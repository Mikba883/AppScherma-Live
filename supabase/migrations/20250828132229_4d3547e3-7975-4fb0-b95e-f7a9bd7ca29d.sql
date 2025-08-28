-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Instructors can view gym member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gym owners can view gym profiles" ON public.profiles;
DROP POLICY IF EXISTS "Instructors can view gym members" ON public.profiles;
DROP POLICY IF EXISTS "Gym owners can view gym members" ON public.profiles;

-- Create a simpler security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_gym_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT gym_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Now create non-recursive policies

-- Policy for instructors to view gym members
CREATE POLICY "Instructors can view gym members" 
ON public.profiles 
FOR SELECT 
USING (
  get_current_user_role() = 'istruttore' 
  AND profiles.gym_id = get_current_user_gym_id()
);

-- Policy for gym owners to view gym members
CREATE POLICY "Gym owners can view gym members" 
ON public.profiles 
FOR SELECT 
USING (
  get_current_user_role() = 'capo_palestra' 
  AND profiles.gym_id = get_current_user_gym_id()
);