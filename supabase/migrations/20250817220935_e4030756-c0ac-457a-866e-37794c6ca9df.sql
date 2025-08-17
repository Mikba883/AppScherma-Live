-- Aggiorna il ruolo dell'utente corrente per test
UPDATE public.profiles 
SET role = 'istruttore' 
WHERE email = 'kereajder@gmail.com';