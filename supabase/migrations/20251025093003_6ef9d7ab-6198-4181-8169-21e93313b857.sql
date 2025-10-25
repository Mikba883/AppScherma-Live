-- Drop existing policy that was too restrictive
DROP POLICY IF EXISTS "Athletes can create notifications for match participants" ON public.notifications;

-- Create new policy that allows SECURITY DEFINER functions to insert notifications
CREATE POLICY "Athletes can create notifications for match participants"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Instructors can always create notifications
  has_role(auth.uid(), 'istruttore'::app_role) 
  OR has_role(auth.uid(), 'capo_palestra'::app_role)
  -- OR notification is related to a valid bout (allows SECURITY DEFINER functions)
  OR (
    related_bout_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.bouts 
      WHERE id = related_bout_id
    )
  )
);