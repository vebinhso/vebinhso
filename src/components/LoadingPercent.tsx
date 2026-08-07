import { useEffect, useRef, useState } from "react";

/**
 * Tiến trình "giả lập" mượt mà: tăng nhanh lúc đầu, chậm dần khi tới 99%.
 * Khi `active` = false (đã tải xong) sẽ chạy nốt lên 100% rồi dừng.
 * (Giữ lại cho các nơi cần đọc số % dưới dạng state.)
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
      const remaining = target - value.current;
      value.current += (remaining * dt) / (active ? 1400 / speed : 220);
      if (!active && remaining < 0.4) value.current = 100;
      const next = Math.min(target, value.current);
      // chỉ cập nhật state khi số nguyên % đổi -> đỡ render liên tục
      setPct((p) => (Math.floor(p) === Math.floor(next) && next < 100 ? p : next));
      if (value.current < 100) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [active, speed]);

  return pct;
}

/**
 * Thanh tải có số % chạy bám theo đầu thanh.
 * Hiệu năng: mọi khung hình được ghi thẳng vào DOM bằng transform (GPU),
 * không setState mỗi frame nên không gây giật khi đang tải nặng.
 */
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
  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  // mục tiêu hiện tại, cập nhật không cần render lại
  const target = useRef(0);
  target.current = done ? 100 : Math.max(0, Math.min(100, percent ?? -1));
  const auto = percent === undefined;
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const doneRef = useRef(done);
  doneRef.current = done;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let value = 0;
    let shown = -1;

    const tick = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;

      const goal = autoRef.current ? (doneRef.current ? 100 : 99) : target.current;
      const remaining = goal - value;
      // tiến nhanh khi còn xa, mượt dần khi tới đích; xong thì lao lên 100
      value += remaining * Math.min(1, dt / (doneRef.current ? 200 : 500));
      if (doneRef.current && remaining < 0.3) value = 100;
      if (value < 0) value = 0;
      if (value > 100) value = 100;

      if (barRef.current) barRef.current.style.transform = `scaleX(${value / 100})`;
      if (labelRef.current) labelRef.current.style.transform = `translateX(${value}%)`;
      const int = value >= 99.5 ? 100 : Math.floor(value);
      if (int !== shown) {
        shown = int;
        if (textRef.current) textRef.current.textContent = `${int}%`;
      }
      if (!(doneRef.current && value >= 100)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`flex w-56 max-w-[70vw] flex-col items-center gap-1 ${className}`}>
      {/* số % chạy theo đầu thanh */}
      <div className="relative h-5 w-full overflow-hidden">
        <div ref={labelRef} className="absolute top-0 left-0 w-full will-change-transform">
          <span
            className={`inline-block -translate-x-1/2 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums shadow ${
              light ? "bg-white text-slate-800" : "bg-primary text-primary-foreground"
            }`}
            ref={textRef}
          >
            0%
          </span>
        </div>
      </div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${light ? "bg-white/30" : "bg-foreground/15"}`}>
        <div
          ref={barRef}
          className={`h-full w-full origin-left rounded-full will-change-transform ${light ? "bg-white" : "bg-primary"}`}
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}

export default LoadingPercent;
