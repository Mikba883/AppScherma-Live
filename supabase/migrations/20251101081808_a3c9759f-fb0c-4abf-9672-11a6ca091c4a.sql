-- Update get_my_active_tournament to:
-- 1. Remove 24-hour time limit
-- 2. Allow instructors and gym managers to see all active tournaments

CREATE OR REPLACE FUNCTION public.get_my_active_tournament()
RETURNS TABLE(
  tournament_id uuid,
  tournament_name text,
  tournament_date date,
  created_by uuid,
  weapon text,
  bout_type text,
  phase integer
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
    t.bout_type,
    t.phase
  FROM public.tournaments t
  JOIN public.bouts b ON b.tournament_id = t.id
  WHERE t.status = 'in_progress'
    AND t.status NOT IN ('completed', 'cancelled')
    AND (
      -- Athletes see tournaments they participate in
      (b.athlete_a = auth.uid() OR b.athlete_b = auth.uid())
      -- Instructors and gym managers see ALL tournaments in their gym
      OR (
        public.has_role(auth.uid(), 'istruttore') 
        OR public.has_role(auth.uid(), 'capo_palestra')
      )
    )
    AND b.status != 'cancelled'
  ORDER BY t.id, t.created_at DESC
  LIMIT 1;
END;
$function$;