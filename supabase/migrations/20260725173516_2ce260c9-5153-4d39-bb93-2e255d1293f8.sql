-- 1) Table
CREATE TABLE IF NOT EXISTS public.question_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions_bank(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  selected_index INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.question_attempts TO authenticated;
GRANT ALL ON public.question_attempts TO service_role;

ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own attempts select" ON public.question_attempts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own attempts insert" ON public.question_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS question_attempts_user_idx ON public.question_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS question_attempts_class_idx ON public.question_attempts(class_id, user_id);

-- 2) Update grade_answer to log attempts
CREATE OR REPLACE FUNCTION public.grade_answer(qid uuid, selected integer)
 RETURNS TABLE(is_correct boolean, correct_indexes integer[], reward integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ci int[];
  ai int;
  rw int;
  q_class uuid;
  ok boolean;
BEGIN
  SELECT
    COALESCE(
      (SELECT array_agg((v)::int) FROM jsonb_array_elements_text(q.correct_indexes) v),
      ARRAY[q.answer_index]
    ),
    q.answer_index,
    q.reward,
    q.class_id
  INTO ci, ai, rw, q_class
  FROM public.questions_bank q WHERE q.id = qid;

  IF ci IS NULL THEN
    RETURN QUERY SELECT false, ARRAY[]::int[], 0;
    RETURN;
  END IF;
  ok := (selected = ANY(ci));
  IF auth.uid() IS NOT NULL THEN
    BEGIN
      INSERT INTO public.question_attempts(user_id, question_id, class_id, selected_index, is_correct)
      VALUES (auth.uid(), qid, q_class, selected, ok);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN QUERY SELECT ok, ci, rw;
END;
$function$;

-- 3) Teacher RPC: per-student stats within a class the teacher owns
CREATE OR REPLACE FUNCTION public.get_student_answer_stats(_class_id uuid, _student_id uuid)
 RETURNS TABLE(
   question_id uuid,
   question_text text,
   attempts integer,
   correct_count integer,
   wrong_count integer,
   last_correct boolean,
   last_at timestamptz
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = _class_id
      AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE class_id = _class_id AND student_id = _student_id
  ) THEN
    RAISE EXCEPTION 'not a member';
  END IF;

  RETURN QUERY
  SELECT
    q.id AS question_id,
    q.text AS question_text,
    COUNT(a.*)::int AS attempts,
    COUNT(a.*) FILTER (WHERE a.is_correct)::int AS correct_count,
    COUNT(a.*) FILTER (WHERE NOT a.is_correct)::int AS wrong_count,
    (SELECT a2.is_correct FROM public.question_attempts a2
       WHERE a2.user_id = _student_id AND a2.question_id = q.id
       ORDER BY a2.created_at DESC LIMIT 1) AS last_correct,
    MAX(a.created_at) AS last_at
  FROM public.questions_bank q
  LEFT JOIN public.question_attempts a
    ON a.question_id = q.id AND a.user_id = _student_id
  WHERE q.class_id = _class_id
  GROUP BY q.id, q.text
  ORDER BY MAX(a.created_at) DESC NULLS LAST, q.text ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_student_answer_stats(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_answer_stats(uuid, uuid) TO authenticated;