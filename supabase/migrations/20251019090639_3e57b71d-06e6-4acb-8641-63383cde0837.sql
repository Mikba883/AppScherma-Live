-- Add RLS policy to allow athletes to view their pending tournament matches
CREATE POLICY "Athletes can view their pending tournament matches"
ON public.bouts
FOR SELECT
USING (
  tournament_id IS NOT NULL 
  AND status = 'pending'
  AND (athlete_a = auth.uid() OR athlete_b = auth.uid())
);