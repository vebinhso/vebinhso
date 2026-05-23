export type Account = {
  id: number;
  username: string;
  email: string;
  password: string;
  createdAt: string;
};

const ACCOUNTS_KEY = "vebinhso_accounts";
const CURRENT_KEY = "vebinhso_current_user";
const COUNTER_KEY = "vebinhso_id_counter";
const LOGIN_AT_KEY = "vebinhso_login_at";
const STREAK_KEY = "vebinhso_login_streak";
const PENDING_KEY = "vebinhso_pending_accounts";

export type PendingAccount = {
  username: string;
  email: string;
  password: string;
  token: string;
  expiresAt: number;
  createdAt: string;
};

function getPending(): PendingAccount[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]"); } catch { return []; }
}
function savePending(list: PendingAccount[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

function randomToken(): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Tạo bản đăng ký chờ xác nhận. Trả về token để dựng link xác nhận. */
export function createPendingRegistration(input: {
  username: string; email: string; password: string;
}): { token: string; expiresAt: number } {
  const list = getPending().filter((p) => p.expiresAt > Date.now());
  // bỏ pending cũ cùng username/email để token mới được dùng
  const filtered = list.filter(
    (p) =>
      p.username.toLowerCase() !== input.username.toLowerCase() &&
      p.email.toLowerCase() !== input.email.toLowerCase(),
  );
  const token = randomToken();
  const expiresAt = Date.now() + 3600_000;
  filtered.push({
    username: input.username,
    email: input.email,
    password: input.password,
    token,
    expiresAt,
    createdAt: new Date().toISOString(),
  });
  savePending(filtered);
  return { token, expiresAt };
}

/** Xác nhận token: tạo tài khoản thật và xoá pending. */
export function verifyRegistration(token: string):
  | { ok: true; account: Account }
  | { ok: false; reason: string } {
  const list = getPending();
  const pending = list.find((p) => p.token === token);
  if (!pending) return { ok: false, reason: "Link xác nhận không hợp lệ hoặc đã được dùng." };
  if (pending.expiresAt < Date.now()) {
    savePending(list.filter((p) => p.token !== token));
    return { ok: false, reason: "Link xác nhận đã hết hạn. Vui lòng đăng ký lại." };
  }
  const accounts = getAccounts();
  if (accounts.some((a) => a.username.toLowerCase() === pending.username.toLowerCase()))
    return { ok: false, reason: "Tên đăng nhập đã được sử dụng." };
  if (accounts.some((a) => a.email.toLowerCase() === pending.email.toLowerCase()))
    return { ok: false, reason: "Email đã được sử dụng." };

  const account: Account = {
    id: nextAccountId(),
    username: pending.username,
    email: pending.email,
    password: pending.password,
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  saveAccounts(accounts);
  savePending(list.filter((p) => p.token !== token));
  return { ok: true, account };
}

export type LoginStreak = {
  totalDays: number;
  currentStreak: number;
  lastLoginDate: number;
};

function readStreakMap(): Record<string, LoginStreak> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStreakMap(m: Record<string, LoginStreak>) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(m));
}

/** 1 ngày tính 1 lần; nhiều lần trong cùng ngày không tăng chuỗi. */
export function recordLoginDay(accountId: number): LoginStreak {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const map = readStreakMap();
  const key = String(accountId);
  const cur = map[key];
  let next: LoginStreak;
  if (!cur || !cur.lastLoginDate) {
    next = { totalDays: 1, currentStreak: 1, lastLoginDate: today };
  } else {
    const oneDay = 24 * 60 * 60 * 1000;
    const diff = (today - cur.lastLoginDate) / oneDay;
    if (diff === 0) next = cur;
    else if (diff === 1)
      next = { totalDays: cur.totalDays + 1, currentStreak: cur.currentStreak + 1, lastLoginDate: today };
    else
      next = { totalDays: cur.totalDays + 1, currentStreak: 1, lastLoginDate: today };
  }
  map[key] = next;
  writeStreakMap(map);
  return next;
}

export function getLoginStreak(accountId: number): LoginStreak {
  const map = readStreakMap();
  return map[String(accountId)] || { totalDays: 0, currentStreak: 0, lastLoginDate: 0 };
}



export function getAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function nextAccountId(): number {
  // ID tăng dần liên tục: lấy max(id) hiện có + max(counter) + 1
  const accounts = getAccounts();
  const maxId = accounts.reduce((m, a) => (a.id > m ? a.id : m), 0);
  const stored = parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10);
  const next = Math.max(maxId, stored) + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

export function getCurrentUser(): Account | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(account: Account | null) {
  if (account) {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(account));
    // Ghi nhận thời điểm đăng nhập (mỗi lần đăng nhập làm reset bộ đếm phiên)
    localStorage.setItem(LOGIN_AT_KEY, String(Date.now()));
    recordLoginDay(account.id);

  } else {
    localStorage.removeItem(CURRENT_KEY);
    localStorage.removeItem(LOGIN_AT_KEY);
  }
  window.dispatchEvent(new Event("auth-change"));
}

export function getLoginAt(): number {
  if (typeof window === "undefined") return Date.now();
  const v = parseInt(localStorage.getItem(LOGIN_AT_KEY) || "0", 10);
  return v || Date.now();
}

export function findAccount(identifier: string, password: string): Account | null {
  const id = identifier.trim().toLowerCase();
  return (
    getAccounts().find(
      (a) =>
        (a.username.toLowerCase() === id || a.email.toLowerCase() === id) &&
        a.password === password,
    ) || null
  );
}
