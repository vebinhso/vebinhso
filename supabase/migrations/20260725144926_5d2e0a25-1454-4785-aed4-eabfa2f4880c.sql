
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

DO $$ BEGIN
  CREATE TYPE public.teacher_status AS ENUM ('none','pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_status public.teacher_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS teacher_school text,
  ADD COLUMN IF NOT EXISTS teacher_subject text,
  ADD COLUMN IF NOT EXISTS class_code text UNIQUE;

CREATE TABLE IF NOT EXISTS public.classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cm_teacher ON public.classroom_members(teacher_id);

GRANT SELECT, INSERT, DELETE ON public.classroom_members TO authenticated;
GRANT ALL ON public.classroom_members TO service_role;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cm_select_self_or_teacher" ON public.classroom_members
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cm_admin_all" ON public.classroom_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.questions_bank
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_qb_teacher ON public.questions_bank(teacher_id) WHERE teacher_id IS NOT NULL;

DROP POLICY IF EXISTS "q_select_all_auth" ON public.questions_bank;
CREATE POLICY "q_select_visible" ON public.questions_bank
  FOR SELECT TO authenticated
  USING (
    teacher_id IS NULL
    OR teacher_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR teacher_id = (SELECT teacher_id FROM public.classroom_members WHERE student_id = auth.uid())
  );

-- Teacher self-ownership (role check via user_roles.role::text to avoid enum literal parse issue this txn)
CREATE POLICY "q_teacher_insert_own" ON public.questions_bank
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'teacher')
  );
CREATE POLICY "q_teacher_update_own" ON public.questions_bank
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'teacher'))
  WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "q_teacher_delete_own" ON public.questions_bank
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'teacher'));

CREATE OR REPLACE FUNCTION public._gen_class_code()
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz';
  code text;
  n int;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    n := 4 + floor(random()*3)::int;
    code := '';
    FOR i IN 1..n LOOP
      code := code || substr(chars, 1 + floor(random()*26)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE class_code = code);
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'cannot generate unique class code'; END IF;
  END LOOP;
  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.request_teacher(school text, subject text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF school IS NULL OR length(btrim(school)) = 0 THEN RAISE EXCEPTION 'school required'; END IF;
  IF subject IS NULL OR length(btrim(subject)) = 0 THEN RAISE EXCEPTION 'subject required'; END IF;
  UPDATE public.profiles
    SET teacher_status = CASE WHEN teacher_status = 'approved' THEN 'approved' ELSE 'pending' END,
        teacher_school = btrim(school),
        teacher_subject = btrim(subject)
    WHERE user_id = auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.approve_teacher(uid uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  code text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT class_code INTO code FROM public.profiles WHERE user_id = uid;
  IF code IS NULL THEN code := public._gen_class_code(); END IF;
  UPDATE public.profiles
    SET teacher_status = 'approved', class_code = code
    WHERE user_id = uid;
  EXECUTE 'INSERT INTO public.user_roles(user_id, role) VALUES ($1, $2::public.app_role) ON CONFLICT DO NOTHING'
    USING uid, 'teacher';
  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_teacher(uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET teacher_status = 'rejected' WHERE user_id = uid;
  DELETE FROM public.user_roles WHERE user_id = uid AND role::text = 'teacher';
END; $$;

CREATE OR REPLACE FUNCTION public.join_class(code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT user_id INTO tid FROM public.profiles WHERE class_code = lower(btrim(code)) AND teacher_status='approved';
  IF tid IS NULL THEN RAISE EXCEPTION 'invalid class code'; END IF;
  IF tid = auth.uid() THEN RAISE EXCEPTION 'cannot join your own class'; END IF;
  INSERT INTO public.classroom_members(teacher_id, student_id)
    VALUES (tid, auth.uid())
    ON CONFLICT (student_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id, joined_at = now();
  RETURN tid;
END; $$;

CREATE OR REPLACE FUNCTION public.leave_class()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.classroom_members WHERE student_id = auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_classroom()
RETURNS TABLE(teacher_id uuid, class_code text, teacher_name text, teacher_school text, teacher_subject text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.class_code, p.display_name, p.teacher_school, p.teacher_subject
  FROM public.classroom_members m
  JOIN public.profiles p ON p.user_id = m.teacher_id
  WHERE m.student_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_classroom_students()
RETURNS TABLE(user_id uuid, username text, display_name text, email text, joined_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('teacher','admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.username, p.display_name, p.email, m.joined_at
    FROM public.classroom_members m
    JOIN public.profiles p ON p.user_id = m.student_id
    WHERE m.teacher_id = auth.uid()
    ORDER BY m.joined_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.list_pending_teachers()
RETURNS TABLE(user_id uuid, username text, display_name text, email text, teacher_school text, teacher_subject text, teacher_status public.teacher_status, class_code text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT p.user_id, p.username, p.display_name, p.email, p.teacher_school, p.teacher_subject, p.teacher_status, p.class_code
    FROM public.profiles p
    WHERE p.teacher_status IN ('pending','approved','rejected')
    ORDER BY (p.teacher_status='pending') DESC, p.updated_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_emails TEXT[] := ARRAY[
    'tamnhu.elsa@gmail.com','carrotle0808@gmail.com','dlenhah1801@gmail.com',
    'mr.ducsu@gmail.com','tienthanh090210@gmail.com',
    'student250746@ptnk.edu.vn','student250722@ptnk.edu.vn','student250729@ptnk.edu.vn'
  ];
  base_name TEXT;
  final_name TEXT;
  n INTEGER := 0;
  is_teacher boolean := COALESCE((NEW.raw_user_meta_data->>'is_teacher')::boolean, false);
  t_school text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'teacher_school','')), '');
  t_subject text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'teacher_subject','')), '');
BEGIN
  base_name := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'player'
  );
  final_name := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_name) LOOP
    n := n + 1;
    final_name := base_name || n::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, username, display_name, email, teacher_status, teacher_school, teacher_subject)
  VALUES (
    NEW.id, final_name, COALESCE(NEW.raw_user_meta_data->>'display_name', final_name), NEW.email,
    CASE WHEN is_teacher THEN 'pending'::public.teacher_status ELSE 'none'::public.teacher_status END,
    CASE WHEN is_teacher THEN t_school ELSE NULL END,
    CASE WHEN is_teacher THEN t_subject ELSE NULL END
  );

  INSERT INTO public.game_state (user_id) VALUES (NEW.id);
  INSERT INTO public.character_outfit (user_id) VALUES (NEW.id);
  INSERT INTO public.login_streaks (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user'::app_role);

  IF lower(NEW.email) = ANY(admin_emails) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;
