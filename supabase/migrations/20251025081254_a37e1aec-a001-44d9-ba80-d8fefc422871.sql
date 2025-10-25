-- Allow gym owners to update member shifts and remove members from gym
CREATE POLICY "Gym owners can manage members"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is gym owner of the same gym
  EXISTS (
    SELECT 1 FROM public.profiles owner
    WHERE owner.user_id = auth.uid()
      AND owner.role = 'capo_palestra'
      AND owner.gym_id = profiles.gym_id
      AND profiles.gym_id IS NOT NULL
  )
  -- Don't allow owner to remove themselves
  AND profiles.user_id != auth.uid()
)
WITH CHECK (
  -- Same conditions
  EXISTS (
    SELECT 1 FROM public.profiles owner
    WHERE owner.user_id = auth.uid()
      AND owner.role = 'capo_palestra'
      AND owner.gym_id IS NOT NULL
  )
  AND profiles.user_id != auth.uid()
);

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