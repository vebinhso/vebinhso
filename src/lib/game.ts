// Game state persistence per-account
import { getCurrentUser } from "./auth";

export type PlacedItem = {
  id: string;
  itemId: string; // catalog id
  x: number; // grid col 0..19
  z: number; // grid row 0..19
  rotation: number; // 0..3 (90deg steps)
};

export type GameState = {
  money: number;
  netWorth: number;
  correctAnswers: number;
  level: number;
  placed: PlacedItem[];
};

const PREFIX = "vebinhso_game_";

const DEFAULT: GameState = {
  money: 500,
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

// Level thresholds based on net worth (đầu tư vào nhà)
const LEVEL_NETWORTH = [0, 700, 1200, 1700, 2200, 2800, 3500, 4500, 6000, 8000, 10000];
const LEVEL_MIN_MONEY = [100, 200, 350, 450, 600, 800, 1000, 1200, 1500, 1800, 2200];

export function computeLevel(s: GameState): number {
  let lvl = 0;
  for (let i = 1; i < LEVEL_NETWORTH.length; i++) {
    if (s.netWorth >= LEVEL_NETWORTH[i] && s.money >= LEVEL_MIN_MONEY[i] && s.correctAnswers >= i * 10) {
      lvl = i;
    } else break;
  }
  return lvl;
}

export function nextLevelInfo(s: GameState) {
  const lvl = computeLevel(s);
  const next = Math.min(lvl + 1, LEVEL_NETWORTH.length - 1);
  return {
    current: lvl,
    next,
    netWorthNeeded: LEVEL_NETWORTH[next] ?? null,
    moneyNeeded: LEVEL_MIN_MONEY[next] ?? null,
    questionsNeeded: next * 10,
  };
}
