import { loadGame, saveGame } from "@/lib/game";
import { getCurrentUser } from "@/lib/auth";

export const START_REWARD = 50;
export const SUMMARY_REWARD = 20;

function key(kind: "start" | "summary", lessonId: string) {
  const u = getCurrentUser();
  return `rp_reward_${kind}_${u?.id ?? "guest"}_${lessonId}`;
}

export function hasClaimed(kind: "start" | "summary", lessonId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(key(kind, lessonId)) === "1";
}

/** Adds coins once per user per lesson. Returns amount actually granted. */
export function claimReward(kind: "start" | "summary", lessonId: string): number {
  if (typeof window === "undefined") return 0;
  if (hasClaimed(kind, lessonId)) return 0;
  const amount = kind === "start" ? START_REWARD : SUMMARY_REWARD;
  const g = loadGame();
  saveGame({ ...g, money: (g.money ?? 0) + amount });
  localStorage.setItem(key(kind, lessonId), "1");
  return amount;
}
