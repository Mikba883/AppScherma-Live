-- Make score_a and score_b nullable for tournament matches that haven't been played yet
ALTER TABLE public.bouts 
  ALTER COLUMN score_a DROP NOT NULL,
  ALTER COLUMN score_b DROP NOT NULL;