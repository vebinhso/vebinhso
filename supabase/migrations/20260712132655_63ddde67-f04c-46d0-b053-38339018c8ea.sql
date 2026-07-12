ALTER TABLE public.questions_bank
ADD COLUMN IF NOT EXISTS competency_level SMALLINT NULL CHECK (competency_level IS NULL OR (competency_level BETWEEN 1 AND 8));

CREATE INDEX IF NOT EXISTS idx_questions_bank_competency_level ON public.questions_bank(competency_level) WHERE competency_level IS NOT NULL;