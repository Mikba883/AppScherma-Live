-- Step 2: Crea ranking per Tommaso1 se non esiste
INSERT INTO rankings (athlete_id, gym_id, elo_rating, matches_played)
VALUES (
  'a1fe0a8a-0f82-43c1-892d-56d450369200',
  'f84bb64e-42d1-4985-868f-7da03c75d1e3',
  1200,
  0
)
ON CONFLICT (athlete_id) DO NOTHING;

-- Step 3: Cancella tornei incompleti di oggi creati da Tommaso1
DELETE FROM bouts 
WHERE tournament_id IN (
  SELECT id FROM tournaments 
  WHERE created_by = 'a1fe0a8a-0f82-43c1-892d-56d450369200'
    AND tournament_date = '2025-10-16'
    AND status = 'in_progress'
);

DELETE FROM tournaments 
WHERE created_by = 'a1fe0a8a-0f82-43c1-892d-56d450369200'
  AND tournament_date = '2025-10-16'
  AND status = 'in_progress';

-- Step 5: Assegna shift di default agli atleti senza shift nella palestra Fanfulla
UPDATE profiles 
SET shift = 'sera'
WHERE gym_id = 'f84bb64e-42d1-4985-868f-7da03c75d1e3'
  AND (shift IS NULL OR shift = '');