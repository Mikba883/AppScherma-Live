-- Fix security issues for functions

-- Update all functions to use explicit search_path
CREATE OR REPLACE FUNCTION public.get_current_user_gym_id()
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT gym_id FROM public.profiles WHERE user_id = auth.uid() AND gym_id IS NOT NULL LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_gym_id()
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT gym_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$function$;