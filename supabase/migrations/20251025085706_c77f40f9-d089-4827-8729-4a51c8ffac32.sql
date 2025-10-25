-- Fix RLS policy to allow gym owners to remove members (set gym_id to NULL)
DROP POLICY IF EXISTS "Gym owners can manage members" ON public.profiles;

CREATE POLICY "Gym owners can manage members"
ON public.profiles
FOR UPDATE
USING (
  -- User trying to update must be gym owner of the same gym as the member
  EXISTS (
    SELECT 1
    FROM profiles owner
    WHERE owner.user_id = auth.uid()
      AND owner.role = 'capo_palestra'
      AND owner.gym_id = profiles.gym_id
      AND profiles.gym_id IS NOT NULL
  )
  AND user_id <> auth.uid()  -- Can't update own profile through this policy
)
WITH CHECK (
  -- After update, the owner must still be a gym owner with a gym
  EXISTS (
    SELECT 1
    FROM profiles owner
    WHERE owner.user_id = auth.uid()
      AND owner.role = 'capo_palestra'
      AND owner.gym_id IS NOT NULL
  )
  AND user_id <> auth.uid()  -- Can't update own profile through this policy
  -- Allow setting gym_id to NULL (for removing members) OR keeping the same gym
);