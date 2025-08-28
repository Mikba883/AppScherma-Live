-- Fix orphaned profiles without gym_id
-- First, let's check if there are any orphaned profiles
DO $$
DECLARE
  orphaned_count INTEGER;
  default_gym_id UUID;
BEGIN
  -- Count orphaned profiles
  SELECT COUNT(*) INTO orphaned_count
  FROM public.profiles
  WHERE gym_id IS NULL;
  
  IF orphaned_count > 0 THEN
    -- Check if there's an existing gym to use as default
    SELECT id INTO default_gym_id
    FROM public.gyms
    LIMIT 1;
    
    IF default_gym_id IS NOT NULL THEN
      -- Assign orphaned profiles to the first available gym
      UPDATE public.profiles
      SET gym_id = default_gym_id
      WHERE gym_id IS NULL;
      
      RAISE NOTICE 'Updated % orphaned profiles with gym_id %', orphaned_count, default_gym_id;
    ELSE
      -- If no gym exists, create a default one
      INSERT INTO public.gyms (
        name,
        owner_name,
        owner_email,
        owner_id,
        shifts
      ) VALUES (
        'Palestra Default',
        'Admin',
        'admin@example.com',
        (SELECT user_id FROM public.profiles WHERE role = 'capo_palestra' LIMIT 1),
        ARRAY['Mattina', 'Pomeriggio', 'Sera']
      ) RETURNING id INTO default_gym_id;
      
      -- Assign orphaned profiles to the new default gym
      UPDATE public.profiles
      SET gym_id = default_gym_id
      WHERE gym_id IS NULL;
      
      RAISE NOTICE 'Created default gym and updated % orphaned profiles', orphaned_count;
    END IF;
  END IF;
END $$;

-- Add constraint to prevent future orphaned profiles
-- Note: We're not making it NOT NULL yet to avoid breaking existing code
-- but we'll enforce this in the application layer