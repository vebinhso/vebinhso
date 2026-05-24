import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser, setCurrentUser, getLoginStreak, type Account, type LoginStreak } from "@/lib/auth";
import { loadGame } from "@/lib/game";
import {
  findUserByName,
  sendRequest,
  listFriends,
  listIncomingRequests,
  acceptRequest,
  declineRequest,
  getFriendship,
} from "@/lib/friends";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Thú Cưng Pro - Shiba Edition" }] }),
});

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [streak, setStreak] = useState<LoginStreak | null>(null);
  const [money, setMoney] = useState(0);
  const [ready, setReady] = useState(false);

  const [friends, setFriends] = useState<Account[]>([]);
  const [incoming, setIncoming] = useState<{ from: Account; created_at: number }[]>([]);
  const [searchName, setSearchName] = useState("");
  const [found, setFound] = useState<Account | null>(null);
  const [searchErr, setSearchErr] = useState<string>("");

  const refreshFriends = (uid: number) => {
    setFriends(listFriends(uid));
    setIncoming(listIncomingRequests(uid));
  };

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate({ to: "/login" }); return; }
    setUser(u);
    setStreak(getLoginStreak(u.id));
    setMoney(loadGame().money);
    refreshFriends(u.id);
    setReady(true);
  }, [navigate]);

  if (!ready || !user) return null;

  const handleLogout = () => { setCurrentUser(null); navigate({ to: "/login" }); };

  const handleSearch = () => {
    setFound(null); setSearchErr("");
    const acc = findUserByName(searchName);
    if (!acc) { setSearchErr("Không tìm thấy người dùng với tên này!"); return; }
    if (acc.id === user.id) { setSearchErr("Không thể tự kết bạn với chính mình."); return; }
    setFound(acc);
  };

  const handleSend = () => {
    if (!found) return;
    const r = sendRequest(user.id, found.id);
    if (r.ok) toast.success(r.msg); else toast.error(r.msg);
    refreshFriends(user.id);
  };

  const friendBtnLabel = (() => {
    if (!found) return "";
    const f = getFriendship(user.id, found.id);
    if (!f) return "📨 GỬI YÊU CẦU";
    if (f.status === "accepted") return "✅ ĐÃ LÀ BẠN";
    return "⏳ ĐANG CHỜ";
  })();

  return (
    <GameLayout>
      <header className="flex items-start justify-between p-4 md:p-6 gap-3">
        <div className="glass-card px-5 py-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-4 border-white flex items-center justify-center text-2xl">🐕</div>
          <div>
            <h1 className="text-lg font-black leading-tight">{user.username}</h1>
            <p className="text-xs font-bold text-orange-700">ID #{user.id}</p>
            <p className="text-xs font-bold text-rose-600">
              🔥 Chuỗi: {streak?.currentStreak ?? 0} ngày
              <span className="ml-1 text-muted-foreground">(tổng {streak?.totalDays ?? 0})</span>
            </p>
            <p className="text-sm font-bold text-yellow-700">💰 {money}đ</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/shop" className="toy-button text-sm">🛒 CỬA HÀNG</Link>
          <Link to="/ranking" className="toy-button text-sm">📊 XẾP HẠNG</Link>
          <button onClick={handleLogout} className="toy-button text-sm">🚪 ĐĂNG XUẤT</button>
        </div>
      </header>

      <main className="flex-1 flex items-stretch justify-between gap-3 px-4 md:px-6 pb-4">
        <aside className="glass-card p-4 w-[260px] hidden md:flex flex-col gap-3 max-h-[78vh] overflow-y-auto">
          <h3 className="text-center font-black text-foreground">BẠN BÈ ONLINE</h3>

          {friends.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground italic">Chưa có bạn bè. Hãy kết bạn bên dưới!</p>
          ) : (
            friends.map((f) => (
              <div key={f.id} className="friend-item">
                <span className="w-9 h-9 rounded-full bg-blue-300 flex items-center justify-center">🧑</span>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm truncate">{f.username}</div>
                  <div className="text-[10px] text-orange-700 font-bold">ID #{f.id}</div>
                </div>
              </div>
            ))
          )}

          {incoming.length > 0 && (
            <div className="mt-2 border-t-2 border-white/60 pt-2">
              <h4 className="text-xs font-black text-center mb-2">📬 LỜI MỜI ({incoming.length})</h4>
              {incoming.map((r) => (
                <div key={r.from.id} className="bg-white/80 rounded-xl p-2 mb-2 text-xs">
                  <div className="font-black">{r.from.username}</div>
                  <div className="text-[10px] text-orange-700 font-bold mb-1">ID #{r.from.id}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { acceptRequest(user.id, r.from.id); refreshFriends(user.id); toast.success("Đã chấp nhận!"); }}
                      className="flex-1 bg-emerald-500 text-white rounded-md py-1 font-black text-[10px]"
                    >✓ ĐỒNG Ý</button>
                    <button
                      onClick={() => { declineRequest(user.id, r.from.id); refreshFriends(user.id); }}
                      className="flex-1 bg-rose-500 text-white rounded-md py-1 font-black text-[10px]"
                    >✗ TỪ CHỐI</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 border-t-2 border-white/60 pt-3">
            <h4 className="text-xs font-black text-center mb-2">➕ KẾT BẠN</h4>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Tên đăng nhập"
              className="w-full mb-1 px-2 py-1 rounded-md border-2 border-white text-xs"
            />
            <input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="ID (ví dụ: 3)"
              className="w-full mb-2 px-2 py-1 rounded-md border-2 border-white text-xs"
            />
            <button onClick={handleSearch} className="w-full toy-button !text-xs !py-1.5">🔍 TÌM</button>

            {searchErr && <p className="text-[11px] font-bold text-rose-600 mt-2 text-center">{searchErr}</p>}

            {found && (
              <div className="mt-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl p-3 border-2 border-orange-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-lg border-2 border-white">🐕</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">{found.username}</div>
                    <div className="text-[10px] text-orange-700 font-bold">ID #{found.id}</div>
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!!getFriendship(user.id, found.id)}
                  className="w-full toy-button toy-button-primary !text-xs !py-1.5 disabled:opacity-50"
                >{friendBtnLabel}</button>
              </div>
            )}
          </div>
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
