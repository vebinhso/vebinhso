ALTER TABLE public.questions_bank
  ADD COLUMN IF NOT EXISTS correct_count integer
  GENERATED ALWAYS AS (
    CASE WHEN jsonb_typeof(correct_indexes) = 'array'
      THEN jsonb_array_length(correct_indexes)
      ELSE 1 END
  ) STORED;