-- Fase 1: Chiudi tutti i tornei in_progress vecchi di più di 1 ora
UPDATE tournaments 
SET status = 'cancelled' 
WHERE status = 'in_progress' 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Commento: Questa migration pulisce i tornei "fantasma" che sono rimasti in_progress
-- ma sono stati creati più di 1 ora fa. Questo previene il problema del ricaricamento
-- di tornei vecchi all'apertura della pagina.