-- First, drop all existing list_bouts functions to resolve the "function not unique" error
DROP FUNCTION IF EXISTS public.list_bouts(date, date, text, integer, integer, text, uuid[], text, text);
DROP FUNCTION IF EXISTS public.list_bouts(date, date, text, integer, integer, text, uuid[], text);
DROP FUNCTION IF EXISTS public.list_bouts(date, date, text, integer, integer, text, uuid[]);

-- Create the corrected list_bouts function with proper athlete filtering
CREATE OR REPLACE FUNCTION public.list_bouts(
  _from date DEFAULT NULL::date, 
  _to date DEFAULT NULL::date, 
  _gender text DEFAULT NULL::text, 
  _min_age integer DEFAULT NULL::integer, 
  _max_age integer DEFAULT NULL::integer, 
  _weapon text DEFAULT NULL::text, 
  _athletes uuid[] DEFAULT NULL::uuid[], 
  _tipo_match text DEFAULT NULL::text, 
  _turni text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid, 
  bout_date date, 
  weapon text, 
  bout_type text, 
  status text, 
  athlete_a uuid, 
  athlete_a_name text, 
  athlete_b uuid, 
  athlete_b_name text, 
  score_a integer, 
  score_b integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  with me as (
    select team_id from public.profiles where user_id = auth.uid()
  ),
  bx as (
    select b.*
    from public.bouts b, me
    where b.team_id = me.team_id
      and b.status = 'approved'
      and (_from is null or b.bout_date >= _from)
      and (_to   is null or b.bout_date <= _to)
      and (_weapon is null or b.weapon = _weapon)
      and (_tipo_match is null or b.bout_type = _tipo_match)
  ),
  b_with_names as (
    select b.*,
           pa.full_name as a_name,
           pb.full_name as b_name,
           pa.gender as a_gender, pb.gender as b_gender,
           pa.birth_date as a_birth, pb.birth_date as b_birth,
           pa.shift as a_shift, pb.shift as b_shift
    from bx b
    join public.profiles pa on pa.user_id = b.athlete_a
    join public.profiles pb on pb.user_id = b.athlete_b
  )
  select
    id, bout_date, weapon, bout_type, status,
    athlete_a, a_name, athlete_b, b_name, score_a, score_b
  from b_with_names
  where
    -- Gender and age filters (apply to both athletes)
    (
      (
        (_gender is null or a_gender = _gender)
        and (_min_age is null or date_part('year', age(current_date, a_birth)) >= _min_age)
        and (_max_age is null or date_part('year', age(current_date, a_birth)) <= _max_age)
        and (_turni is null or a_shift = _turni)
      )
      or
      (
        (_gender is null or b_gender = _gender)
        and (_min_age is null or date_part('year', age(current_date, b_birth)) >= _min_age)
        and (_max_age is null or date_part('year', age(current_date, b_birth)) <= _max_age)
        and (_turni is null or b_shift = _turni)
      )
    )
    -- Athletes filter - CRITICAL: Only show matches where specified athletes are involved
    and (
      _athletes is null
      or athlete_a = any(_athletes)
      or athlete_b = any(_athletes)
    )
  order by bout_date desc, id;
$function$