import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";

export const Route = createFileRoute("/experience")({
  component: ExperiencePage,
  head: () => ({
    meta: [
      { title: "Trải nghiệm — Vệ Binh Số" },
      {
        name: "description",
        content: "Chọn trải nghiệm: chơi trò chơi bản đồ hoặc tham gia khu vực AI của Vệ Binh Số.",
      },
      { property: "og:title", content: "Trải nghiệm — Vệ Binh Số" },
      { property: "og:description", content: "Chọn trò chơi hoặc khu vực AI để bắt đầu trải nghiệm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ExperiencePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
  }, [navigate]);

  if (!user) return null;

  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card max-w-xl w-full p-4 sm:p-8 text-center">
          <div className="text-4xl sm:text-6xl mb-3">✨</div>
          <h1 className="text-xl sm:text-3xl font-black mb-2">TRẢI NGHIỆM</h1>
          <p className="font-bold text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
            Xin chào <span className="text-orange-600">{user.username}</span>
          </p>
          <div className="grid gap-3 sm:gap-4">
            <Link
              to="/play"
              className="toy-button toy-button-primary w-full !text-sm sm:!text-lg md:!text-xl py-3 sm:py-4 md:py-6 flex flex-col items-center gap-1 whitespace-normal !leading-tight"
            >
              <span className="text-2xl sm:text-3xl">🎮</span>
              <span>TRÒ CHƠI</span>
              <span className="text-[10px] sm:text-xs font-bold opacity-80">Chọn bản đồ và bắt đầu chơi</span>
            </Link>
            <Link
              to="/ai"
              className="toy-button w-full !text-sm sm:!text-lg md:!text-xl py-3 sm:py-4 md:py-6 flex flex-col items-center gap-1 bg-gradient-to-br from-cyan-500 to-blue-700 text-white whitespace-normal !leading-tight"
            >
              <span className="text-2xl sm:text-3xl">🤖</span>
              <span>THAM GIA AI</span>
              <span className="text-[10px] sm:text-xs font-bold opacity-90">Khu vực AI — đang phát triển</span>
            </Link>
            <Link
              to="/truy-nguon"
              className="toy-button w-full !text-sm sm:!text-lg md:!text-xl py-3 sm:py-4 md:py-6 flex flex-col items-center gap-1 bg-gradient-to-br from-amber-500 to-orange-700 text-white whitespace-normal !leading-tight"
            >
              <span className="text-2xl sm:text-3xl">🕵️</span>
              <span>TRUY NGUỒN</span>
              <span className="text-[10px] sm:text-xs font-bold opacity-90">
                Dán ảnh / thông tin → tìm bài báo, video gốc
              </span>
            </Link>
          </div>

        </div>
      </div>
    </GameLayout>
  );
}
