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
  /** Y-offset (đơn vị: mét) khi item được đặt chồng lên 1 surface */
  stackY?: number;
  /** Góc xoay tùy ý (radian) — dùng cho cửa sổ snap vào tường xéo. Khi có giá trị này, override rotation*π/2. */
  angleRad?: number;
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

export type FloorSegment = {
  id: string;
  ax: number; az: number; bx: number; bz: number;
  value: number;
  floor: number;
  color?: string;
};

export type GameState = {
  money: number;
  netWorth: number;
  correctAnswers: number;
  totalAnswered: number;
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
  floors: FloorSegment[];
  paint: number;
};

const DEFAULT: GameState = {
  money: 0,
  netWorth: 0,
  correctAnswers: 0,
  totalAnswered: 0,
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
  floors: [],
  paint: 0,
};

// In-memory cache per session.
let CACHE: GameState = { ...DEFAULT };
let CACHE_UID: string | null = null;

const LS_PREFIX = "vebinhso_game_cache_";

function loadCacheFromLocal(uid: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_PREFIX + uid);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.floors)) parsed.floors = [];
      CACHE = { ...DEFAULT, ...parsed };
    } else CACHE = { ...DEFAULT };
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

/**
 * Nơi DUY NHẤT được phép thay đổi các biến đếm câu trả lời.
 * Cập nhật tổng số câu đã trả lời, số câu đúng, và streak.
 */
export function recordAnswer(isCorrect: boolean) {
  const g = loadGame();
  saveGame({
    ...g,
    totalAnswered: (g.totalAnswered || 0) + 1,
    correctAnswers: g.correctAnswers + (isCorrect ? 1 : 0),
    answerStreak: isCorrect ? g.answerStreak + 1 : 0,
  });
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
// Chỉ ghi lên DB sau khi đã tải xong dữ liệu từ DB — tránh ghi đè bằng cache rỗng/cũ.
let HYDRATED_UID: string | null = null;
let PENDING_FLUSH = false;
let flushChain: Promise<void> = Promise.resolve();
function scheduleFlush(uid: string) {
  if (typeof window === "undefined") return;
  if (HYDRATED_UID !== uid) { PENDING_FLUSH = true; return; }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    flushChain = flushChain.then(() => flushToDB(uid)).catch(() => { /* noop */ });
  }, 600);
}
export function saveGame(s: GameState) {
  CACHE = { ...s };
  const u = getCurrentUser();
  if (!u) return;
  persistLocal(u.id);
  scheduleFlush(u.id);
}

async function refreshFromDB(uid: string) {
  const [gs, items, walls, roofs, floors] = await Promise.all([
    supabase.from("game_state").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("placed_items").select("*").eq("user_id", uid),
    supabase.from("walls").select("*").eq("user_id", uid),
    supabase.from("roofs").select("*").eq("user_id", uid),
    (supabase.from as any)("floors").select("*").eq("user_id", uid),
  ]);
  const next: GameState = { ...CACHE };
  let restoreLocal = false;
  if (gs.data) {
    next.money = gs.data.money ?? 0;
    next.netWorth = gs.data.net_worth ?? 0;
    next.correctAnswers = gs.data.correct_answers ?? 0;
    next.totalAnswered = gs.data.total_answered ?? 0;
    next.answerStreak = gs.data.answer_streak ?? 0;
    next.level = gs.data.level ?? 0;
    next.bricks = gs.data.bricks ?? 0;
    next.concrete = gs.data.concrete ?? 0;
    next.roofTiles = gs.data.roof_tiles ?? 0;
    next.roofTilesTon = gs.data.roof_tiles_ton ?? 0;
    next.wallColor = gs.data.wall_color ?? "#f5e6c8";
    next.ownedPalettes = Array.isArray(gs.data.owned_palettes) ? (gs.data.owned_palettes as string[]) : [];
    next.paint = (gs.data as any).paint ?? 0;
  }
  if (items.error || walls.error || roofs.error) return; // không chắc dữ liệu → không đụng
  if (items.data && items.data.length === 0 && CACHE.placed.length > 0) restoreLocal = true;
  else if (items.data) {
    next.placed = items.data.map((r: any) => ({
      id: r.id, itemId: r.item_id, x: r.x, z: r.z, rotation: r.rotation, floor: r.floor ?? 0,
      ...(r.angle_rad != null ? { angleRad: r.angle_rad } : {}),
      ...(r.stack_y != null ? { stackY: r.stack_y } : {}),
    }));
  }
  if (walls.data && walls.data.length === 0 && CACHE.walls.length > 0) restoreLocal = true;
  else if (walls.data) {
    next.walls = walls.data.map((r: any) => ({
      id: r.id, ax: r.ax, az: r.az, bx: r.bx, bz: r.bz, color: r.color, value: r.value, floor: r.floor ?? 0,
    }));
  }
  if (roofs.data && roofs.data.length === 0 && CACHE.roofs.length > 0) restoreLocal = true;
  else if (roofs.data) {
    next.roofs = roofs.data.map((r: any) => ({
      id: r.id, ax: r.ax, az: r.az, bx: r.bx, bz: r.bz, style: r.style as "tile" | "ton", value: r.value, floor: r.floor ?? 0,
    }));
  }
  if ((floors as any)?.data && (floors as any).data.length === 0 && CACHE.floors.length > 0) restoreLocal = true;
  else if ((floors as any)?.data) {
    next.floors = (floors as any).data.map((r: any) => ({
      id: r.id, ax: Number(r.ax), az: Number(r.az), bx: Number(r.bx), bz: Number(r.bz), value: r.value, floor: r.floor ?? 0,
      ...(r.color ? { color: r.color } : {}),
    }));
  }
  if (CACHE_UID !== uid) return;
  CACHE = next;
  persistLocal(uid);
  HYDRATED_UID = uid;
  if (restoreLocal || PENDING_FLUSH) { PENDING_FLUSH = false; scheduleFlush(uid); }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("game-change"));
}

/** Ghi an toàn: chèn bản mới trước, chỉ xoá bản cũ khi chèn thành công — không bao giờ để trống. */
async function replaceRows(table: string, uid: string, rows: Record<string, unknown>[]) {
  const from = (supabase.from as any)(table);
  const old = await from.select("id").eq("user_id", uid);
  if (old.error) return;
  const oldIds: string[] = (old.data ?? []).map((r: any) => r.id);
  if (rows.length) {
    const ins = await (supabase.from as any)(table).insert(rows);
    if (ins.error) return;
  }
  for (let i = 0; i < oldIds.length; i += 200) {
    await (supabase.from as any)(table).delete().eq("user_id", uid).in("id", oldIds.slice(i, i + 200));
  }
}


async function flushToDB(uid: string) {
  // Đồng bộ cấp độ tính toán xuống DB để xếp hạng hiển thị đúng.
  CACHE.level = computeLevel(CACHE);
  // Scalars
  await supabase.from("game_state").upsert({
    user_id: uid,
    money: CACHE.money,
    net_worth: CACHE.netWorth,
    correct_answers: CACHE.correctAnswers,
    total_answered: CACHE.totalAnswered,
    answer_streak: CACHE.answerStreak,
    level: CACHE.level,
    bricks: CACHE.bricks,
    concrete: CACHE.concrete,
    roof_tiles: CACHE.roofTiles,
    roof_tiles_ton: CACHE.roofTilesTon,
    wall_color: CACHE.wallColor,
    owned_palettes: CACHE.ownedPalettes,
    paint: CACHE.paint,
  });
  await replaceRows("placed_items", uid, CACHE.placed.map((p) => ({
    user_id: uid, item_id: p.itemId, x: p.x, z: p.z, rotation: p.rotation, floor: p.floor ?? 0,
    angle_rad: p.angleRad ?? null, stack_y: p.stackY ?? null,
  })));
  await replaceRows("walls", uid, CACHE.walls.map((w) => ({ user_id: uid, ax: w.ax, az: w.az, bx: w.bx, bz: w.bz, color: w.color, value: w.value ?? 0, floor: w.floor ?? 0 })));
  await replaceRows("roofs", uid, CACHE.roofs.map((r) => ({ user_id: uid, ax: r.ax, az: r.az, bx: r.bx, bz: r.bz, style: r.style, value: r.value, floor: r.floor ?? 0 })));
  await replaceRows("floors", uid, CACHE.floors.map((f) => ({ user_id: uid, ax: f.ax, az: f.az, bx: f.bx, bz: f.bz, value: f.value ?? 0, floor: f.floor ?? 0, color: f.color ?? null })));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("game-saved"));
}

export function resetGameCacheForLogout() {
  CACHE = { ...DEFAULT };
  CACHE_UID = null;
  HYDRATED_UID = null;
  PENDING_FLUSH = false;
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

export const MAX_FLOOR = 3;

export function floorHasRoof(s: GameState, floor: number): boolean {
  return s.roofs.some((r) => (r.floor ?? 0) === floor);
}
