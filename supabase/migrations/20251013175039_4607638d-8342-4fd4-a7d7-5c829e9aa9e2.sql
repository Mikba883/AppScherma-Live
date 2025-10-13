-- Fix 1: Email Exposure - Create secure function that doesn't expose email addresses
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(
  id uuid,
  gym_id uuid,
  role text,
  expires_at timestamptz,
  status text,
  gym_name text,
  gym_logo_url text,
  gym_shifts text[]
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.gym_id, 
    i.role, 
    i.expires_at, 
    i.status, 
    g.name as gym_name,
    g.logo_url as gym_logo_url,
    g.shifts as gym_shifts
  FROM gym_invitations i
  JOIN gyms g ON g.id = i.gym_id
  WHERE i.token = _token
    AND i.status = 'pending'
    AND i.expires_at > now()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Remove overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON gym_invitations;

-- Fix 2: Privilege Escalation - Prevent direct role updates in profiles
CREATE OR REPLACE FUNCTION public.prevent_role_updates()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Direct role updates not allowed. Roles are managed by the system.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_profile_role_updates
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_updates();

-- Ensure user_roles table is populated from existing profiles
INSERT INTO user_roles (user_id, role)
SELECT user_id, role::app_role FROM profiles
WHERE role IN ('allievo', 'istruttore', 'capo_palestra')
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix 3: Tournament Match Validation - Add comprehensive validation
CREATE OR REPLACE FUNCTION public.register_tournament_matches(_tournament_name text, _tournament_date date, _weapon text, _bout_type text, _matches jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  _tournament_id UUID;
  _user_gym_id UUID;
  _match_item JSONB;
  _athlete_a_gym UUID;
  _athlete_b_gym UUID;
  _score_a INTEGER;
  _score_b INTEGER;
BEGIN
  -- Get user's gym_id
  SELECT gym_id INTO _user_gym_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF _user_gym_id IS NULL THEN
    RAISE EXCEPTION 'Utente non associato a nessuna palestra';
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

    -- Insert match
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
      _score_a,
      _score_b,
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