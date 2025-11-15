-- Close all open tournaments by setting status to 'cancelled'
UPDATE public.tournaments 
SET status = 'cancelled' 
WHERE status = 'in_progress';