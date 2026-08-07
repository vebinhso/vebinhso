REVOKE EXECUTE ON FUNCTION public.get_student_answer_stats(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_class_roster(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_class_roster(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.can_read_classroom_file(_owner_folder text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _owner_folder = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.classroom_members m
      JOIN public.classes c ON c.id = m.class_id
      WHERE c.teacher_id = auth.uid() AND m.student_id::text = _owner_folder
    )
    OR EXISTS (
      SELECT 1 FROM public.classroom_members m
      JOIN public.classes c ON c.id = m.class_id
      WHERE m.student_id = auth.uid() AND c.teacher_id::text = _owner_folder
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_classroom_file(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_read_classroom_file(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_read_classroom_file(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_classroom_file(text) TO service_role;

DROP POLICY IF EXISTS "classroom read authenticated" ON storage.objects;
CREATE POLICY "classroom read scoped" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom'
  AND public.can_read_classroom_file((storage.foldername(name))[1])
);