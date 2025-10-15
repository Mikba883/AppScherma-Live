-- Modify update_rankings_after_match to exclude tournament matches from weekly limit
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
  _last_win_a DATE;
  _last_win_b DATE;
  _change_a INTEGER;
  _change_b INTEGER;
  _winner_a BOOLEAN := _score_a > _score_b;
  _week_start DATE := CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::INTEGER - 1);
  _matches_this_week INTEGER;
  _is_first_win_a BOOLEAN := FALSE;
  _is_first_win_b BOOLEAN := FALSE;
BEGIN
  -- MODIFIED: Check if they have already played 4+ NORMAL matches this week (exclude tournament matches)
  SELECT COUNT(*)
  INTO _matches_this_week
  FROM public.bouts
  WHERE status = 'approved'
    AND bout_date >= _week_start
    AND tournament_id IS NULL  -- EXCLUDE tournament matches from weekly limit
    AND (
      (athlete_a = _athlete_a AND athlete_b = _athlete_b)
      OR (athlete_a = _athlete_b AND athlete_b = _athlete_a)
    );

  -- MODIFIED: If >= 4 NORMAL matches this week, DON'T update ELO (but still update frequency stats)
  IF _matches_this_week >= 4 THEN
    -- Update frequency stats anyway
    PERFORM public.update_frequency_stats(_athlete_a);
    PERFORM public.update_frequency_stats(_athlete_b);
    RETURN;
  END IF;

  -- Ensure both have ranking records
  INSERT INTO public.rankings (athlete_id) 
  VALUES (_athlete_a), (_athlete_b)
  ON CONFLICT (athlete_id) DO NOTHING;

  -- Get current ELO, stats and frequency multiplier
  SELECT elo_rating, matches_played, frequency_multiplier, last_win_date
  INTO _elo_a, _matches_a, _freq_mult_a, _last_win_a
  FROM public.rankings WHERE athlete_id = _athlete_a;

  SELECT elo_rating, matches_played, frequency_multiplier, last_win_date
  INTO _elo_b, _matches_b, _freq_mult_b, _last_win_b
  FROM public.rankings WHERE athlete_id = _athlete_b;

  -- Check if it's first win of the week
  _is_first_win_a := _winner_a AND (_last_win_a IS NULL OR _last_win_a < _week_start);
  _is_first_win_b := (NOT _winner_a) AND (_last_win_b IS NULL OR _last_win_b < _week_start);

  -- Calculate ELO changes with new parameters
  _change_a := public.calculate_elo_change(
    _elo_a, _elo_b, _winner_a, _matches_a, _freq_mult_a, _is_first_win_a
  );
  
  _change_b := public.calculate_elo_change(
    _elo_b, _elo_a, NOT _winner_a, _matches_b, _freq_mult_b, _is_first_win_b
  );

  -- Update ranking for athlete A
  UPDATE public.rankings SET
    elo_rating = elo_rating + _change_a,
    peak_rating = GREATEST(peak_rating, elo_rating + _change_a),
    matches_played = matches_played + 1,
    last_win_date = CASE WHEN _winner_a THEN CURRENT_DATE ELSE last_win_date END,
    last_updated = now()
  WHERE athlete_id = _athlete_a;

  -- Update ranking for athlete B
  UPDATE public.rankings SET
    elo_rating = elo_rating + _change_b,
    peak_rating = GREATEST(peak_rating, elo_rating + _change_b),
    matches_played = matches_played + 1,
    last_win_date = CASE WHEN NOT _winner_a THEN CURRENT_DATE ELSE last_win_date END,
    last_updated = now()
  WHERE athlete_id = _athlete_b;

  -- Update frequency stats for both
  PERFORM public.update_frequency_stats(_athlete_a);
  PERFORM public.update_frequency_stats(_athlete_b);
END;
$function$;