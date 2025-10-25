-- Drop existing function
DROP FUNCTION IF EXISTS public.delete_user_account();

-- Create improved version that handles all foreign key constraints
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_gym_owner boolean;
BEGIN
  -- Verify user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;

  -- Check if user is a gym owner
  SELECT EXISTS (
    SELECT 1 FROM public.gyms WHERE owner_id = v_user_id
  ) INTO v_is_gym_owner;

  IF v_is_gym_owner THEN
    RAISE EXCEPTION 'Impossibile eliminare account: sei proprietario di una palestra. Trasferisci prima la proprietà.';
  END IF;

  -- Delete notifications
  DELETE FROM public.notifications WHERE athlete_id = v_user_id;
  DELETE FROM public.notifications WHERE created_by = v_user_id;

  -- Delete activity logs
  DELETE FROM public.activity_logs WHERE athlete_id = v_user_id;

  -- Delete rankings
  DELETE FROM public.rankings WHERE athlete_id = v_user_id;

  -- Update bouts: set approval/rejection references to NULL
  UPDATE public.bouts 
  SET approved_by_a = NULL 
  WHERE approved_by_a = v_user_id;

  UPDATE public.bouts 
  SET approved_by_b = NULL 
  WHERE approved_by_b = v_user_id;

  UPDATE public.bouts 
  SET rejected_by = NULL 
  WHERE rejected_by = v_user_id;

  UPDATE public.bouts 
  SET approved_by = NULL 
  WHERE approved_by = v_user_id;

  -- Update bouts: set athlete_b to NULL
  UPDATE public.bouts 
  SET athlete_b = NULL 
  WHERE athlete_b = v_user_id;

  -- Delete bouts where user is athlete_a or created_by
  DELETE FROM public.bouts 
  WHERE athlete_a = v_user_id OR created_by = v_user_id;

  -- Update tournaments: set created_by to NULL (keep tournaments but mark creator as NULL)
  UPDATE public.tournaments 
  SET created_by = NULL 
  WHERE created_by = v_user_id;

  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- Delete gym invitations created by user
  DELETE FROM public.gym_invitations WHERE created_by = v_user_id;

  -- Delete profile (CASCADE will handle any remaining dependent records)
  DELETE FROM public.profiles WHERE user_id = v_user_id;

  -- Delete user from auth.users (CASCADE to auth.identities, sessions, etc.)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;