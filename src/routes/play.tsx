import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import RouteLoading from "@/components/RouteLoading";
import { getCurrentUser, type Account } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { loadOutfit } from "@/lib/character";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/play")({ component: PlayPage });

function PlayPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [hasOutfit, setHasOutfit] = useState(false);
  const en = useLocale() === "en";

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate({ to: "/login" }); return; }
    setUser(u);
    setHasOutfit(!!loadOutfit());
    // Nạp trước phần nặng để vào bản đồ là chơi ngay, không khựng.
    const warm = () => {
      import("@/game/GameWorld").catch(() => {});
      import("@/game/questions")
        .then((m) => m.loadQuestionsFromDB?.())
        .catch(() => {});
      import("@/lib/worldPickups")
        .then((m) => m.loadPickupConfig?.())
        .catch(() => {});
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (ric) ric(warm);
    else window.setTimeout(warm, 300);
  }, [navigate]);

  if (!user) return <RouteLoading />;

  if (!hasOutfit) {
    return (
      <GameLayout showBack>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-8 text-center">
            <div className="text-6xl mb-3">🧑‍🎨</div>
            <h1 className="text-2xl font-black mb-2">{en ? "CREATE YOUR CHARACTER" : "TẠO NHÂN VẬT"}</h1>
            <p className="font-bold text-muted-foreground mb-6">
              {en ? "Design your character's outfit before entering the game." : "Trước khi vào game, hãy thiết kế bộ trang phục riêng cho nhân vật của bạn."}
            </p>
            <Link to="/character" className="toy-button toy-button-primary w-full !text-lg">
              ✨ {en ? "Design outfit" : "Thiết kế trang phục"}
            </Link>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card max-w-xl w-full p-4 sm:p-8 text-center">
          <div className="text-4xl sm:text-6xl mb-3">🎮</div>
          <h1 className="text-xl sm:text-3xl font-black mb-2">{en ? "CHOOSE A MAP" : "CHỌN BẢN ĐỒ"}</h1>
          <p className="font-bold text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
            {en ? "Hello" : "Xin chào"} <span className="text-orange-600">{user.username}</span>
          </p>
          <div className="grid gap-3 sm:gap-4">
            <Link to="/game" className="toy-button toy-button-primary w-full !text-sm sm:!text-lg md:!text-xl py-3 sm:py-4 md:py-6 flex flex-col items-center gap-1 whitespace-normal !leading-tight">
              <span className="text-2xl sm:text-3xl">🏡</span>
              <span>{en ? "HOME MAP" : "BẢN ĐỒ NHÀ"}</span>
              <span className="text-[10px] sm:text-xs font-bold opacity-80">{en ? "Countryside — Build and decorate" : "Khu Nông thôn — Xây dựng & trang trí"}</span>
            </Link>
            <Link to="/magic" className="toy-button w-full !text-sm sm:!text-lg md:!text-xl py-3 sm:py-4 md:py-6 flex flex-col items-center gap-1 bg-gradient-to-br from-purple-500 to-indigo-700 text-white whitespace-normal !leading-tight">
              <span className="text-2xl sm:text-3xl">🏰</span>
              <span>{en ? "MAGIC CASTLE" : "BẢN ĐỒ LÂU ĐÀI MA THUẬT"}</span>
              <span className="text-[10px] sm:text-xs font-bold opacity-90">{en ? "Ten-door corridor — Boss battle" : "Hành lang 10 cánh cửa — Đấu boss"}</span>
            </Link>
            <Link to="/roleplay" className="toy-button w-full !text-sm sm:!text-lg md:!text-xl py-3 sm:py-4 md:py-6 flex flex-col items-center gap-1 bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white whitespace-normal !leading-tight">
              <span className="text-2xl sm:text-3xl">🎭</span>
              <span>{en ? "INTERACTIVE STORIES" : "NHẬP VAI TÌNH HUỐNG"}</span>
              <span className="text-[10px] sm:text-xs font-bold opacity-90">{en ? "Digital safety stories — choose and decide" : "Các bài chơi tình huống số — chọn & quyết định"}</span>
            </Link>
            <Link to="/character" className="toy-button w-full !text-xs sm:!text-sm">
              🎨 {en ? "Change outfit" : "Đổi trang phục"}
            </Link>

          </div>
        </div>
      </div>
    </GameLayout>
  );
}
