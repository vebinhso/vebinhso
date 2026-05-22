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
          <h1 className="text-3xl font-black mb-2">VỆ BINH SỐ</h1>
          <p className="font-bold text-muted-foreground mb-6">
            Xin chào <span className="text-orange-600">{user.username}</span> (ID #{user.id})
          </p>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-6 text-left text-sm font-bold space-y-1">
            <p>🗺️ Map Tổng - Khu Nông thôn (20×20 grid)</p>
            <p>🎮 WASD di chuyển, SPACE nhảy, chuột xoay camera</p>
            <p>🛒 Mua đồ ở shop và đặt vào mảnh đất của bạn</p>
            <p>❓ Trả lời câu hỏi để kiếm tiền</p>
            <p>📈 Tăng level bằng tài sản ròng & số câu đúng</p>
          </div>
          <Link to="/game" className="toy-button toy-button-primary w-full !text-xl">
            🚀 VÀO THẾ GIỚI 3D
          </Link>
          <Link to="/" className="toy-button w-full mt-3 !text-sm">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </GameLayout>
  );
}
