-- NUOVO SISTEMA ELO - Modifiche Complete

-- 1. Aggiungi campo per tracciare ultima vittoria (per bonus prima vittoria settimanale)
ALTER TABLE public.rankings ADD COLUMN IF NOT EXISTS last_win_date DATE;

-- 2. Aggiorna default ELO da 1200 a 0
ALTER TABLE public.rankings 
ALTER COLUMN elo_rating SET DEFAULT 0,
ALTER COLUMN peak_rating SET DEFAULT 0;

-- 3. Converti ELO esistenti (sottrai 1200, minimo 0)
UPDATE public.rankings 
SET 
  elo_rating = GREATEST(0, elo_rating - 1200),
  peak_rating = GREATEST(0, peak_rating - 1200);

-- 4. NUOVA FUNZIONE calculate_elo_change con scaglioni e punti per sconfitta
CREATE OR REPLACE FUNCTION public.calculate_elo_change(
  _player_elo INTEGER,
  _opponent_elo INTEGER,
  _player_won BOOLEAN,
  _matches_played INTEGER,
  _frequency_multiplier NUMERIC DEFAULT 1.0,
  _is_first_win_of_week BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _k_factor INTEGER;
  _expected_score NUMERIC;
  _elo_diff INTEGER;
  _challenge_multiplier NUMERIC := 1.0;
  _win_points NUMERIC;
  _final_points INTEGER;
BEGIN
  -- K-factor dinamico basato su esperienza
  IF _matches_played <= 10 THEN
    _k_factor := 40;
  ELSIF _matches_played <= 30 THEN
    _k_factor := 30;
  ELSE
    _k_factor := 20;
  END IF;

  -- Calcola differenza ELO
  _elo_diff := _opponent_elo - _player_elo;

  -- NUOVO: Sistema a scaglioni graduati
  IF _elo_diff >= 300 THEN
    _challenge_multiplier := 1.5;      -- Sfida un campione!
  ELSIF _elo_diff >= 200 THEN
    _challenge_multiplier := 1.35;     -- Sfida molto forte
  ELSIF _elo_diff >= 100 THEN
    _challenge_multiplier := 1.2;      -- Sfida forte
  ELSIF _elo_diff <= -300 THEN
    _challenge_multiplier := 0.4;      -- Bullying estremo
  ELSIF _elo_diff <= -200 THEN
    _challenge_multiplier := 0.6;      -- Bullying molto debole
  ELSIF _elo_diff <= -100 THEN
    _challenge_multiplier := 0.8;      -- Sfida debole
  ELSE
    _challenge_multiplier := 1.0;      -- Match equilibrato
  END IF;

  -- Calcola punteggio atteso
  _expected_score := 1.0 / (1.0 + power(10.0, _elo_diff / 400.0));
  
  -- Calcola punti base per vittoria
  _win_points := _k_factor * (1.0 - _expected_score) * _challenge_multiplier * _frequency_multiplier;

  -- Applica bonus prima vittoria settimanale (2x) - SOLO per vittorie
  IF _player_won AND _is_first_win_of_week THEN
    _win_points := _win_points * 2.0;
  END IF;

  -- NUOVO: Se vince, punti pieni. Se perde, dividi per 5 e arrotonda per ECCESSO
  IF _player_won THEN
    _final_points := ROUND(_win_points);
  ELSE
    -- Dividi per 5 e arrotonda PER ECCESSO (ceiling)
    _final_points := CEILING(_win_points / 5.0);
  END IF;

  RETURN _final_points;
END;
$$;

-- 5. AGGIORNA update_rankings_after_match con limite 4 match e bonus prima vittoria
CREATE OR REPLACE FUNCTION public.update_rankings_after_match(
  _athlete_a UUID,
  _athlete_b UUID,
  _score_a INTEGER,
  _score_b INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
  -- NUOVO: Controlla se hanno già giocato 4+ match questa settimana
  SELECT COUNT(*)
  INTO _matches_this_week
  FROM public.bouts
  WHERE status = 'approved'
    AND bout_date >= _week_start
    AND (
      (athlete_a = _athlete_a AND athlete_b = _athlete_b)
      OR (athlete_a = _athlete_b AND athlete_b = _athlete_a)
    );

  -- NUOVO: Se >= 4 match questa settimana, NON aggiornare ELO
  IF _matches_this_week >= 4 THEN
    -- Aggiorna comunque frequency stats
    PERFORM public.update_frequency_stats(_athlete_a);
    PERFORM public.update_frequency_stats(_athlete_b);
    RETURN;
  END IF;

  -- Assicurati che entrambi abbiano record ranking
  INSERT INTO public.rankings (athlete_id) 
  VALUES (_athlete_a), (_athlete_b)
  ON CONFLICT (athlete_id) DO NOTHING;

  -- Ottieni ELO, stats e frequency multiplier correnti
  SELECT elo_rating, matches_played, frequency_multiplier, last_win_date
  INTO _elo_a, _matches_a, _freq_mult_a, _last_win_a
  FROM public.rankings WHERE athlete_id = _athlete_a;

  SELECT elo_rating, matches_played, frequency_multiplier, last_win_date
  INTO _elo_b, _matches_b, _freq_mult_b, _last_win_b
  FROM public.rankings WHERE athlete_id = _athlete_b;

  -- NUOVO: Controlla se è prima vittoria della settimana
  _is_first_win_a := _winner_a AND (_last_win_a IS NULL OR _last_win_a < _week_start);
  _is_first_win_b := (NOT _winner_a) AND (_last_win_b IS NULL OR _last_win_b < _week_start);

  -- Calcola cambiamenti ELO con nuovi parametri
  _change_a := public.calculate_elo_change(
    _elo_a, _elo_b, _winner_a, _matches_a, _freq_mult_a, _is_first_win_a
  );
  
  _change_b := public.calculate_elo_change(
    _elo_b, _elo_a, NOT _winner_a, _matches_b, _freq_mult_b, _is_first_win_b
  );

  -- Aggiorna ranking per atleta A
  UPDATE public.rankings SET
    elo_rating = elo_rating + _change_a,
    peak_rating = GREATEST(peak_rating, elo_rating + _change_a),
    matches_played = matches_played + 1,
    last_win_date = CASE WHEN _winner_a THEN CURRENT_DATE ELSE last_win_date END,
    last_updated = now()
  WHERE athlete_id = _athlete_a;

  -- Aggiorna ranking per atleta B
  UPDATE public.rankings SET
    elo_rating = elo_rating + _change_b,
    peak_rating = GREATEST(peak_rating, elo_rating + _change_b),
    matches_played = matches_played + 1,
    last_win_date = CASE WHEN NOT _winner_a THEN CURRENT_DATE ELSE last_win_date END,
    last_updated = now()
  WHERE athlete_id = _athlete_b;

  -- Aggiorna frequency stats per entrambi
  PERFORM public.update_frequency_stats(_athlete_a);
  PERFORM public.update_frequency_stats(_athlete_b);
END;
$$;