// Game state — Supabase-backed with synchronous read via in-memory cache.
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./auth";

export type PlacedItem = {
  id: string;
  itemId: string;
  x: number;
  z: number;
  rotation: number;
  floor?: number;
};

export type WallSegment = {
  id: string;
  ax: number; az: number; bx: number; bz: number;
  color: string;
  value?: number;
  floor?: number;
};

export type RoofSegment = {
  id: string;
  ax: number; az: number; bx: number; bz: number;
  style: "tile" | "ton";
  value: number;
  floor?: number;
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
  ownedPalettes: string[];
  roofTiles: number;
  roofTilesTon: number;
  roofs: RoofSegment[];
};

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
  roofTiles: 0,
  roofTilesTon: 0,
  roofs: [],
};

// In-memory cache per session.
let CACHE: GameState = { ...DEFAULT };
let CACHE_UID: string | null = null;

const LS_PREFIX = "vebinhso_game_cache_";

function loadCacheFromLocal(uid: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_PREFIX + uid);
    if (raw) CACHE = { ...DEFAULT, ...JSON.parse(raw) };
    else CACHE = { ...DEFAULT };
  } catch { CACHE = { ...DEFAULT }; }
}
function persistLocal(uid: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_PREFIX + uid, JSON.stringify(CACHE)); } catch { /* noop */ }
}

export function loadGame(): GameState {
  const u = getCurrentUser();
  if (!u) return { ...DEFAULT };
  if (CACHE_UID !== u.id) {
    CACHE_UID = u.id;
    loadCacheFromLocal(u.id);
    // Trigger async refresh from DB
    refreshFromDB(u.id).catch(() => { /* noop */ });
  }
  return CACHE;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function saveGame(s: GameState) {
  CACHE = { ...s };
  const u = getCurrentUser();
  if (!u) return;
  persistLocal(u.id);
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { flushToDB(u.id).catch(() => { /* noop */ }); }, 600);
}

async function refreshFromDB(uid: string) {
  const [gs, items, walls, roofs] = await Promise.all([
    supabase.from("game_state").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("placed_items").select("*").eq("user_id", uid),
    supabase.from("walls").select("*").eq("user_id", uid),
    supabase.from("roofs").select("*").eq("user_id", uid),
  ]);
  if (gs.data) {
    CACHE = {
      ...CACHE,
      money: gs.data.money ?? 0,
      netWorth: gs.data.net_worth ?? 0,
      correctAnswers: gs.data.correct_answers ?? 0,
      answerStreak: gs.data.answer_streak ?? 0,
      level: gs.data.level ?? 0,
      bricks: gs.data.bricks ?? 0,
      concrete: gs.data.concrete ?? 0,
      roofTiles: gs.data.roof_tiles ?? 0,
      roofTilesTon: gs.data.roof_tiles_ton ?? 0,
      wallColor: gs.data.wall_color ?? "#f5e6c8",
      ownedPalettes: Array.isArray(gs.data.owned_palettes) ? (gs.data.owned_palettes as string[]) : [],
      placed: (items.data || []).map((r: any) => ({
        id: r.id, itemId: r.item_id, x: r.x, z: r.z, rotation: r.rotation,
      })),
      walls: (walls.data || []).map((r: any) => ({
        id: r.id, ax: r.ax, az: r.az, bx: r.bx, bz: r.bz, color: r.color, value: r.value,
      })),
      roofs: (roofs.data || []).map((r: any) => ({
        id: r.id, ax: r.ax, az: r.az, bx: r.bx, bz: r.bz, style: r.style as "tile" | "ton", value: r.value,
      })),
    };
    persistLocal(uid);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("game-change"));
  }
}

async function flushToDB(uid: string) {
  // Scalars
  await supabase.from("game_state").upsert({
    user_id: uid,
    money: CACHE.money,
    net_worth: CACHE.netWorth,
    correct_answers: CACHE.correctAnswers,
    answer_streak: CACHE.answerStreak,
    level: CACHE.level,
    bricks: CACHE.bricks,
    concrete: CACHE.concrete,
    roof_tiles: CACHE.roofTiles,
    roof_tiles_ton: CACHE.roofTilesTon,
    wall_color: CACHE.wallColor,
    owned_palettes: CACHE.ownedPalettes,
  });
  // Items/walls/roofs: full replace strategy (simple, OK for small collections)
  await supabase.from("placed_items").delete().eq("user_id", uid);
  if (CACHE.placed.length) {
    await supabase.from("placed_items").insert(
      CACHE.placed.map((p) => ({ user_id: uid, item_id: p.itemId, x: p.x, z: p.z, rotation: p.rotation })),
    );
  }
  await supabase.from("walls").delete().eq("user_id", uid);
  if (CACHE.walls.length) {
    await supabase.from("walls").insert(
      CACHE.walls.map((w) => ({ user_id: uid, ax: w.ax, az: w.az, bx: w.bx, bz: w.bz, color: w.color, value: w.value ?? 0 })),
    );
  }
  await supabase.from("roofs").delete().eq("user_id", uid);
  if (CACHE.roofs.length) {
    await supabase.from("roofs").insert(
      CACHE.roofs.map((r) => ({ user_id: uid, ax: r.ax, az: r.az, bx: r.bx, bz: r.bz, style: r.style, value: r.value })),
    );
  }
}

export function resetGameCacheForLogout() {
  CACHE = { ...DEFAULT };
  CACHE_UID = null;
}

// Levels
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
    if (s.netWorth >= LEVEL_MIN_NETWORTH[i] && s.correctAnswers >= LEVEL_MIN_QUESTIONS[i]) lvl = i;
    else break;
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

export const WALL_HEIGHT = 5;
export const BRICKS_PER_METER = 10;
export const CONCRETE_PER_METER = 1;

export function wallCost(lengthMeters: number) {
  const L = Math.max(1, Math.ceil(lengthMeters));
  return { bricks: L * BRICKS_PER_METER, concrete: L * CONCRETE_PER_METER, length: L };
}

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
