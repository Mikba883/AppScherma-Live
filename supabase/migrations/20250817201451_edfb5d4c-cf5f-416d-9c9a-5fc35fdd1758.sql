-- First, drop the existing role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Update roles step by step
UPDATE public.profiles 
SET role = 'allievo' 
WHERE role = 'athlete';

UPDATE public.profiles 
SET role = 'istruttore' 
WHERE role IN ('coach', 'admin');

-- Add the new constraint for only allievo and istruttore
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('allievo', 'istruttore'));

-- Make shift column nullable (not required)
ALTER TABLE public.profiles 
ALTER COLUMN shift DROP NOT NULL;