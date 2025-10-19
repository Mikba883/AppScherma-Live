-- Drop existing policy that blocks notification creation
DROP POLICY IF EXISTS "Users can create notifications for their matches" ON notifications;

-- Create new policy that allows athletes to create notifications for both participants
CREATE POLICY "Athletes can create notifications for match participants"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'istruttore'::app_role) 
  OR has_role(auth.uid(), 'capo_palestra'::app_role)
  OR (
    related_bout_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM bouts
      WHERE bouts.id = related_bout_id
      AND (bouts.athlete_a = auth.uid() OR bouts.athlete_b = auth.uid())
      AND (athlete_id = bouts.athlete_a OR athlete_id = bouts.athlete_b)
    )
  )
);