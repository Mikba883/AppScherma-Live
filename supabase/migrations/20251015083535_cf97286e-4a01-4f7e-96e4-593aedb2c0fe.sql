-- Add round_number column to bouts table for tournament round organization
ALTER TABLE public.bouts ADD COLUMN round_number INTEGER;

-- Add index for better query performance
CREATE INDEX idx_bouts_round_number ON public.bouts(tournament_id, round_number) WHERE tournament_id IS NOT NULL;