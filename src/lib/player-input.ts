// Shared movement input state. Both keyboard (desktop) and touch UI (mobile)
// write into the same key map so the game loop reads a single source of truth.
export const playerInput: Record<string, boolean> = {};

export function setInputKey(key: string, down: boolean) {
  playerInput[key.toLowerCase()] = down;
}

export function clearInput() {
  for (const k in playerInput) playerInput[k] = false;
}
