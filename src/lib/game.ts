// Game state persistence per-account
import { getCurrentUser } from "./auth";

export type PlacedItem = {
  id: string;
  itemId: string;
  x: number;
  z: number;
  rotation: number;
};

export type WallSegment = {
  id: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  color: string;
};

export type GameState = {
  money: number;
  netWorth: number;
  correctAnswers: number;
  answerStreak: number;
  level: number;
  placed: PlacedItem[];
  bricks: number;
  concrete: number;
  walls: WallSegment[];
  wallColor: string;
  ownedPalettes: string[]; // palette ids unlocked
};

const PREFIX = "vebinhso_game_";

const DEFAULT: GameState = {
  money: 0,
  netWorth: 0,
  correctAnswers: 0,
  answerStreak: 0,
  level: 0,
  placed: [],
  bricks: 0,
  concrete: 0,
  walls: [],
  wallColor: "#f5e6c8",
  ownedPalettes: [],
};

function key() {
  const u = getCurrentUser();
  return u ? PREFIX + u.id : null;
}

export function loadGame(): GameState {
  const k = key();
  if (!k || typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveGame(s: GameState) {
  const k = key();
  if (!k) return;
  localStorage.setItem(k, JSON.stringify(s));
}

// Theo "BẢNG CHI TIẾT TRÒ CHƠI" — ngưỡng TÀI SẢN RÒNG (🏠) + tổng câu hỏi để lên cấp
const LEVEL_MIN_NETWORTH = [
  0, 700, 1200, 1700, 2200, 2700, 3200, 3400, 3800, 4000, 4150,
  4300, 5000, 5800, 6200, 7200, 8500, 10000, 12200, 14200, 17200,
  18000, 19200, 20200,
];
const LEVEL_MIN_QUESTIONS = [
  0, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700,
  850, 1000, 1200, 1400, 1500, 1800, 2000, 2200, 2400, 2700,
  3000, 3300, 3600,
];

export function computeLevel(s: GameState): number {
  let lvl = 0;
  for (let i = 1; i < LEVEL_MIN_NETWORTH.length; i++) {
    if (s.netWorth >= LEVEL_MIN_NETWORTH[i] && s.correctAnswers >= LEVEL_MIN_QUESTIONS[i]) {
      lvl = i;
    } else break;
  }
  return lvl;
}

export function nextLevelInfo(s: GameState) {
  const lvl = computeLevel(s);
  const next = Math.min(lvl + 1, LEVEL_MIN_NETWORTH.length - 1);
  return {
    current: lvl,
    next,
    netWorthNeeded: LEVEL_MIN_NETWORTH[next] ?? null,
    questionsNeeded: LEVEL_MIN_QUESTIONS[next] ?? null,
  };
}

// Wall conversion: 1m wide × 5m tall = 10 bricks + 1 concrete bucket
export const WALL_HEIGHT = 5;
export const BRICKS_PER_METER = 10;
export const CONCRETE_PER_METER = 1;

export function wallCost(lengthMeters: number) {
  const L = Math.max(1, Math.ceil(lengthMeters));
  return { bricks: L * BRICKS_PER_METER, concrete: L * CONCRETE_PER_METER, length: L };
}

// Curated wall color palettes (inspired by Coolors)
export const WALL_PALETTES: { id: string; name: string; colors: string[] }[] = [
  { id: "warm-sand", name: "Cát ấm", colors: ["#f5e6c8", "#e8d5a8", "#d4a574", "#a16207", "#78350f"] },
  { id: "ocean", name: "Đại dương", colors: ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7", "#0c4a6e"] },
  { id: "forest", name: "Rừng xanh", colors: ["#dcfce7", "#86efac", "#22c55e", "#15803d", "#14532d"] },
  { id: "sunset", name: "Hoàng hôn", colors: ["#fff7ed", "#fed7aa", "#fb923c", "#ea580c", "#9a3412"] },
  { id: "blush", name: "Hồng nhẹ", colors: ["#fdf2f8", "#fbcfe8", "#f472b6", "#db2777", "#831843"] },
  { id: "mono", name: "Đen trắng", colors: ["#ffffff", "#e5e7eb", "#9ca3af", "#4b5563", "#111827"] },
  { id: "lavender", name: "Lavender", colors: ["#f5f3ff", "#ddd6fe", "#a78bfa", "#7c3aed", "#4c1d95"] },
  { id: "terra", name: "Đất nung", colors: ["#fef3c7", "#fcd34d", "#c2410c", "#9a3412", "#7c2d12"] },
  { id: "mint", name: "Bạc hà", colors: ["#ecfdf5", "#a7f3d0", "#34d399", "#059669", "#064e3b"] },
  { id: "rose-gold", name: "Hồng vàng", colors: ["#fff1f2", "#fecdd3", "#fda4af", "#e11d48", "#fbbf24"] },
  { id: "nordic", name: "Bắc Âu", colors: ["#f8fafc", "#cbd5e1", "#64748b", "#334155", "#0f172a"] },
  { id: "tropic", name: "Nhiệt đới", colors: ["#fef9c3", "#fde047", "#22d3ee", "#0e7490", "#ef4444"] },
];
