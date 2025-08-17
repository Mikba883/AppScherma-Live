-- Update summary_by_athlete function to include ranking position
CREATE OR REPLACE FUNCTION public.summary_by_athlete(_from date DEFAULT NULL::date, _to date DEFAULT NULL::date, _gender text DEFAULT NULL::text, _min_age integer DEFAULT NULL::integer, _max_age integer DEFAULT NULL::integer, _weapon text DEFAULT NULL::text, _athletes uuid[] DEFAULT NULL::uuid[], _tipo_match text DEFAULT NULL::text, _turni text DEFAULT NULL::text)
 RETURNS TABLE(athlete_id uuid, full_name text, ranking_position integer, elo_rating integer, matches integer, trainings integer, wins integer, win_rate numeric, avg_point_diff numeric, avg_hits_given numeric, avg_hits_received numeric, last_training date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
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
  ),
  summary_data as (
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
  ),
  with_rankings as (
    select 
      s.*,
      coalesce(r.elo_rating, 1200) as elo_rating,
      ROW_NUMBER() OVER (ORDER BY coalesce(r.elo_rating, 1200) DESC, s.matches DESC) as ranking_position
    from summary_data s
    left join public.rankings r on r.athlete_id = s.athlete_id
  )
  select
    athlete_id,
    full_name,
    ranking_position::integer,
    elo_rating,
    matches,
    trainings,
    wins,
    win_rate,
    avg_point_diff,
    avg_hits_given,
    avg_hits_received,
    last_training
  from with_rankings
  order by ranking_position;
$$;