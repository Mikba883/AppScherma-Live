-- Ristrutturazione completa database: rimozione teams e semplificazione profiles
-- Step 1: Rimuovi prima tutte le policy che dipendono da team_id

-- Rimuovi tutte le policy RLS esistenti che dipendono da team_id
DROP POLICY IF EXISTS "teams_select_same_team" ON public.teams;
DROP POLICY IF EXISTS "bouts_select_approved_team" ON public.bouts;
DROP POLICY IF EXISTS "bouts_select_involved" ON public.bouts;
DROP POLICY IF EXISTS "bouts_update_approve" ON public.bouts;
DROP POLICY IF EXISTS "profiles_select_same_team_secure" ON public.profiles;
DROP POLICY IF EXISTS "rankings_select_same_team" ON public.rankings;
DROP POLICY IF EXISTS "activity_logs_select_same_team" ON public.activity_logs;
DROP POLICY IF EXISTS "bouts_insert_involved" ON public.bouts;

-- Rimuovi la funzione get_current_user_team_id (non più necessaria)
DROP FUNCTION IF EXISTS public.get_current_user_team_id() CASCADE;

-- Rimuovi le colonne team_id e photo_url dalla tabella profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS team_id CASCADE,
DROP COLUMN IF EXISTS photo_url CASCADE;

-- Rimuovi la colonna team_id dalla tabella bouts
ALTER TABLE public.bouts DROP COLUMN IF EXISTS team_id CASCADE;

-- Elimina la tabella teams (non più necessaria)
DROP TABLE IF EXISTS public.teams CASCADE;

-- Crea le nuove policy RLS semplificate

-- Policy per profiles
CREATE POLICY "profiles_select_all" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- Policy per bouts
CREATE POLICY "bouts_select_approved" ON public.bouts
FOR SELECT TO authenticated
USING (status = 'approved');

CREATE POLICY "bouts_select_involved" ON public.bouts
FOR SELECT TO authenticated
USING (athlete_a = auth.uid() OR athlete_b = auth.uid() OR created_by = auth.uid());

CREATE POLICY "bouts_insert_own" ON public.bouts
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (athlete_a = auth.uid() OR athlete_b = auth.uid()));

CREATE POLICY "bouts_update_approve" ON public.bouts
FOR UPDATE TO authenticated
USING (status = 'pending' AND (athlete_b = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'istruttore')))
WITH CHECK (true);

-- Policy per rankings
CREATE POLICY "rankings_select_all" ON public.rankings
FOR SELECT TO authenticated
USING (true);

-- Policy per activity_logs
CREATE POLICY "activity_logs_select_all" ON public.activity_logs
FOR SELECT TO authenticated
USING (true);