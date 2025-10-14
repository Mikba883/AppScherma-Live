-- FASE 2: Pulizia tornei fantasma esistenti
-- Marca come 'cancelled' i tornei in_progress più vecchi di 2 ore senza bouts approvati
UPDATE tournaments
SET status = 'cancelled'
WHERE status = 'in_progress'
  AND created_at < NOW() - INTERVAL '2 hours'
  AND id NOT IN (
    SELECT DISTINCT tournament_id 
    FROM bouts 
    WHERE tournament_id IS NOT NULL
      AND status = 'approved'
  );

-- Elimina i bouts pending dei tornei cancellati
DELETE FROM bouts
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE status = 'cancelled'
)
AND status = 'pending';

-- FASE 3: Fix funzione get_my_active_tournament
-- Aggiorna la funzione per ritornare solo tornei recenti e attivi
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
    AND t.created_at >= NOW() - INTERVAL '24 hours'  -- Solo tornei recenti
    AND (b.athlete_a = auth.uid() OR b.athlete_b = auth.uid())
    AND b.status != 'cancelled'  -- Escludi bouts cancellati dall'utente
  ORDER BY t.id, t.created_at DESC
  LIMIT 1;
END;
$function$;