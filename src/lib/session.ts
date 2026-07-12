import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./auth";

const KEY = "vebinhso_online_session";
const LIFETIME_KEY_PREFIX = "vebinhso_playtime_lifetime_";
const IDLE_LIMIT_MS = 5 * 60 * 1000;   // 5 phút không hoạt động → ngừng đếm
const MAX_SECONDS = 180 * 60;          // trần 180 phút/ngày (chỉ áp cho counter ngày)
const FLUSH_EVERY_S = 30;              // flush lên DB mỗi 30s

type SessionData = { date: string; seconds: number };

function todayStr() { return new Date().toISOString().slice(0, 10); }

function read(): SessionData {
  if (typeof window === "undefined") return { date: todayStr(), seconds: 0 };
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    if (d && d.date === todayStr()) return d;
  } catch {}
  return { date: todayStr(), seconds: 0 };
}
function write(d: SessionData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
}

function readLifetime(uid: string): number {
  if (typeof window === "undefined") return 0;
  try { return parseInt(localStorage.getItem(LIFETIME_KEY_PREFIX + uid) || "0", 10) || 0; } catch { return 0; }
}
function writeLifetime(uid: string, n: number) {
  try { localStorage.setItem(LIFETIME_KEY_PREFIX + uid, String(n)); } catch {}
}

let lastActivity = Date.now();
let started = false;
let lastFlushedValue = -1;

export function getOnlineSeconds(): number {
  return read().seconds;
}

export function getLifetimePlaySeconds(): number {
  const u = getCurrentUser();
  if (!u) return 0;
  return readLifetime(u.id);
}

async function flushLifetimeToDB() {
  const u = getCurrentUser();
  if (!u) return;
  const local = readLifetime(u.id);
  if (local === lastFlushedValue) return;
  try {
    const { data } = await supabase.from("game_state").select("total_play_seconds").eq("user_id", u.id).maybeSingle();
    const dbVal = (data as any)?.total_play_seconds ?? 0;
    const merged = Math.max(dbVal, local);
    writeLifetime(u.id, merged);
    await supabase.from("game_state").update({ total_play_seconds: merged } as any).eq("user_id", u.id);
    lastFlushedValue = merged;
  } catch { /* noop */ }
}

// Gọi 1 lần ở root để khởi động bộ đếm toàn app
export function startSessionTracker(): () => void {
  if (typeof window === "undefined") return () => {};
  if (started) return () => {};
  started = true;

  const markActive = () => { lastActivity = Date.now(); };
  const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
  events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

  let ticks = 0;
  const timer = setInterval(() => {
    const d = read();
    if (d.date !== todayStr()) { write({ date: todayStr(), seconds: 0 }); return; }
    const idle = Date.now() - lastActivity;
    if (idle <= IDLE_LIMIT_MS) {
      // daily counter (bounded)
      if (d.seconds < MAX_SECONDS) write({ date: d.date, seconds: d.seconds + 1 });
      // lifetime counter — không giới hạn, luôn tăng khi user active
      const u = getCurrentUser();
      if (u) writeLifetime(u.id, readLifetime(u.id) + 1);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("session-tick"));
      ticks++;
      if (ticks % FLUSH_EVERY_S === 0) { void flushLifetimeToDB(); }
    }
  }, 1000);

  const onBeforeUnload = () => { void flushLifetimeToDB(); };
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("visibilitychange", onBeforeUnload);

  return () => {
    events.forEach((e) => window.removeEventListener(e, markActive));
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.removeEventListener("visibilitychange", onBeforeUnload);
    clearInterval(timer);
    started = false;
  };
}

export function isIdle(): boolean {
  return Date.now() - lastActivity > IDLE_LIMIT_MS;
}
