import { useEffect, useRef, useState } from "react";
import { setInputKey } from "@/lib/player-input";
import { useLocale } from "@/lib/locale";

type Props = {
  /** Show an action button (e.g. open door). Dispatches keydown/keyup for `actionKey` (default "e"). */
  showActionButton?: boolean;
  actionKey?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Show jump button (default true). */
  showJumpButton?: boolean;
};

export function TouchControls({
  showActionButton = false,
  actionKey = "e",
  actionLabel,
  onAction,
  showJumpButton = true,
}: Props) {
  const en = useLocale() === "en";
  const resolvedActionLabel = actionLabel ?? (en ? "🚪 OPEN" : "🚪 MỞ");
  const [isTouch, setIsTouch] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const joyRef = useRef<HTMLDivElement>(null);
  const activeDirs = useRef<{ w: boolean; a: boolean; s: boolean; d: boolean }>({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  }, []);

  if (!isTouch) return null;

  const RADIUS = 60;
  const KNOB = 26;
  const DEAD = 12;

  const updateDirs = (dx: number, dy: number) => {
    const next = { w: false, a: false, s: false, d: false };
    if (Math.hypot(dx, dy) >= DEAD) {
      if (dy < -DEAD * 0.5) next.w = true;
      if (dy > DEAD * 0.5) next.s = true;
      if (dx < -DEAD * 0.5) next.a = true;
      if (dx > DEAD * 0.5) next.d = true;
    }
    (["w", "a", "s", "d"] as const).forEach((key) => {
      if (next[key] !== activeDirs.current[key]) {
        setInputKey(key, next[key]);
        activeDirs.current[key] = next[key];
      }
    });
  };

  const resetDirs = () => {
    (["w", "a", "s", "d"] as const).forEach((key) => {
      if (activeDirs.current[key]) {
        setInputKey(key, false);
        activeDirs.current[key] = false;
      }
    });
    setKnob({ x: 0, y: 0 });
  };

  const onJoyMove = (e: React.PointerEvent) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const max = RADIUS - KNOB / 2;
    if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
    setKnob({ x: dx, y: dy });
    updateDirs(dx, dy);
  };

  const onJoyDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onJoyMove(e);
  };

  const onJoyUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    resetDirs();
  };

  const jumpDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setInputKey(" ", true);
  };
  const jumpUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    setInputKey(" ", false);
  };

  const fireAction = () => {
    if (onAction) onAction();
    setInputKey(actionKey, true);
    // Also dispatch a real keydown/keyup so any existing window listeners react.
    try {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: actionKey }));
      setTimeout(() => {
        setInputKey(actionKey, false);
        window.dispatchEvent(new KeyboardEvent("keyup", { key: actionKey }));
      }, 80);
    } catch {
      setInputKey(actionKey, false);
    }
  };

  return (
    <>
      <div
        ref={joyRef}
        onPointerDown={onJoyDown}
        onPointerMove={(e) => { if (e.buttons) onJoyMove(e); }}
        onPointerUp={onJoyUp}
        onPointerCancel={onJoyUp}
        onPointerLeave={onJoyUp}
        className="fixed bottom-4 left-4 z-40 pointer-events-auto rounded-full border-4 border-white/70 bg-white/30 backdrop-blur-md shadow-xl"
        style={{ width: RADIUS * 2, height: RADIUS * 2, touchAction: "none" }}
      >
        <div
          className="absolute rounded-full bg-white/90 border-2 border-white shadow-lg"
          style={{
            width: KNOB * 2,
            height: KNOB * 2,
            left: `calc(50% - ${KNOB}px)`,
            top: `calc(50% - ${KNOB}px)`,
            transform: `translate(${knob.x}px, ${knob.y}px)`,
            transition: knob.x === 0 && knob.y === 0 ? "transform 0.15s" : "none",
          }}
        />
      </div>
      {showJumpButton && (
        <button
          onPointerDown={jumpDown}
          onPointerUp={jumpUp}
          onPointerCancel={jumpUp}
          onPointerLeave={jumpUp}
          className="fixed bottom-6 right-4 z-40 pointer-events-auto rounded-full border-4 border-white/70 bg-gradient-to-br from-amber-300 to-orange-500 text-white font-black text-xl shadow-xl active:scale-95"
          style={{ width: 60, height: 60, touchAction: "none" }}
        >
          ⤴
        </button>
      )}
      {showActionButton && (
        <button
          onPointerDown={(e) => { e.preventDefault(); fireAction(); }}
          className="fixed right-4 z-40 pointer-events-auto rounded-2xl border-4 border-white/70 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-black text-xs shadow-xl active:scale-95 px-3 py-2"
          style={{ bottom: showJumpButton ? 80 : 24, touchAction: "none" }}
        >
          {resolvedActionLabel}
        </button>
      )}
    </>
  );
}
