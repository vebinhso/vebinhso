
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard AS
SELECT gs.user_id, gs.net_worth, gs.level, gs.correct_answers,
       p.username, p.display_name, p.avatar_url
FROM public.game_state gs
JOIN public.profiles p ON p.user_id = gs.user_id
WHERE gs.banned = false;
GRANT SELECT ON public.leaderboard TO anon, authenticated;
