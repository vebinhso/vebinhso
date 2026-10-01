// Shared movement input state. Both keyboard (desktop) and touch UI (mobile)
// write into the same key map so the game loop reads a single source of truth.
export const playerInput: Record<string, boolean> = {};

export function setInputKey(key: string, down: boolean) {
  playerInput[key.toLowerCase()] = down;
}

export function clearInput() {
  for (const k in playerInput) playerInput[k] = false;
}

let guardsInstalled = false;
/** Xả phím khi mất focus/ẩn tab/giật lag để nhân vật không tự chạy. */
export function installInputGuards() {
  if (guardsInstalled || typeof window === "undefined") return;
  guardsInstalled = true;
  window.addEventListener("blur", clearInput);
  window.addEventListener("contextmenu", clearInput);
  window.addEventListener("pointerleave", clearInput);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearInput(); });
}

export function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}
