ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

INSERT INTO public.admin_config (key, value)
VALUES ('priority_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;