-- Fix 1: Add phase_transition_lock to tournaments table to prevent duplicate matches
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS phase_transition_lock boolean NOT NULL DEFAULT false;

-- Fix 5: Make athlete_b nullable in bouts table to support BYE matches
ALTER TABLE public.bouts 
ALTER COLUMN athlete_b DROP NOT NULL;