
-- Trigger-only functions: revoke from PUBLIC and app roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Admin-gated definer functions: no anon
REVOKE ALL ON FUNCTION public.admin_list_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_questions() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_question(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_question(uuid) TO authenticated;

-- Player-facing RPCs: authenticated only
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

REVOKE ALL ON FUNCTION public.grade_answer(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grade_answer(uuid, integer) TO authenticated;

-- has_role is used inside RLS policies which run under the querying role; keep executable
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
