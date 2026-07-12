import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import {
  isAdmin,
  loadAdminConfig,
  saveAdminConfig,
  getAllPlayerStats,
  refreshPlayerStats,
  updatePlayerGame,
  resetPasswordRandom,
  getAdminLogs,
  pushAdminLog,
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  toggleQuestionEnabled,
  setQuestionPriority,
  reorderPriority,
  getPriorityMode,
  setPriorityMode,
  type AdminConfig,
  type AdminQuestion,
  type PlayerStat,
} from "@/lib/admin";
import { CATALOG } from "@/game/catalog";
import { ImageUploadField } from "@/components/ImageUploadField";
import { generateBasePickups, loadPickupConfig, savePickupConfig, type PickupKind, type PickupConfig } from "@/lib/worldPickups";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Quản trị viên — VeBinhSo" }] }),
});

type Tab =
  | "dashboard" | "players" | "admins" | "questions" | "levels"
  | "prices" | "rewards" | "content" | "maps" | "pickups" | "logs";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Tổng quan", icon: "📊" },
  { id: "players", label: "Người chơi", icon: "👥" },
  { id: "admins", label: "Quản trị viên", icon: "🛡️" },
  { id: "questions", label: "Câu hỏi", icon: "❓" },
  { id: "levels", label: "Cấp độ", icon: "⭐" },
  { id: "prices", label: "Giá cả", icon: "💰" },
  { id: "rewards", label: "Phần thưởng", icon: "🎁" },
  { id: "content", label: "Nội dung", icon: "📝" },
  { id: "maps", label: "Khu vực", icon: "🗺️" },
  { id: "pickups", label: "Vật phẩm map", icon: "🪙" },
  { id: "logs", label: "Nhật ký", icon: "📜" },
];

function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [cfg, setCfg] = useState<AdminConfig>(() => loadAdminConfig());
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate({ to: "/login" }); return; }
    setAuthorized(isAdmin(u.email));
  }, [navigate]);

  function update(next: AdminConfig, action?: string) {
    setCfg(next);
    saveAdminConfig(next);
    if (action) pushAdminLog(action);
  }

  if (authorized === null) return null;
  if (!authorized) {
    return (
      <GameLayout showBack>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass-card max-w-md p-8 text-center">
            <div className="text-5xl mb-3">🚫</div>
            <h1 className="text-2xl font-black mb-2">Không có quyền truy cập</h1>
            <p className="font-bold text-muted-foreground">Trang này chỉ dành cho quản trị viên.</p>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout showBack>
      <div className="flex-1 p-3 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">🛡️ TRUNG TÂM QUẢN TRỊ</h1>
              <p className="text-xs md:text-sm font-bold text-muted-foreground">
                Đăng nhập: {getCurrentUser()?.email}
              </p>
            </div>
            <div className="text-xs font-bold text-muted-foreground">
              ☁️ Câu hỏi lưu trên DB dùng chung · Một số cấu hình khác lưu cục bộ
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            <nav className="glass-card p-2 h-fit md:sticky md:top-3">
              <div className="flex md:flex-col gap-1 overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`text-left whitespace-nowrap px-3 py-2 rounded-xl font-bold text-sm transition ${
                      tab === t.id ? "bg-orange-500 text-white shadow" : "hover:bg-orange-100"
                    }`}
                  >
                    <span className="mr-2">{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </nav>

            <main className="glass-card p-4 md:p-6 min-h-[60vh]">
              {tab === "dashboard" && <DashboardPanel cfg={cfg} />}
              {tab === "players" && <PlayersPanel cfg={cfg} onChange={update} />}
              {tab === "admins" && <AdminsPanel cfg={cfg} onChange={update} />}
              {tab === "questions" && <QuestionsPanel cfg={cfg} onChange={update} />}
              {tab === "levels" && <LevelsPanel cfg={cfg} onChange={update} />}
              {tab === "prices" && <PricesPanel cfg={cfg} onChange={update} />}
              {tab === "rewards" && <RewardsPanel cfg={cfg} onChange={update} />}
              {tab === "content" && <ContentPanel />}
              {tab === "maps" && <MapsPanel cfg={cfg} onChange={update} />}
              {tab === "pickups" && <PickupsPanel />}
              {tab === "logs" && <LogsPanel />}
            </main>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}

/* ===================== DASHBOARD ===================== */
function StatCard({ icon, label, value, hint }: { icon: string; label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white/80 border-2 border-orange-200 rounded-2xl p-4 shadow">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-xs font-black text-muted-foreground uppercase">{label}</div>
      <div className="text-2xl md:text-3xl font-black text-orange-600">{value}</div>
      {hint && <div className="text-xs font-bold text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function DashboardPanel({ cfg }: { cfg: AdminConfig }) {
  const [stats, setStats] = useState<PlayerStat[]>(() => getAllPlayerStats());
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [s, qs] = await Promise.all([
          refreshPlayerStats(),
          fetchQuestions().catch(() => []),
        ]);
        if (!alive) return;
        setStats(s);
        setTotalQuestions(qs.length);
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const total = stats.length;
  const todayMs = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })();
  const activeToday = stats.filter((s) => s.lastLoginDate >= todayMs).length;
  const totalCorrect = stats.reduce((s, p) => s + p.correctAnswers, 0);
  const totalAnswered = stats.reduce((s, p) => s + p.totalAnswered, 0);
  // Tỉ lệ đúng trung bình = tổng câu đúng / tổng số câu người chơi đã trả lời * 100
  const avgCorrectRate = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;
  // Thời gian chơi trung bình (giây) = tổng thời gian chơi / số người chơi đã truy cập
  const totalPlaySec = stats.reduce((acc, p) => acc + (p.playSeconds || 0), 0);
  const avgPlaySec = total > 0 ? totalPlaySec / total : 0;
  const formatPlay = (sec: number) => {
    const m = Math.round(sec / 60);
    if (m < 60) return `${m}p`;
    const g = Math.floor(m / 60);
    const p = m % 60;
    return p === 0 ? `${g}g` : `${g}g ${p}p`;
  };

  const levelDist = useMemo(() => {
    const m: Record<number, number> = {};
    for (const s of stats) m[s.level] = (m[s.level] || 0) + 1;
    return Object.entries(m).map(([lvl, cnt]) => ({ level: `Lv ${lvl}`, count: cnt }));
  }, [stats]);

  const mapDist = Object.entries(cfg.mapCapacity).map(([id, cap]) => {
    const players = id === "rural" ? Math.min(total, cap) : Math.floor(total * (id === "city" ? 0.3 : 0.2));
    return { name: id === "rural" ? "Nông thôn" : id === "city" ? "Thành phố" : "Lâu đài MT", value: players, capacity: cap };
  });

  const COLORS = ["#f97316", "#3b82f6", "#a855f7", "#10b981", "#ef4444"];

  return (
    <div>
      <h2 className="text-xl font-black mb-4">📊 Tổng quan hệ thống</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon="👥" label="Tổng người chơi" value={total} />
        <StatCard icon="🟢" label="Online hôm nay" value={activeToday} />
        <StatCard icon="❓" label="Tổng số câu hỏi" value={totalQuestions} />
        <StatCard icon="🎯" label="Tỉ lệ đúng trung bình" value={`${avgCorrectRate.toFixed(1)}%`} hint={`${totalCorrect} câu đúng / ${totalAnswered} câu đã trả lời`} />
        <StatCard icon="⏱️" label="Thời gian chơi trung bình" value={formatPlay(avgPlaySec)} hint={`Tổng ${formatPlay(totalPlaySec)}`} />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/80 border-2 border-orange-200 rounded-2xl p-4">
          <h3 className="font-black mb-2">Phân bố theo cấp độ</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={levelDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 border-2 border-orange-200 rounded-2xl p-4">
          <h3 className="font-black mb-2">Phân bố theo khu vực</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mapDist} dataKey="value" nameKey="name" outerRadius={90} label>
                  {mapDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== PLAYERS ===================== */
function fmtPlay(sec: number) {
  const m = Math.round((sec || 0) / 60);
  if (m < 1) return `${Math.round(sec || 0)}s`;
  if (m < 60) return `${m}p`;
  const g = Math.floor(m / 60);
  const p = m % 60;
  return p === 0 ? `${g}g` : `${g}g ${p}p`;
}

function PlayersPanel({ cfg, onChange }: { cfg: AdminConfig; onChange: (c: AdminConfig, a?: string) => void }) {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlayerStat | null>(null);

  useEffect(() => {
    refresh();
    const t = setInterval(() => { refresh(); }, 15000);
    return () => clearInterval(t);
  }, []);

  async function refresh() {
    const fresh = await refreshPlayerStats();
    setStats(fresh);
    setAccounts(fresh.map((s) => ({ id: s.id, username: s.username, email: s.email, createdAt: "" })));
    setSelected((s) => s ? fresh.find((p) => p.id === s.id) || null : null);
  }

  const filtered = stats.filter((s) =>
    !query ||
    s.username.toLowerCase().includes(query.toLowerCase()) ||
    s.email.toLowerCase().includes(query.toLowerCase()) ||
    String(s.id).includes(query),
  );

  function toggleBan(id: string) {
    const banned = cfg.bannedAccountIds.includes(id)
      ? cfg.bannedAccountIds.filter((x) => x !== id)
      : [...cfg.bannedAccountIds, id];
    onChange({ ...cfg, bannedAccountIds: banned }, `Toggle ban tài khoản #${id}`);
  }

  async function doReset(id: string) {
    const pwd = await resetPasswordRandom(id);
    if (pwd) {
      pushAdminLog(`Reset mật khẩu tài khoản #${id}`);
      alert(`Mật khẩu mới: ${pwd}`);
      refresh();
    } else {
      alert("Reset mật khẩu cần yêu cầu người dùng dùng chức năng 'Quên mật khẩu' để nhận email khôi phục.");
    }
  }

  async function grantCoin(id: string) {
    const v = prompt("Nhập số xu muốn cộng (dùng số âm để trừ):", "100");
    if (!v) return;
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return;
    const acc = accounts.find((a) => a.id === id);
    const current = stats.find((s) => s.id === id)?.money || 0;
    await updatePlayerGame(id, { money: Math.max(0, current + n) });
    pushAdminLog(`Cộng ${n} xu cho ${acc?.username}`);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xl font-black">👥 Quản lý người chơi ({filtered.length})</h2>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên / email / ID"
          className="px-3 py-2 rounded-xl border-2 border-orange-200 font-bold text-sm w-72"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="overflow-x-auto bg-white/70 rounded-2xl border-2 border-orange-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-orange-100 font-black">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Tên</th>
                <th className="p-2">Email</th>
                <th className="p-2">Lv</th>
                <th className="p-2">💰</th>
                <th className="p-2">🏠</th>
                <th className="p-2">✅</th>
                <th className="p-2">⏱️</th>
                <th className="p-2">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const banned = cfg.bannedAccountIds.includes(p.id);
                return (
                  <tr key={p.id}
                    onClick={() => setSelected(p)}
                    className={`border-b border-orange-50 cursor-pointer hover:bg-orange-50 font-bold ${selected?.id === p.id ? "bg-orange-100" : ""}`}>
                    <td className="p-2 text-orange-600">#{p.id}</td>
                    <td className="p-2">{p.username}</td>
                    <td className="p-2 text-xs text-muted-foreground">{p.email}</td>
                    <td className="p-2">{p.level}</td>
                    <td className="p-2">{p.money}</td>
                    <td className="p-2">{p.netWorth}</td>
                    <td className="p-2">{p.correctAnswers}</td>
                    <td className="p-2 text-xs">{fmtPlay(p.playSeconds || 0)}</td>
                    <td className="p-2">
                      {banned
                        ? <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">KHÓA</span>
                        : <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">OK</span>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center font-bold text-muted-foreground">Không có tài khoản</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="bg-white/80 rounded-2xl border-2 border-orange-200 p-4 h-fit">
          {selected ? (
            <>
              <h3 className="font-black text-lg mb-1">{selected.username}</h3>
              <div className="text-xs font-bold text-muted-foreground mb-3">{selected.email} · #{selected.id}</div>
              <div className="grid grid-cols-2 gap-2 mb-3 text-sm font-bold">
                <div className="bg-orange-50 p-2 rounded">Cấp: {selected.level}</div>
                <div className="bg-orange-50 p-2 rounded">Streak: {selected.streak}</div>
                <div className="bg-orange-50 p-2 rounded">💰 {selected.money}</div>
                <div className="bg-orange-50 p-2 rounded">🏠 {selected.netWorth}</div>
                <div className="bg-orange-50 p-2 rounded col-span-2">✅ Câu đúng: {selected.correctAnswers}</div>
                <div className="bg-orange-50 p-2 rounded col-span-2">⏱️ Tổng thời gian chơi: {fmtPlay(selected.playSeconds || 0)}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => grantCoin(selected.id)} className="toy-button text-sm bg-green-500">💰 Tặng/trừ xu</button>
                <button onClick={() => doReset(selected.id)} className="toy-button text-sm bg-blue-500">🔑 Reset mật khẩu</button>
                <button onClick={() => toggleBan(selected.id)} className="toy-button text-sm bg-red-500">
                  {cfg.bannedAccountIds.includes(selected.id) ? "✅ Mở khóa" : "🚫 Khóa tài khoản"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground font-bold py-12">Chọn 1 tài khoản để xem chi tiết</div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ===================== ADMINS ===================== */
function AdminsPanel({ cfg, onChange }: { cfg: AdminConfig; onChange: (c: AdminConfig, a?: string) => void }) {
  const [email, setEmail] = useState("");
  function add() {
    const e = email.trim().toLowerCase();
    if (!e || cfg.admins.map(x => x.toLowerCase()).includes(e)) return;
    onChange({ ...cfg, admins: [...cfg.admins, e] }, `Thêm admin ${e}`);
    setEmail("");
  }
  function remove(e: string) {
    if (!confirm(`Xoá quyền admin của ${e}?`)) return;
    onChange({ ...cfg, admins: cfg.admins.filter((x) => x !== e) }, `Xoá admin ${e}`);
  }
  return (
    <div>
      <h2 className="text-xl font-black mb-3">🛡️ Quản lý quản trị viên ({cfg.admins.length})</h2>
      <div className="flex gap-2 mb-4">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com"
          className="flex-1 px-3 py-2 rounded-xl border-2 border-orange-200 font-bold" />
        <button onClick={add} className="toy-button">+ Thêm</button>
      </div>
      <ul className="grid gap-2">
        {cfg.admins.map((e) => (
          <li key={e} className="bg-white/80 border-2 border-orange-100 rounded-xl p-3 flex items-center justify-between font-bold">
            <span>📧 {e}</span>
            <button onClick={() => remove(e)} className="text-red-600 font-black hover:underline">Xoá</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===================== QUESTIONS ===================== */
const MAP_OPTIONS: { id: string; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "rural", label: "Nông thôn" },
  { id: "city", label: "Thành phố" },
  { id: "magic", label: "Lâu đài ma thuật" },
];

function emptyQuestionDraft(): AdminQuestion {
  return {
    id: "",
    q: "",
    options: [
      { text: "", imageUrl: "" },
      { text: "", imageUrl: "" },
      { text: "", imageUrl: "" },
      { text: "", imageUrl: "" },
    ],
    correctIndexes: [0],
    maps: ["all"],
    reward: 10,
    imageUrl: "",
    enabled: true,
    priority: 0,
    competencyLevel: null,
  };
}

function QuestionsPanel({ cfg: _cfg, onChange: _onChange }: { cfg: AdminConfig; onChange: (c: AdminConfig, a?: string) => void }) {
  const [list, setList] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<AdminQuestion>(emptyQuestionDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [priorityModeOn, setPriorityModeOn] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | "all" | "none">("all");


  async function reload() {
    setLoading(true);
    try {
      const [data, mode] = await Promise.all([fetchQuestions(), getPriorityMode()]);
      setList(data);
      setPriorityModeOn(mode);
    } catch (e: any) {
      alert("Lỗi tải câu hỏi: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  async function togglePriorityMode() {
    const next = !priorityModeOn;
    setPriorityModeOn(next);
    try { await setPriorityMode(next); pushAdminLog(`Chế độ ưu tiên: ${next ? "BẬT" : "TẮT"}`); }
    catch (e: any) { alert("Lỗi: " + (e?.message || e)); setPriorityModeOn(!next); }
  }

  async function toggleEnabled(q: AdminQuestion) {
    const next = !q.enabled;
    setList((cur) => cur.map((x) => x.id === q.id ? { ...x, enabled: next } : x));
    try { await toggleQuestionEnabled(q.id, next); }
    catch (e: any) { alert("Lỗi: " + (e?.message || e)); reload(); }
  }

  async function addToPriority(q: AdminQuestion) {
    const maxP = list.reduce((m, x) => Math.max(m, x.priority || 0), 0);
    const priorityCount = list.filter((x) => (x.priority || 0) > 0).length;
    if (priorityCount >= 30) {
      if (!confirm(`Zone ưu tiên đã có ${priorityCount} câu (khuyến nghị ≤30). Vẫn thêm?`)) return;
    }
    try { await setQuestionPriority(q.id, maxP + 1); await reload(); }
    catch (e: any) { alert("Lỗi: " + (e?.message || e)); }
  }

  async function removeFromPriority(q: AdminQuestion) {
    try { await setQuestionPriority(q.id, 0); await reload(); }
    catch (e: any) { alert("Lỗi: " + (e?.message || e)); }
  }

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const priorityList = list.filter((x) => (x.priority || 0) > 0);
    const fromIdx = priorityList.findIndex((x) => x.id === dragId);
    const toIdx = priorityList.findIndex((x) => x.id === targetId);
    if (fromIdx < 0 || toIdx < 0) { setDragId(null); return; }
    const reordered = [...priorityList];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setDragId(null);
    try { await reorderPriority(reordered.map((x) => x.id)); await reload(); }
    catch (e: any) { alert("Lỗi: " + (e?.message || e)); }
  }



  function validateDraft(): boolean {
    if (!draft.q.trim()) { alert("Nhập nội dung câu hỏi"); return false; }
    const filled = draft.options.filter((o) => (o.text || "").trim());
    if (filled.length < 2) { alert("Cần ít nhất 2 đáp án có nội dung"); return false; }
    if (!draft.correctIndexes || draft.correctIndexes.length === 0) {
      alert("Tick ít nhất 1 đáp án đúng"); return false;
    }
    // Loại các index nằm ngoài
    const valid = draft.correctIndexes.filter((i) => i >= 0 && i < draft.options.length);
    if (valid.length === 0) { alert("Tick ít nhất 1 đáp án đúng"); return false; }
    return true;
  }

  function setOptionText(i: number, text: string) {
    const opts = [...draft.options];
    opts[i] = { ...opts[i], text };
    setDraft({ ...draft, options: opts });
  }
  function setOptionImage(i: number, imageUrl: string) {
    const opts = [...draft.options];
    opts[i] = { ...opts[i], imageUrl };
    setDraft({ ...draft, options: opts });
  }
  function addOption() {
    if (draft.options.length >= 6) return;
    setDraft({ ...draft, options: [...draft.options, { text: "", imageUrl: "" }] });
  }
  function removeOption(i: number) {
    if (draft.options.length <= 2) return;
    const opts = draft.options.filter((_, idx) => idx !== i);
    // remap correctIndexes
    const ci = draft.correctIndexes
      .filter((idx) => idx !== i)
      .map((idx) => (idx > i ? idx - 1 : idx));
    setDraft({ ...draft, options: opts, correctIndexes: ci.length ? ci : [0] });
  }
  function toggleCorrect(i: number) {
    const has = draft.correctIndexes.includes(i);
    const ci = has ? draft.correctIndexes.filter((x) => x !== i) : [...draft.correctIndexes, i].sort((a, b) => a - b);
    setDraft({ ...draft, correctIndexes: ci });
  }
  function toggleMap(id: string) {
    if (id === "all") { setDraft({ ...draft, maps: ["all"] }); return; }
    let next = draft.maps.filter((m) => m !== "all");
    if (next.includes(id)) next = next.filter((m) => m !== id);
    else next = [...next, id];
    if (next.length === 0) next = ["all"];
    setDraft({ ...draft, maps: next });
  }

  async function add() {
    if (!validateDraft()) return;
    setBusy(true);
    try {
      await createQuestion(draft);
      pushAdminLog(`Thêm câu hỏi: ${draft.q.slice(0, 30)}`);
      setDraft(emptyQuestionDraft());
      await reload();
    } catch (e: any) {
      alert("Lỗi thêm câu hỏi: " + (e?.message || e));
    } finally { setBusy(false); }
  }

  function startEdit(q: AdminQuestion) {
    setEditingId(q.id);
    setDraft({
      ...q,
      options: q.options.map((o) => ({ text: o.text || "", imageUrl: o.imageUrl || "" })),
      correctIndexes: [...(q.correctIndexes || [])],
      maps: [...(q.maps && q.maps.length ? q.maps : ["all"])],
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyQuestionDraft());
  }
  async function saveEdit() {
    if (!editingId) return;
    if (!validateDraft()) return;
    setBusy(true);
    try {
      await updateQuestion(editingId, draft);
      pushAdminLog(`Sửa câu hỏi: ${draft.q.slice(0, 30)}`);
      setEditingId(null);
      setDraft(emptyQuestionDraft());
      await reload();
    } catch (e: any) {
      alert("Lỗi cập nhật: " + (e?.message || e));
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Xoá câu hỏi này?")) return;
    setBusy(true);
    try {
      await deleteQuestion(id);
      pushAdminLog(`Xoá câu hỏi ${id}`);
      if (editingId === id) cancelEdit();
      await reload();
    } catch (e: any) {
      alert("Lỗi xoá: " + (e?.message || e));
    } finally { setBusy(false); }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "questions.json"; a.click();
    URL.revokeObjectURL(url);
  }

  async function importFromSheet() {
    if (!sheetUrl.trim()) return;
    setImporting(true);
    try {
      let csvUrl = sheetUrl.trim();
      const m = csvUrl.match(/\/d\/([\w-]+)/);
      if (m) {
        const id = m[1];
        const gidMatch = csvUrl.match(/[#&?]gid=(\d+)/);
        const gid = gidMatch ? gidMatch[1] : "0";
        csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
      }
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Không tải được sheet (sheet cần Public).");
      const text = await res.text();
      const rows = text.split(/\r?\n/).filter(Boolean).map((row) => {
        const cells: string[] = []; let cur = ""; let q = false;
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          if (ch === '"') q = !q;
          else if (ch === "," && !q) { cells.push(cur); cur = ""; }
          else cur += ch;
        }
        cells.push(cur);
        return cells.map((c) => c.trim());
      });
      const header = rows.shift();
      if (!header) throw new Error("Sheet rỗng");
      const parsed: AdminQuestion[] = rows.map((r) => {
        const ans = Math.max(0, Math.min(3, (parseInt(r[5] || "1", 10) || 1) - 1));
        return {
          id: "",
          q: r[0] || "",
          options: [
            { text: r[1] || "", imageUrl: "" },
            { text: r[2] || "", imageUrl: "" },
            { text: r[3] || "", imageUrl: "" },
            { text: r[4] || "", imageUrl: "" },
          ],
          correctIndexes: [ans],
          maps: ["all"],
          reward: parseInt(r[6] || "10", 10) || 10,
          imageUrl: r[7] || "",
          enabled: true,
          priority: 0,
        };
      }).filter((q) => q.q && q.options.every((o) => o.text));
      if (parsed.length === 0) throw new Error("Không phân tích được câu nào");
      let ok = 0;
      for (const q of parsed) {
        try { await createQuestion(q); ok++; } catch { /* skip */ }
      }
      pushAdminLog(`Import ${ok} câu từ Google Sheet`);
      alert(`Đã import ${ok}/${parsed.length} câu hỏi`);
      setSheetUrl("");
      await reload();
    } catch (e: any) {
      alert("Lỗi: " + (e?.message || e));
    } finally { setImporting(false); }
  }

  function mapLabel(id: string) {
    return MAP_OPTIONS.find((m) => m.id === id)?.label || id;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xl font-black">❓ Thư viện câu hỏi ({list.length}){loading && " — đang tải..."}</h2>
        <div className="flex gap-2">
          <button onClick={exportJson} className="toy-button text-sm bg-blue-500">⬇️ Xuất JSON</button>
        </div>
      </div>

      {/* Priority mode master toggle */}
      <div className={`rounded-2xl p-4 mb-4 border-2 transition ${priorityModeOn ? "bg-amber-100 border-amber-400" : "bg-gray-50 border-gray-300"}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-black text-lg">🎯 Chế độ ưu tiên</div>
            <div className="text-xs font-bold text-muted-foreground mt-0.5">
              {priorityModeOn
                ? `🟢 ĐANG BẬT — game sẽ ưu tiên ${list.filter((x) => (x.priority || 0) > 0).length} câu trong zone`
                : "⚪ ĐANG TẮT — game random toàn bộ câu hỏi"}
            </div>
          </div>
          <button onClick={togglePriorityMode}
            className={`toy-button text-sm ${priorityModeOn ? "bg-amber-500" : "bg-gray-500"}`}>
            {priorityModeOn ? "Tắt chế độ" : "Bật chế độ"}
          </button>
        </div>
      </div>



      {/* Google Sheet import */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 mb-4">
        <div className="font-black mb-2 text-sm">📊 Nhập từ Google Sheet (Public, cột: câu hỏi, A, B, C, D, đáp án đúng 1-4, điểm, link ảnh) — sẽ gán map "Tất cả"</div>
        <div className="flex gap-2">
          <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 px-3 py-2 rounded-xl border-2 border-emerald-300 font-bold text-sm" />
          <button onClick={importFromSheet} disabled={importing} className="toy-button bg-emerald-500 text-sm">
            {importing ? "Đang nhập..." : "↻ Import"}
          </button>
        </div>
      </div>

      {/* New / edit question form */}
      <div className="bg-white/80 border-2 border-orange-200 rounded-2xl p-3 mb-4">
        <div className="font-black mb-2">
          {editingId ? "✏️ Đang sửa câu hỏi" : "➕ Thêm câu hỏi mới"}
        </div>
        <input value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          placeholder="Nội dung câu hỏi (text)" className="w-full px-3 py-2 rounded-xl border-2 border-orange-200 mb-3 font-bold" />

        {/* Options list (2-6) */}
        <div className="space-y-2 mb-3">
          {draft.options.map((o, i) => {
            const isCorrect = draft.correctIndexes.includes(i);
            return (
              <div key={i} className={`rounded-xl p-2 border-2 transition ${isCorrect ? "bg-green-50 border-green-500" : "bg-white border-orange-100"}`}>
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg font-black text-sm ${isCorrect ? "bg-green-500 text-white" : "bg-gray-100"}`}>
                    <input type="checkbox" className="w-5 h-5 accent-green-600" checked={isCorrect} onChange={() => toggleCorrect(i)} />
                    {isCorrect ? "✓ Đúng" : "Đúng?"}
                  </label>
                  <input value={o.text} onChange={(e) => setOptionText(i, e.target.value)}
                    placeholder={`Đáp án ${i + 1}`} className="flex-1 px-2 py-1 rounded border-2 border-orange-100 text-sm font-bold" />
                  <button onClick={() => removeOption(i)} disabled={draft.options.length <= 2}
                    className="text-red-600 font-black text-lg px-1 disabled:opacity-30" title="Xoá đáp án">🗑</button>
                </div>
                <div className="mt-1">
                  <ImageUploadField value={o.imageUrl || ""} onChange={(url) => setOptionImage(i, url)} label="ảnh đáp án" />
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={addOption} disabled={draft.options.length >= 6}
          className="toy-button text-xs bg-orange-400 mb-3 disabled:opacity-40">➕ Thêm đáp án ({draft.options.length}/6)</button>

        {/* Maps */}
        <div className="mb-3">
          <div className="text-sm font-black mb-1">🗺️ Áp dụng cho map:</div>
          <div className="flex flex-wrap gap-2">
            {MAP_OPTIONS.map((m) => {
              const active = draft.maps.includes(m.id);
              return (
                <label key={m.id} className={`flex items-center gap-1 px-3 py-1 rounded-full border-2 cursor-pointer text-sm font-bold ${active ? "bg-blue-500 text-white border-blue-600" : "bg-white border-blue-200"}`}>
                  <input type="checkbox" className="w-4 h-4" checked={active} onChange={() => toggleMap(m.id)} />
                  {m.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="mb-3 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-2">
          <div className="text-sm font-black text-indigo-800 mb-1">🌐 Khung năng lực số — Môi trường số</div>
          <div className="text-xs font-bold text-indigo-700 mb-1">
            Chọn bậc (1–8). Câu có bậc sẽ tự vào ưu tiên & xuất hiện theo thứ tự bậc; trong cùng bậc mỗi tài khoản thấy thứ tự khác nhau (random). Trả lời sai → câu hiện lại 1 lần trước khi qua bậc khác.
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setDraft({ ...draft, competencyLevel: null })}
              className={`text-xs px-3 py-1 rounded-lg font-black border-2 ${(draft.competencyLevel ?? null) == null ? "bg-gray-400 text-white border-gray-500" : "bg-white border-gray-300"}`}
            >Không</button>
            {[1,2,3,4,5,6,7,8].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDraft({ ...draft, competencyLevel: lvl })}
                className={`text-xs px-3 py-1 rounded-lg font-black border-2 ${draft.competencyLevel === lvl ? "bg-indigo-600 text-white border-indigo-700" : "bg-white border-indigo-200"}`}
              >Bậc {lvl}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-center mb-2 flex-wrap">
          <label className="text-sm font-bold">Điểm:</label>
          <input type="number" value={draft.reward} onChange={(e) => setDraft({ ...draft, reward: parseInt(e.target.value) || 10 })}
            className="w-20 px-2 py-1 rounded border-2 border-orange-100" />
        </div>
        <div className="mb-3">
          <div className="text-sm font-bold mb-1">🖼️ Ảnh câu hỏi (tùy chọn):</div>
          <ImageUploadField value={draft.imageUrl || ""} onChange={(url) => setDraft({ ...draft, imageUrl: url })} label="ảnh câu hỏi" />
        </div>
        {editingId ? (
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={busy} className="toy-button text-sm bg-green-500">💾 Lưu thay đổi</button>
            <button onClick={cancelEdit} disabled={busy} className="toy-button text-sm bg-gray-500">✕ Hủy</button>
          </div>
        ) : (
          <button onClick={add} disabled={busy} className="toy-button text-sm">+ Thêm câu hỏi</button>
        )}
      </div>

      {/* Competency level breakdown */}
      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3 mb-4">
        <div className="font-black text-sm text-indigo-900 mb-2">🌐 Phân loại theo bậc năng lực số</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedLevel("all")}
            className={`text-xs px-3 py-1.5 rounded-xl font-black border-2 ${selectedLevel === "all" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white border-indigo-200"}`}
          >
            Tất cả ({list.length})
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => {
            const count = list.filter((q) => q.competencyLevel === lvl).length;
            return (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`text-xs px-3 py-1.5 rounded-xl font-black border-2 ${selectedLevel === lvl ? "bg-indigo-600 text-white border-indigo-700" : "bg-white border-indigo-200"}`}
              >
                Bậc {lvl} ({count})
              </button>
            );
          })}
          <button
            onClick={() => setSelectedLevel("none")}
            className={`text-xs px-3 py-1.5 rounded-xl font-black border-2 ${selectedLevel === "none" ? "bg-gray-500 text-white border-gray-600" : "bg-white border-gray-300"}`}
          >
            Không bậc ({list.filter((q) => q.competencyLevel == null).length})
          </button>
        </div>
      </div>

      {(() => {
        const matchesLevel = (q: AdminQuestion) => {
          if (selectedLevel === "all") return true;
          if (selectedLevel === "none") return q.competencyLevel == null;
          return q.competencyLevel === selectedLevel;
        };
        const priorityList = list.filter((x) => (x.priority || 0) > 0 && matchesLevel(x));
        const normalList = list.filter((x) => (x.priority || 0) === 0 && matchesLevel(x));


        const renderRow = (q: AdminQuestion, opts: { inPriority: boolean }) => (
          <li
            key={q.id}
            draggable={opts.inPriority}
            onDragStart={opts.inPriority ? () => setDragId(q.id) : undefined}
            onDragOver={opts.inPriority ? (e) => e.preventDefault() : undefined}
            onDrop={opts.inPriority ? () => handleDrop(q.id) : undefined}
            className={`bg-white/80 border-2 rounded-xl p-3 flex items-start gap-3 ${q.enabled ? "border-orange-100" : "border-gray-200 opacity-50"} ${opts.inPriority ? "cursor-grab" : ""} ${dragId === q.id ? "ring-2 ring-amber-400" : ""}`}
          >
            {opts.inPriority && <span className="text-gray-400 font-black select-none" title="Kéo để sắp xếp">⋮⋮</span>}
            {q.imageUrl && <img src={q.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />}
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm">
                {opts.inPriority && <span className="text-amber-600 mr-1">#{q.priority}</span>}
                {q.q}
              </div>
              <div className="text-xs font-bold mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {q.options.map((o, i) => {
                  const correct = (q.correctIndexes || []).includes(i);
                  return (
                    <span key={i} className={`inline-flex items-center gap-1 ${correct ? "text-green-700 font-black" : "text-muted-foreground"}`}>
                      {correct && "✓"} {i + 1}. {o.text}
                      {o.imageUrl && <img src={o.imageUrl} alt="" className="w-6 h-6 object-cover rounded inline-block" />}
                    </span>
                  );
                })}
              </div>
              <div className="text-xs font-bold mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-orange-600">+{q.reward} xu</span>
                {typeof q.competencyLevel === "number" && (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">🌐 Bậc {q.competencyLevel}</span>
                )}
                {(q.maps || ["all"]).map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{mapLabel(m)}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <button
                onClick={() => toggleEnabled(q)}
                className={`text-xs font-black px-2 py-0.5 rounded ${q.enabled ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`}
                title="Bật/tắt câu này"
              >
                {q.enabled ? "● Đang dùng" : "○ Đã ẩn"}
              </button>
              {opts.inPriority ? (
                <button onClick={() => removeFromPriority(q)} className="text-amber-700 font-black hover:underline text-xs">➖ Bỏ ưu tiên</button>
              ) : (
                <button onClick={() => addToPriority(q)} className="text-amber-600 font-black hover:underline text-xs">⭐ Vào ưu tiên</button>
              )}
              <button onClick={() => startEdit(q)} className="text-blue-600 font-black hover:underline text-sm">✏️ Sửa</button>
              <button onClick={() => remove(q.id)} className="text-red-600 font-black hover:underline text-sm">Xoá</button>
            </div>
          </li>
        );

        return (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <section>
              <div className="font-black mb-2 text-amber-700">
                ⭐ Zone ưu tiên ({priorityList.length} câu)
                {priorityList.length > 30 && <span className="ml-2 text-red-600 text-xs">⚠️ Đã vượt 30 câu khuyến nghị</span>}
              </div>
              {priorityList.length === 0 ? (
                <div className="text-sm font-bold text-muted-foreground italic bg-amber-50 border-2 border-dashed border-amber-200 rounded-xl p-3">
                  Chưa có câu nào. Nhấn "⭐ Vào ưu tiên" ở danh sách dưới để thêm.
                </div>
              ) : (
                <ul className="grid gap-2">
                  {priorityList.map((q) => renderRow(q, { inPriority: true }))}
                </ul>
              )}
            </section>

            <section>
              <div className="font-black mb-2">📋 Tất cả câu hỏi ({normalList.length})</div>
              <ul className="grid gap-2">
                {normalList.map((q) => renderRow(q, { inPriority: false }))}
              </ul>
            </section>
          </div>
        );
      })()}
    </div>
  );
}

/* ===================== LEVELS ===================== */
function LevelsPanel({ cfg, onChange }: { cfg: AdminConfig; onChange: (c: AdminConfig, a?: string) => void }) {
  function setVal(idx: number, key: "n" | "q", v: number) {
    const arr = key === "n" ? [...cfg.levelNetWorth] : [...cfg.levelQuestions];
    arr[idx] = v;
    onChange(key === "n" ? { ...cfg, levelNetWorth: arr } : { ...cfg, levelQuestions: arr }, `Sửa ngưỡng cấp ${idx}`);
  }
  return (
    <div>
      <h2 className="text-xl font-black mb-3">⭐ Cấu hình cấp độ (Cấp 0 — {cfg.levelNetWorth.length - 1})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100 font-black">
            <tr><th className="p-2">Cấp</th><th className="p-2">🏠 Tài sản ròng tối thiểu</th><th className="p-2">✅ Câu đúng tối thiểu</th></tr>
          </thead>
          <tbody>
            {cfg.levelNetWorth.map((v, i) => (
              <tr key={i} className="border-b border-orange-50 font-bold">
                <td className="p-2 text-orange-600">Lv {i}</td>
                <td className="p-2">
                  <input type="number" value={v} onChange={(e) => setVal(i, "n", parseInt(e.target.value) || 0)}
                    className="w-28 px-2 py-1 rounded border-2 border-orange-100" />
                </td>
                <td className="p-2">
                  <input type="number" value={cfg.levelQuestions[i] || 0} onChange={(e) => setVal(i, "q", parseInt(e.target.value) || 0)}
                    className="w-28 px-2 py-1 rounded border-2 border-orange-100" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== PRICES ===================== */
function PricesPanel({ cfg, onChange }: { cfg: AdminConfig; onChange: (c: AdminConfig, a?: string) => void }) {
  const [filter, setFilter] = useState("");
  const items = CATALOG.filter((c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.category.toLowerCase().includes(filter.toLowerCase()));

  function setPrice(id: string, v: number) {
    onChange({ ...cfg, priceOverrides: { ...cfg.priceOverrides, [id]: v } }, `Sửa giá ${id} = ${v}`);
  }
  function toggleHide(id: string) {
    const next = cfg.hiddenItems.includes(id) ? cfg.hiddenItems.filter((x) => x !== id) : [...cfg.hiddenItems, id];
    onChange({ ...cfg, hiddenItems: next }, `Toggle hiển thị ${id}`);
  }
  function resetPrice(id: string) {
    const { [id]: _, ...rest } = cfg.priceOverrides;
    onChange({ ...cfg, priceOverrides: rest }, `Reset giá ${id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xl font-black">💰 Quản lý giá cả ({items.length})</h2>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Tìm theo tên / nhóm"
          className="px-3 py-2 rounded-xl border-2 border-orange-200 font-bold text-sm w-72" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-orange-100 font-black sticky top-0">
            <tr><th className="p-2">Vật phẩm</th><th className="p-2">Nhóm</th><th className="p-2">Giá gốc</th><th className="p-2">Giá hiệu lực</th><th className="p-2">Hiển thị</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const hidden = cfg.hiddenItems.includes(it.id);
              const override = cfg.priceOverrides[it.id];
              const eff = override ?? it.price;
              return (
                <tr key={it.id} className="border-b border-orange-50 font-bold">
                  <td className="p-2">{it.icon} {it.name}</td>
                  <td className="p-2 text-xs text-muted-foreground">{it.category}</td>
                  <td className="p-2 text-muted-foreground">{it.price}</td>
                  <td className="p-2">
                    <input type="number" value={eff} onChange={(e) => setPrice(it.id, parseInt(e.target.value) || 0)}
                      className={`w-20 px-2 py-1 rounded border-2 ${override !== undefined ? "border-orange-400 bg-orange-50" : "border-orange-100"}`} />
                  </td>
                  <td className="p-2">
                    <button onClick={() => toggleHide(it.id)} className={`px-2 py-1 rounded font-black text-xs ${hidden ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"}`}>
                      {hidden ? "ẨN" : "HIỆN"}
                    </button>
                  </td>
                  <td className="p-2">
                    {override !== undefined && <button onClick={() => resetPrice(it.id)} className="text-blue-600 text-xs hover:underline">reset</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== REWARDS ===================== */
function RewardsPanel({ cfg, onChange }: { cfg: AdminConfig; onChange: (c: AdminConfig, a?: string) => void }) {
  function setReward(idx: number, key: "coin" | "label", v: any) {
    const arr = [...cfg.dailyRewards];
    arr[idx] = { ...arr[idx], [key]: v };
    onChange({ ...cfg, dailyRewards: arr }, `Sửa thưởng ngày ${arr[idx].day}`);
  }
  function toggleEvent(id: string) {
    const arr = cfg.events.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e);
    onChange({ ...cfg, events: arr }, `Toggle sự kiện ${id}`);
  }
  return (
    <div>
      <h2 className="text-xl font-black mb-3">🎁 Phần thưởng & Sự kiện</h2>

      <h3 className="font-black mb-2">Thưởng đăng nhập hằng ngày</h3>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2 mb-6">
        {cfg.dailyRewards.map((d, i) => (
          <div key={d.day} className="bg-white/80 border-2 border-orange-200 rounded-xl p-2 text-center">
            <div className="font-black text-orange-600">Ngày {d.day}</div>
            <input value={d.label} onChange={(e) => setReward(i, "label", e.target.value)}
              className="w-full text-xs px-2 py-1 rounded border my-1 font-bold" />
            <input type="number" value={d.coin} onChange={(e) => setReward(i, "coin", parseInt(e.target.value) || 0)}
              className="w-full text-center font-black text-lg px-2 py-1 rounded border" />
            <div className="text-xs font-bold text-muted-foreground">xu</div>
          </div>
        ))}
      </div>

      <h3 className="font-black mb-2">Sự kiện trong game</h3>
      <ul className="grid gap-2">
        {cfg.events.map((ev) => (
          <li key={ev.id} className="bg-white/80 border-2 border-orange-100 rounded-xl p-3 flex items-center justify-between font-bold">
            <span>{ev.name}</span>
            <button onClick={() => toggleEvent(ev.id)} className={`px-3 py-1 rounded font-black text-xs ${ev.enabled ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-700"}`}>
              {ev.enabled ? "BẬT" : "TẮT"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===================== CONTENT ===================== */
function ContentPanel() {
  return (
    <div>
      <h2 className="text-xl font-black mb-3">📝 Nội dung người dùng</h2>
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 font-bold text-sm">
        Khu vực này sẽ duyệt tên nhà, ảnh nhà và xử lý báo cáo vi phạm khi người chơi gửi.
        Hiện chưa có nội dung cần duyệt.
      </div>
    </div>
  );
}

/* ===================== MAPS ===================== */
function MapsPanel({ cfg, onChange }: { cfg: AdminConfig; onChange: (c: AdminConfig, a?: string) => void }) {
  function setCap(id: string, v: number) {
    onChange({ ...cfg, mapCapacity: { ...cfg.mapCapacity, [id]: v } }, `Sửa capacity ${id}`);
  }
  const names: Record<string, string> = { rural: "Nông thôn", city: "Thành phố", magic: "Lâu đài ma thuật" };
  return (
    <div>
      <h2 className="text-xl font-black mb-3">🗺️ Sức chứa từng khu vực</h2>
      <div className="grid gap-2">
        {Object.entries(cfg.mapCapacity).map(([id, cap]) => (
          <div key={id} className="bg-white/80 border-2 border-orange-100 rounded-xl p-3 flex items-center justify-between font-bold">
            <span>{names[id] || id}</span>
            <div className="flex items-center gap-2">
              <input type="number" value={cap} onChange={(e) => setCap(id, parseInt(e.target.value) || 0)}
                className="w-24 px-2 py-1 rounded border-2 border-orange-100" />
              <span className="text-sm text-muted-foreground">người</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== PICKUPS (Vật phẩm map nhà) ===================== */
function PickupsPanel() {
  const [cfg, setCfg] = useState<PickupConfig | null>(null);
  const [kind, setKind] = useState<PickupKind>("coin");
  const [x, setX] = useState("20");
  const [z, setZ] = useState("20");
  const [filter, setFilter] = useState<"all" | "coin" | "bomb">("all");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPickupConfig().then(setCfg).catch(() => setCfg({ override: false, items: [] }));
  }, []);

  const persist = async (next: PickupConfig) => {
    setSaving(true);
    try {
      await savePickupConfig(next);
      setCfg(next);
      setMsg("✅ Đã lưu");
      setTimeout(() => setMsg(null), 1500);
    } catch (e: any) {
      setMsg("❌ Lỗi lưu: " + (e?.message ?? "unknown"));
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return <div className="font-bold">Đang tải...</div>;

  const add = () => {
    const nx = parseFloat(x), nz = parseFloat(z);
    if (!isFinite(nx) || !isFinite(nz)) { setMsg("❌ Tọa độ không hợp lệ"); return; }
    const id = `m-${kind[0]}-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`;
    persist({ ...cfg, items: [...cfg.items, { id, kind, x: +nx.toFixed(2), z: +nz.toFixed(2) }] });
  };
  const remove = (id: string) => persist({ ...cfg, items: cfg.items.filter((p) => p.id !== id) });
  const updateCoord = (id: string, axis: "x" | "z", v: string) => {
    const nv = parseFloat(v); if (!isFinite(nv)) return;
    persist({ ...cfg, items: cfg.items.map((p) => p.id === id ? { ...p, [axis]: +nv.toFixed(2) } : p) });
  };
  const clearAll = () => { if (confirm("Xoá toàn bộ vật phẩm trong danh sách?")) persist({ ...cfg, items: [] }); };
  const loadBaseIntoEditor = () => {
    if (!confirm("Tải 100 xu + 200 boom layout mặc định vào danh sách (sẽ bật chế độ ghi đè)?")) return;
    persist({ override: true, items: generateBasePickups() });
  };
  const toggleOverride = (v: boolean) => persist({ ...cfg, override: v });

  const coinCount = cfg.items.filter((p) => p.kind === "coin").length;
  const bombCount = cfg.items.filter((p) => p.kind === "bomb").length;
  const filtered = cfg.items.filter((p) => filter === "all" ? true : p.kind === filter);

  return (
    <div>
      <h2 className="text-xl font-black mb-2">🪙 Vật phẩm rải trên map nhà</h2>
      <p className="text-sm text-muted-foreground font-bold mb-3">
        Hệ tọa độ: x/z trong khoảng <code>±100</code>, mảnh đất ở giữa <code>±10</code>. Xu = +10đ, Boom = 2 câu hỏi (✅+10/❌−5).
      </p>

      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3 mb-3 flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 font-black text-sm">
          <input type="checkbox" checked={cfg.override} onChange={(e) => toggleOverride(e.target.checked)} className="w-4 h-4" />
          Ghi đè toàn bộ (quản lý 100% vị trí)
        </label>
        <button onClick={loadBaseIntoEditor} disabled={saving} className="toy-button !text-xs !py-2 !px-3">📥 Nạp layout base vào danh sách</button>
        <span className="text-xs font-bold text-muted-foreground">
          {cfg.override ? "→ Map chỉ dùng danh sách dưới đây." : "→ Map = 100 xu + 200 boom ngẫu nhiên + các mục dưới đây."}
        </span>
      </div>

      <div className="grid sm:grid-cols-[auto_auto_auto_auto_auto] gap-2 items-end bg-amber-50/60 border border-amber-200 rounded-xl p-3 mb-4">
        <label className="text-xs font-black flex flex-col gap-1">
          Loại
          <select value={kind} onChange={(e) => setKind(e.target.value as PickupKind)} className="border-2 border-amber-300 rounded px-2 py-1 font-bold">
            <option value="coin">🪙 Xu (+10đ)</option>
            <option value="bomb">💣 Boom</option>
          </select>
        </label>
        <label className="text-xs font-black flex flex-col gap-1">
          x <input value={x} onChange={(e) => setX(e.target.value)} className="border-2 border-amber-300 rounded px-2 py-1 w-24 font-bold" />
        </label>
        <label className="text-xs font-black flex flex-col gap-1">
          z <input value={z} onChange={(e) => setZ(e.target.value)} className="border-2 border-amber-300 rounded px-2 py-1 w-24 font-bold" />
        </label>
        <button onClick={add} disabled={saving} className="toy-button toy-button-primary !text-xs !py-2 !px-3">➕ Thêm</button>
        <button onClick={clearAll} disabled={saving || cfg.items.length === 0} className="toy-button !text-xs !py-2 !px-3">🗑️ Xoá hết</button>
      </div>

      {msg && <div className="mb-2 text-sm font-black">{msg}</div>}

      <div className="flex flex-wrap gap-2 items-center mb-2 text-sm font-bold">
        <span>Tổng trong danh sách: 🪙 {coinCount} · 💣 {bombCount} ({cfg.items.length})</span>
        <span className="ml-auto flex gap-1">
          {(["all", "coin", "bomb"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-2 py-1 rounded border-2 text-xs ${filter === k ? "bg-amber-300 border-amber-500" : "bg-white border-amber-200"}`}>
              {k === "all" ? "Tất cả" : k === "coin" ? "🪙 Xu" : "💣 Boom"}
            </button>
          ))}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground font-bold">Chưa có vật phẩm nào.</div>
      ) : (
        <ul className="grid gap-1 max-h-[55vh] overflow-y-auto">
          {filtered.map((p) => (
            <li key={p.id} className="bg-white/70 border border-orange-100 rounded p-2 text-sm font-bold flex flex-wrap justify-between items-center gap-2">
              <span className="flex items-center gap-2">
                {p.kind === "coin" ? "🪙" : "💣"} <code className="text-xs">{p.id}</code>
              </span>
              <span className="flex items-center gap-1 text-xs">
                x <input defaultValue={p.x} onBlur={(e) => updateCoord(p.id, "x", e.target.value)} className="border rounded px-1 py-0.5 w-16" />
                z <input defaultValue={p.z} onBlur={(e) => updateCoord(p.id, "z", e.target.value)} className="border rounded px-1 py-0.5 w-16" />
                <button onClick={() => remove(p.id)} disabled={saving} className="toy-button !text-xs !py-1 !px-2">Xoá</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ===================== LOGS ===================== */
function LogsPanel() {
  const [logs] = useState(() => getAdminLogs());
  return (
    <div>
      <h2 className="text-xl font-black mb-3">📜 Nhật ký hoạt động ({logs.length})</h2>
      {logs.length === 0 ? (
        <div className="text-muted-foreground font-bold">Chưa có hoạt động.</div>
      ) : (
        <ul className="grid gap-1 max-h-[65vh] overflow-y-auto">
          {logs.map((l, i) => (
            <li key={i} className="bg-white/70 border border-orange-100 rounded p-2 text-sm font-bold flex justify-between gap-2">
              <span>{l.action}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {l.actor} · {new Date(l.at).toLocaleString("vi-VN")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
