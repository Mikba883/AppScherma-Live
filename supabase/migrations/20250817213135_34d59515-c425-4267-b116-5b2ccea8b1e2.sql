-- Fix the instructor mode ELO update by ensuring the trigger is properly configured
-- First, ensure the trigger exists and is working
DROP TRIGGER IF EXISTS trigger_update_rankings_on_bout_approval ON public.bouts;

CREATE TRIGGER trigger_update_rankings_on_bout_approval
  AFTER INSERT OR UPDATE ON public.bouts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_rankings();

-- Fix the function overloading issue by creating a simple wrapper for personal ranking
CREATE OR REPLACE FUNCTION public.get_personal_ranking(_athlete_id uuid)
RETURNS TABLE(
  athlete_id uuid,
  full_name text,
  ranking_position integer,
  elo_rating integer,
  matches integer,
  trainings integer,
  wins integer,
  win_rate numeric,
  avg_point_diff numeric,
  avg_hits_given numeric,
  avg_hits_received numeric,
  last_training date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT * FROM public.summary_by_athlete(null, null, null, null, null, null, ARRAY[_athlete_id])
  WHERE s.athlete_id = _athlete_id;
$function$;