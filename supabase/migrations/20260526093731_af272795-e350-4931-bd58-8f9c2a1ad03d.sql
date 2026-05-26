
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.roof_style AS ENUM ('tile', 'ton');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ GAME STATE ============
CREATE TABLE public.game_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  money INTEGER NOT NULL DEFAULT 0,
  net_worth INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  answer_streak INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  bricks INTEGER NOT NULL DEFAULT 0,
  concrete INTEGER NOT NULL DEFAULT 0,
  roof_tiles INTEGER NOT NULL DEFAULT 0,
  roof_tiles_ton INTEGER NOT NULL DEFAULT 0,
  wall_color TEXT NOT NULL DEFAULT '#f5e6c8',
  owned_palettes JSONB NOT NULL DEFAULT '[]'::jsonb,
  banned BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- ============ PLACED ITEMS ============
CREATE TABLE public.placed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  x REAL NOT NULL,
  z REAL NOT NULL,
  rotation REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX placed_items_user_idx ON public.placed_items(user_id);
ALTER TABLE public.placed_items ENABLE ROW LEVEL SECURITY;

-- ============ WALLS ============
CREATE TABLE public.walls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ax REAL NOT NULL, az REAL NOT NULL,
  bx REAL NOT NULL, bz REAL NOT NULL,
  color TEXT NOT NULL DEFAULT '#f5e6c8',
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX walls_user_idx ON public.walls(user_id);
ALTER TABLE public.walls ENABLE ROW LEVEL SECURITY;

-- ============ ROOFS ============
CREATE TABLE public.roofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ax REAL NOT NULL, az REAL NOT NULL,
  bx REAL NOT NULL, bz REAL NOT NULL,
  style roof_style NOT NULL DEFAULT 'tile',
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX roofs_user_idx ON public.roofs(user_id);
ALTER TABLE public.roofs ENABLE ROW LEVEL SECURITY;

-- ============ CHARACTER OUTFIT ============
CREATE TABLE public.character_outfit (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.character_outfit ENABLE ROW LEVEL SECURITY;

-- ============ PETS ============
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL,
  name TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  equipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pets_user_idx ON public.pets(user_id);
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- ============ FRIENDS ============
CREATE TABLE public.friends (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|accepted|blocked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages(from_user, to_user, created_at);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============ LOGIN STREAKS ============
CREATE TABLE public.login_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_days INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

-- ============ QUESTIONS BANK ============
CREATE TABLE public.questions_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  choices JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer_index INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions_bank ENABLE ROW LEVEL SECURITY;

-- ============ ADMIN CONFIG ============
CREATE TABLE public.admin_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_game_state_upd BEFORE UPDATE ON public.game_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_outfit_upd BEFORE UPDATE ON public.character_outfit FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_streaks_upd BEFORE UPDATE ON public.login_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_questions_upd BEFORE UPDATE ON public.questions_bank FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_admin_cfg_upd BEFORE UPDATE ON public.admin_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ handle_new_user trigger ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_emails TEXT[] := ARRAY[
    'tamnhu.elsa@gmail.com','carrotle0808@gmail.com','dlenhah1801@gmail.com',
    'mr.ducsu@gmail.com','tienthanh090210@gmail.com',
    'student250746@ptnk.edu.vn','student250722@ptnk.edu.vn','student250729@ptnk.edu.vn'
  ];
  base_name TEXT;
  final_name TEXT;
  n INTEGER := 0;
BEGIN
  base_name := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'player'
  );
  final_name := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_name) LOOP
    n := n + 1;
    final_name := base_name || n::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, username, display_name, email)
  VALUES (NEW.id, final_name, COALESCE(NEW.raw_user_meta_data->>'display_name', final_name), NEW.email);

  INSERT INTO public.game_state (user_id) VALUES (NEW.id);
  INSERT INTO public.character_outfit (user_id) VALUES (NEW.id);
  INSERT INTO public.login_streaks (user_id) VALUES (NEW.id);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user'::app_role);

  IF lower(NEW.email) = ANY(admin_emails) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "roles_select_self" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- game_state
CREATE POLICY "gs_select_all_auth" ON public.game_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "gs_insert_own" ON public.game_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gs_update_own" ON public.game_state FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "gs_admin_all" ON public.game_state FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- placed_items / walls / roofs / pets : owner CRUD, anyone authed reads
CREATE POLICY "items_select_all" ON public.placed_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_owner_write" ON public.placed_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "walls_select_all" ON public.walls FOR SELECT TO authenticated USING (true);
CREATE POLICY "walls_owner_write" ON public.walls FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "roofs_select_all" ON public.roofs FOR SELECT TO authenticated USING (true);
CREATE POLICY "roofs_owner_write" ON public.roofs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "outfit_select_all" ON public.character_outfit FOR SELECT TO authenticated USING (true);
CREATE POLICY "outfit_owner_write" ON public.character_outfit FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pets_select_all" ON public.pets FOR SELECT TO authenticated USING (true);
CREATE POLICY "pets_owner_write" ON public.pets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "streaks_select_all" ON public.login_streaks FOR SELECT TO authenticated USING (true);
CREATE POLICY "streaks_owner_write" ON public.login_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- friends
CREATE POLICY "friends_select_involved" ON public.friends FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friends_insert_own" ON public.friends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friends_update_involved" ON public.friends FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friends_delete_involved" ON public.friends FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- messages
CREATE POLICY "msg_select_involved" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "msg_insert_own" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user);
CREATE POLICY "msg_delete_own" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = from_user);

-- questions_bank
CREATE POLICY "q_select_all_auth" ON public.questions_bank FOR SELECT TO authenticated USING (true);
CREATE POLICY "q_admin_write" ON public.questions_bank FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- admin_config
CREATE POLICY "cfg_select_all_auth" ON public.admin_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfg_admin_write" ON public.admin_config FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
