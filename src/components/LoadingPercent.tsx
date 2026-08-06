import { useEffect, useRef, useState } from "react";

/**
 * Tiến trình "giả lập" mượt mà: tăng nhanh lúc đầu, chậm dần khi tới 95%.
 * Dùng cho những màn tải không có số liệu thật (route, dữ liệu, đăng nhập...).
 */
export function useFakeProgress(active = true, speed = 1) {
  const [pct, setPct] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setPct(100);
      return;
    }
    let value = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      // càng gần 95 càng chậm
      const remaining = 95 - value;
      value += (remaining * dt) / (1400 / speed);
      setPct(Math.min(95, Math.round(value)));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [active, speed]);

  return pct;
}

export function LoadingPercent({
  percent,
  className = "",
  light = true,
}: {
  percent?: number;
  className?: string;
  light?: boolean;
}) {
  const auto = useFakeProgress(percent === undefined);
  const pct = Math.max(0, Math.min(100, Math.round(percent ?? auto)));
  return (
    <div className={`flex w-56 max-w-[70vw] flex-col items-center gap-1.5 ${className}`}>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${light ? "bg-white/30" : "bg-foreground/15"}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${light ? "bg-white" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`text-xs font-black tabular-nums ${light ? "text-white/90" : "text-muted-foreground"}`}>
        {pct}%
      </div>
    </div>
  );
}

export default LoadingPercent;
