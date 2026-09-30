ALTER TABLE public.questions_bank
  ADD COLUMN IF NOT EXISTS text_en text,
  ADD COLUMN IF NOT EXISTS choices_en jsonb;

ALTER TABLE public.questions_bank
  DROP CONSTRAINT IF EXISTS questions_bank_choices_en_shape,
  ADD CONSTRAINT questions_bank_choices_en_shape CHECK (
    choices_en IS NULL OR (
      jsonb_typeof(choices_en) = 'array'
      AND jsonb_array_length(choices_en) = jsonb_array_length(choices)
    )
  );

COMMENT ON COLUMN public.questions_bank.text_en IS 'English translation of text; NULL falls back to Vietnamese text.';
COMMENT ON COLUMN public.questions_bank.choices_en IS 'English choices in the same positional order as choices; NULL falls back to Vietnamese choices.';