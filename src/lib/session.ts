const KEY = "vebinhso_online_session";
const IDLE_LIMIT_MS = 5 * 60 * 1000;   // 5 phút không hoạt động → ngừng đếm
const MAX_SECONDS = 180 * 60;          // trần 180 phút/ngày

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

let lastActivity = Date.now();
let started = false;

export function getOnlineSeconds(): number {
  return read().seconds;
}

// Gọi 1 lần ở root để khởi động bộ đếm toàn app
export function startSessionTracker(): () => void {
  if (typeof window === "undefined") return () => {};
  if (started) return () => {};
  started = true;

  const markActive = () => { lastActivity = Date.now(); };
  const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
  events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

  const timer = setInterval(() => {
    const d = read();
    if (d.date !== todayStr()) { write({ date: todayStr(), seconds: 0 }); return; }
    const idle = Date.now() - lastActivity;
    if (idle <= IDLE_LIMIT_MS && d.seconds < MAX_SECONDS) {
      write({ date: d.date, seconds: d.seconds + 1 });
      if (typeof window !== "undefined") window.dispatchEvent(new Event("session-tick"));
    }
  }, 1000);

  return () => {
    events.forEach((e) => window.removeEventListener(e, markActive));
    clearInterval(timer);
    started = false;
  };
}

export function isIdle(): boolean {
  return Date.now() - lastActivity > IDLE_LIMIT_MS;
}
