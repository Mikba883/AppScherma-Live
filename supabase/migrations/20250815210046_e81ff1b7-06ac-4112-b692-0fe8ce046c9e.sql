-- Fix RLS recursion properly with security definer function
-- First, create a security definer function to get current user's team
CREATE OR REPLACE FUNCTION public.get_current_user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Now drop the previous policy and create the correct one
DROP POLICY IF EXISTS "profiles_select_same_team_fixed" ON public.profiles;

-- Create the proper policy using the security definer function
CREATE POLICY "profiles_select_same_team_secure" 
ON public.profiles 
FOR SELECT 
USING (team_id = public.get_current_user_team_id());