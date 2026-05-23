import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getCurrentUser, setCurrentUser, getLoginStreak, type Account, type LoginStreak } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Thú Cưng Pro - Shiba Edition" }] }),
});

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
    setReady(true);
  }, [navigate]);

  if (!ready || !user) return null;

  const handleLogout = () => {
    setCurrentUser(null);
    navigate({ to: "/login" });
  };

  return (
    <GameLayout>
      {/* Top bar */}
      <header className="flex items-start justify-between p-4 md:p-6 gap-3">
        <div className="glass-card px-5 py-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-4 border-white flex items-center justify-center text-2xl">
            🐕
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight">{user.username}</h1>
            <p className="text-xs font-bold text-orange-700">ID #{user.id}</p>
            <p className="text-sm font-bold text-yellow-700">💰 2,400</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/shop" className="toy-button text-sm">🛒 CỬA HÀNG</Link>
          <Link to="/ranking" className="toy-button text-sm">📊 XẾP HẠNG</Link>
          <button onClick={handleLogout} className="toy-button text-sm">🚪 ĐĂNG XUẤT</button>
        </div>
      </header>

      {/* Middle */}
      <main className="flex-1 flex items-stretch justify-between gap-3 px-4 md:px-6 pb-4">
        <aside className="glass-card p-4 w-[230px] hidden md:flex flex-col gap-3">
          <h3 className="text-center font-black text-foreground">BẠN BÈ ONLINE</h3>
          <div className="friend-item"><span className="w-9 h-9 rounded-full bg-blue-300 flex items-center justify-center">👦</span>An Nguyễn</div>
          <div className="friend-item"><span className="w-9 h-9 rounded-full bg-pink-300 flex items-center justify-center">👧</span>Bình Lê</div>
          <div className="friend-item"><span className="w-9 h-9 rounded-full bg-green-300 flex items-center justify-center">🧑</span>Minh Trần</div>
        </aside>

        <div className="flex-1 flex flex-col items-center justify-end gap-4">
          <div className="text-9xl drop-shadow-lg animate-bounce" style={{ animationDuration: "3s" }}>🐕</div>
          <Link to="/play" className="toy-button toy-button-primary">CHƠI NGAY</Link>
        </div>

        <aside className="flex flex-col gap-3 justify-center">
          <Link to="/inventory" className="toy-button min-w-[180px] justify-start">🎒 HÀNH TRANG</Link>
          <Link to="/missions" className="toy-button min-w-[180px] justify-start">🎁 TIỆN ÍCH</Link>
          <Link to="/pets" className="toy-button min-w-[180px] justify-start">⚡ QUYỀN NĂNG</Link>
        </aside>
      </main>

      <footer className="flex items-center justify-between gap-3 p-4 md:p-6">
        <div className="flex gap-2">
          <Link to="/chat" className="toy-button text-sm">💬 TRÒ CHUYỆN</Link>
          <Link to="/chat" className="toy-button text-sm">📸</Link>
        </div>
        <Link to="/events" className="toy-button toy-button-accent">SỰ KIỆN HOT 🔥</Link>
      </footer>
    </GameLayout>
  );
}
