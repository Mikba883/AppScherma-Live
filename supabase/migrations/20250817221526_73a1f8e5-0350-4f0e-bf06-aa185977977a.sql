-- 3. Ricreare il trigger per aggiornare i ranking automaticamente
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

-- Ricreare il trigger
DROP TRIGGER IF EXISTS trigger_update_rankings ON public.bouts;
CREATE TRIGGER trigger_update_rankings
  AFTER INSERT OR UPDATE ON public.bouts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_rankings();

-- 4. Ricalcolare tutti i ranking dai match esistenti
DO $$
DECLARE
  bout_record RECORD;
BEGIN
  -- Reset all rankings to default values first
  UPDATE public.rankings SET 
    elo_rating = 1200,
    peak_rating = 1200,
    matches_played = 0,
    last_updated = now();

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