
CREATE OR REPLACE FUNCTION public.join_class(code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE cid UUID; tid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT id, teacher_id INTO cid, tid FROM public.classes WHERE public.classes.code = lower(btrim(join_class.code));
  IF cid IS NULL THEN RAISE EXCEPTION 'invalid class code'; END IF;
  IF tid = auth.uid() THEN RAISE EXCEPTION 'cannot join your own class'; END IF;
  INSERT INTO public.classroom_members(teacher_id, student_id, class_id)
    VALUES (tid, auth.uid(), cid)
    ON CONFLICT (class_id, student_id) DO NOTHING;
  UPDATE public.profiles SET active_class_id = cid
    WHERE user_id = auth.uid() AND active_class_id IS NULL;
  RETURN cid;
END; $$;
