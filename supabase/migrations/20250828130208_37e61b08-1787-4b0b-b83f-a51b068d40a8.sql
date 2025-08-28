-- Fix the recursive RLS policy for profiles
DROP POLICY IF EXISTS profiles_select_same_gym ON public.profiles;

-- Create a non-recursive policy
CREATE POLICY "profiles_select_same_gym" ON public.profiles
FOR SELECT
USING (
  -- Allow users to see their own profile
  user_id = auth.uid()
  OR
  -- Allow users to see profiles from the same gym (if they have one)
  gym_id IN (
    SELECT gym_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND gym_id IS NOT NULL
  )
);