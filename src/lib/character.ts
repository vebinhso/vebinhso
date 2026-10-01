import { supabase } from "@/integrations/supabase/client";
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
  /** Kiểu tóc; chưa có nghĩa là chưa chọn lần nào (lần đầu miễn phí). */
  hairStyle?: string;
  /** Phụ kiện đã mua và đang đeo. */
  accessoriesOwned?: string[];
  accessories?: string[];
  faceShape?: string;
  expression?: string;
  bodyShape?: string;
  topStyle?: string;
  bottomStyle?: string;
  shoeStyle?: string;
  clothesOwned?: string[];
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

const LS_PREFIX = "vebinhso_outfit_cache_";

let CACHE: Outfit | null = null;
let CACHE_UID: string | null = null;

function localKey(uid: string) { return LS_PREFIX + uid; }

export function loadOutfit(): Outfit | null {
  const u = getCurrentUser();
  if (!u) return null;
  if (CACHE_UID !== u.id) {
    CACHE_UID = u.id;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(localKey(u.id));
        CACHE = raw ? { ...DEFAULT, ...JSON.parse(raw) } : null;
      } catch { CACHE = null; }
    }
    // async refresh
    supabase.from("character_outfit").select("outfit").eq("user_id", u.id).maybeSingle()
      .then(({ data }) => {
        if (data?.outfit && typeof data.outfit === "object") {
          const next = { ...DEFAULT, ...(data.outfit as Outfit) };
          // Only adopt DB value if no local outfit (avoid overwriting unsaved changes)
          if (!CACHE) {
            CACHE = next;
            if (typeof window !== "undefined") {
              localStorage.setItem(localKey(u.id), JSON.stringify(next));
              window.dispatchEvent(new Event("outfit-change"));
            }
          }
        }
      }, () => {});
  }
  return CACHE;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function saveOutfit(o: Outfit) {
  const u = getCurrentUser();
  if (!u) return;
  CACHE = o;
  CACHE_UID = u.id;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(localKey(u.id), JSON.stringify(o)); } catch { /* noop */ }
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    supabase.from("character_outfit").upsert({ user_id: u.id, outfit: o as any }).then(
      () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("game-saved")); },
      () => {},
    );
  }, 500);
}

export const DEFAULT_OUTFIT = DEFAULT;
