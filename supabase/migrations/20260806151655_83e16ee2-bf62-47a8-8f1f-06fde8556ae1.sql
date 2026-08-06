CREATE TABLE public.class_ai_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  source_image_url text,
  frames jsonb NOT NULL DEFAULT '[]'::jsonb,
  lesson jsonb NOT NULL DEFAULT '{}'::jsonb,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_ai_lessons TO authenticated;
GRANT ALL ON public.class_ai_lessons TO service_role;
ALTER TABLE public.class_ai_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher manages own ai lessons" ON public.class_ai_lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));
CREATE POLICY "members read published ai lessons" ON public.class_ai_lessons FOR SELECT TO authenticated
  USING (published AND EXISTS (SELECT 1 FROM public.classroom_members m WHERE m.class_id = class_ai_lessons.class_id AND m.student_id = auth.uid()));

CREATE TRIGGER update_class_ai_lessons_updated_at BEFORE UPDATE ON public.class_ai_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();