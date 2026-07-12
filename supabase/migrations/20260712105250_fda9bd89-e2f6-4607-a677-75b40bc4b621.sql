
DROP VIEW IF EXISTS public.leaderboard;

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text,
              net_worth int, level int, correct_answers int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT gs.user_id, p.username, p.display_name, p.avatar_url,
         gs.net_worth, gs.level, gs.correct_answers
  FROM public.game_state gs
  JOIN public.profiles p ON p.user_id = gs.user_id
  WHERE gs.banned = false;
$$;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, anon;
