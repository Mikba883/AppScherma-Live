-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Instructors can view gym member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gym owners can view gym profiles" ON public.profiles;

-- Create a security definer function to get user's role and gym without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role_and_gym()
RETURNS TABLE(role text, gym_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT p.role, p.gym_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
END;
$$;

-- Now create non-recursive policies using the function

-- Policy for instructors to view gym members
CREATE POLICY "Instructors can view gym members" 
ON public.profiles 
FOR SELECT 
USING (
  profiles.gym_id IN (
    SELECT (get_user_role_and_gym()).gym_id 
    WHERE (get_user_role_and_gym()).role = 'istruttore'
  )
);

-- Policy for gym owners to view gym members
CREATE POLICY "Gym owners can view gym members" 
ON public.profiles 
FOR SELECT 
USING (
  profiles.gym_id IN (
    SELECT (get_user_role_and_gym()).gym_id 
    WHERE (get_user_role_and_gym()).role = 'capo_palestra'
  )
);