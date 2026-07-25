-- ============================================================
-- 1) Extend profiles with map/house info
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS map_x float NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS map_y float NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS house_privacy text NOT NULL DEFAULT 'friends'
    CHECK (house_privacy IN ('public','friends','private')),
  ADD COLUMN IF NOT EXISTS house_name text;

-- Deterministic default coords for existing rows based on user_id hash
UPDATE public.profiles
SET map_x = 100 + (('x' || substr(md5(user_id::text), 1, 6))::bit(24)::int % 1720),
    map_y = 100 + (('x' || substr(md5(user_id::text), 7, 6))::bit(24)::int % 920)
WHERE map_x = 0 AND map_y = 0;

-- Allow authenticated users to SELECT safe public columns of profiles
-- (username, display_name, avatar_url, map_x, map_y, house_privacy, house_name)
-- Column-level GRANTS: keep email hidden.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  user_id, username, display_name, avatar_url,
  created_at, map_x, map_y, house_privacy, house_name
) ON public.profiles TO authenticated;

-- SELECT policy: authenticated users can read any profile row (column grants filter what's exposed)
DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
CREATE POLICY "profiles_public_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Self-read policy (kept for own-email etc via get_my_email definer)
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 2) presence table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  in_house_owner uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_seen timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.presence TO authenticated;
GRANT INSERT, UPDATE ON public.presence TO authenticated;
GRANT ALL ON public.presence TO service_role;

ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_select_all_auth" ON public.presence;
CREATE POLICY "presence_select_all_auth"
  ON public.presence FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "presence_insert_own" ON public.presence;
CREATE POLICY "presence_insert_own"
  ON public.presence FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "presence_update_own" ON public.presence;
CREATE POLICY "presence_update_own"
  ON public.presence FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_presence_updated_at
  BEFORE UPDATE ON public.presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_friend_houses()
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  map_x float,
  map_y float,
  house_privacy text,
  house_name text,
  is_online boolean,
  in_house_owner uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.display_name, p.avatar_url,
         p.map_x, p.map_y, p.house_privacy, p.house_name,
         COALESCE(pr.is_online, false) AS is_online,
         pr.in_house_owner
  FROM public.profiles p
  LEFT JOIN public.presence pr ON pr.user_id = p.user_id
  WHERE p.user_id IN (
    SELECT CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (f.user_id = auth.uid() OR f.friend_id = auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_friend_houses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_friend_houses() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_visit_house(owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  priv text;
  is_friend boolean;
BEGIN
  IF owner = auth.uid() THEN RETURN true; END IF;
  SELECT house_privacy INTO priv FROM public.profiles WHERE user_id = owner;
  IF priv IS NULL OR priv = 'private' THEN RETURN false; END IF;
  IF priv = 'public' THEN RETURN true; END IF;
  -- friends only
  SELECT EXISTS (
    SELECT 1 FROM public.friends
    WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND friend_id = owner)
        OR (user_id = owner AND friend_id = auth.uid()))
  ) INTO is_friend;
  RETURN COALESCE(is_friend, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_visit_house(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_visit_house(uuid) TO authenticated;

-- ============================================================
-- 4) Realtime publication for presence
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'presence'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.presence';
  END IF;
END $$;

ALTER TABLE public.presence REPLICA IDENTITY FULL;
