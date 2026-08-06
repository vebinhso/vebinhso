import bgHouse from "@/assets/bg-house.jpg";
import LoadingPercent from "@/components/LoadingPercent";

export default function RouteLoading() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${bgHouse})` }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/50 border-t-white" />
        <div className="text-xl font-black text-white drop-shadow-lg">Đang tải, chờ xíu nhé...</div>
        <LoadingPercent />
      </div>
    </div>
  );
}
