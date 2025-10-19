-- Fase A: Aggiungere supporto per tornei a 2 fasi (Fase 1: round-robin, Fase 2: eliminazione diretta)

-- 1. Aggiungere colonna phase alla tabella tournaments
ALTER TABLE public.tournaments 
ADD COLUMN phase integer NOT NULL DEFAULT 1 CHECK (phase IN (1, 2));

-- 2. Aggiungere colonne per gestire bracket eliminazione diretta nella tabella bouts
ALTER TABLE public.bouts 
ADD COLUMN seed_a integer,
ADD COLUMN seed_b integer,
ADD COLUMN bracket_round integer,
ADD COLUMN bracket_match_number integer,
ADD COLUMN next_match_id uuid REFERENCES public.bouts(id);

-- 3. Creare vista per calcolare seeding dalla Fase 1
CREATE OR REPLACE VIEW public.tournament_phase1_rankings AS
SELECT 
  b.tournament_id,
  athlete_id,
  COUNT(*) FILTER (WHERE is_winner) as wins,
  SUM(points_for) as points_for,
  SUM(points_against) as points_against,
  SUM(point_diff) as point_diff
FROM (
  SELECT 
    tournament_id,
    athlete_a as athlete_id,
    score_a as points_for,
    score_b as points_against,
    score_a - score_b as point_diff,
    score_a > score_b as is_winner
  FROM public.bouts
  WHERE tournament_id IS NOT NULL 
    AND status = 'approved'
    AND score_a IS NOT NULL 
    AND score_b IS NOT NULL
  UNION ALL
  SELECT 
    tournament_id,
    athlete_b as athlete_id,
    score_b as points_for,
    score_a as points_against,
    score_b - score_a as point_diff,
    score_b > score_a as is_winner
  FROM public.bouts
  WHERE tournament_id IS NOT NULL 
    AND status = 'approved'
    AND score_a IS NOT NULL 
    AND score_b IS NOT NULL
) b
GROUP BY b.tournament_id, athlete_id
ORDER BY wins DESC, point_diff DESC;

-- 4. Drop e ricreare RPC get_my_active_tournament per includere phase
DROP FUNCTION IF EXISTS public.get_my_active_tournament();

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
    AND t.created_at >= NOW() - INTERVAL '24 hours'
    AND t.tournament_date >= CURRENT_DATE - INTERVAL '2 days'
    AND (b.athlete_a = auth.uid() OR b.athlete_b = auth.uid())
    AND b.status != 'cancelled'
  ORDER BY t.id, t.created_at DESC
  LIMIT 1;
END;
$function$;