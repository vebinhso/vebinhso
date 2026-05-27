import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { loadOutfit } from "@/lib/character";

export const Route = createFileRoute("/play")({ component: PlayPage });

function PlayPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [hasOutfit, setHasOutfit] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate({ to: "/login" }); return; }
    setUser(u);
    setHasOutfit(!!loadOutfit());
  }, [navigate]);

  if (!user) return null;

  if (!hasOutfit) {
    return (
      <GameLayout showBack>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-8 text-center">
            <div className="text-6xl mb-3">🧑‍🎨</div>
            <h1 className="text-2xl font-black mb-2">TẠO NHÂN VẬT</h1>
            <p className="font-bold text-muted-foreground mb-6">
              Trước khi vào game, hãy thiết kế bộ trang phục riêng cho nhân vật của bạn.
            </p>
            <Link to="/character" className="toy-button toy-button-primary w-full !text-lg">
              ✨ Thiết kế trang phục
            </Link>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card max-w-xl w-full p-8 text-center">
          <div className="text-6xl mb-3">🎮</div>
          <h1 className="text-3xl font-black mb-2">CHỌN BẢN ĐỒ</h1>
          <p className="font-bold text-muted-foreground mb-6">
            Xin chào <span className="text-orange-600">{user.username}</span>{isAdmin(user.email) && <> (ID #{user.id})</>}
          </p>
          <div className="grid gap-4">
            <Link to="/game" className="toy-button toy-button-primary w-full !text-xl py-6 flex flex-col items-center gap-1">
              <span className="text-3xl">🏡</span>
              <span>BẢN ĐỒ NHÀ</span>
              <span className="text-xs font-bold opacity-80">Khu Nông thôn — Xây dựng & trang trí</span>
            </Link>
            <Link to="/magic" className="toy-button w-full !text-xl py-6 flex flex-col items-center gap-1 bg-gradient-to-br from-purple-500 to-indigo-700 text-white">
              <span className="text-3xl">🏰</span>
              <span>BẢN ĐỒ LÂU ĐÀI MA THUẬT</span>
              <span className="text-xs font-bold opacity-90">Hành lang 10 cánh cửa — Đấu boss</span>
            </Link>
            <Link to="/character" className="toy-button w-full !text-sm">
              🎨 Đổi trang phục
            </Link>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
