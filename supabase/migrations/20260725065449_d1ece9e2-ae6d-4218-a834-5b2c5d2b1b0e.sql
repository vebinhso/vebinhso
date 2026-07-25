-- Add visit-based SELECT policies so getVisitableHouse can read as the visitor.
-- can_visit_house(owner) enforces public/friends/private rules.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['placed_items','walls','roofs','floors','character_outfit']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_visit_select" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_visit_select" ON public.%I FOR SELECT TO authenticated USING (public.can_visit_house(user_id))',
      t, t
    );
  END LOOP;
END $$;
