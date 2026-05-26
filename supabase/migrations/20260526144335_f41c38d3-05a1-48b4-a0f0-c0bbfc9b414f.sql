
ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS correct_indexes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS maps jsonb NOT NULL DEFAULT '["all"]'::jsonb;

UPDATE public.questions_bank
SET correct_indexes = to_jsonb(ARRAY[answer_index])
WHERE correct_indexes = '[]'::jsonb;

UPDATE public.questions_bank
SET choices = (
  SELECT jsonb_agg(jsonb_build_object('text', elem, 'imageUrl', ''))
  FROM jsonb_array_elements_text(choices) AS elem
)
WHERE jsonb_typeof(choices->0) = 'string';
