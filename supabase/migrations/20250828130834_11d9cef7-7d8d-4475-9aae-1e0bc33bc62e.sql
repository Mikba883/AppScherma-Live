-- Elimino le policy esistenti sul bucket gym-logos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

-- Ricreo le policy per il bucket gym-logos in modo corretto
CREATE POLICY "Anyone can view gym logos" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gym-logos');

CREATE POLICY "Authenticated users can upload gym logos" ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'gym-logos');

CREATE POLICY "Users can update their own gym logos" ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'gym-logos' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own gym logos" ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'gym-logos' AND auth.uid() = owner);