-- Add gym_id to all tables that need gym isolation
-- This ensures data is compartmentalized per gym

-- Add gym_id to bouts table (already exists, but let's ensure it's populated)
UPDATE public.bouts b
SET gym_id = (
  SELECT p.gym_id 
  FROM public.profiles p 
  WHERE p.user_id = b.created_by
)
WHERE b.gym_id IS NULL;

-- Add gym_id to activity_logs table (already exists, but let's ensure it's populated)  
UPDATE public.activity_logs a
SET gym_id = (
  SELECT p.gym_id 
  FROM public.profiles p 
  WHERE p.user_id = a.athlete_id
)
WHERE a.gym_id IS NULL;

-- Add gym_id to notifications table (already exists, but let's ensure it's populated)
UPDATE public.notifications n
SET gym_id = (
  SELECT p.gym_id 
  FROM public.profiles p 
  WHERE p.user_id = n.athlete_id
)
WHERE n.gym_id IS NULL;

-- Add gym_id to rankings table (already exists, but let's ensure it's populated)
UPDATE public.rankings r
SET gym_id = (
  SELECT p.gym_id 
  FROM public.profiles p 
  WHERE p.user_id = r.athlete_id
)
WHERE r.gym_id IS NULL;

-- Update RLS policies to ensure gym isolation

-- Drop existing policies for bouts
DROP POLICY IF EXISTS "bouts_select_approved_same_gym" ON public.bouts;
DROP POLICY IF EXISTS "bouts_select_involved_same_gym" ON public.bouts;
DROP POLICY IF EXISTS "bouts_insert_own" ON public.bouts;

-- Create new policies for bouts with proper gym isolation
CREATE POLICY "Users can view bouts from their gym only"
ON public.bouts
FOR SELECT
USING (
  gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert bouts in their gym"
ON public.bouts
FOR INSERT
WITH CHECK (
  gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
  AND (created_by = auth.uid() OR 
       EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'istruttore'))
);

-- Update profiles policies for gym isolation
DROP POLICY IF EXISTS "Instructors can view gym members" ON public.profiles;
DROP POLICY IF EXISTS "Gym owners can view gym members" ON public.profiles;

CREATE POLICY "Users can view profiles from their gym"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid() OR
  gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update rankings policies for gym isolation
DROP POLICY IF EXISTS "rankings_select_all" ON public.rankings;

CREATE POLICY "Users can view rankings from their gym"
ON public.rankings
FOR SELECT
USING (
  gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update activity_logs policies for gym isolation
DROP POLICY IF EXISTS "activity_logs_select_all" ON public.activity_logs;

CREATE POLICY "Users can view activity logs from their gym"
ON public.activity_logs
FOR SELECT
USING (
  gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update notifications policies for gym isolation
DROP POLICY IF EXISTS "Athletes can view own notifications" ON public.notifications;

CREATE POLICY "Users can view notifications from their gym"
ON public.notifications
FOR SELECT
USING (
  athlete_id = auth.uid() OR
  gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update function to ensure gym_id is set when creating bouts
CREATE OR REPLACE FUNCTION public.register_bout_instructor(
  _athlete_a uuid,
  _athlete_b uuid,
  _bout_date date,
  _weapon text,
  _bout_type text,
  _score_a integer,
  _score_b integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _user_role text;
  _user_gym_id uuid;
  _id uuid;
  _instructor_name text;
  _athlete_a_name text;
  _athlete_b_name text;
  _message_a text;
  _message_b text;
BEGIN
  -- Check if user is an instructor and get gym_id
  SELECT role, full_name, gym_id INTO _user_role, _instructor_name, _user_gym_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF _user_role IS NULL THEN
    RAISE EXCEPTION 'Profilo non trovato per utente';
  END IF;
  
  IF _user_role != 'istruttore' THEN
    RAISE EXCEPTION 'Solo gli istruttori possono usare questa funzione';
  END IF;

  -- Validate weapon
  IF _weapon IS NOT NULL AND _weapon != '' AND _weapon NOT IN ('fioretto','spada','sciabola') THEN
    RAISE EXCEPTION 'Arma non valida: %', _weapon;
  END IF;
  
  -- Validate bout type
  IF _bout_type NOT IN ('sparring','gara','bianco') THEN
    RAISE EXCEPTION 'Tipo match non valido: %', _bout_type;
  END IF;

  -- Check if athletes exist and are in the same gym
  SELECT full_name INTO _athlete_a_name
  FROM public.profiles 
  WHERE user_id = _athlete_a AND gym_id = _user_gym_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atleta A non trovato nella tua palestra';
  END IF;
  
  SELECT full_name INTO _athlete_b_name
  FROM public.profiles 
  WHERE user_id = _athlete_b AND gym_id = _user_gym_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atleta B non trovato nella tua palestra';
  END IF;

  -- Validate athletes are different
  IF _athlete_a = _athlete_b THEN
    RAISE EXCEPTION 'Gli atleti devono essere diversi';
  END IF;

  -- Insert the bout with gym_id
  INSERT INTO public.bouts (
    bout_date, 
    weapon, 
    bout_type,
    athlete_a, 
    athlete_b, 
    score_a, 
    score_b,
    status, 
    created_by, 
    approved_by, 
    approved_at,
    gym_id
  ) VALUES (
    COALESCE(_bout_date, CURRENT_DATE), 
    CASE WHEN _weapon = '' THEN NULL ELSE _weapon END, 
    _bout_type,
    _athlete_a, 
    _athlete_b, 
    _score_a, 
    _score_b,
    'approved', 
    auth.uid(), 
    auth.uid(), 
    NOW(),
    _user_gym_id
  )
  RETURNING id INTO _id;

  -- Create notification messages
  _message_a := format(
    'L''istruttore %s ha registrato un nuovo match per te del %s contro %s (%s - %s). Risultato: %s - %s',
    _instructor_name,
    COALESCE(_bout_date, CURRENT_DATE),
    _athlete_b_name,
    COALESCE(_weapon, 'arma non specificata'),
    _bout_type,
    _score_a,
    _score_b
  );

  _message_b := format(
    'L''istruttore %s ha registrato un nuovo match per te del %s contro %s (%s - %s). Risultato: %s - %s',
    _instructor_name,
    COALESCE(_bout_date, CURRENT_DATE),
    _athlete_a_name,
    COALESCE(_weapon, 'arma non specificata'),
    _bout_type,
    _score_b,
    _score_a
  );

  -- Create notifications for both athletes with gym_id
  INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
  VALUES 
    (_athlete_a, 'Nuovo Match Registrato', _message_a, 'info', auth.uid(), _id, _user_gym_id),
    (_athlete_b, 'Nuovo Match Registrato', _message_b, 'info', auth.uid(), _id, _user_gym_id);

  RETURN _id;
END;
$$;