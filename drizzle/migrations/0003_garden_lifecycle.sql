ALTER TABLE public.garden_plants ADD COLUMN IF NOT EXISTS boosted boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.garden_water(plant uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid=auth.uid(); p public.garden_plants; today date=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
 SELECT * INTO p FROM public.garden_plants WHERE id=plant AND owner_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plant unavailable'; END IF;
 IF today-COALESCE((p.watered_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,(p.planted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)>=3 THEN RAISE EXCEPTION 'Plant wilted'; END IF;
 IF p.watered_at IS NOT NULL AND (p.watered_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=today THEN RAISE EXCEPTION 'Already watered today'; END IF;
 UPDATE public.garden_inventory SET quantity=quantity-1 WHERE user_id=uid AND item_id='watering_use' AND quantity>0;
 IF NOT FOUND THEN RAISE EXCEPTION 'Buy a watering use first'; END IF;
 UPDATE public.garden_plants SET watered_at=now() WHERE id=plant;
END $$;
CREATE OR REPLACE FUNCTION public.garden_remove_wilted(plant uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid=auth.uid(); p public.garden_plants; balance integer; spent integer;
BEGIN
 SELECT * INTO p FROM public.garden_plants WHERE id=plant AND owner_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plant unavailable'; END IF;
 IF (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-COALESCE((p.watered_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,(p.planted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)<3 THEN RAISE EXCEPTION 'Plant is not wilted'; END IF;
 UPDATE public.game_state SET money=money-20,garden_spent=garden_spent+20 WHERE user_id=uid AND money>=20 RETURNING money,garden_spent INTO balance,spent;
 IF NOT FOUND THEN RAISE EXCEPTION 'Not enough coins'; END IF;
 DELETE FROM public.garden_plants WHERE id=plant;
 RETURN jsonb_build_object('money',balance,'garden_spent',spent);
END $$;
REVOKE ALL ON FUNCTION public.garden_remove_wilted(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garden_remove_wilted(uuid) TO authenticated;
