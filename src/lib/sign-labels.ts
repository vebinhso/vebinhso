// Persist short user-editable labels for placed "sign" items.
// Keyed by user id, then by the placed item's id.
const KEY = (uid: string) => `signLabels:${uid}`;

export type SignLabelMap = Record<string, string>;

export function loadSignLabels(uid: string): SignLabelMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY(uid));
    return raw ? (JSON.parse(raw) as SignLabelMap) : {};
  } catch {
    return {};
  }
}

export function saveSignLabels(uid: string, map: SignLabelMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(uid), JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export const SIGN_LABEL_MAX = 50;
