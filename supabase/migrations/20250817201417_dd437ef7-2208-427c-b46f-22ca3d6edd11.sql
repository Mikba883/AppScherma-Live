-- Update roles to only allow 'allievo' and 'istruttore'
-- First, update existing roles
UPDATE public.profiles 
SET role = CASE 
  WHEN role IN ('athlete') THEN 'allievo'
  WHEN role IN ('coach', 'admin') THEN 'istruttore'
  ELSE 'allievo'
END;

-- Add constraint to only allow the new roles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('allievo', 'istruttore'));

-- Make shift column nullable (not required)
ALTER TABLE public.profiles 
ALTER COLUMN shift DROP NOT NULL;