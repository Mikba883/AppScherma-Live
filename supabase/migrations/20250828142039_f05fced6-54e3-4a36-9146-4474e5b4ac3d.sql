-- Create table for public gym join links
CREATE TABLE public.gym_public_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  uses_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.gym_public_links ENABLE ROW LEVEL SECURITY;

-- Policies for gym_public_links
CREATE POLICY "Gym owners can manage their public links" 
ON public.gym_public_links 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gyms 
  WHERE gyms.id = gym_public_links.gym_id 
  AND gyms.owner_id = auth.uid()
));

CREATE POLICY "Anyone can view active public links by token" 
ON public.gym_public_links 
FOR SELECT 
USING (is_active = true);

-- Create indexes
CREATE INDEX idx_gym_public_links_token ON public.gym_public_links(token);
CREATE INDEX idx_gym_public_links_gym_id ON public.gym_public_links(gym_id);