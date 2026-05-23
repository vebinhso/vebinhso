// Quản lý trạng thái đã nhận quà theo period (daily/weekly/level)
const KEY = "vebinhso_claims";

type Period = "daily" | "weekly" | "level";

type ClaimMap = Record<string, string>; // claimKey -> periodKey đã nhận

function read(): Record<string, ClaimMap> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function write(v: Record<string, ClaimMap>) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function currentPeriodKey(period: Period, level?: number): string {
  const d = new Date();
  if (period === "daily") {
    return `D-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  if (period === "weekly") {
    // ISO-ish week key
    const first = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7);
    return `W-${d.getFullYear()}-${week}`;
  }
  return `L-${level ?? 0}`;
}

export function isClaimed(userId: number, claimKey: string, period: Period, level?: number): boolean {
  const map = read()[String(userId)] || {};
  return map[claimKey] === currentPeriodKey(period, level);
}

export function setClaimed(userId: number, claimKey: string, period: Period, level?: number) {
  const all = read();
  const key = String(userId);
  const map = all[key] || {};
  map[claimKey] = currentPeriodKey(period, level);
  all[key] = map;
  write(all);
}
