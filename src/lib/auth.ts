// Supabase-backed auth — keeps a synchronous `getCurrentUser()` for legacy callers
// by maintaining an in-memory cache hydrated from `supabase.auth` + `profiles`.
import { supabase } from "@/integrations/supabase/client";
import { loadGame, saveGame } from "./game";

export type Account = {
  id: string; // auth.users.id (UUID)
  username: string;
  email: string;
  createdAt: string;
  avatarUrl?: string | null;
};

export type LoginStreak = {
  totalDays: number;
  currentStreak: number;
  lastLoginDate: number;
};

const CACHE_KEY = "vebinhso_current_user_cache";
let CURRENT: Account | null = null;
let STREAK: LoginStreak = { totalDays: 0, currentStreak: 0, lastLoginDate: 0 };

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) CURRENT = JSON.parse(raw);
  } catch { /* noop */ }
}

function persist() {
  if (typeof window === "undefined") return;
  if (CURRENT) localStorage.setItem(CACHE_KEY, JSON.stringify(CURRENT));
  else localStorage.removeItem(CACHE_KEY);
  window.dispatchEvent(new Event("auth-change"));
}

export function getCurrentUser(): Account | null {
  return CURRENT;
}

export function setCurrentUserCache(a: Account | null) {
  CURRENT = a;
  persist();
}

/** Sign out + clear caches. */
export async function signOut() {
  await supabase.auth.signOut();
  CURRENT = null;
  persist();
}

/** Email + password sign in. */
export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Email + password sign up with username metadata. */
export async function signUpWithPassword(opts: {
  email: string; password: string; username: string;
}) {
  const { error } = await supabase.auth.signUp({
    email: opts.email,
    password: opts.password,
    options: {
      data: { username: opts.username, display_name: opts.username },
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
}

/** Hydrate cache from current session — call on auth state changes. */
export async function hydrateFromSession(): Promise<Account | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) { setCurrentUserCache(null); return null; }

  const u = session.user;
  // Fetch profile (created by trigger)
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, created_at, email, avatar_url")
    .eq("user_id", u.id)
    .maybeSingle();

  const acc: Account = {
    id: u.id,
    username: profile?.username || (u.email?.split("@")[0] ?? "player"),
    email: profile?.email || u.email || "",
    createdAt: profile?.created_at || u.created_at || new Date().toISOString(),
    avatarUrl: (profile as any)?.avatar_url ?? null,
  };
  setCurrentUserCache(acc);
  try { recordLoginDay(acc.id); } catch {}
  return acc;
}

export async function renameAccount(newName: string): Promise<{ ok: boolean; msg: string; cost: number }> {
  const u = getCurrentUser();
  if (!u) return { ok: false, msg: "Chưa đăng nhập", cost: 0 };
  const name = newName.trim();
  if (name.length < 2 || name.length > 20) return { ok: false, msg: "Tên phải từ 2–20 ký tự", cost: 0 };

  const { data: prof } = await supabase
    .from("profiles").select("name_changes").eq("user_id", u.id).maybeSingle();
  const changes = (prof as any)?.name_changes ?? 0;
  const cost = changes === 0 ? 0 : 50;

  const { data: existing } = await supabase
    .from("profiles").select("user_id").eq("username", name).maybeSingle();
  if (existing && (existing as any).user_id !== u.id) {
    return { ok: false, msg: "Tên này đã có người dùng", cost };
  }

  if (cost > 0) {
    const g = loadGame();
    if (g.money < cost) return { ok: false, msg: `Cần ${cost} xu để đổi tên (đang có ${g.money})`, cost };
    saveGame({ ...g, money: g.money - cost });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: name, display_name: name, name_changes: changes + 1 })
    .eq("user_id", u.id);
  if (error) {
    if (cost > 0) { const g = loadGame(); saveGame({ ...g, money: g.money + cost }); }
    return { ok: false, msg: error.message, cost };
  }

  setCurrentUserCache({ ...u, username: name });
  return { ok: true, msg: cost > 0 ? `Đã đổi tên (−${cost} xu)` : "Đã đổi tên (miễn phí lần đầu)", cost };
}

// ===== Login streak (kept local for now — non-critical) =====
const STREAK_KEY = "vebinhso_login_streak_v2";
function readStreak(uid: string): LoginStreak {
  if (typeof window === "undefined") return { totalDays: 0, currentStreak: 0, lastLoginDate: 0 };
  try {
    const map = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
    return map[uid] || { totalDays: 0, currentStreak: 0, lastLoginDate: 0 };
  } catch { return { totalDays: 0, currentStreak: 0, lastLoginDate: 0 }; }
}
function writeStreak(uid: string, s: LoginStreak) {
  if (typeof window === "undefined") return;
  try {
    const map = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
    map[uid] = s;
    localStorage.setItem(STREAK_KEY, JSON.stringify(map));
  } catch { /* noop */ }
}

export function recordLoginDay(uid: string): LoginStreak {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const cur = readStreak(uid);
  let next: LoginStreak;
  if (!cur.lastLoginDate) {
    next = { totalDays: 1, currentStreak: 1, lastLoginDate: today };
  } else {
    const oneDay = 86400000;
    const diff = (today - cur.lastLoginDate) / oneDay;
    if (diff === 0) next = cur;
    else if (diff === 1) next = { totalDays: cur.totalDays + 1, currentStreak: cur.currentStreak + 1, lastLoginDate: today };
    else next = { totalDays: cur.totalDays + 1, currentStreak: 1, lastLoginDate: today };
  }
  writeStreak(uid, next);
  STREAK = next;
  // Best-effort sync to DB
  supabase.from("login_streaks").upsert({
    user_id: uid,
    total_days: next.totalDays,
    current_streak: next.currentStreak,
    last_login_date: new Date(next.lastLoginDate).toISOString().slice(0, 10),
  }).then(() => {}, () => {});
  return next;
}

export function getLoginStreak(_uid: string): LoginStreak {
  return STREAK;
}

export function getLoginAt(): number {
  return Date.now();
}

// ===== Legacy shims =====
let LEGACY_PROFILES: Account[] = [];
export function _setLegacyProfiles(list: Account[]) { LEGACY_PROFILES = list; }
export function getAccounts(): Account[] { return LEGACY_PROFILES; }
export function setCurrentUser(a: Account | null) { if (a === null) void signOut(); }
export function findAccount(_id: string, _pwd: string): Account | null { return null; }
export function createPendingRegistration(_o: { username: string; email: string; password: string }) {
  return { token: "", expiresAt: 0 };
}
export function verifyRegistration(_t: string): { ok: false; reason: string } {
  return { ok: false, reason: "Hệ thống đã chuyển sang đăng nhập mới — vui lòng đăng ký lại." };
}
