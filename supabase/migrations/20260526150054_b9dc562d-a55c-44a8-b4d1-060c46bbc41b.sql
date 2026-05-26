INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('question-images','question-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public=true, file_size_limit=5242880, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "qimg_public_read" ON storage.objects;
DROP POLICY IF EXISTS "qimg_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "qimg_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "qimg_admin_delete" ON storage.objects;

CREATE POLICY "qimg_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

CREATE POLICY "qimg_admin_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "qimg_admin_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "qimg_admin_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));