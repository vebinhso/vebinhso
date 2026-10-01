CREATE TABLE public.ai_skills (
  key text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_skills TO authenticated;
GRANT ALL ON public.ai_skills TO service_role;
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins select ai_skills" ON public.ai_skills FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert ai_skills" ON public.ai_skills FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update ai_skills" ON public.ai_skills FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete ai_skills" ON public.ai_skills FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.ai_skills_bump_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.version = OLD.version + 1;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER ai_skills_bump_version BEFORE UPDATE ON public.ai_skills
FOR EACH ROW EXECUTE FUNCTION public.ai_skills_bump_version();