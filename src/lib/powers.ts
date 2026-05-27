const activeKey = (uid: string) => `vebinhso_powers_active_${uid}`;

export type ActiveMap = Record<number, number>;

export function loadActivePowers(uid: string): ActiveMap {
  if (typeof window === "undefined" || !uid) return {};

  try { return JSON.parse(localStorage.getItem(activeKey(uid)) || "{}"); } catch { return {}; }
}

// Trả về mảng id các thẻ đang còn hiệu lực tại thời điểm now
export function getActivePowerIds(uid: string, now = Date.now()): number[] {
  const a = loadActivePowers(uid);

  return Object.entries(a)
    .filter(([, until]) => until === -1 || (typeof until === "number" && until > now))
    .map(([id]) => Number(id));
}

export function isPowerActive(uid: string, powerId: number, now = Date.now()): boolean {
  return getActivePowerIds(uid, now).includes(powerId);
}
