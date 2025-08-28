-- Fix security warning for function search path
CREATE OR REPLACE FUNCTION public.get_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Verifica che il bucket gym-logos abbia le policy corrette
-- Prima elimino le policy esistenti se ci sono
DELETE FROM storage.policies WHERE bucket_id = 'gym-logos';

-- Ricreo le policy per il bucket gym-logos
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'gym-logos');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gym-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'gym-logos' AND auth.uid() = owner) WITH CHECK (bucket_id = 'gym-logos');
CREATE POLICY "Users can delete their own uploads" ON storage.objects FOR DELETE USING (bucket_id = 'gym-logos' AND auth.uid() = owner);