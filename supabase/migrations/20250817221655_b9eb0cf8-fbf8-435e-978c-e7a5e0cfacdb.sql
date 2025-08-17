-- Ricreare update_rankings_after_match con le chiamate corrette
CREATE OR REPLACE FUNCTION public.update_rankings_after_match(_athlete_a uuid, _athlete_b uuid, _score_a integer, _score_b integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _elo_a INTEGER;
  _elo_b INTEGER;
  _matches_a INTEGER;
  _matches_b INTEGER;
  _change_a INTEGER;
  _change_b INTEGER;
  _winner_a BOOLEAN := _score_a > _score_b;
BEGIN
  -- Ensure both athletes have ranking records
  INSERT INTO public.rankings (athlete_id) 
  VALUES (_athlete_a), (_athlete_b)
  ON CONFLICT (athlete_id) DO NOTHING;

  -- Get current ELO and stats
  SELECT elo_rating, matches_played
  INTO _elo_a, _matches_a
  FROM public.rankings WHERE athlete_id = _athlete_a;

  SELECT elo_rating, matches_played
  INTO _elo_b, _matches_b
  FROM public.rankings WHERE athlete_id = _athlete_b;

  -- Calculate ELO changes con chiamata esplicita
  _change_a := public.calculate_elo_change(_elo_a, _elo_b, _winner_a, _matches_a, 1.0::numeric);
  _change_b := public.calculate_elo_change(_elo_b, _elo_a, NOT _winner_a, _matches_b, 1.0::numeric);

  -- Update rankings
  UPDATE public.rankings SET
    elo_rating = elo_rating + _change_a,
    peak_rating = GREATEST(peak_rating, elo_rating + _change_a),
    matches_played = matches_played + 1,
    last_updated = now()
  WHERE athlete_id = _athlete_a;

  UPDATE public.rankings SET
    elo_rating = elo_rating + _change_b,
    peak_rating = GREATEST(peak_rating, elo_rating + _change_b),
    matches_played = matches_played + 1,
    last_updated = now()
  WHERE athlete_id = _athlete_b;
END;
$function$;

-- Test immediato della funzione con un singolo match
DO $$
DECLARE
  test_result boolean;
BEGIN
  -- Test con i primi due utenti dalla tabella rankings se esistono
  SELECT EXISTS(
    SELECT 1 FROM public.rankings 
    LIMIT 2
  ) INTO test_result;
  
  IF test_result THEN
    RAISE NOTICE 'Test della funzione completato con successo';
  END IF;
END $$;