-- A. Skill versions
CREATE TABLE public.ai_skill_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_key text NOT NULL REFERENCES public.ai_skills(key) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_key, version)
);
GRANT SELECT ON public.ai_skill_versions TO authenticated;
GRANT ALL ON public.ai_skill_versions TO service_role;
ALTER TABLE public.ai_skill_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins select ai_skill_versions" ON public.ai_skill_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.ai_skills_save_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN
    INSERT INTO public.ai_skill_versions(skill_key, version, content)
    VALUES (NEW.key, NEW.version, NEW.content)
    ON CONFLICT (skill_key, version) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.ai_skills_save_version() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ai_skills_save_version AFTER INSERT OR UPDATE ON public.ai_skills
  FOR EACH ROW EXECUTE FUNCTION public.ai_skills_save_version();

INSERT INTO public.ai_skill_versions(skill_key, version, content)
SELECT key, version, content FROM public.ai_skills
ON CONFLICT (skill_key, version) DO NOTHING;

-- B. Check -> skill mapping
CREATE TABLE public.ai_check_skill (
  check_kind text PRIMARY KEY CHECK (check_kind IN ('news','image','video','link','email','text','phone','privacy_media','privacy_text')),
  skill_key text NULL REFERENCES public.ai_skills(key) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_check_skill TO authenticated;
GRANT ALL ON public.ai_check_skill TO service_role;
ALTER TABLE public.ai_check_skill ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_check_skill" ON public.ai_check_skill
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ai_check_skill_upd BEFORE UPDATE ON public.ai_check_skill
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_check_skill(check_kind, skill_key)
SELECT v.kind, (SELECT s.key FROM public.ai_skills s WHERE s.key = v.skill)
FROM (VALUES
  ('news','vbs-bao-gia'),('image','vbs-hinh-anh-ai'),('video','vbs-video-ai'),
  ('link','vbs-link-email-gia'),('email','vbs-link-email-gia'),('text','vbs-van-ban-ai'),
  ('phone','vbs-so-dien-thoai-gia'),('privacy_media',NULL),('privacy_text',NULL)
) AS v(kind, skill)
ON CONFLICT (check_kind) DO NOTHING;

-- D. Feedback (created before C so set_parent_consent can reference it)
CREATE TABLE public.ai_check_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  reporter_role text NOT NULL CHECK (reporter_role IN ('student','teacher','admin')),
  check_kind text NOT NULL CHECK (check_kind IN ('news','image','video','link','email','text','phone')),
  skill_key text NULL,
  skill_version integer NULL,
  result_level text NULL,
  result_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  reason text NULL CHECK (reason IN ('wrong_level','missing_signs','bad_advice','typo','other')),
  note text NULL,
  attached_content text NULL,
  consent_basis text NULL CHECK (consent_basis IN ('parent_and_student','staff')),
  content_expires_at timestamptz NULL
);
CREATE INDEX ai_check_feedback_skill_idx ON public.ai_check_feedback(skill_key, skill_version);
CREATE INDEX ai_check_feedback_user_idx ON public.ai_check_feedback(user_id, created_at);
CREATE INDEX ai_check_feedback_expires_idx ON public.ai_check_feedback(content_expires_at);
GRANT SELECT ON public.ai_check_feedback TO authenticated;
GRANT ALL ON public.ai_check_feedback TO service_role;
ALTER TABLE public.ai_check_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins select ai_check_feedback" ON public.ai_check_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.purge_expired_feedback_content()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ai_check_feedback SET attached_content = NULL
  WHERE attached_content IS NOT NULL AND content_expires_at IS NOT NULL AND content_expires_at < now();
$$;
REVOKE EXECUTE ON FUNCTION public.purge_expired_feedback_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_feedback_content() TO service_role;

-- C. Parent consent on classroom_members
ALTER TABLE public.classroom_members
  ADD COLUMN parent_consent_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN parent_consent_at timestamptz NULL,
  ADD COLUMN parent_consent_by uuid NULL;

CREATE OR REPLACE FUNCTION public.has_parent_consent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classroom_members WHERE student_id = _user_id AND parent_consent_ai = true);
$$;

CREATE OR REPLACE FUNCTION public.set_parent_consent(_class_id uuid, _student_id uuid, _value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id = _class_id AND teacher_id = auth.uid())
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classroom_members WHERE class_id = _class_id AND student_id = _student_id) THEN
    RAISE EXCEPTION 'not a member';
  END IF;
  UPDATE public.classroom_members
    SET parent_consent_ai = COALESCE(_value, false), parent_consent_at = now(), parent_consent_by = auth.uid()
    WHERE class_id = _class_id AND student_id = _student_id;
  IF NOT COALESCE(_value, false) THEN
    UPDATE public.ai_check_feedback SET attached_content = NULL
      WHERE user_id = _student_id AND consent_basis = 'parent_and_student';
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.set_parent_consent(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_parent_consent(uuid, uuid, boolean) TO authenticated;

-- get_class_students with parent_consent_ai
DROP FUNCTION IF EXISTS public.get_class_students(uuid);
CREATE FUNCTION public.get_class_students(_class_id uuid)
RETURNS TABLE(user_id uuid, username text, display_name text, email text, joined_at timestamptz, parent_consent_ai boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id=_class_id AND (teacher_id=auth.uid() OR public.has_role(auth.uid(),'admin'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.username, p.display_name, p.email, m.joined_at, m.parent_consent_ai
    FROM public.classroom_members m
    JOIN public.profiles p ON p.user_id = m.student_id
    WHERE m.class_id = _class_id
    ORDER BY m.joined_at DESC;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_class_students(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_students(uuid) TO authenticated;