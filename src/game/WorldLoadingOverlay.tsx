import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/**
 * Màn hình "Đang tải" phủ toàn bộ cho tới khi Canvas 3D nạp xong toàn bộ tài nguyên.
 * Nhờ vậy người chơi vào là chơi mượt ngay, không bị khựng từng nấc khi tải dở.
 */
export function WorldLoadingOverlay({ label = "Đang tải bản đồ nhà..." }: { label?: string }) {
  const { active, progress, loaded, total } = useProgress();
  const [hidden, setHidden] = useState(false);
  const [finished, setFinished] = useState(false);

  const done = !active && (total === 0 || loaded >= total);

  useEffect(() => {
    if (!done) return;
    setFinished(true);
    const id = window.setTimeout(() => setHidden(true), 650);
    return () => window.clearTimeout(id);
  }, [done]);

  if (hidden) return null;
  const pct = finished ? 100 : total === 0 ? 90 : Math.min(99, Math.max(5, Math.floor(progress)));

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-sky-300 to-sky-600">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/50 border-t-white" />
      <div className="text-white font-black text-lg sm:text-xl drop-shadow">{label}</div>
      <LoadingPercent percent={pct} done={finished} />
    </div>
  );

}

export default WorldLoadingOverlay;
