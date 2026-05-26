
-- Wipe game/user data first (no FK to auth.users in current schema)
TRUNCATE TABLE public.messages, public.friends, public.pets, public.placed_items,
  public.walls, public.roofs, public.character_outfit, public.login_streaks,
  public.game_state, public.user_roles, public.profiles RESTART IDENTITY;

-- Delete all auth users (identities/sessions cascade)
DELETE FROM auth.users;
