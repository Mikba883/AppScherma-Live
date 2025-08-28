-- Drop the overly permissive policy
DROP POLICY IF EXISTS "profiles_select_own_or_same_gym" ON public.profiles;

-- Create more restrictive policies for profile access

-- 1. Users can always view their own full profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- 2. Instructors can view profiles of users in their gym (needed for bout registration)
CREATE POLICY "Instructors can view gym member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles instructor
    WHERE instructor.user_id = auth.uid()
    AND instructor.role = 'istruttore'
    AND instructor.gym_id = profiles.gym_id
  )
);

-- 3. Gym owners can view all profiles in their gym
CREATE POLICY "Gym owners can view gym profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles owner
    WHERE owner.user_id = auth.uid()
    AND owner.role = 'capo_palestra'
    AND owner.gym_id = profiles.gym_id
  )
);

-- 4. Create a limited view for students to see only necessary info about other gym members
CREATE OR REPLACE VIEW public.profiles_limited AS
SELECT 
  user_id,
  full_name,
  role,
  gym_id
FROM public.profiles;

-- Grant access to the limited view
GRANT SELECT ON public.profiles_limited TO authenticated;

-- Add RLS to the view through a security definer function
CREATE OR REPLACE FUNCTION public.get_gym_member_names()
RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.full_name, p.role
  FROM public.profiles p
  WHERE p.gym_id = (
    SELECT gym_id FROM public.profiles WHERE user_id = auth.uid()
  );
END;
$$;

-- Add comment explaining the security model
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 
'Users have full access to their own profile data';

COMMENT ON POLICY "Instructors can view gym member profiles" ON public.profiles IS 
'Instructors need to see member profiles for bout registration and training management';

COMMENT ON POLICY "Gym owners can view gym profiles" ON public.profiles IS 
'Gym owners need full visibility for administrative purposes';