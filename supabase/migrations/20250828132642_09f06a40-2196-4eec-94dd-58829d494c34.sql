-- Update the create_gym_and_user function to remove password handling
-- This function now expects the user to already exist in auth.users
CREATE OR REPLACE FUNCTION public.create_gym_and_user(
  _user_id uuid,
  _email text, 
  _full_name text, 
  _gym_name text, 
  _gym_logo_url text DEFAULT NULL, 
  _shifts text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _gym_id uuid;
  _result json;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'Profilo già esistente per questo utente';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    birth_date,
    gender,
    role
  ) VALUES (
    _user_id,
    _full_name,
    _email,
    '2000-01-01'::date,
    'M',
    'capo_palestra'
  );

  -- Create gym
  INSERT INTO public.gyms (
    name,
    logo_url,
    owner_name,
    owner_email,
    owner_id,
    shifts
  ) VALUES (
    _gym_name,
    _gym_logo_url,
    _full_name,
    _email,
    _user_id,
    _shifts
  ) RETURNING id INTO _gym_id;

  -- Update profile with gym_id
  UPDATE public.profiles
  SET gym_id = _gym_id
  WHERE user_id = _user_id;

  -- Return result
  _result := json_build_object(
    'user_id', _user_id,
    'gym_id', _gym_id,
    'email', _email
  );

  RETURN _result;
END;
$$;