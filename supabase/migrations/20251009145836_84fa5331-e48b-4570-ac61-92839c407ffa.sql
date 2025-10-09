-- Remove unused and insecure profiles_limited view
-- This view has no RLS and exposes user data without proper access control

DROP VIEW IF EXISTS public.profiles_limited CASCADE;

-- Add comment explaining the removal
COMMENT ON TABLE public.profiles IS 
'User profiles with RLS enabled. Use this table directly with proper RLS policies instead of views.';