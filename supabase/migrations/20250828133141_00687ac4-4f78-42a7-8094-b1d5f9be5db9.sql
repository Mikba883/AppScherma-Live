-- Update create_gym_and_user to handle existing profiles
-- This function now updates the existing profile instead of creating a new one
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
  _profile_exists boolean;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) INTO _profile_exists;

  IF _profile_exists THEN
    -- Update existing profile with full_name and email
    UPDATE public.profiles
    SET 
      full_name = _full_name,
      email = _email,
      role = 'capo_palestra'
    WHERE user_id = _user_id;
  ELSE
    -- Create new profile if it doesn't exist
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
  END IF;

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