ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_visibility_chk;
ALTER TABLE public.classes ADD CONSTRAINT classes_visibility_chk CHECK (visibility IN ('public','private'));

CREATE TABLE IF NOT EXISTS public.class_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_join_requests TO authenticated;
GRANT ALL ON public.class_join_requests TO service_role;

ALTER TABLE public.class_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students see own join requests" ON public.class_join_requests;
CREATE POLICY "students see own join requests" ON public.class_join_requests
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "teachers manage join requests" ON public.class_join_requests;
CREATE POLICY "teachers manage join requests" ON public.class_join_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "students cancel own join requests" ON public.class_join_requests;
CREATE POLICY "students cancel own join requests" ON public.class_join_requests
  FOR DELETE TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_cjr_updated ON public.class_join_requests;
CREATE TRIGGER trg_cjr_updated BEFORE UPDATE ON public.class_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP FUNCTION IF EXISTS public.join_class(text);
CREATE OR REPLACE FUNCTION public.join_class(code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE cid uuid; tid uuid; vis text; c text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  c := btrim(join_class.code);
  SELECT id, teacher_id, visibility INTO cid, tid, vis FROM public.classes WHERE public.classes.code = c;
  IF cid IS NULL THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF tid = auth.uid() THEN RETURN jsonb_build_object('status','own'); END IF;
  IF EXISTS (SELECT 1 FROM public.classroom_members WHERE class_id = cid AND student_id = auth.uid()) THEN
    RETURN jsonb_build_object('status','joined','class_id',cid);
  END IF;
  IF vis = 'private' THEN
    INSERT INTO public.class_join_requests(class_id, student_id) VALUES (cid, auth.uid())
      ON CONFLICT (class_id, student_id) DO UPDATE SET status = 'pending', updated_at = now();
    RETURN jsonb_build_object('status','pending','class_id',cid);
  END IF;
  INSERT INTO public.classroom_members(teacher_id, student_id, class_id)
    VALUES (tid, auth.uid(), cid) ON CONFLICT (class_id, student_id) DO NOTHING;
  UPDATE public.profiles SET active_class_id = cid WHERE user_id = auth.uid() AND active_class_id IS NULL;
  RETURN jsonb_build_object('status','joined','class_id',cid);
END; $$;

REVOKE ALL ON FUNCTION public.join_class(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_class(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_class_visibility(_class_id uuid, _visibility text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF _visibility NOT IN ('public','private') THEN RAISE EXCEPTION 'invalid visibility'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id=_class_id AND teacher_id=auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.classes SET visibility = _visibility WHERE id = _class_id;
END; $$;
REVOKE ALL ON FUNCTION public.set_class_visibility(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_class_visibility(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_join_requests(_class_id uuid)
RETURNS TABLE(student_id uuid, display_name text, username text, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id=_class_id AND teacher_id=auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT r.student_id, p.display_name, p.username, r.status, r.created_at
    FROM public.class_join_requests r JOIN public.profiles p ON p.user_id = r.student_id
    WHERE r.class_id = _class_id AND r.status = 'pending'
    ORDER BY r.created_at ASC;
END; $$;
REVOKE ALL ON FUNCTION public.list_join_requests(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_join_requests(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_join_request(_class_id uuid, _student_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE tid uuid;
BEGIN
  SELECT teacher_id INTO tid FROM public.classes WHERE id=_class_id AND teacher_id=auth.uid();
  IF tid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _approve THEN
    INSERT INTO public.classroom_members(teacher_id, student_id, class_id)
      VALUES (tid, _student_id, _class_id) ON CONFLICT (class_id, student_id) DO NOTHING;
    UPDATE public.class_join_requests SET status='approved' WHERE class_id=_class_id AND student_id=_student_id;
  ELSE
    UPDATE public.class_join_requests SET status='rejected' WHERE class_id=_class_id AND student_id=_student_id;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.decide_join_request(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_join_request(uuid, uuid, boolean) TO authenticated;