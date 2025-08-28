-- Fix security issues detected by the linter

-- 1. Fix Function Search Path Mutable issues
-- Update all functions to have immutable search_path

-- Update calculate_elo_change function
CREATE OR REPLACE FUNCTION public.calculate_elo_change(
  _player_elo integer, 
  _opponent_elo integer, 
  _player_won boolean, 
  _matches_played integer, 
  _frequency_multiplier numeric DEFAULT 1.0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  -- Check if user has an invitation
  SELECT * INTO _invitation
  FROM public.gym_invitations
  WHERE email = NEW.email
  AND status = 'pending'
  AND expires_at > now()
  LIMIT 1;

  IF _invitation.id IS NOT NULL THEN
    -- Create profile with gym_id from invitation
    INSERT INTO public.profiles (user_id, full_name, birth_date, gender, email, role, shift, gym_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
      COALESCE((NEW.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
      COALESCE(NEW.raw_user_meta_data ->> 'gender', 'M'),
      NEW.email,
      _invitation.role,
      NEW.raw_user_meta_data ->> 'shift',
      _invitation.gym_id
    );
    
    -- Mark invitation as accepted
    UPDATE public.gym_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = _invitation.id;
  ELSE
    -- Create profile without gym_id (will need to join a gym)
    INSERT INTO public.profiles (user_id, full_name, birth_date, gender, email, role, shift)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
      COALESCE((NEW.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
      COALESCE(NEW.raw_user_meta_data ->> 'gender', 'M'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'allievo'),
      NEW.raw_user_meta_data ->> 'shift'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update trigger_update_rankings function
CREATE OR REPLACE FUNCTION public.trigger_update_rankings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM public.update_rankings_after_match(NEW.athlete_a, NEW.athlete_b, NEW.score_a, NEW.score_b);
  END IF;
  RETURN NEW;
END;
$$;