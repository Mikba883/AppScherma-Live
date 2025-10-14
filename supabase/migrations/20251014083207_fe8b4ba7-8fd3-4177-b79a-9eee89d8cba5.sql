-- Fix 2: Improve bouts INSERT RLS policy to use get_current_user_gym_id() function
DROP POLICY IF EXISTS "Users can insert bouts in their gym" ON public.bouts;

CREATE POLICY "Users can insert bouts in their gym" 
ON public.bouts FOR INSERT 
WITH CHECK (
  gym_id = public.get_current_user_gym_id()
  AND gym_id IS NOT NULL
  AND (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'istruttore'::app_role) 
    OR has_role(auth.uid(), 'capo_palestra'::app_role)
  )
);