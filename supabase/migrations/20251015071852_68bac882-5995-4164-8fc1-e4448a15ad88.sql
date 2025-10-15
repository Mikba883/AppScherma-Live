-- Pulizia del torneo fantasma che continua a ricomparire
-- Cancella tutti i bouts del torneo residuo
UPDATE bouts
SET status = 'cancelled'
WHERE tournament_id = 'be7e32a8-c5b6-4265-b81a-712a9dab5a1a'
  AND status != 'cancelled';

-- Cancella il torneo residuo
UPDATE tournaments
SET status = 'cancelled'
WHERE id = 'be7e32a8-c5b6-4265-b81a-712a9dab5a1a'
  AND status != 'cancelled';