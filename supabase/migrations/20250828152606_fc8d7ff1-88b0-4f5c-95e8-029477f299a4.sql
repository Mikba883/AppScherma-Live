-- Create a security definer function to check if a gym has an active public link
CREATE OR REPLACE FUNCTION public.gym_has_active_public_link(_gym_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gym_public_links
    WHERE gym_id = _gym_id
    AND is_active = true
  );
$$;

-- Add RLS policy to allow viewing gyms with active public links
CREATE POLICY "View gyms with active public links" 
ON public.gyms 
FOR SELECT 
USING (public.gym_has_active_public_link(id));