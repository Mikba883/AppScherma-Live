-- Aggiorna tutte le funzioni database per rimuovere i riferimenti a team_id

-- 1. Aggiorna summary_by_athlete
CREATE OR REPLACE FUNCTION public.summary_by_athlete(_from date DEFAULT NULL::date, _to date DEFAULT NULL::date, _gender text DEFAULT NULL::text, _min_age integer DEFAULT NULL::integer, _max_age integer DEFAULT NULL::integer, _weapon text DEFAULT NULL::text, _athletes uuid[] DEFAULT NULL::uuid[], _tipo_match text DEFAULT NULL::text, _turni text DEFAULT NULL::text)
 RETURNS TABLE(athlete_id uuid, full_name text, ranking_position integer, elo_rating integer, matches integer, trainings integer, wins integer, win_rate numeric, avg_point_diff numeric, avg_hits_given numeric, avg_hits_received numeric, last_training date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with base as (
    select b.*
    from public.bouts b
    where b.status = 'approved'
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
$function$;

-- 2. Aggiorna list_bouts
CREATE OR REPLACE FUNCTION public.list_bouts(_from date DEFAULT NULL::date, _to date DEFAULT NULL::date, _gender text DEFAULT NULL::text, _min_age integer DEFAULT NULL::integer, _max_age integer DEFAULT NULL::integer, _weapon text DEFAULT NULL::text, _athletes uuid[] DEFAULT NULL::uuid[], _tipo_match text DEFAULT NULL::text, _turni text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, bout_date date, weapon text, bout_type text, status text, athlete_a uuid, athlete_a_name text, athlete_b uuid, athlete_b_name text, score_a integer, score_b integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with bx as (
    select b.*
    from public.bouts b
    where b.status = 'approved'
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
    and (
      _athletes is null
      or athlete_a = any(_athletes)
      or athlete_b = any(_athletes)
    )
  order by bout_date desc, id;
$function$;

-- 3. Aggiorna get_rankings
CREATE OR REPLACE FUNCTION public.get_rankings(_weapon text DEFAULT NULL::text, _gender text DEFAULT NULL::text, _min_age integer DEFAULT NULL::integer, _max_age integer DEFAULT NULL::integer)
 RETURNS TABLE(ranking_position integer, athlete_id uuid, full_name text, elo_rating integer, peak_rating integer, matches_played integer, frequency_streak integer, frequency_multiplier numeric, last_activity_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH team_rankings AS (
    SELECT r.*, p.full_name, p.gender, p.birth_date
    FROM public.rankings r
    JOIN public.profiles p ON p.user_id = r.athlete_id
    WHERE (_gender IS NULL OR p.gender = _gender)
      AND (_min_age IS NULL OR date_part('year', age(current_date, p.birth_date)) >= _min_age)
      AND (_max_age IS NULL OR date_part('year', age(current_date, p.birth_date)) <= _max_age)
  ),
  ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (ORDER BY elo_rating DESC, matches_played DESC) as ranking_position
    FROM team_rankings
  )
  SELECT 
    ranking_position::INTEGER,
    athlete_id,
    full_name,
    elo_rating,
    peak_rating,
    matches_played,
    frequency_streak,
    frequency_multiplier,
    last_activity_date
  FROM ranked
  ORDER BY ranking_position;
$function$;

-- 4. Aggiorna register_bout_instructor
CREATE OR REPLACE FUNCTION public.register_bout_instructor(_athlete_a uuid, _athlete_b uuid, _bout_date date, _weapon text, _bout_type text, _score_a integer, _score_b integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _user_role text;
  _id uuid;
begin
  select role into _user_role 
  from public.profiles 
  where user_id = auth.uid();
  
  if _user_role is null then
    raise exception 'Profilo non trovato per utente';
  end if;
  
  if _user_role != 'istruttore' then
    raise exception 'Solo gli istruttori possono usare questa funzione';
  end if;

  if _weapon is not null and _weapon != '' and _weapon not in ('fioretto','spada','sciabola') then
    raise exception 'Arma non valida';
  end if;
  
  if _bout_type not in ('sparring','gara','bianco') then
    raise exception 'Tipo match non valido';
  end if;

  if not exists (select 1 from public.profiles where user_id = _athlete_a) then
    raise exception 'Atleta A non trovato';
  end if;
  
  if not exists (select 1 from public.profiles where user_id = _athlete_b) then
    raise exception 'Atleta B non trovato';
  end if;

  insert into public.bouts (
    bout_date, weapon, bout_type,
    athlete_a, athlete_b, score_a, score_b,
    status, created_by, approved_by, approved_at
  ) values (
    coalesce(_bout_date, current_date), 
    case when _weapon = '' then null else _weapon end, 
    _bout_type,
    _athlete_a, _athlete_b, _score_a, _score_b,
    'approved', auth.uid(), auth.uid(), now()
  )
  returning id into _id;

  return _id;
end;
$function$;

-- 5. Aggiorna register_bout
CREATE OR REPLACE FUNCTION public.register_bout(_opponent uuid, _bout_date date, _weapon text, _bout_type text, _my_score integer, _opp_score integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _id uuid;
begin
  if not exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'Profilo non trovato per utente';
  end if;

  if _weapon is not null and _weapon != '' and _weapon not in ('fioretto','spada','sciabola') then
    raise exception 'Arma non valida';
  end if;
  if _bout_type not in ('sparring','gara','bianco') then
    raise exception 'Tipo match non valido';
  end if;

  insert into public.bouts (
    bout_date, weapon, bout_type,
    athlete_a, athlete_b, score_a, score_b,
    status, created_by
  ) values (
    coalesce(_bout_date, current_date), 
    case when _weapon = '' then null else _weapon end, 
    _bout_type,
    auth.uid(), _opponent, _my_score, _opp_score,
    'pending', auth.uid()
  )
  returning id into _id;

  return _id;
end;
$function$;

-- 6. Aggiorna handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (user_id, full_name, birth_date, gender, email, role, shift)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
    coalesce((new.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
    coalesce(new.raw_user_meta_data ->> 'gender', 'M'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'allievo'),
    new.raw_user_meta_data ->> 'shift'
  );
  return new;
end;
$function$;