-- Rimuovo le policy esistenti per il bucket gym-logos usando la sintassi corretta
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

-- Ricreo le policy per il bucket gym-logos
CREATE POLICY "gym_logos_public_access" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gym-logos');

CREATE POLICY "gym_logos_authenticated_upload" ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'gym-logos');

CREATE POLICY "gym_logos_owner_update" ON storage.objects 
FOR UPDATE
TO authenticated
USING (bucket_id = 'gym-logos' AND auth.uid() = owner) 
WITH CHECK (bucket_id = 'gym-logos');

CREATE POLICY "gym_logos_owner_delete" ON storage.objects 
FOR DELETE
TO authenticated
USING (bucket_id = 'gym-logos' AND auth.uid() = owner);