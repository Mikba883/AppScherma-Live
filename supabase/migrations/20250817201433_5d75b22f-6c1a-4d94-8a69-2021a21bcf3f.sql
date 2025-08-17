-- Check existing data first
SELECT DISTINCT role FROM public.profiles;

-- Update roles step by step
UPDATE public.profiles 
SET role = 'allievo' 
WHERE role = 'athlete';

UPDATE public.profiles 
SET role = 'istruttore' 
WHERE role IN ('coach', 'admin');

-- Make shift column nullable (not required)
ALTER TABLE public.profiles 
ALTER COLUMN shift DROP NOT NULL;