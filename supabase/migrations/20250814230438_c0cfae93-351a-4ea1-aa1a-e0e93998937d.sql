-- Fix security warnings: remove security definer view and fix function search paths

-- Drop the problematic view and recreate as a regular function
drop view if exists public.my_pending_bouts;

-- Recreate as a function with proper search path
create or replace function public.get_my_pending_bouts()
returns table (
  id uuid,
  team_id uuid,
  bout_date date,
  weapon text,
  bout_type text,
  athlete_a uuid,
  athlete_b uuid,
  score_a int,
  score_b int,
  status text,
  created_by uuid,
  created_at timestamp with time zone,
  notes text
)
language sql security definer stable
set search_path = ''
as $$
  select b.id, b.team_id, b.bout_date, b.weapon, b.bout_type, 
         b.athlete_a, b.athlete_b, b.score_a, b.score_b, b.status,
         b.created_by, b.created_at, b.notes
  from public.bouts b
  where b.status = 'pending' and b.athlete_b = auth.uid();
$$;

-- Fix search path for existing functions
create or replace function public.register_bout(
  _opponent uuid,
  _bout_date date,
  _weapon text,
  _bout_type text,
  _my_score int,
  _opp_score int
) returns uuid
language plpgsql security definer stable
set search_path = ''
as $$
declare
  _team uuid;
  _id uuid;
begin
  select team_id into _team from public.profiles where user_id = auth.uid();
  if _team is null then
    raise exception 'Profilo non trovato per utente';
  end if;

  if _weapon not in ('fioretto','spada','sciabola') then
    raise exception 'Arma non valida';
  end if;
  if _bout_type not in ('sparring','gara','bianco') then
    raise exception 'Tipo match non valido';
  end if;

  insert into public.bouts (
    team_id, bout_date, weapon, bout_type,
    athlete_a, athlete_b, score_a, score_b,
    status, created_by
  ) values (
    _team, coalesce(_bout_date, current_date), _weapon, _bout_type,
    auth.uid(), _opponent, _my_score, _opp_score,
    'pending', auth.uid()
  )
  returning id into _id;

  return _id;
end;
$$;

create or replace function public.decide_bout(
  _bout_id uuid,
  _decision text
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  _is_b boolean;
begin
  select (athlete_b = auth.uid()) into _is_b
  from public.bouts where id = _bout_id and status = 'pending';

  if not _is_b then
    if not exists (
      select 1
      from public.bouts b
      join public.profiles p on p.user_id = auth.uid()
      where b.id = _bout_id
        and b.team_id = p.team_id
        and p.role in ('coach','admin')
        and b.status = 'pending'
    ) then
      raise exception 'Non autorizzato a decidere questo match';
    end if;
  end if;

  if _decision = 'approve' then
    update public.bouts
      set status='approved', approved_by=auth.uid(), approved_at=now()
      where id=_bout_id and status='pending';
  elsif _decision = 'reject' then
    update public.bouts
      set status='rejected', rejected_by=auth.uid(), rejected_at=now()
      where id=_bout_id and status='pending';
  else
    raise exception 'Decisione non valida';
  end if;
end;
$$;

create or replace function public.list_bouts(
  _from date default null,
  _to date default null,
  _gender text default null,
  _min_age int default null,
  _max_age int default null,
  _weapon text default null,
  _athletes uuid[] default null
) returns table (
  id uuid,
  bout_date date,
  weapon text,
  bout_type text,
  status text,
  athlete_a uuid,
  athlete_a_name text,
  athlete_b uuid,
  athlete_b_name text,
  score_a int,
  score_b int
)
language sql security definer stable
set search_path = ''
as $$
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
  ),
  b_with_names as (
    select b.*,
           pa.full_name as a_name,
           pb.full_name as b_name,
           pa.gender as a_gender, pb.gender as b_gender,
           pa.birth_date as a_birth, pb.birth_date as b_birth
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
    )
    or
    (
      (_gender is null or b_gender = _gender)
      and (_min_age is null or date_part('year', age(current_date, b_birth)) >= _min_age)
      and (_max_age is null or date_part('year', age(current_date, b_birth)) <= _max_age)
    )
  and (
      _athletes is null
      or athlete_a = any(_athletes)
      or athlete_b = any(_athletes)
  )
  order by bout_date desc, id;
$$;

create or replace function public.summary_by_athlete(
  _from date default null,
  _to date default null,
  _gender text default null,
  _min_age int default null,
  _max_age int default null,
  _weapon text default null,
  _athletes uuid[] default null
) returns table (
  athlete_id uuid,
  full_name text,
  matches int,
  trainings int,
  wins int,
  win_rate numeric,
  avg_point_diff numeric,
  last_training date
)
language sql security definer stable
set search_path = ''
as $$
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
    select n.*, p.full_name, p.gender, p.birth_date
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
    max(bout_date) as last_training
  from filtered
  group by athlete_id
  order by win_rate desc, matches desc, full_name;
$$;