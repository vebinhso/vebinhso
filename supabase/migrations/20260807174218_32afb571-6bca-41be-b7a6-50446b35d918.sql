CREATE OR REPLACE FUNCTION public.can_read_classroom_file(_owner_folder text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id::text = _owner_folder AND c.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classroom_members m
      WHERE m.class_id::text = _owner_folder AND m.student_id = auth.uid()
    )
  );
$function$;