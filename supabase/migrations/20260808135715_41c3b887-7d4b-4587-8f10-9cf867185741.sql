CREATE OR REPLACE FUNCTION public.approve_teacher(uid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT p.class_code INTO v_code FROM public.profiles p WHERE p.user_id = uid;
  IF v_code IS NULL OR length(v_code) = 0 THEN v_code := public._gen_class_code(); END IF;
  UPDATE public.profiles p
    SET teacher_status = 'approved', class_code = v_code
    WHERE p.user_id = uid;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'teacher'::public.app_role)
    ON CONFLICT DO NOTHING;
  RETURN v_code;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_or_create_my_class_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_code text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher'::app_role) AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not a teacher';
  END IF;
  SELECT p.class_code INTO v_code FROM public.profiles p WHERE p.user_id = auth.uid();
  IF v_code IS NULL OR length(v_code) = 0 THEN
    v_code := public._gen_class_code();
    UPDATE public.profiles p SET class_code = v_code WHERE p.user_id = auth.uid();
  END IF;
  RETURN v_code;
END; $function$;