import { createFileRoute, Link } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Thú Cưng Pro - Shiba Edition" }] }),
});

function Home() {
  return (
    <GameLayout>
      {/* Top bar */}
      <header className="flex items-start justify-between p-4 md:p-6 gap-3">
        <div className="glass-card px-5 py-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-4 border-white flex items-center justify-center text-2xl">🐕</div>
          <div>
            <h1 className="text-lg font-black leading-tight">Chủ nuôi Pro</h1>
            <p className="text-sm font-bold text-yellow-700">💰 2,400</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/shop" className="toy-button text-sm">🛒 CỬA HÀNG</Link>
          <Link to="/ranking" className="toy-button text-sm">📊 XẾP HẠNG</Link>
        </div>
      </header>

      {/* Middle */}
      <main className="flex-1 flex items-stretch justify-between gap-3 px-4 md:px-6 pb-4">
        {/* Friends */}
        <aside className="glass-card p-4 w-[230px] hidden md:flex flex-col gap-3">
          <h3 className="text-center font-black text-foreground">BẠN BÈ ONLINE</h3>
          <div className="friend-item"><span className="w-9 h-9 rounded-full bg-blue-300 flex items-center justify-center">👦</span>An Nguyễn</div>
          <div className="friend-item"><span className="w-9 h-9 rounded-full bg-pink-300 flex items-center justify-center">👧</span>Bình Lê</div>
          <div className="friend-item"><span className="w-9 h-9 rounded-full bg-green-300 flex items-center justify-center">🧑</span>Minh Trần</div>
        </aside>

        {/* Center - pet + play */}
        <div className="flex-1 flex flex-col items-center justify-end gap-4">
          <div className="text-9xl drop-shadow-lg animate-bounce" style={{ animationDuration: "3s" }}>🐕</div>
          <Link to="/login" className="toy-button toy-button-primary">CHƠI NGAY</Link>
        </div>

        {/* Right menu */}
        <aside className="flex flex-col gap-3 justify-center">
          <Link to="/inventory" className="toy-button min-w-[180px] justify-start">🎒 HÀNH TRANG</Link>
          <Link to="/missions" className="toy-button min-w-[180px] justify-start">🎯 NHIỆM VỤ</Link>
          <Link to="/pets" className="toy-button min-w-[180px] justify-start">🐾 THÚ CƯNG</Link>
        </aside>
      </main>

      {/* Bottom bar */}
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
