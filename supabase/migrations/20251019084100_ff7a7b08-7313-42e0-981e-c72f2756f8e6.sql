-- Create function to get pending tournament matches for current user
CREATE OR REPLACE FUNCTION public.get_my_pending_tournament_matches()
RETURNS TABLE(
  id uuid,
  bout_date date,
  weapon text,
  bout_type text,
  athlete_a uuid,
  athlete_b uuid,
  score_a integer,
  score_b integer,
  status text,
  tournament_id uuid,
  tournament_name text,
  approved_by_a uuid,
  approved_by_b uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    b.id,
    b.bout_date,
    b.weapon,
    b.bout_type,
    b.athlete_a,
    b.athlete_b,
    b.score_a,
    b.score_b,
    b.status,
    b.tournament_id,
    t.name as tournament_name,
    b.approved_by_a,
    b.approved_by_b
  FROM public.bouts b
  JOIN public.tournaments t ON t.id = b.tournament_id
  WHERE b.status = 'pending'
    AND b.tournament_id IS NOT NULL
    AND (b.athlete_a = auth.uid() OR b.athlete_b = auth.uid());
$$;