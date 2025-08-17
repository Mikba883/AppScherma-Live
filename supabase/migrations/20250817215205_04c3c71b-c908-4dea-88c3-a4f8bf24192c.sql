-- Fix security warning by setting immutable search path
DROP FUNCTION IF EXISTS public.register_bout_instructor;

CREATE OR REPLACE FUNCTION public.register_bout_instructor(
  _athlete_a uuid,
  _athlete_b uuid, 
  _bout_date date, 
  _weapon text, 
  _bout_type text, 
  _score_a integer, 
  _score_b integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare
  _team uuid;
  _user_role text;
  _id uuid;
begin
  -- Get user's team and role
  select team_id, role into _team, _user_role 
  from public.profiles 
  where user_id = auth.uid();
  
  if _team is null then
    raise exception 'Profilo non trovato per utente';
  end if;
  
  -- Verify user is instructor
  if _user_role != 'istruttore' then
    raise exception 'Solo gli istruttori possono usare questa funzione';
  end if;

  -- Validate weapon if provided
  if _weapon is not null and _weapon != '' and _weapon not in ('fioretto','spada','sciabola') then
    raise exception 'Arma non valida';
  end if;
  
  if _bout_type not in ('sparring','gara','bianco') then
    raise exception 'Tipo match non valido';
  end if;

  -- Verify both athletes are in the same team
  if not exists (
    select 1 from public.profiles 
    where user_id = _athlete_a and team_id = _team
  ) then
    raise exception 'Atleta A non appartiene al team';
  end if;
  
  if not exists (
    select 1 from public.profiles 
    where user_id = _athlete_b and team_id = _team
  ) then
    raise exception 'Atleta B non appartiene al team';
  end if;

  -- Insert bout with approved status
  insert into public.bouts (
    team_id, bout_date, weapon, bout_type,
    athlete_a, athlete_b, score_a, score_b,
    status, created_by, approved_by, approved_at
  ) values (
    _team, coalesce(_bout_date, current_date), 
    case when _weapon = '' then null else _weapon end, 
    _bout_type,
    _athlete_a, _athlete_b, _score_a, _score_b,
    'approved', auth.uid(), auth.uid(), now()
  )
  returning id into _id;

  return _id;
end;
$function$