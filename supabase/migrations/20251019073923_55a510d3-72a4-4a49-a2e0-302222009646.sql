-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Instructors can create notifications" ON notifications;

-- Create new policy that allows:
-- 1. Instructors/gym owners to create any notification
-- 2. Athletes to create notifications for their tournament matches
CREATE POLICY "Users can create notifications for their matches"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Instructors can create any notification
  has_role(auth.uid(), 'istruttore'::app_role) 
  OR has_role(auth.uid(), 'capo_palestra'::app_role)
  -- OR athletes can create notifications for matches they are involved in
  OR (
    related_bout_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM bouts
      WHERE bouts.id = related_bout_id
      AND (bouts.athlete_a = auth.uid() OR bouts.athlete_b = auth.uid())
    )
  )
);