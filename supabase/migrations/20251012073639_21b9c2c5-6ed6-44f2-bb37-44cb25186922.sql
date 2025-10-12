-- Fix ambiguous reference in register_tournament_matches function
DROP FUNCTION IF EXISTS public.register_tournament_matches(text, date, text, text, jsonb);

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
  _match_item JSONB;
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
  VALUES (_tournament_name, auth.uid(), _tournament_date, _user_gym_id, 
          CASE WHEN _weapon = '' THEN NULL ELSE _weapon END, _bout_type)
  RETURNING id INTO _tournament_id;

  -- Insert all matches as pending
  FOR _match_item IN SELECT * FROM jsonb_array_elements(_matches)
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
      (_match_item->>'athlete_a')::UUID,
      (_match_item->>'athlete_b')::UUID,
      (_match_item->>'score_a')::INTEGER,
      (_match_item->>'score_b')::INTEGER,
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
    SELECT (item->>'athlete_a')::UUID as athlete_id
    FROM jsonb_array_elements(_matches) item
    UNION
    SELECT (item->>'athlete_b')::UUID as athlete_id
    FROM jsonb_array_elements(_matches) item
  ) athletes
  WHERE athlete_id != auth.uid();

  RETURN _tournament_id;
END;
$function$;

-- Function to auto-close old tournaments
CREATE OR REPLACE FUNCTION public.close_old_tournaments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Update tournaments that are still in_progress and older than 24 hours
  UPDATE public.tournaments
  SET status = 'cancelled'
  WHERE status = 'in_progress'
    AND created_at < (NOW() - INTERVAL '24 hours');
    
  -- Delete pending bouts from cancelled tournaments
  DELETE FROM public.bouts
  WHERE tournament_id IN (
    SELECT id FROM public.tournaments WHERE status = 'cancelled'
  )
  AND status = 'pending';
END;
$function$;