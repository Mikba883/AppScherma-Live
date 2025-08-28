-- Create gyms table
CREATE TABLE public.gyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_id UUID NOT NULL,
  shifts TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create gym_invitations table
CREATE TABLE public.gym_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('allievo', 'istruttore')),
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add gym_id to existing tables
ALTER TABLE public.profiles ADD COLUMN gym_id UUID REFERENCES public.gyms(id);
ALTER TABLE public.bouts ADD COLUMN gym_id UUID;
ALTER TABLE public.notifications ADD COLUMN gym_id UUID;
ALTER TABLE public.rankings ADD COLUMN gym_id UUID;
ALTER TABLE public.activity_logs ADD COLUMN gym_id UUID;

-- Update role enum to include capo_palestra
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('allievo', 'istruttore', 'capo_palestra'));

-- Create default gym for existing data
INSERT INTO public.gyms (id, name, owner_name, owner_email, owner_id, shifts)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Palestra Principale',
  'Admin',
  'admin@fanfulla.it',
  (SELECT user_id FROM public.profiles WHERE role = 'istruttore' LIMIT 1),
  ARRAY['mattina', 'pomeriggio', 'sera']
);

-- Migrate existing data to default gym
UPDATE public.profiles SET gym_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE gym_id IS NULL;
UPDATE public.bouts SET gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = bouts.athlete_a LIMIT 1) WHERE gym_id IS NULL;
UPDATE public.notifications SET gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = notifications.athlete_id LIMIT 1) WHERE gym_id IS NULL;
UPDATE public.rankings SET gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = rankings.athlete_id LIMIT 1) WHERE gym_id IS NULL;
UPDATE public.activity_logs SET gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = activity_logs.athlete_id LIMIT 1) WHERE gym_id IS NULL;

-- Enable RLS on new tables
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gyms
CREATE POLICY "Users can view their gym" ON public.gyms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.gym_id = gyms.id
    )
  );

CREATE POLICY "Gym owners can update their gym" ON public.gyms
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Anyone can create a gym" ON public.gyms
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- RLS Policies for gym_invitations
CREATE POLICY "Gym owners can create invitations" ON public.gym_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gyms 
      WHERE gyms.id = gym_invitations.gym_id 
      AND gyms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Gym owners can view their invitations" ON public.gym_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gyms 
      WHERE gyms.id = gym_invitations.gym_id 
      AND gyms.owner_id = auth.uid()
    ) OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Anyone can view invitation by token" ON public.gym_invitations
  FOR SELECT USING (true);

CREATE POLICY "Gym owners can update invitations" ON public.gym_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.gyms 
      WHERE gyms.id = gym_invitations.gym_id 
      AND gyms.owner_id = auth.uid()
    )
  );

-- Update existing RLS policies to filter by gym_id
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_same_gym" ON public.profiles
  FOR SELECT USING (
    gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "bouts_select_approved" ON public.bouts;
CREATE POLICY "bouts_select_approved_same_gym" ON public.bouts
  FOR SELECT USING (
    status = 'approved' 
    AND gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "bouts_select_involved" ON public.bouts;
CREATE POLICY "bouts_select_involved_same_gym" ON public.bouts
  FOR SELECT USING (
    ((athlete_a = auth.uid()) OR (athlete_b = auth.uid()) OR (created_by = auth.uid()))
    AND gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Update trigger for new users to include gym_id from invitation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  -- Check if user has an invitation
  SELECT * INTO _invitation
  FROM public.gym_invitations
  WHERE email = NEW.email
  AND status = 'pending'
  AND expires_at > now()
  LIMIT 1;

  IF _invitation.id IS NOT NULL THEN
    -- Create profile with gym_id from invitation
    INSERT INTO public.profiles (user_id, full_name, birth_date, gender, email, role, shift, gym_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
      COALESCE((NEW.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
      COALESCE(NEW.raw_user_meta_data ->> 'gender', 'M'),
      NEW.email,
      _invitation.role,
      NEW.raw_user_meta_data ->> 'shift',
      _invitation.gym_id
    );
    
    -- Mark invitation as accepted
    UPDATE public.gym_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = _invitation.id;
  ELSE
    -- Create profile without gym_id (will need to join a gym)
    INSERT INTO public.profiles (user_id, full_name, birth_date, gender, email, role, shift)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Nome da completare'),
      COALESCE((NEW.raw_user_meta_data ->> 'birth_date')::date, '2000-01-01'::date),
      COALESCE(NEW.raw_user_meta_data ->> 'gender', 'M'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'allievo'),
      NEW.raw_user_meta_data ->> 'shift'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create gym and make user the owner
CREATE OR REPLACE FUNCTION public.create_gym(
  _name TEXT,
  _logo_url TEXT,
  _owner_name TEXT,
  _owner_email TEXT,
  _shifts TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _gym_id UUID;
BEGIN
  -- Create the gym
  INSERT INTO public.gyms (name, logo_url, owner_name, owner_email, owner_id, shifts)
  VALUES (_name, _logo_url, _owner_name, _owner_email, auth.uid(), _shifts)
  RETURNING id INTO _gym_id;
  
  -- Update user profile to capo_palestra and assign to gym
  UPDATE public.profiles
  SET role = 'capo_palestra', gym_id = _gym_id
  WHERE user_id = auth.uid();
  
  RETURN _gym_id;
END;
$$;

-- Create storage bucket for gym logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('gym-logos', 'gym-logos', true)
ON CONFLICT DO NOTHING;

-- Storage policies for gym logos
CREATE POLICY "Anyone can view gym logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gym-logos');

CREATE POLICY "Gym owners can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'gym-logos' AND 
  EXISTS (
    SELECT 1 FROM public.gyms 
    WHERE gyms.owner_id = auth.uid()
  )
);

CREATE POLICY "Gym owners can update logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'gym-logos' AND 
  EXISTS (
    SELECT 1 FROM public.gyms 
    WHERE gyms.owner_id = auth.uid()
  )
);

CREATE POLICY "Gym owners can delete logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'gym-logos' AND 
  EXISTS (
    SELECT 1 FROM public.gyms 
    WHERE gyms.owner_id = auth.uid()
  )
);