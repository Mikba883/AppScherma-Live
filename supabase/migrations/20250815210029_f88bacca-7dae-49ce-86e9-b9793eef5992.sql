-- Fix the recursive RLS policy issue for profiles table
-- Drop the existing problematic policy and create a new one
DROP POLICY IF EXISTS "profiles_select_same_team" ON public.profiles;

-- Create a new policy that doesn't cause recursion
CREATE POLICY "profiles_select_same_team_fixed" 
ON public.profiles 
FOR SELECT 
USING (
  team_id = (
    SELECT p.team_id 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid()
    LIMIT 1
  )
);