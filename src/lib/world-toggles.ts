// Trạng thái toàn cục: va chạm nhân vật, cửa nhà, đèn.
// Lưu localStorage + phát event 'world-toggles-change' để mọi component subscribe.
import { useEffect, useState } from "react";

export type CollisionMode = "phase" | "block";

export type WorldToggles = {
  collision: CollisionMode;   // 'phase' = đi xuyên, 'block' = bị cản
  doorsOpen: boolean;         // mở tất cả cửa nhà
  lightsOn: boolean;          // bật tất cả đèn
};

const LS_KEY = "vebinhso_world_toggles";
const DEFAULTS: WorldToggles = { collision: "phase", doorsOpen: false, lightsOn: true };

function read(): WorldToggles {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<WorldToggles>) };
  } catch {
    return { ...DEFAULTS };
  }
}

let CURRENT: WorldToggles = read();

export function getToggles(): WorldToggles {
  return CURRENT;
}

export function setToggles(patch: Partial<WorldToggles>) {
  CURRENT = { ...CURRENT, ...patch };
  try { localStorage.setItem(LS_KEY, JSON.stringify(CURRENT)); } catch { /* noop */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("world-toggles-change"));
}

export function useWorldToggles(): WorldToggles {
  const [t, setT] = useState<WorldToggles>(CURRENT);
  useEffect(() => {
    const sync = () => setT({ ...CURRENT });
    window.addEventListener("world-toggles-change", sync);
    return () => window.removeEventListener("world-toggles-change", sync);
  }, []);
  return t;
}
