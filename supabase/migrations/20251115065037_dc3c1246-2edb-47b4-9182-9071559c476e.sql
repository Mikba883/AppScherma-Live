-- Update RLS policy on tournaments table to allow all participants to update tournament status
-- This includes creators AND all athletes participating in the tournament

DROP POLICY IF EXISTS "Users can update their tournament status" ON public.tournaments;

CREATE POLICY "Users can update their tournament status"
ON public.tournaments
FOR UPDATE
TO authenticated
USING (
  -- Tournament creator can always update
  (created_by = auth.uid())
  OR (
    -- Any participant in the tournament can update
    EXISTS (
      SELECT 1 FROM public.bouts
      WHERE tournament_id = tournaments.id
      AND (athlete_a = auth.uid() OR athlete_b = auth.uid())
      AND status != 'cancelled'
    )
  )
)
WITH CHECK (
  -- Tournament creator can always update
  (created_by = auth.uid())
  OR (
    -- Any participant in the tournament can update
    EXISTS (
      SELECT 1 FROM public.bouts
      WHERE tournament_id = tournaments.id
      AND (athlete_a = auth.uid() OR athlete_b = auth.uid())
      AND status != 'cancelled'
    )
  )
);