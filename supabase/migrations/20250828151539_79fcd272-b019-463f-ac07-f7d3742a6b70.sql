-- Add RLS policy to allow viewing gym details with valid public links
CREATE POLICY "Anyone can view gym with valid public link" 
ON public.gyms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.gym_public_links 
    WHERE gym_public_links.gym_id = gyms.id 
    AND gym_public_links.is_active = true
  )
);