CREATE OR REPLACE FUNCTION public.remove_class_student(_class_id uuid, _student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id=_class_id AND (teacher_id=auth.uid() OR public.has_role(auth.uid(),'admin'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.classroom_members WHERE class_id=_class_id AND student_id=_student_id;
  DELETE FROM public.class_join_requests WHERE class_id=_class_id AND student_id=_student_id;
  UPDATE public.profiles SET active_class_id = NULL WHERE user_id=_student_id AND active_class_id=_class_id;
END; $$;

REVOKE ALL ON FUNCTION public.remove_class_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_class_student(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._gen_class_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars text := 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
  n int;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    n := 5 + floor(random()*2)::int;
    code := '';
    FOR i IN 1..n LOOP
      code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE class_code = code)
      AND NOT EXISTS (SELECT 1 FROM public.classes WHERE classes.code = code);
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'cannot generate unique class code'; END IF;
  END LOOP;
  RETURN code;
END; $$;