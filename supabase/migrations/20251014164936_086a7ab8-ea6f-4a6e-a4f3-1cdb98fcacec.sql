-- Attiva Realtime sulla tabella tournaments
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;

-- Aggiungi la tabella alla pubblicazione realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;