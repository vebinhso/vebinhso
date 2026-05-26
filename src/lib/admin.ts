// Admin allowlist, dynamic config & helpers — Supabase-backed
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./auth";
import type { Question } from "@/game/questions";

const CONFIG_KEY = "vebinhso_admin_config";
const LOG_KEY = "vebinhso_admin_log";

export const DEFAULT_ADMIN_EMAILS = [
  "tamnhu.elsa@gmail.com",
  "carrotle0808@gmail.com",
  "dlenhah1801@gmail.com",
  "mr.ducsu@gmail.com",
  "tienthanh090210@gmail.com",
  "student250746@ptnk.edu.vn",
  "student250722@ptnk.edu.vn",
  "student250729@ptnk.edu.vn",
];

export type AdminQuestion = Question & {
  id: string;
  imageUrl?: string;
  category?: string;
};

export type DailyReward = { day: number; coin: number; label: string };

export type AdminConfig = {
  admins: string[];
  questions: AdminQuestion[];
  priceOverrides: Record<string, number>;
  hiddenItems: string[];
  levelNetWorth: number[];
  levelQuestions: number[];
  dailyRewards: DailyReward[];
  events: { id: string; name: string; enabled: boolean }[];
  bannedAccountIds: string[];
  mapCapacity: Record<string, number>;
  flags: Record<string, boolean>;
};

const DEFAULT_CONFIG: AdminConfig = {
  admins: DEFAULT_ADMIN_EMAILS,
  questions: [],
  priceOverrides: {},
  hiddenItems: [],
  levelNetWorth: [0, 700, 1200, 1700, 2200, 2700, 3200, 3400, 3800, 4000, 4150, 4300, 5000, 5800, 6200, 7200, 8500, 10000, 12200, 14200, 17200, 18000, 19200, 20200],
  levelQuestions: [0, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 1000, 1200, 1400, 1500, 1800, 2000, 2200, 2400, 2700, 3000, 3300, 3600],
  dailyRewards: [
    { day: 1, coin: 10, label: "Ngày 1" },
    { day: 2, coin: 15, label: "Ngày 2" },
    { day: 3, coin: 20, label: "Ngày 3" },
    { day: 4, coin: 30, label: "Ngày 4" },
    { day: 5, coin: 50, label: "Ngày 5" },
    { day: 6, coin: 80, label: "Ngày 6" },
    { day: 7, coin: 150, label: "Ngày 7 (BIG)" },
  ],
  events: [
    { id: "weather", name: "Hệ thống thời tiết", enabled: true },
    { id: "festival", name: "Festival cuối tuần", enabled: false },
    { id: "double_coin", name: "Sự kiện x2 xu", enabled: false },
  ],
  bannedAccountIds: [],
  mapCapacity: { rural: 100, city: 100, magic: 50 },
  flags: {},
};

export function loadAdminConfig(): AdminConfig {
  if (typeof window === "undefined") return { ...DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAdminConfig(cfg: AdminConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new Event("admin-config-change"));
}

export function isAdmin(email?: string | null): boolean {
  const e = (email ?? getCurrentUser()?.email ?? "").toLowerCase().trim();
  if (!e) return false;
  return loadAdminConfig().admins.map((x) => x.toLowerCase()).includes(e);
}

// ===== Activity log (local) =====
export type AdminLog = { at: number; actor: string; action: string };
export function getAdminLogs(): AdminLog[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
}
export function pushAdminLog(action: string) {
  const list = getAdminLogs();
  list.unshift({ at: Date.now(), actor: getCurrentUser()?.email || "?", action });
  localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 200)));
}

// ===== Stats (Supabase) =====
export type PlayerStat = {
  id: string;        // user_id UUID
  username: string;
  email: string;
  level: number;
  money: number;
  netWorth: number;
  correctAnswers: number;
  streak: number;
  lastLoginDate: number;
};

let STATS_CACHE: PlayerStat[] = [];

/** Fetch all player stats from Supabase. */
export async function refreshPlayerStats(): Promise<PlayerStat[]> {
  const [profiles, games, streaks] = await Promise.all([
    supabase.from("profiles").select("user_id, username, email"),
    supabase.from("game_state").select("user_id, money, net_worth, correct_answers, level"),
    supabase.from("login_streaks").select("user_id, current_streak, last_login_date"),
  ]);
  const gMap = new Map<string, any>();
  (games.data || []).forEach((g: any) => gMap.set(g.user_id, g));
  const sMap = new Map<string, any>();
  (streaks.data || []).forEach((s: any) => sMap.set(s.user_id, s));
  const cfg = loadAdminConfig();
  STATS_CACHE = (profiles.data || []).map((p: any) => {
    const g = gMap.get(p.user_id) || {};
    const s = sMap.get(p.user_id) || {};
    const netWorth = g.net_worth || 0;
    const correct = g.correct_answers || 0;
    let lvl = g.level || 0;
    if (!lvl) {
      for (let i = 1; i < cfg.levelNetWorth.length; i++) {
        if (netWorth >= cfg.levelNetWorth[i] && correct >= cfg.levelQuestions[i]) lvl = i;
        else break;
      }
    }
    return {
      id: p.user_id,
      username: p.username,
      email: p.email || "",
      level: lvl,
      money: g.money || 0,
      netWorth,
      correctAnswers: correct,
      streak: s.current_streak || 0,
      lastLoginDate: s.last_login_date ? new Date(s.last_login_date).getTime() : 0,
    };
  });
  return STATS_CACHE;
}

export function getAllPlayerStats(): PlayerStat[] {
  return STATS_CACHE;
}

export async function updatePlayerGame(userId: string, patch: Record<string, any>) {
  // Convert camelCase to snake_case for DB
  const map: Record<string, string> = {
    money: "money", netWorth: "net_worth", correctAnswers: "correct_answers",
    level: "level", bricks: "bricks", concrete: "concrete",
  };
  const dbPatch: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) dbPatch[map[k] || k] = v;
  await supabase.from("game_state").update(dbPatch as any).eq("user_id", userId);
}

export async function resetPasswordRandom(_userId: string): Promise<string | null> {
  // Password reset through Supabase requires admin API (service role).
  // From client-side admin panel, prompt user to use the "forgot password" flow.
  return null;
}

// ===== Questions Bank (Supabase) =====
export async function fetchQuestions(): Promise<AdminQuestion[]> {
  const { data, error } = await supabase
    .from("questions_bank")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    q: row.text,
    options: Array.isArray(row.choices) ? row.choices : [],
    answer: row.answer_index ?? 0,
    reward: row.reward ?? 10,
    imageUrl: row.image_url ?? "",
    category: row.category ?? "",
  }));
}

function toDbRow(q: AdminQuestion) {
  return {
    text: q.q,
    choices: q.options as any,
    answer_index: q.answer,
    reward: q.reward ?? 10,
    image_url: q.imageUrl || null,
    category: q.category || null,
  };
}

export async function createQuestion(q: AdminQuestion): Promise<AdminQuestion> {
  const { data, error } = await supabase
    .from("questions_bank")
    .insert(toDbRow(q) as any)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    q: data.text,
    options: Array.isArray(data.choices) ? (data.choices as any) : [],
    answer: data.answer_index ?? 0,
    reward: (data as any).reward ?? 10,
    imageUrl: data.image_url ?? "",
    category: data.category ?? "",
  };
}

export async function updateQuestion(id: string, q: AdminQuestion): Promise<void> {
  const { error } = await supabase
    .from("questions_bank")
    .update(toDbRow(q) as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions_bank").delete().eq("id", id);
  if (error) throw error;
}
