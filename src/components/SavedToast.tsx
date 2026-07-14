import { useEffect, useState, useRef } from "react";

/**
 * Small "✓ Đã lưu" toast that appears at top-center whenever any part of the
 * game state is persisted (game_state, outfit, sign labels, ...).
 * Listens for the global "game-saved" window event.
 */
export function SavedToast() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = () => {
      // Debounce bursts of save events into one toast
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), 1400);
      }, 120);
    };
    window.addEventListener("game-saved", show);
    return () => {
      window.removeEventListener("game-saved", show);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <div className="px-3 py-1.5 rounded-full bg-emerald-600/95 text-white text-xs font-black shadow-lg border-2 border-white/70 flex items-center gap-1.5">
        <span>✓</span>
        <span>Đã lưu</span>
      </div>
    </div>
  );
}
