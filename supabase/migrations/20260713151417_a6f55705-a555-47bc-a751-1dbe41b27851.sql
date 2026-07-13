
-- 1. Restrict email column on profiles: revoke from anon/authenticated.
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;
-- Owner can still read own email via public.get_my_email() (SECURITY DEFINER).
-- Admins read via SECURITY DEFINER RPCs when needed.

-- 2. Hide quiz answer columns from clients.
REVOKE SELECT (answer_index, correct_indexes) ON public.questions_bank FROM anon, authenticated;
-- Grading goes through public.grade_answer() and admin reads through public.admin_list_questions() /
-- public.admin_get_question(), both SECURITY DEFINER.

-- 3. Make the public read policy on question-images bucket explicit.
DROP POLICY IF EXISTS "qimg_public_select" ON storage.objects;
CREATE POLICY "qimg_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'question-images');
