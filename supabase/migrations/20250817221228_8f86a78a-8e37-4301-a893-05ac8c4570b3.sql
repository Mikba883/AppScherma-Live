-- Continuare con il sistema di ranking

-- 3. Ricreare la funzione update_rankings_after_match
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
  _freq_mult_a NUMERIC;
  _freq_mult_b NUMERIC;
  _change_a INTEGER;
  _change_b INTEGER;
  _winner_a BOOLEAN := _score_a > _score_b;
BEGIN
  -- Ensure both athletes have ranking records
  INSERT INTO public.rankings (athlete_id) 
  VALUES (_athlete_a), (_athlete_b)
  ON CONFLICT (athlete_id) DO NOTHING;

  -- Update frequency stats for both athletes
  PERFORM update_frequency_stats(_athlete_a);
  PERFORM update_frequency_stats(_athlete_b);

  -- Get current ELO and stats
  SELECT elo_rating, matches_played, frequency_multiplier
  INTO _elo_a, _matches_a, _freq_mult_a
  FROM public.rankings WHERE athlete_id = _athlete_a;

  SELECT elo_rating, matches_played, frequency_multiplier
  INTO _elo_b, _matches_b, _freq_mult_b
  FROM public.rankings WHERE athlete_id = _athlete_b;

  -- Calculate ELO changes
  _change_a := calculate_elo_change(_elo_a, _elo_b, _winner_a, _matches_a, _freq_mult_a);
  _change_b := calculate_elo_change(_elo_b, _elo_a, NOT _winner_a, _matches_b, _freq_mult_b);

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

-- 4. Ricreare il trigger
DROP TRIGGER IF EXISTS trigger_update_rankings ON public.bouts;
CREATE TRIGGER trigger_update_rankings
  AFTER INSERT OR UPDATE ON public.bouts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_rankings();

-- 5. Ricalcolare tutti i ranking dai match esistenti
DO $$
DECLARE
  bout_record RECORD;
BEGIN
  -- Reset all rankings to default values first
  UPDATE public.rankings SET 
    elo_rating = 1200,
    peak_rating = 1200,
    matches_played = 0,
    frequency_streak = 0,
    frequency_multiplier = 1.0,
    weekly_matches = 0,
    total_weeks_active = 0,
    activity_points = 0,
    last_activity_date = NULL;

  -- Process all approved bouts in chronological order
  FOR bout_record IN 
    SELECT athlete_a, athlete_b, score_a, score_b 
    FROM public.bouts 
    WHERE status = 'approved' 
    ORDER BY bout_date ASC, created_at ASC
  LOOP
    PERFORM update_rankings_after_match(
      bout_record.athlete_a, 
      bout_record.athlete_b, 
      bout_record.score_a, 
      bout_record.score_b
    );
  END LOOP;
END $$;