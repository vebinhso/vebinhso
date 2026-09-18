
DO $$
DECLARE
  nw  int[] := ARRAY[0,700,1200,1700,2200,2700,3200,3400,3800,4000,4150,4300,5000,5800,6200,7200,8500,10000,12200,14200,17200,18000,19200,20200];
  qs  int[] := ARRAY[0,50,100,150,200,250,300,400,500,600,700,850,1000,1200,1400,1500,1800,2000,2200,2400,2700,3000,3300,3600];
  r   record;
  lvl int;
  p   double precision;
  nw_lo int; nw_hi int; q_lo int; q_hi int;
  v_nw int; v_q int; v_total int; v_money int; v_secs int; acc double precision;
  demo uuid;
BEGIN
  SELECT id INTO demo FROM auth.users WHERE email = 'vebinhso.hocsinh@gmail.com' LIMIT 1;

  FOR r IN SELECT user_id FROM public.game_state LOOP
    IF demo IS NOT NULL AND r.user_id = demo THEN CONTINUE; END IF;

    p := random();
    IF p < 0.15 THEN lvl := floor(random()*2)::int;            -- 0-1 mới chơi
    ELSIF p < 0.60 THEN lvl := 2 + floor(random()*4)::int;     -- 2-5
    ELSIF p < 0.90 THEN lvl := 6 + floor(random()*5)::int;     -- 6-10
    ELSE lvl := 11 + floor(random()*4)::int;                   -- 11-14
    END IF;

    nw_lo := nw[lvl+1]; nw_hi := nw[lvl+2];
    q_lo  := qs[lvl+1]; q_hi  := qs[lvl+2];

    v_nw := nw_lo + floor(random() * GREATEST(1, (nw_hi - nw_lo) * 0.9))::int;
    v_q  := q_lo  + floor(random() * GREATEST(1, (q_hi  - q_lo ) * 0.9))::int;

    acc := 0.60 + random() * 0.30;                              -- tỉ lệ đúng 60-90%
    v_total := GREATEST(v_q, ceil(v_q / acc)::int);
    v_money := floor(v_q * (8 + random() * 22))::int;           -- tiền còn lại hợp lý
    v_secs  := floor(v_total * (22 + random() * 45))::int;      -- ~22-67s mỗi câu

    UPDATE public.game_state SET
      level = lvl,
      net_worth = v_nw,
      correct_answers = v_q,
      total_answered = v_total,
      answer_streak = floor(random() * 9)::int,
      money = v_money,
      bricks = floor(random() * (60 + lvl * 40))::int,
      concrete = floor(random() * (10 + lvl * 8))::int,
      roof_tiles = floor(random() * (20 + lvl * 15))::int,
      roof_tiles_ton = floor(random() * (20 + lvl * 15))::int,
      paint = floor(random() * (5 + lvl * 4))::int,
      total_play_seconds = v_secs,
      updated_at = now() - (random() * interval '6 days')
    WHERE user_id = r.user_id;

    INSERT INTO public.login_streaks (user_id, total_days, current_streak, last_login_date, updated_at)
    VALUES (
      r.user_id,
      GREATEST(1, LEAST(120, 2 + lvl * 4 + floor(random() * 10)::int)),
      1 + floor(random() * LEAST(14, 2 + lvl * 2))::int,
      (now() - (floor(random() * 3) * interval '1 day'))::date,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_days = EXCLUDED.total_days,
      current_streak = EXCLUDED.current_streak,
      last_login_date = EXCLUDED.last_login_date,
      updated_at = now();
  END LOOP;
END $$;
