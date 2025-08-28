-- Remove the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Anyone can view gym with valid public link" ON public.gyms;