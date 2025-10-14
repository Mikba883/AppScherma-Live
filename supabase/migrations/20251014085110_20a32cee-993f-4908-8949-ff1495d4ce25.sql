-- Fix 1: Exclude tournament bouts from pending notifications
CREATE OR REPLACE FUNCTION public.get_my_pending_bouts()
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
  created_by uuid,
  created_at timestamp with time zone,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    b.id, b.bout_date, b.weapon, b.bout_type, 
    b.athlete_a, b.athlete_b, b.score_a, b.score_b, b.status,
    b.created_by, b.created_at, b.notes
  FROM public.bouts b
  WHERE b.status = 'pending' 
    AND b.athlete_b = auth.uid()
    AND b.tournament_id IS NULL;
$function$;

-- Fix 2: Correct get_my_active_tournament to avoid SQL error
CREATE OR REPLACE FUNCTION public.get_my_active_tournament()
RETURNS TABLE(
  tournament_id uuid,
  tournament_name text,
  tournament_date date,
  created_by uuid,
  weapon text,
  bout_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (t.id)
    t.id as tournament_id,
    t.name as tournament_name,
    t.tournament_date,
    t.created_by,
    t.weapon,
    t.bout_type
  FROM public.tournaments t
  JOIN public.bouts b ON b.tournament_id = t.id
  WHERE t.status = 'in_progress'
    AND t.created_at >= NOW() - INTERVAL '24 hours'
    AND (b.athlete_a = auth.uid() OR b.athlete_b = auth.uid())
  ORDER BY t.id, t.created_at DESC
  LIMIT 1;
END;
$function$;