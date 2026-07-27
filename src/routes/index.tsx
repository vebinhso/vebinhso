import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getCurrentUser,
  setCurrentUser,
  getLoginStreak,
  renameAccount,
  hydrateFromSession,
  type Account,
  type LoginStreak,
} from "@/lib/auth";
import { loadGame } from "@/lib/game";
import { loadQuestionsFromDB } from "@/game/questions";
import { isAdmin } from "@/lib/admin";
import { ClassroomPanel } from "@/components/ClassroomPanel";
import { latestAnnouncementAt, getSeenAnnouncement, markAnnouncementSeen } from "@/lib/classroom-posts";
import { getMyTeacherProfile, joinClass, leaveClass, getMyClasses, setActiveClass, type MyTeacherProfile, type MyClass } from "@/lib/teacher";
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
  head: () => ({ meta: [{ title: "Vệ binh số - vui học kỹ năng số" }] }),
});

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [streak, setStreak] = useState<LoginStreak | null>(null);
  const [money, setMoney] = useState(0);
  const [level, setLevel] = useState(0);
  const [netWorth, setNetWorth] = useState(0);
  const [ready, setReady] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);


  const [friends, setFriends] = useState<Account[]>([]);
  const [incoming, setIncoming] = useState<{ from: Account; created_at: number }[]>([]);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllIncoming, setShowAllIncoming] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [found, setFound] = useState<Account | null>(null);
  const [searchErr, setSearchErr] = useState<string>("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<MyTeacherProfile | null>(null);
  const [myClasses, setMyClasses] = useState<MyClass[]>([]);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [annAt, setAnnAt] = useState<Record<string, string>>({});
  const annNew = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const [cid, at] of Object.entries(annAt)) {
      const seen = getSeenAnnouncement(cid);
      out[cid] = !seen || new Date(at) > new Date(seen);
    }
    return out;
  }, [annAt]);
  const hasAnyNew = Object.values(annNew).some(Boolean);
  const openClassDetail = (c: MyClass) => {
    const at = annAt[c.class_id];
    if (at) markAnnouncementSeen(c.class_id, at);
    setAnnAt((m) => ({ ...m }));
    setDetailClass(c);
  };
  const [detailClass, setDetailClass] = useState<MyClass | null>(null);

  const syncGame = () => {
    const g = loadGame();
    setMoney(g.money);
    setLevel(g.level);
    setNetWorth(g.netWorth);
  };

  const takeScreenshot = async () => {
    try {
      const md = (navigator as any).mediaDevices;
      if (!md?.getDisplayMedia) {
        toast.error("Trình duyệt không hỗ trợ chụp màn hình.");
        return;
      }
      const stream: MediaStream = await md.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      // Chờ 1 frame để có ảnh
      await new Promise((r) => setTimeout(r, 250));
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      track.stop();
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vebinhso-${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Đã lưu ảnh chụp màn hình!");
      }, "image/png");
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") toast.error("Không thể chụp màn hình.");
    }
  };

  const doRename = async () => {
    setRenameBusy(true);
    const res = await renameAccount(renameVal);
    setRenameBusy(false);
    if (res.ok) {
      toast.success(res.msg);
      setUser(getCurrentUser());
      syncGame();
      setRenameOpen(false);
      setRenameVal("");
    } else {
      toast.error(res.msg);
    }
  };

  const refreshFriends = (uid: string) => {
    setFriends(listFriends(uid));
    setIncoming(listIncomingRequests(uid));
  };

  // Unread chat messages badge
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("to_id", user.id)
        .is("seen_at", null);
      if (!cancelled) setUnreadChat(count || 0);
    };
    load();
    const ch = supabase
      .channel(`home-unread-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `to_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);


  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      let u = getCurrentUser();
      if (!u) {
        u = await hydrateFromSession();
      }
      if (cancelled) return;
      if (!u) {
        navigate({ to: "/login" });
        return;
      }
      setUser(u);
      setStreak(getLoginStreak(u.id));
      syncGame();
      refreshFriends(u.id);
      getMyTeacherProfile().then((p) => { if (!cancelled) setTeacherProfile(p); }).catch(() => {});
      getMyClasses().then((cs) => {
        if (cancelled) return;
        setMyClasses(cs);
        latestAnnouncementAt(cs.map((c) => c.class_id)).then((m) => { if (!cancelled) setAnnAt(m); }).catch(() => {});
      }).catch(() => {});
      setReady(true);
      // Cập nhật lại streak khi session hydrate xong (recordLoginDay chạy async).
      const refresh = () => {
        const cu = getCurrentUser();
        if (cu) setStreak(getLoginStreak(cu.id));
        syncGame();
      };
      window.addEventListener("auth-change", refresh);
      window.addEventListener("game-change", syncGame);
      const t = setTimeout(refresh, 800);
      cleanup = () => {
        window.removeEventListener("auth-change", refresh);
        window.removeEventListener("game-change", syncGame);
        clearTimeout(t);
      };
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [navigate]);

  if (!ready || !user) return null;

  const handleLogout = () => {
    setCurrentUser(null);
    navigate({ to: "/login" });
  };

  const handleSearch = () => {
    setFound(null);
    setSearchErr("");
    const acc = findUserByName(searchName);
    if (!acc) {
      setSearchErr("Không tìm thấy người dùng với tên này!");
      return;
    }
    if (acc.id === user.id) {
      setSearchErr("Không thể tự kết bạn với chính mình.");
      return;
    }
    setFound(acc);
  };

  const handleSend = () => {
    if (!found) return;
    const r = sendRequest(user.id, found.id);
    if (r.ok) toast.success(r.msg);
    else toast.error(r.msg);
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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-4 border-white flex items-center justify-center text-2xl overflow-hidden">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : "🐕"}
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight flex items-center gap-2">
              {user.username}
              <button
                onClick={() => {
                  setRenameVal(user.username);
                  setRenameOpen(true);
                }}
                className="text-sm opacity-60 hover:opacity-100 transition"
                title="Đổi tên"
              >
                ✏️
              </button>
            </h1>
            
            <p className="text-xs font-bold text-rose-600">
              🔥 Chuỗi: {streak?.currentStreak ?? 0} ngày
              <span className="ml-1 text-muted-foreground">(tổng {streak?.totalDays ?? 0})</span>
            </p>
            <p className="text-sm font-bold text-yellow-700">💰 {money}đ</p>
            <p className="text-xs font-bold text-purple-700">⭐ Cấp {level} • 🏠 {netWorth}đ</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-12 w-[160px]">
          <Link to="/shop" className="toy-button text-sm w-full justify-center">
            🛒 CỬA HÀNG
          </Link>
          <Link to="/ranking" className="toy-button text-sm w-full justify-center">
            📊 XẾP HẠNG
          </Link>
          <Link to="/tutorial" className="toy-button text-sm w-full justify-center">
            📖 HƯỚNG DẪN
          </Link>
          {isAdmin(user.email) && (
            <Link to="/admin" className="toy-button text-sm bg-purple-600 text-white w-full justify-center">
              🛡️ ADMIN
            </Link>
          )}
          {teacherProfile?.isTeacher && (
            <Link to="/classroom" className="toy-button text-sm bg-emerald-600 text-white w-full justify-center">
              🧑‍🏫 LỚP HỌC
            </Link>
          )}
          {teacherProfile && !teacherProfile.isTeacher && teacherProfile.teacherStatus === "pending" && (
            <div className="text-[10px] font-black bg-yellow-100 text-yellow-800 rounded-xl px-2 py-1 text-center">
              🧑‍🏫 Chờ duyệt giáo viên
            </div>
          )}
          <button onClick={() => setJoinOpen(true)} className="relative toy-button text-sm bg-blue-500 text-white w-full justify-center whitespace-nowrap">
            🎓 LỚP HỌC{myClasses.length > 0 ? ` (${myClasses.length})` : ""}
            {hasAnyNew && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow animate-pulse" title="Có thông báo mới từ giáo viên" />
            )}
          </button>



          <button onClick={handleLogout} className="toy-button text-sm w-full justify-center">
            🚪 ĐĂNG XUẤT
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-stretch md:justify-between gap-3 px-4 md:px-6 pb-4">
        <aside className="glass-card p-3 md:p-4 w-full md:w-[260px] flex flex-col gap-3 max-h-[40vh] md:max-h-[78vh] overflow-y-auto">
          <h3 className="text-center font-black text-foreground">BẠN BÈ ONLINE</h3>

          {friends.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground italic">Chưa có bạn bè. Hãy kết bạn bên dưới!</p>
          ) : (
            <>
              {(showAllFriends ? friends : friends.slice(0, 1)).map((f) => (
                <div key={f.id} className="friend-item">
                  <span className="w-9 h-9 rounded-full bg-blue-300 flex items-center justify-center">🧑</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">{f.username}</div>
                    
                  </div>
                </div>
              ))}
              {friends.length > 1 && (
                <button
                  onClick={() => setShowAllFriends((v) => !v)}
                  className="w-full mt-1 py-1 rounded-lg bg-white/60 hover:bg-white/80 text-[10px] font-black transition"
                >
                  {showAllFriends ? "▲ ẨN BỚT" : "▼ HIỆN THÊM"}
                </button>
              )}
            </>
          )}

          {incoming.length > 0 && (
            <div className="mt-2 border-t-2 border-white/60 pt-2">
              <h4 className="text-xs font-black text-center mb-2">📬 LỜI MỜI ({incoming.length})</h4>
              {(showAllIncoming ? incoming : incoming.slice(0, 1)).map((r) => (
                <div key={r.from.id} className="bg-white/80 rounded-xl p-2 mb-2 text-xs">
                  <div className="font-black">{r.from.username}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        acceptRequest(user.id, r.from.id);
                        refreshFriends(user.id);
                        toast.success("Đã chấp nhận!");
                      }}
                      className="flex-1 bg-emerald-500 text-white rounded-md py-1 font-black text-[10px]"
                    >
                      ✓ ĐỒNG Ý
                    </button>
                    <button
                      onClick={() => {
                        declineRequest(user.id, r.from.id);
                        refreshFriends(user.id);
                      }}
                      className="flex-1 bg-rose-500 text-white rounded-md py-1 font-black text-[10px]"
                    >
                      ✗ TỪ CHỐI
                    </button>
                  </div>
                </div>
              ))}
              {incoming.length > 1 && (
                <button
                  onClick={() => setShowAllIncoming((v) => !v)}
                  className="w-full mt-1 py-1 rounded-lg bg-white/60 hover:bg-white/80 text-[10px] font-black transition"
                >
                  {showAllIncoming ? "▲ ẨN BỚT" : "▼ HIỆN THÊM"}
                </button>
              )}
            </div>
          )}

          <div className="mt-2 border-t-2 border-white/60 pt-3">
            <h4 className="text-xs font-black text-center mb-2">➕ KẾT BẠN</h4>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Nhập tên đăng nhập"
              className="w-full mb-2 px-2 py-1 rounded-md border-2 border-white text-xs"
            />
            <button onClick={handleSearch} className="w-full toy-button !text-xs !py-1.5">
              🔍 TÌM
            </button>

            {searchErr && <p className="text-[11px] font-bold text-rose-600 mt-2 text-center">{searchErr}</p>}

            {found && (
              <div className="mt-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl p-3 border-2 border-orange-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-lg border-2 border-white">
                    🐕
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">{found.username}</div>
                    
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!!getFriendship(user.id, found.id)}
                  className="w-full toy-button toy-button-primary !text-xs !py-1.5 disabled:opacity-50"
                >
                  {friendBtnLabel}
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col items-center justify-end gap-4">
          <div className="text-9xl drop-shadow-lg animate-bounce" style={{ animationDuration: "3s" }}>
            🐕
          </div>
          <Link to="/play" className="toy-button toy-button-primary">
            CHƠI NGAY
          </Link>
        </div>

        <aside className="flex flex-row md:flex-col gap-2 md:gap-3 justify-center flex-wrap md:w-[180px]">
          <button
            onClick={() => setSurveyOpen(true)}
            className="toy-button md:w-full md:justify-center text-xs md:text-sm bg-gradient-to-r from-pink-200 to-rose-200 border-pink-300"
          >
            💗 KHẢO SÁT
          </button>
          <Link to="/missions" className="toy-button md:w-full md:justify-center text-xs md:text-sm">
            🎁 TIỆN ÍCH
          </Link>
          <Link to="/pets" className="toy-button md:w-full md:justify-center text-xs md:text-sm">
            ⚡ QUYỀN NĂNG
          </Link>
        </aside>
      </main>

      <footer className="flex items-center justify-between gap-3 p-4 md:p-6">
        <div className="flex gap-2 flex-wrap">
          <Link to="/chat" className="toy-button text-sm min-w-[140px] justify-center">
            💬 TRÒ CHUYỆN
          </Link>
          <button
            onClick={takeScreenshot}
            className="toy-button text-sm min-w-[140px] justify-center"
            title="Chụp màn hình trò chơi"
          >
            📸 CHỤP ẢNH
          </button>
        </div>

        <Link to="/events" className="toy-button toy-button-accent min-w-[180px] justify-center">
          SỰ KIỆN HOT 🔥
        </Link>
      </footer>

      {renameOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setRenameOpen(false)}
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black mb-2">✏️ Đổi tên đăng nhập</h3>
            <p className="text-xs text-muted-foreground mb-3">Lần đầu miễn phí. Các lần sau tốn 50 xu/lần.</p>
            <input
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              maxLength={20}
              placeholder="Tên mới (2–20 ký tự)"
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setRenameOpen(false)} className="toy-button flex-1">
                Hủy
              </button>
              <button
                onClick={doRename}
                disabled={renameBusy}
                className="toy-button toy-button-primary flex-1 disabled:opacity-50"
              >
                {renameBusy ? "Đang đổi..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {surveyOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSurveyOpen(false)}
        >
          <div
            className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-3xl p-6 max-w-md w-full border-4 border-pink-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-3 text-rose-700">💗 Khảo sát trải nghiệm</h3>
            <p className="text-sm font-bold text-rose-700 leading-relaxed mb-4">
              💗 Cảm ơn bạn vì đã trải nghiệm trò chơi Vệ Binh Số. Bạn vui lòng điền khảo sát để chúng mình hiểu rõ hơn
              về quá trình trải nghiệm trò chơi của bạn nhée!
            </p>
            <a
              href="https://byvn.net/AnKf"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center toy-button toy-button-primary mb-2"
            >
              🔗 MỞ KHẢO SÁT
            </a>
            <p className="text-[10px] text-center text-rose-600 break-all">https://byvn.net/AnKf</p>
            <button onClick={() => setSurveyOpen(false)} className="toy-button w-full mt-3">
              Đóng
            </button>
          </div>
        </div>
      )}

      {joinOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-3 overflow-y-auto" onClick={() => { setJoinOpen(false); setDetailClass(null); }}>
          <div className="bg-white rounded-3xl p-5 max-w-2xl w-full border-4 border-blue-300 my-6 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailClass ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setDetailClass(null)} className="toy-button !text-xs !py-1.5">← Lớp học</button>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black truncate">{detailClass.name}</h3>
                    <p className="text-[11px] font-bold text-muted-foreground truncate">
                      🧑‍🏫 {detailClass.teacher_name} · mã {detailClass.code}
                    </p>
                  </div>
                </div>
                <ClassroomPanel classId={detailClass.class_id} canPost={false} compact defaultTab="announcement" />
              </>
            ) : (
              <>
                <h3 className="text-xl font-black mb-2">🎓 Lớp học</h3>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3 mb-4">
                  <p className="text-xs font-black text-blue-700 mb-2">Nhập mã lớp giáo viên cung cấp để tham gia</p>
                  {(() => {
                    const doJoin = async () => {
                      const code = joinCode.trim();
                      if (!code) { setJoinMsg({ ok: false, text: "VUI LÒNG NHẬP MÃ LỚP" }); toast.error("Nhập mã lớp"); return; }
                      setJoinMsg(null);
                      if (joining) return;
                      setJoining(true);
                      try {
                        let res: any;
                        try {
                          res = await joinClass(code);
                        } catch {
                          // phiên đăng nhập vừa khôi phục — thử lại 1 lần
                          res = await joinClass(code);
                        }
                        if (res?.status === "joined") {
                          setMyClasses(await getMyClasses());
                          setJoinCode("");
                          setJoinMsg({ ok: true, text: "ĐÃ THAM GIA LỚP HỌC THÀNH CÔNG" });
                          toast.success("ĐÃ THAM GIA LỚP HỌC THÀNH CÔNG");
                        } else if (res?.status === "pending") {
                          setJoinCode("");
                          setJoinMsg({ ok: true, text: "ĐÃ GỬI YÊU CẦU — chờ giáo viên phê duyệt" });
                          toast.success("ĐÃ GỬI YÊU CẦU — chờ giáo viên phê duyệt");
                        } else if (res?.status === "own") {
                          setJoinMsg({ ok: false, text: "ĐÂY LÀ LỚP CỦA BẠN" });
                          toast.error("Đây là lớp của bạn");
                        } else {
                          setJoinMsg({ ok: false, text: "MÃ LỚP SAI / KHÔNG TỒN TẠI" });
                          toast.error("MÃ LỚP SAI / KHÔNG TỒN TẠI");
                        }
                      } catch (e: any) {
                        setJoinMsg({ ok: false, text: "MÃ LỚP SAI / KHÔNG TỒN TẠI" });
                        toast.error(e?.message || "MÃ LỚP SAI / KHÔNG TỒN TẠI");
                      }
                      setJoining(false);
                    };
                    return (
                      <div className="flex gap-2">
                        <input
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.replace(/\s+/g, ""))}
                          onKeyDown={(e) => { if (e.key === "Enter") doJoin(); }}
                          placeholder="VD: ab12Cd"
                          maxLength={10}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className="flex-1 min-w-0 px-3 py-2 rounded-2xl border-2 border-gray-200 font-black text-center text-lg tracking-widest normal-case"
                        />
                        <button
                          onClick={doJoin}
                          disabled={joining}
                          className="toy-button toy-button-primary !text-sm whitespace-nowrap disabled:opacity-60"
                        >{joining ? "Đang vào..." : "Tham gia"}</button>
                      </div>
                    );
                  })()}
                  {joinMsg && (
                    <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-black text-center border-2 ${
                      joinMsg.ok ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-red-50 border-red-300 text-red-600"
                    }`}>
                      {joinMsg.ok ? "✅ " : "❌ "}{joinMsg.text}
                    </div>
                  )}
                </div>

                {myClasses.length === 0 ? (
                  <p className="text-sm font-bold text-muted-foreground text-center py-4">Bạn chưa tham gia lớp nào.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myClasses.map((c) => (
                      <div key={c.class_id} className={`relative rounded-2xl p-3 border-2 min-w-0 ${c.is_active ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white"}`}>
                        {annNew[c.class_id] && (
                          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow animate-pulse" title="Có thông báo mới từ giáo viên" />
                        )}
                        <button onClick={() => openClassDetail(c)} className="text-left w-full min-w-0">
                          <div className="font-black truncate">{c.name}</div>
                          <div className="text-[11px] font-bold text-muted-foreground truncate">
                            🧑‍🏫 {c.teacher_name} · mã {c.code}
                          </div>
                        </button>
                        <label className="flex items-center gap-2 mt-2 text-[11px] font-black cursor-pointer">
                          <input
                            type="checkbox"
                            checked={c.is_active}
                            onChange={async () => {
                              try {
                                await setActiveClass(c.is_active ? null : c.class_id);
                                setMyClasses(await getMyClasses());
                                loadQuestionsFromDB().catch(() => {});
                                toast.success(c.is_active ? "Đã tắt — dùng câu hỏi mặc định" : `Đang tham gia: ${c.name}`);
                              } catch (e: any) { toast.error(e?.message || "Lỗi"); }
                            }}
                          />
                          {c.is_active ? "Đang tham gia (nhận câu hỏi lớp)" : "Chưa tham gia nhận câu hỏi"}
                        </label>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => openClassDetail(c)} className="toy-button !text-[11px] !py-1 flex-1 justify-center">Mở lớp</button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Rời lớp ${c.name}?`)) return;
                              try { await leaveClass(c.class_id); setMyClasses(await getMyClasses()); loadQuestionsFromDB().catch(() => {}); toast.success("Đã rời lớp"); } catch (e: any) { toast.error(e?.message || "Lỗi"); }
                            }}
                            className="toy-button !text-[11px] !py-1 text-red-600"
                          >Rời</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setJoinOpen(false)} className="toy-button w-full mt-4 justify-center">Đóng</button>
              </>
            )}
          </div>
        </div>
      )}
    </GameLayout>
  );
}
