-- Enable pgcrypto extension for password encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop and recreate the function with proper password handling
DROP FUNCTION IF EXISTS public.create_gym_and_user;

CREATE OR REPLACE FUNCTION public.create_gym_and_user(
  _email text,
  _password text,
  _full_name text,
  _gym_name text,
  _gym_logo_url text DEFAULT NULL,
  _shifts text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  _user_id uuid;
  _gym_id uuid;
  _result json;
BEGIN
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
    RAISE EXCEPTION 'Email già registrata';
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    _email,
    crypt(_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('full_name', _full_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO _user_id;

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
$function$;