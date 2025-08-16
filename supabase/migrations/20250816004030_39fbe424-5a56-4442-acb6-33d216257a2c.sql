-- Add shift column to profiles table
ALTER TABLE public.profiles ADD COLUMN shift text;

-- Update handle_new_user function to save shift from registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
begin
  -- Insert into profiles with email from auth.users and shift from metadata
  insert into public.profiles (user_id, team_id, full_name, birth_date, gender, email, role, shift)
  values (
    new.id,
    (select id from public.teams where name = 'Fanfulla' limit 1),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
    coalesce((new.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
    coalesce(new.raw_user_meta_data ->> 'gender', 'M'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'athlete'),
    new.raw_user_meta_data ->> 'shift'
  );
  return new;
end;
$function$

-- Update summary_by_athlete function to use the shift column properly
CREATE OR REPLACE FUNCTION public.summary_by_athlete(
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
  athlete_id uuid, 
  full_name text, 
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
  with me as (
    select team_id from public.profiles where user_id = auth.uid()
  ),
  base as (
    select b.*
    from public.bouts b, me
    where b.team_id = me.team_id
      and b.status = 'approved'
      and (_from is null or b.bout_date >= _from)
      and (_to   is null or b.bout_date <= _to)
      and (_weapon is null or b.weapon = _weapon)
      and (_tipo_match is null or b.bout_type = _tipo_match)
  ),
  norm as (
    select
      id, bout_date, weapon, bout_type,
      athlete_a as athlete_id,
      score_a   as pts_for,
      score_b   as pts_against
    from base
    union all
    select
      id, bout_date, weapon, bout_type,
      athlete_b as athlete_id,
      score_b   as pts_for,
      score_a   as pts_against
    from base
  ),
  with_profiles as (
    select n.*, p.full_name, p.gender, p.birth_date, p.shift
    from norm n
    join public.profiles p on p.user_id = n.athlete_id
  ),
  filtered as (
    select *
    from with_profiles
    where
      (_gender  is null or gender = _gender)
      and (_min_age is null or date_part('year', age(current_date, birth_date)) >= _min_age)
      and (_max_age is null or date_part('year', age(current_date, birth_date)) <= _max_age)
      and (_athletes is null or athlete_id = any(_athletes))
      and (_turni is null or shift = _turni)
  )
  select
    athlete_id,
    min(full_name) as full_name,
    count(*)::int as matches,
    count(distinct bout_date)::int as trainings,
    sum(case when pts_for > pts_against then 1 else 0 end)::int as wins,
    case when count(*) = 0 then 0
         else sum(case when pts_for > pts_against then 1 else 0 end)::numeric / count(*)
    end as win_rate,
    avg((pts_for - pts_against))::numeric as avg_point_diff,
    avg(pts_for)::numeric as avg_hits_given,
    avg(pts_against)::numeric as avg_hits_received,
    max(bout_date) as last_training
  from filtered
  group by athlete_id
  order by win_rate desc, matches desc, full_name;
$function$

-- Also update list_bouts function to use tipo_match and turni parameters
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
  and (
      _athletes is null
      or athlete_a = any(_athletes)
      or athlete_b = any(_athletes)
  )
  order by bout_date desc, id;
$function$