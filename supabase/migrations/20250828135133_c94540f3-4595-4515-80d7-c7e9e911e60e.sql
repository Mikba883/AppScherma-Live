-- Fix infinite recursion in profiles RLS policies

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles from their gym" ON public.profiles;

-- Create a new policy that avoids recursion by using the existing function
CREATE POLICY "Users can view profiles from their gym" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR gym_id = public.get_current_user_gym_id()
);

-- Also check and fix similar policies on other tables if needed

-- Fix bouts table policy
DROP POLICY IF EXISTS "Users can view bouts from their gym only" ON public.bouts;
CREATE POLICY "Users can view bouts from their gym only" 
ON public.bouts 
FOR SELECT 
USING (gym_id = public.get_current_user_gym_id());

-- Fix rankings table policy  
DROP POLICY IF EXISTS "Users can view rankings from their gym" ON public.rankings;
CREATE POLICY "Users can view rankings from their gym" 
ON public.rankings 
FOR SELECT 
USING (gym_id = public.get_current_user_gym_id());

-- Fix activity_logs table policy
DROP POLICY IF EXISTS "Users can view activity logs from their gym" ON public.activity_logs;
CREATE POLICY "Users can view activity logs from their gym" 
ON public.activity_logs 
FOR SELECT 
USING (gym_id = public.get_current_user_gym_id());

-- Fix notifications table policy
DROP POLICY IF EXISTS "Users can view notifications from their gym" ON public.notifications;
CREATE POLICY "Users can view notifications from their gym" 
ON public.notifications 
FOR SELECT 
USING (
  athlete_id = auth.uid() 
  OR gym_id = public.get_current_user_gym_id()
);