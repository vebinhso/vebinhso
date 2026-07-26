CREATE TABLE public.class_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'material',
  title text NOT NULL,
  content text,
  link_url text,
  file_url text,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_posts TO authenticated;
GRANT ALL ON public.class_posts TO service_role;
ALTER TABLE public.class_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher manages own class posts" ON public.class_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));
CREATE POLICY "members read class posts" ON public.class_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classroom_members m WHERE m.class_id = class_posts.class_id AND m.student_id = auth.uid()));

CREATE TABLE public.class_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.class_posts(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT auth.uid(),
  file_url text,
  file_name text,
  note text,
  grade text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_submissions TO authenticated;
GRANT ALL ON public.class_submissions TO service_role;
ALTER TABLE public.class_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student manages own submission" ON public.class_submissions FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "teacher reads class submissions" ON public.class_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));
CREATE POLICY "teacher grades class submissions" ON public.class_submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

CREATE TRIGGER update_class_posts_updated_at BEFORE UPDATE ON public.class_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_submissions_updated_at BEFORE UPDATE ON public.class_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_class_roster(_class_id uuid)
RETURNS TABLE(user_id uuid, display_name text, username text, is_teacher boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.classroom_members m WHERE m.class_id = _class_id AND m.student_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = _class_id AND c.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.display_name, p.username, true
    FROM public.classes c JOIN public.profiles p ON p.user_id = c.teacher_id
    WHERE c.id = _class_id
    UNION ALL
    SELECT p.user_id, p.display_name, p.username, false
    FROM public.classroom_members m JOIN public.profiles p ON p.user_id = m.student_id
    WHERE m.class_id = _class_id
    ORDER BY 4 DESC, 2 ASC;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_class_roster(uuid) FROM anon;