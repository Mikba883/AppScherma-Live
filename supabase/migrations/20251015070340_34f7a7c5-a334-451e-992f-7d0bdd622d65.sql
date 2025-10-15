-- Step 1: Pulizia immediata del torneo fantasma specifico
UPDATE bouts
SET status = 'cancelled'
WHERE tournament_id = 'ce6d476b-f28d-47d6-93c6-386851b5fec6';

UPDATE tournaments
SET status = 'cancelled'
WHERE id = 'ce6d476b-f28d-47d6-93c6-386851b5fec6';

-- Step 2: Aggiornare get_my_active_tournament() con filtro data
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
    AND t.tournament_date >= CURRENT_DATE - INTERVAL '2 days'  -- NUOVO: esclude tornei con date vecchie
    AND (b.athlete_a = auth.uid() OR b.athlete_b = auth.uid())
    AND b.status != 'cancelled'
    -- Esclude tornei con SOLO bouts pending (non ancora giocati)
    AND EXISTS (
      SELECT 1 FROM public.bouts b2
      WHERE b2.tournament_id = t.id
        AND b2.score_a IS NOT NULL
        AND b2.score_b IS NOT NULL
    )
  ORDER BY t.id, t.created_at DESC
  LIMIT 1;
END;
$function$;