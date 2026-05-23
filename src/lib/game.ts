// Game state persistence per-account
import { getCurrentUser } from "./auth";

export type PlacedItem = {
  id: string;
  itemId: string;
  x: number;
  z: number;
  rotation: number;
};

export type GameState = {
  money: number;       // Tiền trong tài khoản (bắt đầu 0). Dùng để lên cấp.
  netWorth: number;    // Tài sản ròng = tiền đã đầu tư vào nhà. Hoàn lại khi vật tư biến mất.
  correctAnswers: number;
  level: number;
  placed: PlacedItem[];
};

const PREFIX = "vebinhso_game_";

const DEFAULT: GameState = {
  money: 0,
  netWorth: 0,
  correctAnswers: 0,
  level: 0,
  placed: [],
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

// Số tiền tối thiểu PHẢI CÓ TRONG TÀI KHOẢN để lên cấp tương ứng.
const LEVEL_MIN_MONEY = [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4500, 6000, 8000];

export function computeLevel(s: GameState): number {
  let lvl = 0;
  for (let i = 1; i < LEVEL_MIN_MONEY.length; i++) {
    if (s.money >= LEVEL_MIN_MONEY[i] && s.correctAnswers >= i * 10) {
      lvl = i;
    } else break;
  }
  return lvl;
}

export function nextLevelInfo(s: GameState) {
  const lvl = computeLevel(s);
  const next = Math.min(lvl + 1, LEVEL_MIN_MONEY.length - 1);
  return {
    current: lvl,
    next,
    moneyNeeded: LEVEL_MIN_MONEY[next] ?? null,
    questionsNeeded: next * 10,
  };
}
