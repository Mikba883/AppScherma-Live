-- Crea funzione per ottenere il torneo attivo dove l'utente è coinvolto
CREATE OR REPLACE FUNCTION public.get_my_active_tournament()
RETURNS TABLE(
  tournament_id UUID,
  tournament_name TEXT,
  tournament_date DATE,
  created_by UUID,
  weapon TEXT,
  bout_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
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
  ORDER BY t.created_at DESC
  LIMIT 1;
END;
$$;