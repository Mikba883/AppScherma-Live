-- Fix weapon CHECK constraint to allow NULL values
ALTER TABLE public.bouts DROP CONSTRAINT IF EXISTS bouts_weapon_check;

-- Add new constraint that allows NULL
ALTER TABLE public.bouts ADD CONSTRAINT bouts_weapon_check 
  CHECK (weapon IS NULL OR weapon IN ('fioretto', 'spada', 'sciabola'));