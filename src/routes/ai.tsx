import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";

export const Route = createFileRoute("/ai")({
  component: AiPage,
  head: () => ({
    meta: [
      { title: "Tham gia AI — Vệ Binh Số" },
      {
        name: "description",
        content: "Khu vực AI của Vệ Binh Số: các trải nghiệm học tập cùng trí tuệ nhân tạo, sắp ra mắt.",
      },
      { property: "og:title", content: "Tham gia AI — Vệ Binh Số" },
      { property: "og:description", content: "Khu vực AI đang được phát triển — hãy quay lại sớm nhé!" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AiPage() {
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
        <div className="glass-card max-w-xl w-full p-5 sm:p-8 text-center">
          <div className="text-5xl sm:text-6xl mb-3">🤖</div>
          <h1 className="text-xl sm:text-3xl font-black mb-2">THAM GIA AI</h1>
          <p className="font-bold text-muted-foreground text-sm sm:text-base mb-5">
            Khu vực trải nghiệm cùng trí tuệ nhân tạo đang được xây dựng.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-border p-5 mb-5 text-left">
            <p className="font-black text-sm mb-2">🚧 Sắp ra mắt</p>
            <ul className="text-xs sm:text-sm font-bold text-muted-foreground space-y-1 list-disc pl-5">
              <li>Trợ lý AI đồng hành trong game</li>
              <li>Luyện kỹ năng nhận diện nội dung do AI tạo</li>
              <li>Thử thách hỏi đáp cùng AI</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Link to="/experience" className="toy-button !text-xs sm:!text-sm">
              ↩ Quay lại trải nghiệm
            </Link>
            <Link to="/play" className="toy-button toy-button-primary !text-xs sm:!text-sm">
              🎮 Vào trò chơi
            </Link>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
