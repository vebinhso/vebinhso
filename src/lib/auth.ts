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
  const current = parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10);
  const next = current + 1;
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
  } else {
    localStorage.removeItem(CURRENT_KEY);
  }
  window.dispatchEvent(new Event("auth-change"));
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
