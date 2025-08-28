-- Update the handle_new_user trigger to handle gym_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _invitation RECORD;
  _gym_id uuid;
BEGIN
  -- First check if gym_id is provided in metadata (for public link registrations)
  _gym_id := (NEW.raw_user_meta_data ->> 'gym_id')::uuid;
  
  -- If gym_id from metadata, create profile with it
  IF _gym_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, full_name, birth_date, gender, email, role, shift, gym_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
      COALESCE((NEW.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
      COALESCE(NEW.raw_user_meta_data ->> 'gender', 'M'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'allievo'),
      NEW.raw_user_meta_data ->> 'shift',
      _gym_id
    );
    RETURN NEW;
  END IF;
  
  -- Otherwise check if user has an invitation
  SELECT * INTO _invitation
  FROM public.gym_invitations
  WHERE email = NEW.email
  AND status = 'pending'
  AND expires_at > now()
  LIMIT 1;

  IF _invitation.id IS NOT NULL THEN
    -- Create profile with gym_id from invitation
    INSERT INTO public.profiles (user_id, full_name, birth_date, gender, email, role, shift, gym_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
      COALESCE((NEW.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
      COALESCE(NEW.raw_user_meta_data ->> 'gender', 'M'),
      NEW.email,
      _invitation.role,
      NEW.raw_user_meta_data ->> 'shift',
      _invitation.gym_id
    );
    
    -- Mark invitation as accepted
    UPDATE public.gym_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = _invitation.id;
  ELSE
    -- Create profile without gym_id (will need to join a gym)
    INSERT INTO public.profiles (user_id, full_name, birth_date, gender, email, role, shift)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
      COALESCE((NEW.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
      COALESCE(NEW.raw_user_meta_data ->> 'gender', 'M'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'allievo'),
      NEW.raw_user_meta_data ->> 'shift'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;