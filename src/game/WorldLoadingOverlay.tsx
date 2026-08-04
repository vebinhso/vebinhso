import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/**
 * Màn hình "Đang tải" phủ toàn bộ cho tới khi Canvas 3D nạp xong toàn bộ tài nguyên.
 * Nhờ vậy người chơi vào là chơi mượt ngay, không bị khựng từng nấc khi tải dở.
 */
export function WorldLoadingOverlay({ label = "Đang tải bản đồ nhà..." }: { label?: string }) {
  const { active, progress, loaded, total } = useProgress();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Nếu scene không có asset async nào thì vẫn phải ẩn sau một nhịp ngắn
    const done = !active && (total === 0 || loaded >= total);
    if (!done) return;
    const id = window.setTimeout(() => setHidden(true), 450);
    return () => window.clearTimeout(id);
  }, [active, loaded, total]);

  if (hidden) return null;
  const pct = total === 0 ? 90 : Math.max(5, Math.round(progress));

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-sky-300 to-sky-600">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/50 border-t-white" />
      <div className="text-white font-black text-lg sm:text-xl drop-shadow">{label}</div>
      <div className="w-56 h-2.5 rounded-full bg-white/30 overflow-hidden">
        <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-white/85 text-xs font-black">{pct}%</div>
    </div>
  );
}

export default WorldLoadingOverlay;
