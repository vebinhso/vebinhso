CREATE OR REPLACE FUNCTION public._gen_class_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  chars text := 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text;
  n int;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    n := 5 + floor(random()*2)::int;
    v_code := '';
    FOR i IN 1..n LOOP
      v_code := v_code || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.class_code = v_code)
      AND NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.code = v_code);
    attempts := attempts + 1;
    IF attempts > 50 THEN RAISE EXCEPTION 'cannot generate unique class code'; END IF;
  END LOOP;
  RETURN v_code;
END; $function$;