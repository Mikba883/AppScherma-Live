-- Estensioni utili
create extension if not exists "uuid-ossp";

-- ========= TEAMS =========
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamp with time zone default now()
);

-- Seed team Fanfulla
insert into public.teams (name) values ('Fanfulla')
on conflict (name) do nothing;

-- ========= PROFILES =========
-- 1:1 con auth.users (user_id = auth.uid)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  full_name text not null,
  birth_date date not null,
  gender text not null check (gender in ('M','F','X')),
  photo_url text,
  role text not null default 'athlete' check (role in ('athlete','coach','admin')),
  created_at timestamp with time zone default now()
);

-- ========= BOUTS (match/assalti) =========
create table if not exists public.bouts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  bout_date date not null,
  weapon text not null check (weapon in ('fioretto','spada','sciabola')),
  bout_type text not null default 'sparring' check (bout_type in ('sparring','gara','bianco')),
  athlete_a uuid not null references public.profiles(user_id) on delete restrict,
  athlete_b uuid not null references public.profiles(user_id) on delete restrict,
  score_a int not null check (score_a >= 0),
  score_b int not null check (score_b >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  created_at timestamp with time zone default now(),
  approved_by uuid references public.profiles(user_id),
  approved_at timestamp with time zone,
  rejected_by uuid references public.profiles(user_id),
  rejected_at timestamp with time zone,
  notes text
);

create index if not exists idx_bouts_team_date on public.bouts(team_id, bout_date);
create index if not exists idx_bouts_status on public.bouts(status);
create index if not exists idx_bouts_athletes on public.bouts(athlete_a, athlete_b);

-- ========= VIEW: pending per me =========
create or replace view public.my_pending_bouts as
select b.*
from public.bouts b
where b.status = 'pending' and b.athlete_b = auth.uid();

-- ========= ROW LEVEL SECURITY =========
alter table public.profiles enable row level security;
alter table public.bouts enable row level security;
alter table public.teams enable row level security;

-- TEAMS: visibili ai membri del team
create policy "teams_select_same_team"
on public.teams for select
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.team_id = teams.id
  )
);

-- PROFILES
create policy "profiles_select_same_team"
on public.profiles for select
using (
  team_id = (select team_id from public.profiles where user_id = auth.uid())
);

create policy "profiles_insert_self"
on public.profiles for insert
with check (user_id = auth.uid());

create policy "profiles_update_self"
on public.profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- BOUTS: regole di lettura
-- 1) Tutti gli approved del mio team sono visibili
create policy "bouts_select_approved_team"
on public.bouts for select
using (
  status = 'approved'
  and team_id = (select team_id from public.profiles where user_id = auth.uid())
);

-- 2) Inoltre, posso vedere match dove sono coinvolto (anche pending)
create policy "bouts_select_involved"
on public.bouts for select
using (
  team_id = (select team_id from public.profiles where user_id = auth.uid())
  and (athlete_a = auth.uid() or athlete_b = auth.uid() or created_by = auth.uid())
);

-- INSERT: chiunque del team può inserire DA coinvolto
create policy "bouts_insert_involved"
on public.bouts for insert
with check (
  team_id = (select team_id from public.profiles where user_id = auth.uid())
  and (athlete_a = auth.uid() or athlete_b = auth.uid())
  and created_by = auth.uid()
);

-- UPDATE: approva/rifiuta
-- L'avversario (athlete_b) o un coach/admin del team può aggiornare PENDING
create policy "bouts_update_approve"
on public.bouts for update
using (
  team_id = (select team_id from public.profiles where user_id = auth.uid())
  and status = 'pending'
  and (
    athlete_b = auth.uid()
    or (select role from public.profiles where user_id = auth.uid()) in ('coach','admin')
  )
)
with check (true);

-- ========= TRIGGER PER AUTO-CREAZIONE PROFILO =========
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Inserisci automaticamente nel team Fanfulla
  insert into public.profiles (user_id, team_id, full_name, birth_date, gender)
  values (
    new.id,
    (select id from public.teams where name = 'Fanfulla' limit 1),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
    coalesce((new.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
    coalesce(new.raw_user_meta_data ->> 'gender', 'M')
  );
  return new;
end;
$$;

-- trigger per auto-creazione profilo al signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========= RPC FUNCTIONS =========

-- a) Registra match
create or replace function public.register_bout(
  _opponent uuid,
  _bout_date date,
  _weapon text,
  _bout_type text,
  _my_score int,
  _opp_score int
) returns uuid
language plpgsql security definer
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

-- b) Approva / rifiuta match
create or replace function public.decide_bout(
  _bout_id uuid,
  _decision text  -- 'approve' | 'reject'
) returns void
language plpgsql security definer
as $$
declare
  _is_b boolean;
begin
  -- Solo l'atleta B o coach/admin del team
  select (athlete_b = auth.uid()) into _is_b
  from public.bouts where id = _bout_id and status = 'pending';

  if not _is_b then
    -- se non è B, può essere coach/admin del team?
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

-- c) Consultazione: lista completa (con filtri)
create or replace function public.list_bouts(
  _from date default null,
  _to date default null,
  _gender text default null,      -- 'M','F','X' o null
  _min_age int default null,
  _max_age int default null,
  _weapon text default null,      -- 'fioretto','spada','sciabola' o null
  _athletes uuid[] default null   -- elenco user_id; null = tutti
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
language sql security definer
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
    -- filtro genere/età applicato se almeno uno dei due atleti rispetta i criteri
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

-- d) Consultazione: riassunto per atleta (con filtri)
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
  trainings int,            -- date distinte
  wins int,
  win_rate numeric,         -- 0..1
  avg_point_diff numeric,   -- media (punti_fatti - punti_subiti)
  last_training date
)
language sql security definer
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
  -- normalizzo in righe per atleta
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