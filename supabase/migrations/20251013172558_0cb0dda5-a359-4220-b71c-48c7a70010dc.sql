-- Policy per permettere di aggiornare lo status dei propri tornei
CREATE POLICY "Users can update their tournament status"
ON tournaments
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Script one-time per chiudere i tornei vecchi rimasti in 'in_progress'
UPDATE tournaments 
SET status = 'cancelled'
WHERE status = 'in_progress' 
  AND created_at < (NOW() - INTERVAL '24 hours');