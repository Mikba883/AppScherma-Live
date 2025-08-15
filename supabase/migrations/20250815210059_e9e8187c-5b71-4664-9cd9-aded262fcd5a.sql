-- Fix the search_path issue in the security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_team_id()
RETURNS UUID 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT team_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;