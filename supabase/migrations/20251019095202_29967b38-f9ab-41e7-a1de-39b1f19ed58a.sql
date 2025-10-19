-- Delete all 'info' type notifications related to tournament matches
-- These are unnecessary notifications that were created before our fixes
DELETE FROM public.notifications
WHERE type = 'info'
  AND related_bout_id IN (
    SELECT id FROM public.bouts WHERE tournament_id IS NOT NULL
  );