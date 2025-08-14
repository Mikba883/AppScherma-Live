-- Add email field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email TEXT;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
begin
  -- Insert into profiles with email from auth.users
  insert into public.profiles (user_id, team_id, full_name, birth_date, gender, email)
  values (
    new.id,
    (select id from public.teams where name = 'Fanfulla' limit 1),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
    coalesce((new.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
    coalesce(new.raw_user_meta_data ->> 'gender', 'M'),
    new.email
  );
  return new;
end;
$$;