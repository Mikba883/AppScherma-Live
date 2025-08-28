-- Fix RLS policies to properly filter by gym
-- Ensure matches without gym_id are not visible to anyone

-- Drop and recreate the bouts policy to ensure only gym matches are visible
DROP POLICY IF EXISTS "Users can view bouts from their gym only" ON public.bouts;

CREATE POLICY "Users can view bouts from their gym only" 
ON public.bouts 
FOR SELECT 
USING (
  gym_id IS NOT NULL 
  AND gym_id = public.get_current_user_gym_id()
);

-- Update the function to properly handle NULL gym_id
CREATE OR REPLACE FUNCTION public.get_current_user_gym_id()
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER
AS $function$
  SELECT gym_id FROM public.profiles WHERE user_id = auth.uid() AND gym_id IS NOT NULL LIMIT 1;
$function$;