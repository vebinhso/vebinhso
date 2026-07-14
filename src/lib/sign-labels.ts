// Persist short user-editable labels for placed "sign" items.
// Cache in localStorage for instant sync reads, and mirror to Supabase
// (game_state.sign_labels JSONB) so labels follow the user across devices.
import { supabase } from "@/integrations/supabase/client";

const KEY = (uid: string) => `signLabels:${uid}`;

export type SignLabelMap = Record<string, string>;

export function loadSignLabels(uid: string): SignLabelMap {
  if (typeof window === "undefined") return {};
  // Kick off async DB refresh; UI will be re-fed via 'sign-labels-refresh' event.
  refreshSignLabelsFromDB(uid).catch(() => { /* noop */ });
  try {
    const raw = window.localStorage.getItem(KEY(uid));
    return raw ? (JSON.parse(raw) as SignLabelMap) : {};
  } catch {
    return {};
  }
}

async function refreshSignLabelsFromDB(uid: string) {
  const { data } = await supabase
    .from("game_state")
    .select("sign_labels")
    .eq("user_id", uid)
    .maybeSingle();
  if (!data) return;
  const remote = ((data as any).sign_labels ?? {}) as SignLabelMap;
  try {
    window.localStorage.setItem(KEY(uid), JSON.stringify(remote));
    window.dispatchEvent(new CustomEvent("sign-labels-refresh", { detail: remote }));
  } catch { /* ignore */ }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
async function flushToDB(uid: string, map: SignLabelMap) {
  try {
    await supabase.from("game_state").upsert({ user_id: uid, sign_labels: map as any });
    if (typeof window !== "undefined") window.dispatchEvent(new Event("game-saved"));
  } catch { /* ignore */ }
}

export function saveSignLabels(uid: string, map: SignLabelMap) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY(uid), JSON.stringify(map)); } catch { /* ignore */ }
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { flushToDB(uid, map); }, 500);
}

export const SIGN_LABEL_MAX = 50;
