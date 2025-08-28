-- Fix the security definer view issue
-- The profiles_limited view needs to be recreated without SECURITY DEFINER

DROP VIEW IF EXISTS public.profiles_limited;

-- Recreate the view without SECURITY DEFINER (using SECURITY INVOKER by default)
CREATE VIEW public.profiles_limited AS
SELECT 
  user_id,
  full_name,
  role,
  gym_id
FROM public.profiles;