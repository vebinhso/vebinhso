CREATE POLICY "classroom read authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'classroom');
CREATE POLICY "classroom upload authenticated" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'classroom' AND owner = auth.uid());
CREATE POLICY "classroom delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'classroom' AND owner = auth.uid());