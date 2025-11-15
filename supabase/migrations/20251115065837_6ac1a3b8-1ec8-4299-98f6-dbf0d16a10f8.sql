-- Update RLS policy on tournaments table to allow:
-- 1. Tournament creators
-- 2. All participants (athletes)
-- 3. Instructors and gym managers for ALL tournaments in their gym

DROP POLICY IF EXISTS "Users can update their tournament status" ON public.tournaments;

CREATE POLICY "Users can update their tournament status"
ON public.tournaments
FOR UPDATE
TO authenticated
USING (
  -- 1. Tournament creator can always update
  (created_by = auth.uid())
  OR 
  -- 2. Any participant in the tournament can update
  (
    EXISTS (
      SELECT 1 FROM public.bouts
      WHERE tournament_id = tournaments.id
      AND (athlete_a = auth.uid() OR athlete_b = auth.uid())
      AND status != 'cancelled'
    )
  )
  OR
  -- 3. Instructors and gym owners can update ALL tournaments in their gym
  (
    (has_role(auth.uid(), 'istruttore') OR has_role(auth.uid(), 'capo_palestra'))
    AND gym_id = get_current_user_gym_id()
    AND get_current_user_gym_id() IS NOT NULL
  )
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  (created_by = auth.uid())
  OR 
  (
    EXISTS (
      SELECT 1 FROM public.bouts
      WHERE tournament_id = tournaments.id
      AND (athlete_a = auth.uid() OR athlete_b = auth.uid())
      AND status != 'cancelled'
    )
  )
  OR
  (
    (has_role(auth.uid(), 'istruttore') OR has_role(auth.uid(), 'capo_palestra'))
    AND gym_id = get_current_user_gym_id()
    AND get_current_user_gym_id() IS NOT NULL
  )
);