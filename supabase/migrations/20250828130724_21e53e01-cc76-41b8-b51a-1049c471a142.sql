-- Prima elimino TUTTE le policy esistenti sulla tabella profiles per essere sicuro
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
DROP POLICY IF EXISTS profiles_select_same_gym ON public.profiles;

-- Creo una funzione helper per evitare ricorsione
CREATE OR REPLACE FUNCTION public.get_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Ora ricreo le policy usando la funzione helper
CREATE POLICY "profiles_select_own_or_same_gym" ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR 
  gym_id = public.get_user_gym_id()
);

CREATE POLICY "profiles_insert_self" ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());