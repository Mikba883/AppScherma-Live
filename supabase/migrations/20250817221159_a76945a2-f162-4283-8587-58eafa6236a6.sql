-- Ricreare tutto il sistema di ranking step by step

-- 1. Prima ricreare la funzione update_frequency_stats
CREATE OR REPLACE FUNCTION public.update_frequency_stats(_athlete_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _today DATE := CURRENT_DATE;
  _week_start DATE := _today - (EXTRACT(DOW FROM _today)::INTEGER - 1);
  _last_activity DATE;
  _current_streak INTEGER;
  _weekly_matches INTEGER;
  _total_weeks INTEGER;
BEGIN
  -- Get current stats
  SELECT last_activity_date, frequency_streak, weekly_matches, total_weeks_active
  INTO _last_activity, _current_streak, _weekly_matches, _total_weeks
  FROM public.rankings
  WHERE athlete_id = _athlete_id;

  -- If no ranking record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.rankings (athlete_id, last_activity_date, weekly_matches)
    VALUES (_athlete_id, _today, 1);
    
    -- Insert activity log
    INSERT INTO public.activity_logs (athlete_id, week_start, matches_count, activity_points)
    VALUES (_athlete_id, _week_start, 1, 1)
    ON CONFLICT (athlete_id, week_start) DO UPDATE SET
      matches_count = activity_logs.matches_count + 1,
      activity_points = activity_logs.activity_points + 1;
    RETURN;
  END IF;

  -- Update weekly matches count
  IF _last_activity IS NULL OR _last_activity < _week_start THEN
    -- New week, reset counter
    _weekly_matches := 1;
    _total_weeks := _total_weeks + 1;
  ELSE
    -- Same week, increment
    _weekly_matches := _weekly_matches + 1;
  END IF;

  -- Update streak (consecutive weeks with activity)
  IF _last_activity IS NULL THEN
    _current_streak := 1;
  ELSIF _last_activity >= (_week_start - INTERVAL '7 days') THEN
    -- Active in previous week, continue streak
    IF _last_activity < _week_start THEN
      _current_streak := _current_streak + 1;
    END IF;
  ELSE
    -- Gap in activity, reset streak
    _current_streak := 1;
  END IF;

  -- Calculate frequency multiplier (max 1.25)
  DECLARE
    _multiplier NUMERIC := 1.0 + LEAST(_current_streak * 0.05, 0.25);
  BEGIN
    -- Update rankings
    UPDATE public.rankings SET
      last_activity_date = _today,
      frequency_streak = _current_streak,
      frequency_multiplier = _multiplier,
      weekly_matches = _weekly_matches,
      total_weeks_active = _total_weeks,
      activity_points = activity_points + 1,
      last_updated = now()
    WHERE athlete_id = _athlete_id;
  END;

  -- Update activity log
  INSERT INTO public.activity_logs (athlete_id, week_start, matches_count, activity_points)
  VALUES (_athlete_id, _week_start, 1, 1)
  ON CONFLICT (athlete_id, week_start) DO UPDATE SET
    matches_count = activity_logs.matches_count + 1,
    activity_points = activity_logs.activity_points + 1;
END;
$function$;

-- 2. Popolare prima la tabella rankings con tutti gli atleti
INSERT INTO public.rankings (athlete_id)
SELECT user_id 
FROM public.profiles 
WHERE role IN ('allievo', 'istruttore')
ON CONFLICT (athlete_id) DO NOTHING;