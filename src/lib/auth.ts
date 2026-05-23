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
