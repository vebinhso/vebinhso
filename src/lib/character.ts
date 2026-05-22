import { getCurrentUser } from "./auth";

export type Outfit = {
  description: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  hat?: string;
  accent: string;
};

const DEFAULT: Outfit = {
  description: "Vệ binh áo đỏ cơ bản",
  skin: "#fde68a",
  hair: "#7c2d12",
  shirt: "#ef4444",
  pants: "#1e40af",
  shoes: "#1f2937",
  accent: "#fcd34d",
};

const PREFIX = "vebinhso_outfit_";

function key() {
  const u = getCurrentUser();
  return u ? PREFIX + u.id : null;
}

export function loadOutfit(): Outfit | null {
  const k = key();
  if (!k || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(k);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function saveOutfit(o: Outfit) {
  const k = key();
  if (!k) return;
  localStorage.setItem(k, JSON.stringify(o));
}

export const DEFAULT_OUTFIT = DEFAULT;
