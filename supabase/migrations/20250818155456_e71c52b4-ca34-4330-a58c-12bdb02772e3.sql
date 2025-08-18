-- Fix get_my_pending_bouts function by removing team_id reference
CREATE OR REPLACE FUNCTION public.get_my_pending_bouts()
RETURNS TABLE(id uuid, bout_date date, weapon text, bout_type text, athlete_a uuid, athlete_b uuid, score_a integer, score_b integer, status text, created_by uuid, created_at timestamp with time zone, notes text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  select b.id, b.bout_date, b.weapon, b.bout_type, 
         b.athlete_a, b.athlete_b, b.score_a, b.score_b, b.status,
         b.created_by, b.created_at, b.notes
  from public.bouts b
  where b.status = 'pending' and b.athlete_b = auth.uid();
$function$;