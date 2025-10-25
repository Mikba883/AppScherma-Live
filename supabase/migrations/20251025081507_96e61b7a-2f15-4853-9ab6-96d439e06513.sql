-- Function to delete user account (profiles + auth.users)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;

  -- Delete profile (CASCADE will handle related data like bouts, rankings, etc.)
  DELETE FROM public.profiles WHERE user_id = auth.uid();
  
  -- Delete user from auth.users
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;