-- Garden challenges: answers and payments verified atomically in Postgres.
CREATE TABLE IF NOT EXISTS public.garden_challenges (
 user_id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('water','boost')),
 plant_id uuid, streak integer NOT NULL DEFAULT 0, completed boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.garden_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.garden_challenges FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.garden_challenge_start(kind text, plant uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR kind NOT IN ('water','boost') THEN RAISE EXCEPTION 'Invalid challenge'; END IF;
 IF kind='boost' AND NOT EXISTS(SELECT 1 FROM public.garden_plants WHERE id=plant AND owner_id=auth.uid() AND NOT boosted) THEN RAISE EXCEPTION 'Plant unavailable'; END IF;
 INSERT INTO public.garden_challenges(user_id,kind,plant_id,streak,completed,updated_at)
 VALUES(auth.uid(),kind,plant,0,false,now())
 ON CONFLICT(user_id) DO UPDATE SET kind=EXCLUDED.kind,plant_id=EXCLUDED.plant_id,streak=0,completed=false,updated_at=now();
END $$;
CREATE OR REPLACE FUNCTION public.garden_challenge_answer(qid uuid, selected integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.garden_challenges; ci integer[]; ok boolean;
BEGIN
 SELECT * INTO c FROM public.garden_challenges WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR c.completed OR c.updated_at<now()-interval '1 hour' THEN RAISE EXCEPTION 'Challenge expired'; END IF;
 SELECT COALESCE((SELECT array_agg(v::integer) FROM jsonb_array_elements_text(q.correct_indexes) v),ARRAY[q.answer_index])
 INTO ci FROM public.questions_bank q WHERE q.id=qid AND q.enabled IS DISTINCT FROM false;
 IF ci IS NULL THEN RAISE EXCEPTION 'Question unavailable'; END IF;
 ok=selected=ANY(ci);
 UPDATE public.garden_challenges SET streak=CASE WHEN ok THEN streak+1 ELSE 0 END,
 completed=CASE WHEN ok THEN streak+1>=CASE WHEN kind='boost' THEN 5 ELSE 1 END ELSE false END,
 updated_at=now() WHERE user_id=auth.uid() RETURNING * INTO c;
 RETURN jsonb_build_object('correct',ok,'streak',c.streak,'completed',c.completed);
END $$;
CREATE OR REPLACE FUNCTION public.garden_challenge_purchase(item text, plant uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.garden_challenges; p public.garden_plants; cost integer; balance integer; spent integer;
BEGIN
 SELECT * INTO c FROM public.garden_challenges WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT c.completed OR c.updated_at<now()-interval '1 hour' THEN RAISE EXCEPTION 'Answer challenge first'; END IF;
 IF (item='watering_use' AND c.kind<>'water') OR (item='boost' AND (c.kind<>'boost' OR c.plant_id IS DISTINCT FROM plant)) OR item NOT IN ('watering_use','boost') THEN RAISE EXCEPTION 'Wrong challenge'; END IF;
 IF item='boost' THEN
  SELECT * INTO p FROM public.garden_plants WHERE id=plant AND owner_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR p.boosted THEN RAISE EXCEPTION 'Boost unavailable'; END IF;
  IF (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-COALESCE((p.watered_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,(p.planted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)>=3 THEN RAISE EXCEPTION 'Plant wilted'; END IF;
 END IF;
 cost=CASE WHEN item='boost' THEN 30 ELSE 5 END;
 UPDATE public.game_state SET money=money-cost,garden_spent=garden_spent+cost WHERE user_id=auth.uid() AND money>=cost RETURNING money,garden_spent INTO balance,spent;
 IF NOT FOUND THEN RAISE EXCEPTION 'Not enough coins'; END IF;
 IF item='boost' THEN UPDATE public.garden_plants SET boosted=true WHERE id=plant;
 ELSE INSERT INTO public.garden_inventory(user_id,item_id,quantity) VALUES(auth.uid(),'watering_use',1)
 ON CONFLICT(user_id,item_id) DO UPDATE SET quantity=garden_inventory.quantity+1;
 END IF;
 DELETE FROM public.garden_challenges WHERE user_id=auth.uid();
 RETURN jsonb_build_object('money',balance,'garden_spent',spent);
END $$;
REVOKE ALL ON FUNCTION public.garden_challenge_start(text,uuid), public.garden_challenge_answer(uuid,integer), public.garden_challenge_purchase(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garden_challenge_start(text,uuid), public.garden_challenge_answer(uuid,integer), public.garden_challenge_purchase(text,uuid) TO authenticated;
-- Prevent bypassing the water question through the old purchase RPC.
CREATE OR REPLACE FUNCTION public.garden_purchase(item text, amount integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid=auth.uid(); cost integer; balance integer; spent integer;
BEGIN
 IF uid IS NULL OR amount<1 OR amount>99 THEN RAISE EXCEPTION 'Invalid purchase'; END IF;
 IF item='watering_use' THEN RAISE EXCEPTION 'Answer challenge first'; END IF;
 cost=CASE item WHEN 'seed_rose' THEN 18 WHEN 'seed_mango' THEN 30 WHEN 'seed_sunflower' THEN 12 WHEN 'seed_paper' THEN 12 ELSE NULL END;
 IF cost IS NULL THEN RAISE EXCEPTION 'Invalid item'; END IF;
 UPDATE public.game_state SET money=money-cost*amount,garden_spent=garden_spent+cost*amount WHERE user_id=uid AND money>=cost*amount RETURNING money,garden_spent INTO balance,spent;
 IF NOT FOUND THEN RAISE EXCEPTION 'Not enough coins'; END IF;
 INSERT INTO public.garden_inventory(user_id,item_id,quantity) VALUES(uid,item,amount) ON CONFLICT(user_id,item_id) DO UPDATE SET quantity=garden_inventory.quantity+amount;
 RETURN jsonb_build_object('money',balance,'garden_spent',spent);
END $$;
