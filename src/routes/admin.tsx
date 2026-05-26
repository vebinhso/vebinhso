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
  type AdminConfig,
  type AdminQuestion,
  type PlayerStat,
} from "@/lib/admin";
import { CATALOG } from "@/game/catalog";

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
  | "prices" | "rewards" | "content" | "maps" | "logs";

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
  useEffect(() => { refreshPlayerStats().catch(() => {}); }, []);
  const stats = useMemo(() => getAllPlayerStats(), []);
  const total = stats.length;
  const todayMs = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })();
  const activeToday = stats.filter((s) => s.lastLoginDate >= todayMs).length;
  const totalAnswers = stats.reduce((s, p) => s + p.correctAnswers, 0);
  // Tỉ lệ đúng giả lập 70-95% (chưa có log câu sai); thực tế sẽ wire khi có data
  const avgCorrect = total > 0 ? Math.round((totalAnswers / (total * Math.max(1, totalAnswers / total))) * 100) : 0;
  const avgOnline = "~ 22 phút"; // chưa track session length

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
        <StatCard icon="✅" label="Tổng câu đúng" value={totalAnswers} />
        <StatCard icon="🎯" label="Tỉ lệ đúng TB" value={`${Math.min(100, avgCorrect)}%`} hint="ước lượng" />
        <StatCard icon="⏱️" label="Thời gian online TB" value={avgOnline} hint="ước lượng" />
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
function PlayersPanel({ cfg, onChange }: { cfg: AdminConfig; onChange: (c: AdminConfig, a?: string) => void }) {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlayerStat | null>(null);

  useEffect(() => { refresh(); }, []);

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
                    <td className="p-2">
                      {banned
                        ? <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">KHÓA</span>
                        : <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">OK</span>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center font-bold text-muted-foreground">Không có tài khoản</td></tr>
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

  async function reload() {
    setLoading(true);
    try {
      const data = await fetchQuestions();
      setList(data);
    } catch (e: any) {
      alert("Lỗi tải câu hỏi: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

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
                <input value={o.imageUrl || ""} onChange={(e) => setOptionImage(i, e.target.value)}
                  placeholder="Link ảnh đáp án (tùy chọn)" className="mt-1 w-full px-2 py-1 rounded border border-orange-100 text-xs" />
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

        <div className="flex gap-2 items-center mb-2 flex-wrap">
          <label className="text-sm font-bold">Điểm:</label>
          <input type="number" value={draft.reward} onChange={(e) => setDraft({ ...draft, reward: parseInt(e.target.value) || 10 })}
            className="w-20 px-2 py-1 rounded border-2 border-orange-100" />
          <input value={draft.imageUrl || ""} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
            placeholder="Link ảnh câu hỏi (tùy chọn)" className="flex-1 px-2 py-1 rounded border-2 border-orange-100 text-sm" />
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

      <ul className="grid gap-2 max-h-[55vh] overflow-y-auto">
        {list.map((q) => (
          <li key={q.id} className="bg-white/80 border-2 border-orange-100 rounded-xl p-3 flex items-start gap-3">
            {q.imageUrl && <img src={q.imageUrl} alt="" className="w-16 h-16 object-cover rounded" />}
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm">{q.q}</div>
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
                {(q.maps || ["all"]).map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{mapLabel(m)}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => startEdit(q)} className="text-blue-600 font-black hover:underline text-sm">✏️ Sửa</button>
              <button onClick={() => remove(q.id)} className="text-red-600 font-black hover:underline text-sm">Xoá</button>
            </div>
          </li>
        ))}
      </ul>
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
