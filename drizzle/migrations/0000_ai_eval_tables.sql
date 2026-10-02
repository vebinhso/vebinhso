CREATE TABLE public.ai_eval_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_eval_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.ai_eval_sets(id) ON DELETE CASCADE,
  check_kind text NOT NULL CHECK (check_kind IN ('text','link','email','phone','news')),
  content text NOT NULL,
  context text,
  label text NOT NULL CHECK (label IN ('scam','legit')),
  grp text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_eval_cases_set_idx ON public.ai_eval_cases(set_id);
CREATE TABLE public.ai_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.ai_eval_sets(id) ON DELETE CASCADE,
  label text NOT NULL,
  attempts smallint NOT NULL DEFAULT 1 CHECK (attempts IN (1,2)),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done')),
  skill_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX ai_eval_runs_set_idx ON public.ai_eval_runs(set_id);
CREATE TABLE public.ai_eval_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ai_eval_runs(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.ai_eval_cases(id) ON DELETE CASCADE,
  attempt smallint NOT NULL DEFAULT 1,
  check_kind text NOT NULL,
  label text NOT NULL,
  risk_score integer,
  band text CHECK (band IN ('high','mid','low')),
  predicted text CHECK (predicted IN ('scam','legit')),
  correct boolean,
  skill_key text,
  skill_version integer,
  margin integer,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, case_id, attempt)
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['ai_eval_sets','ai_eval_cases','ai_eval_runs','ai_eval_results'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Admins manage %s" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t, t);
  END LOOP;
END $$;