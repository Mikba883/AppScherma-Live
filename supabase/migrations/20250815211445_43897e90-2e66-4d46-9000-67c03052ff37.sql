-- Fix register_bout function - change from STABLE to VOLATILE to allow INSERT
CREATE OR REPLACE FUNCTION public.register_bout(_opponent uuid, _bout_date date, _weapon text, _bout_type text, _my_score integer, _opp_score integer)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
declare
  _team uuid;
  _id uuid;
begin
  select team_id into _team from public.profiles where user_id = auth.uid();
  if _team is null then
    raise exception 'Profilo non trovato per utente';
  end if;

  -- Allow weapon to be NULL or empty, but validate if provided
  if _weapon is not null and _weapon != '' and _weapon not in ('fioretto','spada','sciabola') then
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
    _team, coalesce(_bout_date, current_date), 
    case when _weapon = '' then null else _weapon end, 
    _bout_type,
    auth.uid(), _opponent, _my_score, _opp_score,
    'pending', auth.uid()
  )
  returning id into _id;

  return _id;
end;
$$;