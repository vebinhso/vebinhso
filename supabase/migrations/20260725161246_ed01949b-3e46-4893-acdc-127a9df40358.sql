
-- Remove overly-permissive SELECT policies
DROP POLICY IF EXISTS outfit_select_all ON public.character_outfit;
DROP POLICY IF EXISTS items_select_all ON public.placed_items;
DROP POLICY IF EXISTS roofs_select_all ON public.roofs;
DROP POLICY IF EXISTS walls_select_all ON public.walls;

-- Owner can also read (visit policies already cover self via can_visit_house, but add explicit owner reads for clarity/safety)
CREATE POLICY outfit_owner_select ON public.character_outfit FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY items_owner_select ON public.placed_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY roofs_owner_select ON public.roofs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY walls_owner_select ON public.walls FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Restrict admin_config reads to admins
DROP POLICY IF EXISTS cfg_select_all_auth ON public.admin_config;
CREATE POLICY cfg_admin_select ON public.admin_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Restrict login_streaks reads to the owner
DROP POLICY IF EXISTS streaks_select_all ON public.login_streaks;
CREATE POLICY streaks_owner_select ON public.login_streaks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Restrict pets reads to the owner
DROP POLICY IF EXISTS pets_select_all ON public.pets;
CREATE POLICY pets_owner_select ON public.pets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Consolidate profiles read policies into a single authenticated SELECT
DROP POLICY IF EXISTS profiles_public_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_all_auth ON public.profiles;
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_authenticated_select ON public.profiles FOR SELECT TO authenticated USING (true);

-- Revoke EXECUTE from anon on SECURITY DEFINER functions that require an authenticated user.
-- All these check auth.uid() / has_role internally; anon should never be able to invoke them.
REVOKE EXECUTE ON FUNCTION public._gen_class_code() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_teacher(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_class(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_class(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_class_students(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_classes() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_or_create_my_class_code() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_class(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.leave_class(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_my_taught_classes() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_pending_teachers() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_teacher(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_teacher(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_active_class(uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.approve_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_class(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_students(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_classes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_my_class_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_taught_classes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_teachers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_teacher(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_class(uuid) TO authenticated;
