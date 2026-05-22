import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";

export const Route = createFileRoute("/play")({ component: PlayPage });

function PlayPage() {
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
        <div className="glass-card max-w-lg w-full p-8 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-black mb-2">CHƠI NGAY</h1>
          <p className="font-bold text-muted-foreground mb-6">
            Xin chào <span className="text-orange-600">{user.username}</span> (ID #{user.id})
          </p>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-6">
            <p className="font-bold">🚧 Các màn chơi sẽ được bổ sung sau!</p>
          </div>
          <Link to="/" className="toy-button toy-button-primary w-full !text-lg">
            ← VỀ TRANG CHỦ
          </Link>
        </div>
      </div>
    </GameLayout>
  );
}
