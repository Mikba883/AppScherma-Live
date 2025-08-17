-- Drop all triggers and functions with CASCADE to remove dependencies

-- Drop all triggers first
DROP TRIGGER IF EXISTS trigger_update_rankings ON public.bouts CASCADE;
DROP TRIGGER IF EXISTS update_rankings_trigger ON public.bouts CASCADE;
DROP TRIGGER IF EXISTS update_rankings_on_bout_approval ON public.bouts CASCADE;
DROP TRIGGER IF EXISTS trigger_update_rankings_on_bout_approval ON public.bouts CASCADE;

-- Drop functions with CASCADE
DROP FUNCTION IF EXISTS public.trigger_update_rankings() CASCADE;
DROP FUNCTION IF EXISTS public.update_rankings_after_match(uuid, uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.register_bout_instructor(uuid, uuid, date, text, text, integer, integer) CASCADE;

-- Recreate the update rankings function
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
  _change_a := public.calculate_elo_change(_elo_a, _elo_b, _winner_a, _matches_a, 1.0::numeric);
  _change_b := public.calculate_elo_change(_elo_b, _elo_a, NOT _winner_a, _matches_b, 1.0::numeric);

  -- Update rankings for athlete A
  UPDATE public.rankings SET
    elo_rating = elo_rating + _change_a,
    peak_rating = GREATEST(peak_rating, elo_rating + _change_a),
    matches_played = matches_played + 1,
    last_updated = now()
  WHERE athlete_id = _athlete_a;

  -- Update rankings for athlete B
  UPDATE public.rankings SET
    elo_rating = elo_rating + _change_b,
    peak_rating = GREATEST(peak_rating, elo_rating + _change_b),
    matches_played = matches_played + 1,
    last_updated = now()
  WHERE athlete_id = _athlete_b;

  -- Update frequency stats for both athletes
  PERFORM public.update_frequency_stats(_athlete_a);
  PERFORM public.update_frequency_stats(_athlete_b);
END;
$function$;

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION public.trigger_update_rankings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Only update when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM public.update_rankings_after_match(NEW.athlete_a, NEW.athlete_b, NEW.score_a, NEW.score_b);
  END IF;
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER trigger_update_rankings
  AFTER INSERT OR UPDATE ON public.bouts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_rankings();

-- Recreate the instructor bout registration function
CREATE OR REPLACE FUNCTION public.register_bout_instructor(_athlete_a uuid, _athlete_b uuid, _bout_date date, _weapon text, _bout_type text, _score_a integer, _score_b integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _user_role text;
  _id uuid;
BEGIN
  -- Check if user is an instructor
  SELECT role INTO _user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF _user_role IS NULL THEN
    RAISE EXCEPTION 'Profilo non trovato per utente';
  END IF;
  
  IF _user_role != 'istruttore' THEN
    RAISE EXCEPTION 'Solo gli istruttori possono usare questa funzione';
  END IF;

  -- Validate weapon
  IF _weapon IS NOT NULL AND _weapon != '' AND _weapon NOT IN ('fioretto','spada','sciabola') THEN
    RAISE EXCEPTION 'Arma non valida: %', _weapon;
  END IF;
  
  -- Validate bout type
  IF _bout_type NOT IN ('sparring','gara','bianco') THEN
    RAISE EXCEPTION 'Tipo match non valido: %', _bout_type;
  END IF;

  -- Check if athletes exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _athlete_a) THEN
    RAISE EXCEPTION 'Atleta A non trovato';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _athlete_b) THEN
    RAISE EXCEPTION 'Atleta B non trovato';
  END IF;

  -- Validate athletes are different
  IF _athlete_a = _athlete_b THEN
    RAISE EXCEPTION 'Gli atleti devono essere diversi';
  END IF;

  -- Insert the bout
  INSERT INTO public.bouts (
    bout_date, 
    weapon, 
    bout_type,
    athlete_a, 
    athlete_b, 
    score_a, 
    score_b,
    status, 
    created_by, 
    approved_by, 
    approved_at
  ) VALUES (
    COALESCE(_bout_date, CURRENT_DATE), 
    CASE WHEN _weapon = '' THEN NULL ELSE _weapon END, 
    _bout_type,
    _athlete_a, 
    _athlete_b, 
    _score_a, 
    _score_b,
    'approved', 
    auth.uid(), 
    auth.uid(), 
    NOW()
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;