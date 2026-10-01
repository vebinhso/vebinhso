REVOKE EXECUTE ON FUNCTION public.has_parent_consent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_parent_consent(uuid) TO service_role;