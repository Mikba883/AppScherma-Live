-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  tournament_date DATE NOT NULL,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  weapon TEXT CHECK (weapon IN ('fioretto', 'spada', 'sciabola') OR weapon IS NULL),
  bout_type TEXT NOT NULL CHECK (bout_type IN ('sparring', 'gara', 'bianco'))
);

-- Enable RLS on tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Users can create tournaments in their gym"
ON public.tournaments FOR INSERT
WITH CHECK (
  gym_id = get_current_user_gym_id() AND
  created_by = auth.uid()
);

CREATE POLICY "Users can view tournaments from their gym"
ON public.tournaments FOR SELECT
USING (gym_id = get_current_user_gym_id());

-- Add new columns to bouts table
ALTER TABLE public.bouts 
ADD COLUMN tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
ADD COLUMN approved_by_a UUID REFERENCES auth.users(id),
ADD COLUMN approved_by_b UUID REFERENCES auth.users(id);

-- Function to register tournament matches (for students)
CREATE OR REPLACE FUNCTION public.register_tournament_matches(
  _tournament_name TEXT,
  _tournament_date DATE,
  _weapon TEXT,
  _bout_type TEXT,
  _matches JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _tournament_id UUID;
  _user_gym_id UUID;
  _match JSONB;
BEGIN
  -- Get user's gym_id
  SELECT gym_id INTO _user_gym_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF _user_gym_id IS NULL THEN
    RAISE EXCEPTION 'Utente non associato a nessuna palestra';
  END IF;

  -- Validate weapon
  IF _weapon IS NOT NULL AND _weapon != '' AND _weapon NOT IN ('fioretto','spada','sciabola') THEN
    RAISE EXCEPTION 'Arma non valida';
  END IF;
  
  -- Validate bout type
  IF _bout_type NOT IN ('sparring','gara','bianco') THEN
    RAISE EXCEPTION 'Tipo match non valido';
  END IF;

  -- Create tournament
  INSERT INTO public.tournaments (name, created_by, tournament_date, gym_id, weapon, bout_type)
  VALUES (_tournament_name, auth.uid(), _tournament_date, _user_gym_id, CASE WHEN _weapon = '' THEN NULL ELSE _weapon END, _bout_type)
  RETURNING id INTO _tournament_id;

  -- Insert all matches as pending
  FOR _match IN SELECT * FROM jsonb_array_elements(_matches)
  LOOP
    INSERT INTO public.bouts (
      tournament_id, bout_date, weapon, bout_type,
      athlete_a, athlete_b, score_a, score_b,
      status, created_by, gym_id
    ) VALUES (
      _tournament_id,
      _tournament_date,
      CASE WHEN _weapon = '' THEN NULL ELSE _weapon END,
      _bout_type,
      (_match->>'athlete_a')::UUID,
      (_match->>'athlete_b')::UUID,
      (_match->>'score_a')::INTEGER,
      (_match->>'score_b')::INTEGER,
      'pending',
      auth.uid(),
      _user_gym_id
    );
  END LOOP;

  -- Send notifications to all involved athletes
  INSERT INTO public.notifications (athlete_id, title, message, type, created_by, gym_id)
  SELECT DISTINCT 
    athlete_id,
    'Nuovo Torneo',
    format('Sei stato inserito nel torneo "%s" del %s. Approva i tuoi match per confermare i risultati.', 
           _tournament_name, _tournament_date),
    'info',
    auth.uid(),
    _user_gym_id
  FROM (
    SELECT (_match->>'athlete_a')::UUID as athlete_id
    FROM jsonb_array_elements(_matches) _match
    UNION
    SELECT (_match->>'athlete_b')::UUID as athlete_id
    FROM jsonb_array_elements(_matches) _match
  ) athletes
  WHERE athlete_id != auth.uid();

  RETURN _tournament_id;
END;
$function$;

-- Function to approve tournament match
CREATE OR REPLACE FUNCTION public.approve_tournament_match(
  _bout_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _bout_record RECORD;
  _is_athlete_a BOOLEAN;
  _is_athlete_b BOOLEAN;
BEGIN
  -- Get bout details
  SELECT * INTO _bout_record
  FROM public.bouts
  WHERE id = _bout_id 
    AND status = 'pending'
    AND tournament_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match non trovato o già approvato';
  END IF;

  -- Check if current user is one of the athletes
  _is_athlete_a := (_bout_record.athlete_a = auth.uid());
  _is_athlete_b := (_bout_record.athlete_b = auth.uid());

  IF NOT (_is_athlete_a OR _is_athlete_b) THEN
    RAISE EXCEPTION 'Non sei autorizzato ad approvare questo match';
  END IF;

  -- Mark approval
  IF _is_athlete_a THEN
    UPDATE public.bouts
    SET approved_by_a = auth.uid()
    WHERE id = _bout_id;
  ELSIF _is_athlete_b THEN
    UPDATE public.bouts
    SET approved_by_b = auth.uid()
    WHERE id = _bout_id;
  END IF;

  -- Check if both approved
  SELECT * INTO _bout_record
  FROM public.bouts
  WHERE id = _bout_id;

  IF _bout_record.approved_by_a IS NOT NULL AND _bout_record.approved_by_b IS NOT NULL THEN
    -- Both approved - mark as approved and update rankings
    UPDATE public.bouts
    SET status = 'approved', 
        approved_by = _bout_record.created_by,
        approved_at = now()
    WHERE id = _bout_id;

    -- Notify the other athlete
    INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
    VALUES (
      CASE WHEN _is_athlete_a THEN _bout_record.athlete_b ELSE _bout_record.athlete_a END,
      'Match Approvato',
      format('Il match del torneo è stato approvato da entrambi gli atleti ed è ora ufficiale!'),
      'success',
      auth.uid(),
      _bout_id,
      _bout_record.gym_id
    );
  ELSE
    -- Notify the other athlete that one approved
    INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
    VALUES (
      CASE WHEN _is_athlete_a THEN _bout_record.athlete_b ELSE _bout_record.athlete_a END,
      'Match in Attesa',
      format('Il tuo avversario ha approvato il match del torneo. Approva anche tu per renderlo ufficiale.'),
      'info',
      auth.uid(),
      _bout_id,
      _bout_record.gym_id
    );
  END IF;
END;
$function$;

-- Function to get tournament matches for current athlete
CREATE OR REPLACE FUNCTION public.get_my_tournament_matches()
RETURNS TABLE(
  bout_id UUID,
  tournament_id UUID,
  tournament_name TEXT,
  tournament_date DATE,
  bout_date DATE,
  weapon TEXT,
  bout_type TEXT,
  opponent_id UUID,
  opponent_name TEXT,
  my_score INTEGER,
  opponent_score INTEGER,
  status TEXT,
  i_approved BOOLEAN,
  opponent_approved BOOLEAN,
  created_by UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    b.id as bout_id,
    t.id as tournament_id,
    t.name as tournament_name,
    t.tournament_date,
    b.bout_date,
    b.weapon,
    b.bout_type,
    CASE 
      WHEN b.athlete_a = auth.uid() THEN b.athlete_b
      ELSE b.athlete_a
    END as opponent_id,
    CASE 
      WHEN b.athlete_a = auth.uid() THEN pb.full_name
      ELSE pa.full_name
    END as opponent_name,
    CASE 
      WHEN b.athlete_a = auth.uid() THEN b.score_a
      ELSE b.score_b
    END as my_score,
    CASE 
      WHEN b.athlete_a = auth.uid() THEN b.score_b
      ELSE b.score_a
    END as opponent_score,
    b.status,
    CASE 
      WHEN b.athlete_a = auth.uid() THEN (b.approved_by_a IS NOT NULL)
      ELSE (b.approved_by_b IS NOT NULL)
    END as i_approved,
    CASE 
      WHEN b.athlete_a = auth.uid() THEN (b.approved_by_b IS NOT NULL)
      ELSE (b.approved_by_a IS NOT NULL)
    END as opponent_approved,
    t.created_by
  FROM public.bouts b
  JOIN public.tournaments t ON t.id = b.tournament_id
  LEFT JOIN public.profiles pa ON pa.user_id = b.athlete_a
  LEFT JOIN public.profiles pb ON pb.user_id = b.athlete_b
  WHERE (b.athlete_a = auth.uid() OR b.athlete_b = auth.uid())
    AND b.tournament_id IS NOT NULL
    AND t.status = 'in_progress'
  ORDER BY t.tournament_date DESC, b.bout_date DESC;
$function$;

-- Update RLS policy for bouts to allow tournament match approval
CREATE POLICY "Athletes can approve their tournament matches"
ON public.bouts FOR UPDATE
USING (
  status = 'pending' AND
  tournament_id IS NOT NULL AND
  (athlete_a = auth.uid() OR athlete_b = auth.uid())
);