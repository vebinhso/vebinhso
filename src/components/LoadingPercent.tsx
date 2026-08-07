import { useEffect, useRef, useState } from "react";

/**
 * Tiến trình "giả lập" mượt mà: tăng nhanh lúc đầu, chậm dần khi tới 99%.
 * Khi `active` = false (đã tải xong) sẽ chạy nốt lên 100% rồi dừng.
 */
export function useFakeProgress(active = true, speed = 1) {
  const [pct, setPct] = useState(0);
  const raf = useRef<number | null>(null);
  const value = useRef(0);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      const target = active ? 99 : 100;
      // càng gần đích càng chậm; khi xong thì phi nhanh lên 100
      const remaining = target - value.current;
      value.current += (remaining * dt) / (active ? 1400 / speed : 220);
      if (!active && remaining < 0.4) value.current = 100;
      setPct(Math.min(target, value.current));
      if (value.current < 100) raf.current = requestAnimationFrame(tick);
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
  done = false,
  className = "",
  light = true,
}: {
  /** % thật (0-100). Bỏ trống = dùng tiến trình giả lập. */
  percent?: number;
  /** Đánh dấu đã tải xong: thanh sẽ chạy nốt lên 100%. */
  done?: boolean;
  className?: string;
  light?: boolean;
}) {
  const auto = useFakeProgress(percent === undefined && !done);
  const raw = percent ?? auto;
  const pct = Math.max(0, Math.min(100, done ? 100 : raw));
  // làm tròn xuống để không hiện 100% khi chưa thật sự xong
  const shown = pct >= 99.5 ? 100 : Math.floor(pct);
  return (
    <div className={`flex w-56 max-w-[70vw] flex-col items-center gap-1 ${className}`}>
      {/* số % chạy theo đầu thanh */}
      <div className="relative h-5 w-full">
        <div
          className="absolute top-0 -translate-x-1/2 transition-[left] duration-200"
          style={{ left: `${pct}%` }}
        >
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums shadow ${
              light ? "bg-white text-slate-800" : "bg-primary text-primary-foreground"
            }`}
          >
            {shown}%
          </span>
        </div>
      </div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${light ? "bg-white/30" : "bg-foreground/15"}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${light ? "bg-white" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default LoadingPercent;
