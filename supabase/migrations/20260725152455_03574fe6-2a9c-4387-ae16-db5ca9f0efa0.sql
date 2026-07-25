
-- 1) Allow a student to be in multiple classes
ALTER TABLE public.classroom_members DROP CONSTRAINT IF EXISTS classroom_members_student_id_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='classroom_members_teacher_student_uk') THEN
    ALTER TABLE public.classroom_members ADD CONSTRAINT classroom_members_teacher_student_uk UNIQUE (teacher_id, student_id);
  END IF;
END $$;

-- 2) Active class for a student
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_teacher_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3) Update question visibility policy
DROP POLICY IF EXISTS q_select_visible ON public.questions_bank;
CREATE POLICY q_select_visible ON public.questions_bank
FOR SELECT
USING (
  -- admin sees all
  public.has_role(auth.uid(), 'admin'::app_role)
  -- teacher sees own
  OR teacher_id = auth.uid()
  -- if student has an active class, ONLY that teacher's questions
  OR (
    teacher_id IS NOT NULL
    AND teacher_id = (SELECT active_teacher_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.classroom_members m
      WHERE m.student_id = auth.uid() AND m.teacher_id = questions_bank.teacher_id
    )
  )
  -- else (no active class) show only global (teacher_id NULL) questions
  OR (
    teacher_id IS NULL
    AND (SELECT active_teacher_id FROM public.profiles WHERE user_id = auth.uid()) IS NULL
  )
);

-- 4) join_class: allow multiple memberships
CREATE OR REPLACE FUNCTION public.join_class(code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE tid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT user_id INTO tid FROM public.profiles WHERE class_code = lower(btrim(code)) AND teacher_status='approved';
  IF tid IS NULL THEN RAISE EXCEPTION 'invalid class code'; END IF;
  IF tid = auth.uid() THEN RAISE EXCEPTION 'cannot join your own class'; END IF;
  INSERT INTO public.classroom_members(teacher_id, student_id)
    VALUES (tid, auth.uid())
    ON CONFLICT (teacher_id, student_id) DO NOTHING;
  -- auto-set as active class if none set
  UPDATE public.profiles SET active_teacher_id = tid WHERE user_id = auth.uid() AND active_teacher_id IS NULL;
  RETURN tid;
END; $$;

-- 5) leave a specific class
CREATE OR REPLACE FUNCTION public.leave_class(tid uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF tid IS NULL THEN
    DELETE FROM public.classroom_members WHERE student_id = auth.uid();
    UPDATE public.profiles SET active_teacher_id = NULL WHERE user_id = auth.uid();
  ELSE
    DELETE FROM public.classroom_members WHERE student_id = auth.uid() AND teacher_id = tid;
    UPDATE public.profiles SET active_teacher_id = NULL WHERE user_id = auth.uid() AND active_teacher_id = tid;
  END IF;
END; $$;

-- 6) Set active class
CREATE OR REPLACE FUNCTION public.set_active_class(tid uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF tid IS NULL THEN
    UPDATE public.profiles SET active_teacher_id = NULL WHERE user_id = auth.uid();
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.classroom_members WHERE student_id = auth.uid() AND teacher_id = tid) THEN
      RAISE EXCEPTION 'not a member of that class';
    END IF;
    UPDATE public.profiles SET active_teacher_id = tid WHERE user_id = auth.uid();
  END IF;
END; $$;

-- 7) list all classes joined
CREATE OR REPLACE FUNCTION public.get_my_classes()
RETURNS TABLE(teacher_id uuid, class_code text, teacher_name text, teacher_school text, teacher_subject text, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT p.user_id, p.class_code, p.display_name, p.teacher_school, p.teacher_subject,
         (p.user_id = (SELECT active_teacher_id FROM public.profiles WHERE user_id = auth.uid())) AS is_active
  FROM public.classroom_members m
  JOIN public.profiles p ON p.user_id = m.teacher_id
  WHERE m.student_id = auth.uid()
  ORDER BY m.joined_at DESC;
$$;

-- 8) get_or_create_my_class_code: ensure teacher has a code
CREATE OR REPLACE FUNCTION public.get_or_create_my_class_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE code text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::app_role) AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not a teacher';
  END IF;
  SELECT class_code INTO code FROM public.profiles WHERE user_id = auth.uid();
  IF code IS NULL OR length(code) = 0 THEN
    code := public._gen_class_code();
    UPDATE public.profiles SET class_code = code WHERE user_id = auth.uid();
  END IF;
  RETURN code;
END; $$;
