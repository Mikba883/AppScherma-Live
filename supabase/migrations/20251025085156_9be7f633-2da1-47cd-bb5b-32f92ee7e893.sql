-- Drop existing function
DROP FUNCTION IF EXISTS public.delete_user_account();

-- Create updated version that allows gym owners to delete their account (and gym)
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

  -- If user is gym owner, delete the gym (CASCADE will handle everything)
  IF v_is_gym_owner THEN
    DELETE FROM public.gyms WHERE owner_id = v_user_id;
  END IF;

  -- Delete notifications
  DELETE FROM public.notifications WHERE athlete_id = v_user_id;
  DELETE FROM public.notifications WHERE created_by = v_user_id;

  -- Delete activity logs
  DELETE FROM public.activity_logs WHERE athlete_id = v_user_id;

  -- Delete rankings
  DELETE FROM public.rankings WHERE athlete_id = v_user_id;

  -- Delete tournaments created by user (CASCADE will delete related bouts)
  DELETE FROM public.tournaments WHERE created_by = v_user_id;

  -- Update remaining bouts: set approval/rejection references to NULL
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

  -- Update remaining bouts: set athlete_b to NULL
  UPDATE public.bouts 
  SET athlete_b = NULL 
  WHERE athlete_b = v_user_id;

  -- Delete remaining bouts where user is athlete_a or created_by
  DELETE FROM public.bouts 
  WHERE athlete_a = v_user_id OR created_by = v_user_id;

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