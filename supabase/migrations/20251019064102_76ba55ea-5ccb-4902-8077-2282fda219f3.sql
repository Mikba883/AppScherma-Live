-- Modifica register_tournament_matches per approvazione automatica se istruttore
CREATE OR REPLACE FUNCTION public.register_tournament_matches(
  _tournament_name text,
  _tournament_date date,
  _weapon text,
  _bout_type text,
  _matches jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _tournament_id UUID;
  _user_gym_id UUID;
  _match_item JSONB;
  _athlete_a_gym UUID;
  _athlete_b_gym UUID;
  _score_a INTEGER;
  _score_b INTEGER;
  _is_instructor BOOLEAN;
  _match_status TEXT;
  _notification_message TEXT;
BEGIN
  -- Get user's gym_id
  SELECT gym_id INTO _user_gym_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF _user_gym_id IS NULL THEN
    RAISE EXCEPTION 'Utente non associato a nessuna palestra';
  END IF;

  -- Check if user is instructor
  _is_instructor := public.has_role(auth.uid(), 'istruttore'::app_role) 
                 OR public.has_role(auth.uid(), 'capo_palestra'::app_role);
  
  -- Determine match status based on role
  IF _is_instructor THEN
    _match_status := 'approved';
  ELSE
    _match_status := 'pending';
  END IF;

  -- Validate array size (prevent DoS)
  IF jsonb_array_length(_matches) > 200 THEN
    RAISE EXCEPTION 'Troppi match (massimo 200)';
  END IF;

  IF jsonb_array_length(_matches) < 1 THEN
    RAISE EXCEPTION 'Almeno un match richiesto';
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

  -- Validate and insert all matches
  FOR _match_item IN SELECT * FROM jsonb_array_elements(_matches)
  LOOP
    -- Extract scores
    _score_a := (_match_item->>'score_a')::INTEGER;
    _score_b := (_match_item->>'score_b')::INTEGER;

    -- Validate scores (fencing matches typically go to 5 or 15)
    IF _score_a < 0 OR _score_a > 45 OR _score_b < 0 OR _score_b > 45 THEN
      RAISE EXCEPTION 'Punteggi non validi (0-45): % - %', _score_a, _score_b;
    END IF;

    -- Validate athletes exist and are in the same gym
    SELECT gym_id INTO _athlete_a_gym 
    FROM public.profiles 
    WHERE user_id = (_match_item->>'athlete_a')::UUID;
    
    SELECT gym_id INTO _athlete_b_gym 
    FROM public.profiles 
    WHERE user_id = (_match_item->>'athlete_b')::UUID;

    IF _athlete_a_gym IS NULL OR _athlete_b_gym IS NULL THEN
      RAISE EXCEPTION 'Atleta non trovato';
    END IF;

    IF _athlete_a_gym != _user_gym_id OR _athlete_b_gym != _user_gym_id THEN
      RAISE EXCEPTION 'Gli atleti devono essere della stessa palestra';
    END IF;

    -- Validate athletes are different
    IF (_match_item->>'athlete_a')::UUID = (_match_item->>'athlete_b')::UUID THEN
      RAISE EXCEPTION 'Gli atleti devono essere diversi';
    END IF;

    -- Insert match with conditional status
    INSERT INTO public.bouts (
      tournament_id, bout_date, weapon, bout_type,
      athlete_a, athlete_b, score_a, score_b,
      status, created_by, approved_by, approved_at, gym_id
    ) VALUES (
      _tournament_id,
      _tournament_date,
      CASE WHEN _weapon = '' THEN NULL ELSE _weapon END,
      _bout_type,
      (_match_item->>'athlete_a')::UUID,
      (_match_item->>'athlete_b')::UUID,
      _score_a,
      _score_b,
      _match_status,
      auth.uid(),
      CASE WHEN _is_instructor THEN auth.uid() ELSE NULL END,
      CASE WHEN _is_instructor THEN NOW() ELSE NULL END,
      _user_gym_id
    );
  END LOOP;

  -- Send notifications with role-specific message
  IF _is_instructor THEN
    _notification_message := format('L''istruttore ha registrato i risultati del torneo "%s" del %s. I match sono già approvati.', 
           _tournament_name, _tournament_date);
  ELSE
    _notification_message := format('Sei stato inserito nel torneo "%s" del %s. Approva i tuoi match per confermare i risultati.', 
           _tournament_name, _tournament_date);
  END IF;

  INSERT INTO public.notifications (athlete_id, title, message, type, created_by, gym_id)
  SELECT DISTINCT 
    athlete_id,
    'Nuovo Torneo',
    _notification_message,
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