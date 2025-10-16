-- Modifica RPC function per mostrare tornei attivi anche senza punteggi
CREATE OR REPLACE FUNCTION public.get_my_active_tournament()
RETURNS TABLE(tournament_id uuid, tournament_name text, tournament_date date, created_by uuid, weapon text, bout_type text)
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
    AND t.tournament_date >= CURRENT_DATE - INTERVAL '2 days'
    AND (b.athlete_a = auth.uid() OR b.athlete_b = auth.uid())
    AND b.status != 'cancelled'
    -- RIMOSSA la condizione che richiedeva punteggi inseriti
    -- Ora mostra tutti i tornei con bouts associati, anche senza score
  ORDER BY t.id, t.created_at DESC
  LIMIT 1;
END;
$function$;