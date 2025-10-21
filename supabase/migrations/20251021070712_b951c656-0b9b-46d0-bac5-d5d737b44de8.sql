-- Fix trigger to handle BYE matches (athlete_b = NULL)
-- BYE matches should not update rankings

CREATE OR REPLACE FUNCTION public.trigger_update_rankings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update when status changes to approved AND athlete_b is NOT NULL
  -- BYE matches (athlete_b = NULL) should not update rankings
  IF NEW.status = 'approved' 
     AND (OLD.status IS NULL OR OLD.status != 'approved')
     AND NEW.athlete_b IS NOT NULL THEN
    PERFORM public.update_rankings_after_match(NEW.athlete_a, NEW.athlete_b, NEW.score_a, NEW.score_b);
  END IF;
  RETURN NEW;
END;
$$;