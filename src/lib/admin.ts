// Admin allowlist, dynamic config & helpers
import { getCurrentUser, getAccounts } from "./auth";
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
  imageUrl?: string; // ảnh cho đáp án (nếu có)
  category?: string;
};

export type DailyReward = { day: number; coin: number; label: string };

export type AdminConfig = {
  admins: string[]; // emails (lowercased)
  questions: AdminQuestion[]; // null/empty => dùng default
  priceOverrides: Record<string, number>; // itemId -> price
  hiddenItems: string[]; // itemId bị ẩn khỏi shop
  levelNetWorth: number[];
  levelQuestions: number[];
  dailyRewards: DailyReward[];
  events: { id: string; name: string; enabled: boolean }[];
  bannedAccountIds: number[];
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

// ===== Activity log =====
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

// ===== Stats =====
export type PlayerStat = {
  id: number;
  username: string;
  email: string;
  level: number;
  money: number;
  netWorth: number;
  correctAnswers: number;
  streak: number;
  lastLoginDate: number;
};

export function getAllPlayerStats(): PlayerStat[] {
  if (typeof window === "undefined") return [];
  const accounts = getAccounts();
  const streakMap: Record<string, { totalDays: number; currentStreak: number; lastLoginDate: number }> = (() => {
    try { return JSON.parse(localStorage.getItem("vebinhso_login_streak") || "{}"); } catch { return {}; }
  })();
  const cfg = loadAdminConfig();

  return accounts.map((a) => {
    let game: any = {};
    try {
      const raw = localStorage.getItem("vebinhso_game_" + a.id);
      if (raw) game = JSON.parse(raw);
    } catch { /* noop */ }
    const netWorth = game.netWorth || 0;
    const correct = game.correctAnswers || 0;
    let lvl = 0;
    for (let i = 1; i < cfg.levelNetWorth.length; i++) {
      if (netWorth >= cfg.levelNetWorth[i] && correct >= cfg.levelQuestions[i]) lvl = i;
      else break;
    }
    const s = streakMap[String(a.id)] || { totalDays: 0, currentStreak: 0, lastLoginDate: 0 };
    return {
      id: a.id,
      username: a.username,
      email: a.email,
      level: lvl,
      money: game.money || 0,
      netWorth,
      correctAnswers: correct,
      streak: s.currentStreak || 0,
      lastLoginDate: s.lastLoginDate || 0,
    };
  });
}

export function updatePlayerGame(accountId: number, patch: Record<string, any>) {
  const key = "vebinhso_game_" + accountId;
  let cur: any = {};
  try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* noop */ }
  localStorage.setItem(key, JSON.stringify({ ...cur, ...patch }));
}

export function resetPasswordRandom(accountId: number): string | null {
  try {
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx < 0) return null;
    const newPwd = Math.random().toString(36).slice(-8);
    accounts[idx].password = newPwd;
    localStorage.setItem("vebinhso_accounts", JSON.stringify(accounts));
    return newPwd;
  } catch { return null; }
}
