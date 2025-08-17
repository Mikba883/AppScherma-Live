-- Sistema completo di ranking da zero

-- 1. Ricreare la funzione calculate_elo_change
CREATE OR REPLACE FUNCTION public.calculate_elo_change(_player_elo integer, _opponent_elo integer, _player_won boolean, _matches_played integer, _frequency_multiplier numeric DEFAULT 1.0)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
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
$function$;

-- 2. Ricreare la funzione update_rankings_after_match
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

  -- Calculate ELO changes
  _change_a := calculate_elo_change(_elo_a, _elo_b, _winner_a, _matches_a, 1.0);
  _change_b := calculate_elo_change(_elo_b, _elo_a, NOT _winner_a, _matches_b, 1.0);

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