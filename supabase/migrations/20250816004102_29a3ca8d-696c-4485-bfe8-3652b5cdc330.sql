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