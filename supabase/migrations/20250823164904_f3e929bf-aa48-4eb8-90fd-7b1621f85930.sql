-- Update the register_bout_instructor function to send notifications to athletes
CREATE OR REPLACE FUNCTION public.register_bout_instructor(_athlete_a uuid, _athlete_b uuid, _bout_date date, _weapon text, _bout_type text, _score_a integer, _score_b integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _user_role text;
  _id uuid;
  _instructor_name text;
  _athlete_a_name text;
  _athlete_b_name text;
  _message_a text;
  _message_b text;
BEGIN
  -- Check if user is an instructor
  SELECT role, full_name INTO _user_role, _instructor_name
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

  -- Check if athletes exist and get their names
  SELECT full_name INTO _athlete_a_name
  FROM public.profiles WHERE user_id = _athlete_a;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atleta A non trovato';
  END IF;
  
  SELECT full_name INTO _athlete_b_name
  FROM public.profiles WHERE user_id = _athlete_b;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atleta B non trovato';
  END IF;

  -- Validate athletes are different
  IF _athlete_a = _athlete_b THEN
    RAISE EXCEPTION 'Gli atleti devono essere diversi';
  END IF;

  -- Insert the bout
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
    approved_at
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
    NOW()
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

  -- Create notifications for both athletes
  INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id)
  VALUES 
    (_athlete_a, 'Nuovo Match Registrato', _message_a, 'info', auth.uid(), _id),
    (_athlete_b, 'Nuovo Match Registrato', _message_b, 'info', auth.uid(), _id);

  RETURN _id;
END;
$function$;