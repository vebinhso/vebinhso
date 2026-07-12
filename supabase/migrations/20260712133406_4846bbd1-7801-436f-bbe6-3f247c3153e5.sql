
-- 1) questions_bank: hide answer columns from clients
REVOKE SELECT (answer_index, correct_indexes) ON public.questions_bank FROM authenticated;
REVOKE SELECT (answer_index, correct_indexes) ON public.questions_bank FROM anon;

-- 2) profiles: hide email from other users
REVOKE SELECT (email) ON public.profiles FROM authenticated;
REVOKE SELECT (email) ON public.profiles FROM anon;
-- Owner-only read of own email via dedicated RPC
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

-- 3) realtime.messages: replace substring policy with exact UUID-segment match
DROP POLICY IF EXISTS realtime_participants_only ON realtime.messages;
CREATE POLICY realtime_participants_only ON realtime.messages
FOR SELECT TO authenticated
USING (
  (
    (regexp_match(topic, '^(?:messages|typing)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'))[1] = auth.uid()::text
    OR
    (regexp_match(topic, '^(?:messages|typing)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'))[2] = auth.uid()::text
    OR topic = 'online-users'
  )
);

-- 4) avatars bucket: allow each user to delete only their own avatar files
CREATE POLICY "avatar delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
