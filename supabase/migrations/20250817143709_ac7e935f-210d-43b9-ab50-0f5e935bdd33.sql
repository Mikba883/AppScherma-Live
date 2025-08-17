-- Create rankings table with ELO and frequency tracking
CREATE TABLE public.rankings (
  athlete_id UUID NOT NULL PRIMARY KEY,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  peak_rating INTEGER NOT NULL DEFAULT 1200,
  matches_played INTEGER NOT NULL DEFAULT 0,
  activity_points INTEGER NOT NULL DEFAULT 0,
  frequency_streak INTEGER NOT NULL DEFAULT 0,
  frequency_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  last_activity_date DATE,
  weekly_matches INTEGER NOT NULL DEFAULT 0,
  total_weeks_active INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activity logs table for weekly tracking
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  week_start DATE NOT NULL,
  matches_count INTEGER NOT NULL DEFAULT 0,
  activity_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(athlete_id, week_start)
);

-- Enable RLS on rankings table
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- RLS policies for rankings table
CREATE POLICY "rankings_select_same_team" 
ON public.rankings 
FOR SELECT 
USING (
  athlete_id IN (
    SELECT user_id FROM public.profiles 
    WHERE team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "rankings_insert_self" 
ON public.rankings 
FOR INSERT 
WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "rankings_update_self" 
ON public.rankings 
FOR UPDATE 
USING (athlete_id = auth.uid());

-- Enable RLS on activity_logs table
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs table
CREATE POLICY "activity_logs_select_same_team" 
ON public.activity_logs 
FOR SELECT 
USING (
  athlete_id IN (
    SELECT user_id FROM public.profiles 
    WHERE team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "activity_logs_insert_self" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (athlete_id = auth.uid());

-- Function to calculate ELO change with frequency bonus
CREATE OR REPLACE FUNCTION public.calculate_elo_change(
  _player_elo INTEGER,
  _opponent_elo INTEGER,
  _player_won BOOLEAN,
  _matches_played INTEGER,
  _frequency_multiplier NUMERIC DEFAULT 1.0
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  _k_factor INTEGER;
  _expected_score NUMERIC;
  _actual_score INTEGER;
  _elo_change INTEGER;
  _challenge_bonus NUMERIC := 1.0;
BEGIN
  -- Dynamic K-factor based on experience
  IF _matches_played <= 10 THEN
    _k_factor := 40;
  ELSIF _matches_played <= 30 THEN
    _k_factor := 30;
  ELSE
    _k_factor := 20;
  END IF;

  -- Challenge bonus/penalty system
  IF _opponent_elo - _player_elo >= 100 THEN
    _challenge_bonus := 1.2; -- +20% for challenging stronger players
  ELSIF _player_elo - _opponent_elo >= 150 THEN
    _challenge_bonus := 0.9; -- -10% for "bullying" weaker players
  END IF;

  -- Calculate expected score
  _expected_score := 1.0 / (1.0 + power(10.0, (_opponent_elo - _player_elo) / 400.0));
  
  -- Actual score (1 for win, 0 for loss)
  _actual_score := CASE WHEN _player_won THEN 1 ELSE 0 END;
  
  -- Calculate ELO change with bonuses
  _elo_change := ROUND(
    _k_factor * (_actual_score - _expected_score) * _challenge_bonus * _frequency_multiplier
  );

  RETURN _elo_change;
END;
$$;

-- Function to update frequency stats
CREATE OR REPLACE FUNCTION public.update_frequency_stats(_athlete_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Function to update rankings after a match
CREATE OR REPLACE FUNCTION public.update_rankings_after_match(
  _athlete_a UUID,
  _athlete_b UUID,
  _score_a INTEGER,
  _score_b INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Function to get rankings with positions
CREATE OR REPLACE FUNCTION public.get_rankings(
  _weapon TEXT DEFAULT NULL,
  _gender TEXT DEFAULT NULL,
  _min_age INTEGER DEFAULT NULL,
  _max_age INTEGER DEFAULT NULL
) RETURNS TABLE(
  ranking_position INTEGER,
  athlete_id UUID,
  full_name TEXT,
  elo_rating INTEGER,
  peak_rating INTEGER,
  matches_played INTEGER,
  frequency_streak INTEGER,
  frequency_multiplier NUMERIC,
  last_activity_date DATE
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH team_rankings AS (
    SELECT r.*, p.full_name, p.gender, p.birth_date
    FROM public.rankings r
    JOIN public.profiles p ON p.user_id = r.athlete_id
    WHERE p.team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
      AND (_gender IS NULL OR p.gender = _gender)
      AND (_min_age IS NULL OR date_part('year', age(current_date, p.birth_date)) >= _min_age)
      AND (_max_age IS NULL OR date_part('year', age(current_date, p.birth_date)) <= _max_age)
  ),
  ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (ORDER BY elo_rating DESC, matches_played DESC) as ranking_position
    FROM team_rankings
  )
  SELECT 
    ranking_position::INTEGER,
    athlete_id,
    full_name,
    elo_rating,
    peak_rating,
    matches_played,
    frequency_streak,
    frequency_multiplier,
    last_activity_date
  FROM ranked
  ORDER BY ranking_position;
$$;

-- Trigger to update rankings when a bout is approved
CREATE OR REPLACE FUNCTION public.trigger_update_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only update when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM update_rankings_after_match(NEW.athlete_a, NEW.athlete_b, NEW.score_a, NEW.score_b);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on bouts table
CREATE TRIGGER update_rankings_on_bout_approval
  AFTER UPDATE ON public.bouts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_rankings();