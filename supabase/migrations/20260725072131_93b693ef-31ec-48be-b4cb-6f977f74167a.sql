
-- Add new columns for advanced house privacy
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS house_allow_list uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS coop_build boolean NOT NULL DEFAULT false;

-- Update can_visit_house to support 'custom' and 'closed'
CREATE OR REPLACE FUNCTION public.can_visit_house(owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  priv text;
  allow uuid[];
  is_friend boolean;
BEGIN
  IF owner = auth.uid() THEN RETURN true; END IF;
  SELECT house_privacy, house_allow_list INTO priv, allow FROM public.profiles WHERE user_id = owner;
  IF priv IS NULL OR priv = 'private' OR priv = 'closed' THEN RETURN false; END IF;
  IF priv = 'public' THEN RETURN true; END IF;
  IF priv = 'custom' THEN
    RETURN COALESCE(auth.uid() = ANY(allow), false);
  END IF;
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

-- Helper: check if visitor can co-build in owner's house
CREATE OR REPLACE FUNCTION public.can_coop_build(owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coop boolean;
BEGIN
  IF owner = auth.uid() THEN RETURN true; END IF;
  SELECT coop_build INTO coop FROM public.profiles WHERE user_id = owner;
  IF NOT COALESCE(coop, false) THEN RETURN false; END IF;
  RETURN public.can_visit_house(owner);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_coop_build(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_coop_build(uuid) TO authenticated;

-- RLS: allow coop editing on placed_items / walls / roofs / floors
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['placed_items','walls','roofs','floors'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "coop_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "coop_delete_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "coop_update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "coop_select_%s" ON public.%I', t, t);
    EXECUTE format($f$
      CREATE POLICY "coop_insert_%1$s" ON public.%1$I
      FOR INSERT TO authenticated
      WITH CHECK (public.can_coop_build(user_id))
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "coop_delete_%1$s" ON public.%1$I
      FOR DELETE TO authenticated
      USING (public.can_coop_build(user_id))
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "coop_update_%1$s" ON public.%1$I
      FOR UPDATE TO authenticated
      USING (public.can_coop_build(user_id))
      WITH CHECK (public.can_coop_build(user_id))
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "coop_select_%1$s" ON public.%1$I
      FOR SELECT TO authenticated
      USING (public.can_visit_house(user_id))
    $f$, t);
  END LOOP;
END $$;

-- Ensure realtime is on for these tables (safe if already added)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.placed_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.walls; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.roofs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.floors; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.presence; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
