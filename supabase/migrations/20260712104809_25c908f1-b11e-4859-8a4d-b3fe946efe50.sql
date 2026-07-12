
-- 1) friends: only recipient can accept/update status
DROP POLICY IF EXISTS friends_update_involved ON public.friends;
CREATE POLICY friends_update_recipient ON public.friends
  FOR UPDATE TO authenticated
  USING (auth.uid() = friend_id)
  WITH CHECK (auth.uid() = friend_id);

-- 2) game_state: restrict SELECT to owner + admin
DROP POLICY IF EXISTS gs_select_all_auth ON public.game_state;
CREATE POLICY gs_select_own ON public.game_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Public-safe leaderboard view (no money/banned/streak columns)
CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT gs.user_id, gs.net_worth, gs.level, gs.correct_answers,
       p.username, p.display_name, p.avatar_url
FROM public.game_state gs
JOIN public.profiles p ON p.user_id = gs.user_id
WHERE gs.banned = false;
GRANT SELECT ON public.leaderboard TO anon, authenticated;

-- 3) profiles.email: hide via column-level grants
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (user_id, username, display_name, avatar, avatar_url, created_at, updated_at, name_changes)
  ON public.profiles TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- 4) questions_bank: hide answer_index & correct_indexes columns
REVOKE SELECT ON public.questions_bank FROM authenticated, anon;
GRANT SELECT (id, text, choices, category, image_url, priority, enabled, maps, reward, created_at, updated_at)
  ON public.questions_bank TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions_bank TO authenticated; -- RLS still restricts writes to admin

-- Server-side grading function
CREATE OR REPLACE FUNCTION public.grade_answer(qid uuid, selected int)
RETURNS TABLE(is_correct boolean, correct_indexes int[], reward int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ci int[];
  ai int;
  rw int;
BEGIN
  SELECT
    COALESCE(
      (SELECT array_agg((v)::int) FROM jsonb_array_elements_text(q.correct_indexes) v),
      ARRAY[q.answer_index]
    ),
    q.answer_index,
    q.reward
  INTO ci, ai, rw
  FROM public.questions_bank q WHERE q.id = qid;

  IF ci IS NULL THEN
    RETURN QUERY SELECT false, ARRAY[]::int[], 0;
    RETURN;
  END IF;
  RETURN QUERY SELECT (selected = ANY(ci)), ci, rw;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grade_answer(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grade_answer(uuid, int) TO authenticated;

-- Server-side function to fetch questions with answers, admin only
CREATE OR REPLACE FUNCTION public.admin_list_questions()
RETURNS SETOF public.questions_bank
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.questions_bank ORDER BY created_at ASC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_questions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_questions() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_question(qid uuid)
RETURNS public.questions_bank
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.questions_bank;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO r FROM public.questions_bank WHERE id = qid;
  RETURN r;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_question(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_question(uuid) TO authenticated;

-- 5) storage: remove broad public SELECT policies to stop listing
DROP POLICY IF EXISTS "avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "qimg_public_read" ON storage.objects;
-- Public files remain accessible via /storage/v1/object/public/<bucket>/<path>

-- 6) has_role: revoke EXECUTE from anon/authenticated; RLS policy expressions
--    continue to work because they run under the table owner's context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- 7) realtime.messages: restrict channel subscriptions to participants
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "realtime_participants_only" ON realtime.messages;
CREATE POLICY "realtime_participants_only" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic = 'online-users'
    OR (topic LIKE 'messages-%' AND position((auth.uid())::text IN topic) > 0)
    OR (topic LIKE 'typing-%'    AND position((auth.uid())::text IN topic) > 0)
  );
