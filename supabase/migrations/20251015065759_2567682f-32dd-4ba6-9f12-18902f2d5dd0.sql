-- Step 1: Rimuovi il vecchio check constraint su bouts.status
ALTER TABLE bouts DROP CONSTRAINT IF EXISTS bouts_status_check;

-- Step 2: Aggiungi nuovo check constraint che include 'cancelled'
ALTER TABLE bouts ADD CONSTRAINT bouts_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Step 3: Aggiorna get_my_active_tournament() per escludere tornei senza match giocati
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

-- Step 4: Pulizia tornei fantasma esistenti
UPDATE bouts
SET status = 'cancelled'
WHERE tournament_id IN (
  SELECT id FROM tournaments 
  WHERE status = 'in_progress'
    AND NOT EXISTS (
      SELECT 1 FROM bouts b2
      WHERE b2.tournament_id = tournaments.id
        AND b2.score_a IS NOT NULL
        AND b2.score_b IS NOT NULL
    )
)
AND status = 'pending';

UPDATE tournaments
SET status = 'cancelled'
WHERE status = 'in_progress'
  AND NOT EXISTS (
    SELECT 1 FROM bouts b
    WHERE b.tournament_id = tournaments.id
      AND b.score_a IS NOT NULL
      AND b.score_b IS NOT NULL
  );