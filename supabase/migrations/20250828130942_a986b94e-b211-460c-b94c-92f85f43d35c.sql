-- Elimino le policy esistenti una per una con nomi specifici
DROP POLICY IF EXISTS "Anyone can view gym logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload gym logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own gym logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own gym logos" ON storage.objects;
DROP POLICY IF EXISTS "gym_logos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "gym_logos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "gym_logos_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "gym_logos_delete_policy" ON storage.objects;

-- Creo una policy generale per permettere upload pubblici per il momento
CREATE POLICY "Allow public uploads to gym logos" ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gym-logos');

CREATE POLICY "Allow public to view gym logos" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gym-logos');

CREATE POLICY "Allow public to update gym logos" ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'gym-logos');

CREATE POLICY "Allow public to delete gym logos" ON storage.objects 
FOR DELETE 
USING (bucket_id = 'gym-logos');