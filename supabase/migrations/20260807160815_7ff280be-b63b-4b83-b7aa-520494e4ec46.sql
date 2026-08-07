CREATE TABLE public.class_annotated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL DEFAULT auth.uid(),
  kind TEXT NOT NULL DEFAULT 'material',
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_annotated_images TO authenticated;
GRANT ALL ON public.class_annotated_images TO service_role;
ALTER TABLE public.class_annotated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher manages own annotated images"
ON public.class_annotated_images FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_annotated_images.class_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_annotated_images.class_id AND c.teacher_id = auth.uid()));

CREATE POLICY "members read published annotated images"
ON public.class_annotated_images FOR SELECT TO authenticated
USING (published AND EXISTS (
  SELECT 1 FROM public.classroom_members m
  WHERE m.class_id = class_annotated_images.class_id AND m.student_id = auth.uid()
));

CREATE TABLE public.class_note_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID NOT NULL REFERENCES public.class_annotated_images(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  student_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  answer TEXT NOT NULL DEFAULT '',
  grade TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (image_id, note_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_note_answers TO authenticated;
GRANT ALL ON public.class_note_answers TO service_role;
ALTER TABLE public.class_note_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student manages own note answer"
ON public.class_note_answers FOR ALL TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "teacher reads class note answers"
ON public.class_note_answers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_note_answers.class_id AND c.teacher_id = auth.uid()));

CREATE POLICY "teacher grades class note answers"
ON public.class_note_answers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_note_answers.class_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_note_answers.class_id AND c.teacher_id = auth.uid()));

CREATE TRIGGER update_class_annotated_images_updated_at
BEFORE UPDATE ON public.class_annotated_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_note_answers_updated_at
BEFORE UPDATE ON public.class_note_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();