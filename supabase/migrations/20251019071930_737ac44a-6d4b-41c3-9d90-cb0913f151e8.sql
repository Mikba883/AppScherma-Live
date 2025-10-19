-- Drop old policy that restricts updates
DROP POLICY IF EXISTS "bouts_update_approve" ON bouts;

-- New policy for tournament matches: everyone in the gym can update
CREATE POLICY "Users can update tournament matches in their gym"
ON bouts
FOR UPDATE
USING (
  tournament_id IS NOT NULL 
  AND gym_id = get_current_user_gym_id()
  AND gym_id IS NOT NULL
)
WITH CHECK (
  tournament_id IS NOT NULL 
  AND gym_id = get_current_user_gym_id()
  AND gym_id IS NOT NULL
);

-- Separate policy for normal sparring matches: only athlete_b or instructors can approve
CREATE POLICY "Athletes can approve their pending sparring matches"
ON bouts
FOR UPDATE
USING (
  tournament_id IS NULL
  AND status = 'pending'
  AND (
    athlete_b = auth.uid() 
    OR has_role(auth.uid(), 'istruttore'::app_role) 
    OR has_role(auth.uid(), 'capo_palestra'::app_role)
  )
)
WITH CHECK (
  tournament_id IS NULL
  AND status = 'pending'
);