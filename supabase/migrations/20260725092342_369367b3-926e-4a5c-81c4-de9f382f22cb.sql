
-- 1) profiles: revoke email column access from anon/authenticated
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (user_id, username, display_name, avatar, avatar_url, created_at, updated_at, name_changes, map_x, map_y, house_privacy, house_name, house_allow_list, coop_build) ON public.profiles TO authenticated;
GRANT SELECT (user_id, username, display_name, avatar, avatar_url, house_privacy, house_name) ON public.profiles TO anon;

-- 2) questions_bank: revoke answer columns from anon/authenticated
REVOKE SELECT ON public.questions_bank FROM anon, authenticated;
GRANT SELECT (id, text, choices, image_url, category, created_at, updated_at, reward, maps, enabled, priority, competency_level, competency_domain) ON public.questions_bank TO authenticated;

-- 3) presence: scope reads to self / friends / house owner
DROP POLICY IF EXISTS presence_select_all_auth ON public.presence;
CREATE POLICY presence_select_scoped ON public.presence
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR in_house_owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friends f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = presence.user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = presence.user_id)
        )
    )
  );

-- 4) storage.objects: restrict listing question-images to admins
DROP POLICY IF EXISTS qimg_public_select ON storage.objects;
CREATE POLICY qimg_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'::app_role));
