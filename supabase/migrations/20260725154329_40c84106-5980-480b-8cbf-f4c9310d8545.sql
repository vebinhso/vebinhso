
-- 1. Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_admin_all" ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Teachers manage their own classes
CREATE POLICY "classes_teacher_select_own" ON public.classes FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());
CREATE POLICY "classes_teacher_insert_own" ON public.classes FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text='teacher'));
CREATE POLICY "classes_teacher_update_own" ON public.classes FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "classes_teacher_delete_own" ON public.classes FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add class_id to classroom_members and questions_bank
ALTER TABLE public.classroom_members ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;

-- Students can see classes they've joined (added after class_id column exists)
CREATE POLICY "classes_student_select_joined" ON public.classes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classroom_members m WHERE m.student_id = auth.uid() AND m.class_id = classes.id));
ALTER TABLE public.questions_bank ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN active_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- 3. Backfill: for each approved teacher with an existing class_code, create a default class
INSERT INTO public.classes (teacher_id, code, name, subject)
SELECT p.user_id, p.class_code, COALESCE(NULLIF(p.teacher_subject,''), 'Lớp mặc định'), p.teacher_subject
FROM public.profiles p
WHERE p.teacher_status='approved' AND p.class_code IS NOT NULL
ON CONFLICT (code) DO NOTHING;

-- 4. Backfill classroom_members.class_id from teacher_id
UPDATE public.classroom_members cm
SET class_id = c.id
FROM public.classes c
WHERE c.teacher_id = cm.teacher_id AND cm.class_id IS NULL;

-- 5. Backfill questions_bank.class_id from teacher_id
UPDATE public.questions_bank qb
SET class_id = c.id
FROM public.classes c
WHERE c.teacher_id = qb.teacher_id AND qb.class_id IS NULL;

-- 6. Backfill active_class_id from active_teacher_id
UPDATE public.profiles p
SET active_class_id = c.id
FROM public.classes c
WHERE c.teacher_id = p.active_teacher_id AND p.active_class_id IS NULL AND p.active_teacher_id IS NOT NULL;

-- 7. Drop old unique constraint and add new one on (class_id, student_id)
ALTER TABLE public.classroom_members DROP CONSTRAINT IF EXISTS classroom_members_teacher_student_uk;
-- Delete any rows without class_id (orphans from before backfill was possible)
DELETE FROM public.classroom_members WHERE class_id IS NULL;
ALTER TABLE public.classroom_members ALTER COLUMN class_id SET NOT NULL;
ALTER TABLE public.classroom_members ADD CONSTRAINT classroom_members_class_student_uk UNIQUE (class_id, student_id);
CREATE INDEX IF NOT EXISTS idx_cm_class ON public.classroom_members(class_id);

-- 8. Replace questions_bank RLS to use class_id
DROP POLICY IF EXISTS q_select_visible ON public.questions_bank;
CREATE POLICY q_select_visible ON public.questions_bank FOR SELECT
USING (
  public.has_role(auth.uid(),'admin')
  OR teacher_id = auth.uid()
  OR (
    class_id IS NOT NULL
    AND class_id = (SELECT active_class_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.classroom_members m WHERE m.student_id = auth.uid() AND m.class_id = questions_bank.class_id)
  )
  OR (
    teacher_id IS NULL
    AND (SELECT active_class_id FROM public.profiles WHERE user_id = auth.uid()) IS NULL
  )
);

-- 9. RPCs

-- Teacher: create a new class
CREATE OR REPLACE FUNCTION public.create_class(_name TEXT, _subject TEXT)
RETURNS public.classes
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  code TEXT;
  row public.classes;
BEGIN
  IF NOT public.has_role(auth.uid(),'teacher') AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _name IS NULL OR length(btrim(_name))=0 THEN RAISE EXCEPTION 'name required'; END IF;
  code := public._gen_class_code();
  INSERT INTO public.classes(teacher_id, code, name, subject)
    VALUES (auth.uid(), code, btrim(_name), NULLIF(btrim(COALESCE(_subject,'')),''))
    RETURNING * INTO row;
  RETURN row;
END; $$;

-- Teacher: list own classes
CREATE OR REPLACE FUNCTION public.list_my_taught_classes()
RETURNS TABLE(id UUID, code TEXT, name TEXT, subject TEXT, student_count INT, question_count INT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT c.id, c.code, c.name, c.subject,
    (SELECT COUNT(*)::INT FROM public.classroom_members m WHERE m.class_id = c.id),
    (SELECT COUNT(*)::INT FROM public.questions_bank q WHERE q.class_id = c.id),
    c.created_at
  FROM public.classes c
  WHERE c.teacher_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

-- Teacher: delete class
CREATE OR REPLACE FUNCTION public.delete_class(_class_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id=_class_id AND teacher_id=auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.classes WHERE id=_class_id;
END; $$;

-- Teacher: list students in a specific class
CREATE OR REPLACE FUNCTION public.get_class_students(_class_id UUID)
RETURNS TABLE(user_id UUID, username TEXT, display_name TEXT, email TEXT, joined_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id=_class_id AND (teacher_id=auth.uid() OR public.has_role(auth.uid(),'admin'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.username, p.display_name, p.email, m.joined_at
    FROM public.classroom_members m
    JOIN public.profiles p ON p.user_id = m.student_id
    WHERE m.class_id = _class_id
    ORDER BY m.joined_at DESC;
END; $$;

-- Replace join_class to work by code -> class
CREATE OR REPLACE FUNCTION public.join_class(code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE cid UUID; tid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT id, teacher_id INTO cid, tid FROM public.classes WHERE code = lower(btrim(join_class.code));
  IF cid IS NULL THEN RAISE EXCEPTION 'invalid class code'; END IF;
  IF tid = auth.uid() THEN RAISE EXCEPTION 'cannot join your own class'; END IF;
  INSERT INTO public.classroom_members(teacher_id, student_id, class_id)
    VALUES (tid, auth.uid(), cid)
    ON CONFLICT (class_id, student_id) DO NOTHING;
  UPDATE public.profiles SET active_class_id = cid
    WHERE user_id = auth.uid() AND active_class_id IS NULL;
  RETURN cid;
END; $$;

-- Replace leave_class to accept class_id
DROP FUNCTION IF EXISTS public.leave_class(UUID);
DROP FUNCTION IF EXISTS public.set_active_class(UUID);
DROP FUNCTION IF EXISTS public.join_class(TEXT);
DROP FUNCTION IF EXISTS public.get_my_classes();
CREATE OR REPLACE FUNCTION public.leave_class(_class_id UUID DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF _class_id IS NULL THEN
    DELETE FROM public.classroom_members WHERE student_id = auth.uid();
    UPDATE public.profiles SET active_class_id = NULL WHERE user_id = auth.uid();
  ELSE
    DELETE FROM public.classroom_members WHERE student_id = auth.uid() AND class_id = _class_id;
    UPDATE public.profiles SET active_class_id = NULL
      WHERE user_id = auth.uid() AND active_class_id = _class_id;
  END IF;
END; $$;

-- Replace set_active_class to accept class_id
CREATE OR REPLACE FUNCTION public.set_active_class(_class_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF _class_id IS NULL THEN
    UPDATE public.profiles SET active_class_id = NULL WHERE user_id = auth.uid();
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.classroom_members WHERE student_id = auth.uid() AND class_id = _class_id) THEN
      RAISE EXCEPTION 'not a member of that class';
    END IF;
    UPDATE public.profiles SET active_class_id = _class_id WHERE user_id = auth.uid();
  END IF;
END; $$;

-- Replace get_my_classes to return joined class info
CREATE OR REPLACE FUNCTION public.get_my_classes()
RETURNS TABLE(class_id UUID, code TEXT, name TEXT, subject TEXT, teacher_id UUID, teacher_name TEXT, teacher_school TEXT, is_active BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT c.id, c.code, c.name, c.subject, c.teacher_id, p.display_name, p.teacher_school,
    (c.id = (SELECT active_class_id FROM public.profiles WHERE user_id = auth.uid())) AS is_active
  FROM public.classroom_members m
  JOIN public.classes c ON c.id = m.class_id
  JOIN public.profiles p ON p.user_id = c.teacher_id
  WHERE m.student_id = auth.uid()
  ORDER BY m.joined_at DESC;
$$;

-- Drop old signatures that conflict
DROP FUNCTION IF EXISTS public.leave_class();
DROP FUNCTION IF EXISTS public.get_classroom_students();
DROP FUNCTION IF EXISTS public.get_my_classroom();
