-- Versione semplificata: solo trigger senza ricalcolo automatico

-- 1. Fix search_path per calculate_elo_change
CREATE OR REPLACE FUNCTION public.calculate_elo_change(_player_elo integer, _opponent_elo integer, _player_won boolean, _matches_played integer, _frequency_multiplier numeric DEFAULT 1.0)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

-- 2. Ricreare il trigger function
CREATE OR REPLACE FUNCTION public.trigger_update_rankings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Only update when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM update_rankings_after_match(NEW.athlete_a, NEW.athlete_b, NEW.score_a, NEW.score_b);
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Ricreare il trigger
DROP TRIGGER IF EXISTS trigger_update_rankings ON public.bouts;
CREATE TRIGGER trigger_update_rankings
  AFTER INSERT OR UPDATE ON public.bouts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_rankings();