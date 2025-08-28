-- Prima elimino TUTTE le policy esistenti per gym-logos specificando nomi univoci
DO $$
BEGIN
  -- Elimina tutte le policy esistenti per il bucket gym-logos
  FOR i IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND definition LIKE '%gym-logos%'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', i.policyname);
  END LOOP;
END $$;

-- Ora creo le policy con nomi univoci per gym-logos
CREATE POLICY "gym_logos_select_policy" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gym-logos');

CREATE POLICY "gym_logos_insert_policy" ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'gym-logos');

CREATE POLICY "gym_logos_update_policy" ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'gym-logos' AND auth.uid() = owner);

CREATE POLICY "gym_logos_delete_policy" ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'gym-logos' AND auth.uid() = owner);