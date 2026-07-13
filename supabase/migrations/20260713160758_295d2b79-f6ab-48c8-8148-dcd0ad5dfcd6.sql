ALTER TABLE public.questions_bank
  ADD COLUMN IF NOT EXISTS competency_domain smallint
    CHECK (competency_domain IS NULL OR (competency_domain BETWEEN 1 AND 6));

-- Backfill category to default 'history' where NULL/empty so filter never drops rows
UPDATE public.questions_bank
SET category = 'history'
WHERE category IS NULL OR btrim(category) = '';