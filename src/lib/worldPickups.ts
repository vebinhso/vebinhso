// World pickups (coins + bombs) cho map nhà.
// - Layout cơ bản: sinh deterministic 100 xu + 200 boom, cùng layout cho mọi user.
// - Extras: admin có thể thêm/xoá vật phẩm thủ công, lưu trong admin_config.
// - Collected per-user: lưu localStorage.

import { supabase } from "@/integrations/supabase/client";

export type PickupKind = "coin" | "bomb";
export type Pickup = { id: string; kind: PickupKind; x: number; z: number };

const COIN_COUNT = 100;
const BOMB_COUNT = 200;
const INNER_R = 12; // tránh mảnh đất 20×20 + đường
const OUTER_R = 95; // còn nằm trong WORLD 220
const BASE_SEED = 20260527;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function generateBasePickups(seed = BASE_SEED): Pickup[] {
  const r = rng(seed);
  const out: Pickup[] = [];
  const place = (kind: PickupKind, i: number) => {
    for (let a = 0; a < 30; a++) {
      const ang = r() * Math.PI * 2;
      const rad = INNER_R + r() * (OUTER_R - INNER_R);
      const x = +(Math.cos(ang) * rad).toFixed(2);
      const z = +(Math.sin(ang) * rad).toFixed(2);
      if (Math.max(Math.abs(x), Math.abs(z)) < 11) continue;
      out.push({ id: `${kind[0]}-${i}`, kind, x, z });
      return;
    }
    out.push({ id: `${kind[0]}-${i}`, kind, x: 0, z: 0 });
  };
  for (let i = 0; i < COIN_COUNT; i++) place("coin", i);
  for (let i = 0; i < BOMB_COUNT; i++) place("bomb", i);
  return out;
}

// ===== Extras (admin manual placements) =====
const EXTRAS_KEY = "world_pickups_extras";

export async function loadPickupExtras(): Promise<Pickup[]> {
  const { data } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", EXTRAS_KEY)
    .maybeSingle();
  if (!data) return [];
  const v = data.value as any;
  const items = Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
  return items.filter((p: any) => p && (p.kind === "coin" || p.kind === "bomb"));
}

export async function savePickupExtras(items: Pickup[]) {
  await supabase
    .from("admin_config")
    .upsert({ key: EXTRAS_KEY, value: items as any });
}

// ===== Collected (per user, localStorage) =====
const LS_KEY = "vebinhso_pickups_collected_";

export function loadCollected(uid: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY + uid);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveCollected(uid: string, s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY + uid, JSON.stringify([...s]));
  } catch {
    /* noop */
  }
}

export function getAllPickups(extras: Pickup[]): Pickup[] {
  return [...generateBasePickups(), ...extras];
}
