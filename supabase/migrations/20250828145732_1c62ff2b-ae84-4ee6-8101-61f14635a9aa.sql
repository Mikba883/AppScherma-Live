-- Fix RLS policies to ensure proper gym isolation

-- Update profiles RLS policy to handle NULL gym_id properly
DROP POLICY IF EXISTS "Users can view profiles from their gym" ON public.profiles;

CREATE POLICY "Users can view profiles from their gym" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR (
    gym_id IS NOT NULL 
    AND gym_id = get_current_user_gym_id()
    AND get_current_user_gym_id() IS NOT NULL
  )
);

-- Ensure rankings are properly isolated by gym
DROP POLICY IF EXISTS "Users can view rankings from their gym" ON public.rankings;

CREATE POLICY "Users can view rankings from their gym" 
ON public.rankings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = rankings.athlete_id 
    AND profiles.gym_id = get_current_user_gym_id()
    AND get_current_user_gym_id() IS NOT NULL
  )
);

-- Ensure activity logs are properly isolated
DROP POLICY IF EXISTS "Users can view activity logs from their gym" ON public.activity_logs;

CREATE POLICY "Users can view activity logs from their gym" 
ON public.activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = activity_logs.athlete_id 
    AND profiles.gym_id = get_current_user_gym_id()
    AND get_current_user_gym_id() IS NOT NULL
  )
);

-- Ensure notifications are properly isolated
DROP POLICY IF EXISTS "Users can view notifications from their gym" ON public.notifications;

CREATE POLICY "Users can view notifications from their gym" 
ON public.notifications 
FOR SELECT 
USING (
  athlete_id = auth.uid() 
  OR (
    gym_id IS NOT NULL 
    AND gym_id = get_current_user_gym_id()
    AND get_current_user_gym_id() IS NOT NULL
  )
);

-- Update bouts to ensure gym_id is always set
UPDATE public.bouts 
SET gym_id = (
  SELECT gym_id FROM profiles 
  WHERE profiles.user_id = bouts.created_by
)
WHERE gym_id IS NULL;

-- Add gym_id to rankings and activity_logs if missing
UPDATE public.rankings 
SET gym_id = (
  SELECT gym_id FROM profiles 
  WHERE profiles.user_id = rankings.athlete_id
)
WHERE gym_id IS NULL;

UPDATE public.activity_logs 
SET gym_id = (
  SELECT gym_id FROM profiles 
  WHERE profiles.user_id = activity_logs.athlete_id
)
WHERE gym_id IS NULL;