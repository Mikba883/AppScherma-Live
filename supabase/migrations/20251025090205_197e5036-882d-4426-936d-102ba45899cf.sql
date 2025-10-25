-- Fix RLS policy WITH CHECK to allow setting gym_id to NULL when removing members
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
  -- Owner must be a capo_palestra with a gym
  EXISTS (
    SELECT 1
    FROM profiles owner
    WHERE owner.user_id = auth.uid()
      AND owner.role = 'capo_palestra'
      AND owner.gym_id IS NOT NULL
  )
  AND user_id <> auth.uid()
);