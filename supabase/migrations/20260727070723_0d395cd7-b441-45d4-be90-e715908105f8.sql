CREATE OR REPLACE FUNCTION public.get_friend_houses()
 RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, map_x double precision, map_y double precision, house_privacy text, house_name text, is_online boolean, in_house_owner uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT active_class_id FROM public.profiles WHERE user_id = auth.uid()
  ),
  ids AS (
    SELECT CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END AS uid
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (f.user_id = auth.uid() OR f.friend_id = auth.uid())
    UNION
    SELECT cm.student_id
    FROM public.classroom_members cm, me
    WHERE me.active_class_id IS NOT NULL AND cm.class_id = me.active_class_id
    UNION
    SELECT c.teacher_id
    FROM public.classes c, me
    WHERE me.active_class_id IS NOT NULL AND c.id = me.active_class_id
  )
  SELECT p.user_id, p.username, p.display_name, p.avatar_url,
         p.map_x, p.map_y, p.house_privacy, p.house_name,
         COALESCE(pr.is_online, false) AS is_online,
         pr.in_house_owner
  FROM public.profiles p
  LEFT JOIN public.presence pr ON pr.user_id = p.user_id
  WHERE p.user_id IN (SELECT uid FROM ids WHERE uid IS NOT NULL)
    AND p.user_id <> auth.uid();
$function$;