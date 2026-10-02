CREATE TABLE public.ai_signal_domains (
  domain text PRIMARY KEY,
  checks_count integer NOT NULL DEFAULT 0,
  high_count integer NOT NULL DEFAULT 0,
  mid_count integer NOT NULL DEFAULT 0,
  low_count integer NOT NULL DEFAULT 0,
  thumbs_up integer NOT NULL DEFAULT 0,
  thumbs_down integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_signal_domains TO authenticated;
GRANT ALL ON public.ai_signal_domains TO service_role;
ALTER TABLE public.ai_signal_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins select anonymous domain signals" ON public.ai_signal_domains
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.ai_signal_phone_prefixes (
  prefix text PRIMARY KEY,
  checks_count integer NOT NULL DEFAULT 0,
  high_count integer NOT NULL DEFAULT 0,
  mid_count integer NOT NULL DEFAULT 0,
  low_count integer NOT NULL DEFAULT 0,
  thumbs_up integer NOT NULL DEFAULT 0,
  thumbs_down integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_signal_phone_prefixes TO authenticated;
GRANT ALL ON public.ai_signal_phone_prefixes TO service_role;
ALTER TABLE public.ai_signal_phone_prefixes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins select anonymous phone signals" ON public.ai_signal_phone_prefixes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.parent_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'declined', 'revoked')),
  parent_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  responded_at timestamptz NULL,
  revoked_at timestamptz NULL
);
CREATE INDEX parent_consents_student_created_idx ON public.parent_consents(student_id, created_at DESC);
GRANT SELECT ON public.parent_consents TO authenticated;
GRANT ALL ON public.parent_consents TO service_role;
ALTER TABLE public.parent_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students select own parent consents" ON public.parent_consents
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Admins select all parent consents" ON public.parent_consents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.ai_check_feedback
  ADD COLUMN consent_source text NULL CHECK (consent_source IN ('class', 'parent_link', 'staff'));

CREATE OR REPLACE FUNCTION public.bump_signal_check(_table text, _key text, _bucket text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _table NOT IN ('domain', 'phone') OR _bucket NOT IN ('high', 'mid', 'low') OR NULLIF(btrim(_key), '') IS NULL THEN
    RAISE EXCEPTION 'invalid signal';
  END IF;
  IF _table = 'domain' THEN
    INSERT INTO public.ai_signal_domains(domain, checks_count, high_count, mid_count, low_count)
    VALUES (lower(btrim(_key)), 1, (_bucket = 'high')::integer, (_bucket = 'mid')::integer, (_bucket = 'low')::integer)
    ON CONFLICT (domain) DO UPDATE SET
      checks_count = ai_signal_domains.checks_count + 1,
      high_count = ai_signal_domains.high_count + (_bucket = 'high')::integer,
      mid_count = ai_signal_domains.mid_count + (_bucket = 'mid')::integer,
      low_count = ai_signal_domains.low_count + (_bucket = 'low')::integer,
      last_seen_at = now();
  ELSE
    INSERT INTO public.ai_signal_phone_prefixes(prefix, checks_count, high_count, mid_count, low_count)
    VALUES (btrim(_key), 1, (_bucket = 'high')::integer, (_bucket = 'mid')::integer, (_bucket = 'low')::integer)
    ON CONFLICT (prefix) DO UPDATE SET
      checks_count = ai_signal_phone_prefixes.checks_count + 1,
      high_count = ai_signal_phone_prefixes.high_count + (_bucket = 'high')::integer,
      mid_count = ai_signal_phone_prefixes.mid_count + (_bucket = 'mid')::integer,
      low_count = ai_signal_phone_prefixes.low_count + (_bucket = 'low')::integer,
      last_seen_at = now();
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.bump_signal_check(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_signal_check(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.bump_signal_rating(_table text, _key text, _rating smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _table NOT IN ('domain', 'phone') OR _rating NOT IN (-1, 1) OR NULLIF(btrim(_key), '') IS NULL THEN
    RAISE EXCEPTION 'invalid signal';
  END IF;
  IF _table = 'domain' THEN
    INSERT INTO public.ai_signal_domains(domain, thumbs_up, thumbs_down)
    VALUES (lower(btrim(_key)), (_rating = 1)::integer, (_rating = -1)::integer)
    ON CONFLICT (domain) DO UPDATE SET
      thumbs_up = ai_signal_domains.thumbs_up + (_rating = 1)::integer,
      thumbs_down = ai_signal_domains.thumbs_down + (_rating = -1)::integer,
      last_seen_at = now();
  ELSE
    INSERT INTO public.ai_signal_phone_prefixes(prefix, thumbs_up, thumbs_down)
    VALUES (btrim(_key), (_rating = 1)::integer, (_rating = -1)::integer)
    ON CONFLICT (prefix) DO UPDATE SET
      thumbs_up = ai_signal_phone_prefixes.thumbs_up + (_rating = 1)::integer,
      thumbs_down = ai_signal_phone_prefixes.thumbs_down + (_rating = -1)::integer,
      last_seen_at = now();
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.bump_signal_rating(text, text, smallint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_signal_rating(text, text, smallint) TO service_role;

CREATE OR REPLACE FUNCTION public.has_parent_consent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.classroom_members WHERE student_id = _user_id AND parent_consent_ai = true)
    OR EXISTS (SELECT 1 FROM public.parent_consents WHERE student_id = _user_id AND status = 'granted');
$$;
REVOKE EXECUTE ON FUNCTION public.has_parent_consent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_parent_consent(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_all_parent_consent(_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.parent_consents
    SET status = 'revoked', revoked_at = now()
    WHERE student_id = _student_id AND status = 'granted';
  UPDATE public.classroom_members
    SET parent_consent_ai = false, parent_consent_at = now(), parent_consent_by = NULL
    WHERE student_id = _student_id AND parent_consent_ai = true;
  UPDATE public.ai_check_feedback
    SET attached_content = NULL
    WHERE user_id = _student_id AND consent_basis = 'parent_and_student';
END; $$;
REVOKE EXECUTE ON FUNCTION public.revoke_all_parent_consent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_parent_consent(uuid) TO service_role;