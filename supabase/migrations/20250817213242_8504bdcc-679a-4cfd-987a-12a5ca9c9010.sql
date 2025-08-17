-- Fix the trigger and create a specialized function for personal ranking
-- First, ensure the trigger exists and is working
DROP TRIGGER IF EXISTS trigger_update_rankings_on_bout_approval ON public.bouts;

CREATE TRIGGER trigger_update_rankings_on_bout_approval
  AFTER INSERT OR UPDATE ON public.bouts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_rankings();

-- Create a specific function for personal ranking that calls get_rankings
CREATE OR REPLACE FUNCTION public.get_personal_ranking_with_elo(_athlete_id uuid)
RETURNS TABLE(
  ranking_position integer,
  elo_rating integer,
  peak_rating integer,
  matches_played integer,
  frequency_streak integer,
  frequency_multiplier numeric,
  last_activity_date date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    r.ranking_position,
    r.elo_rating,
    r.peak_rating,
    r.matches_played,
    r.frequency_streak,
    r.frequency_multiplier,
    r.last_activity_date
  FROM public.get_rankings() r
  WHERE r.athlete_id = _athlete_id
  LIMIT 1;
$function$;