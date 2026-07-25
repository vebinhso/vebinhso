
CREATE TABLE public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  house_owner UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_category TEXT,
  topic_domain INT,
  question_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL DEFAULT 'pending',
  host_score INT NOT NULL DEFAULT 0,
  guest_score INT NOT NULL DEFAULT 0,
  winner_id UUID,
  payout INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.duels TO authenticated;
GRANT ALL ON public.duels TO service_role;

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duel players can view"
  ON public.duels FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "host can insert"
  ON public.duels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "players can update own duel"
  ON public.duels FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id)
  WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE TABLE public.duel_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
  q_index INT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  ms INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (duel_id, q_index, user_id)
);

CREATE INDEX duel_answers_duel_idx ON public.duel_answers(duel_id);

GRANT SELECT, INSERT ON public.duel_answers TO authenticated;
GRANT ALL ON public.duel_answers TO service_role;

ALTER TABLE public.duel_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duel players view answers"
  ON public.duel_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.duels d
      WHERE d.id = duel_id AND (auth.uid() = d.host_id OR auth.uid() = d.guest_id)
    )
  );

CREATE POLICY "duel players insert own answers"
  ON public.duel_answers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.duels d
      WHERE d.id = duel_id AND (auth.uid() = d.host_id OR auth.uid() = d.guest_id)
    )
  );
