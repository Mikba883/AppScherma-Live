-- Processare tutti i match per calcolare i ranking
DO $$
DECLARE
  bout_record RECORD;
  count_processed INTEGER := 0;
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
    
    count_processed := count_processed + 1;
  END LOOP;

  RAISE NOTICE 'Sistema di ranking implementato! Processati % match approvati.', count_processed;
END $$;