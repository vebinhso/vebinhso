import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  getMyTeacherProfile,
  listMyTaughtClasses,
  createClass,
  deleteClass,
  getClassStudents,
  listMyQuestions,
  createMyQuestion,
  updateMyQuestion,
  deleteMyQuestion,
  parseQuestionsCSV,
  parseQuestionsJSON,
  requestTeacher,
  type ClassroomStudent,
  type TeacherQuestion,
  type MyTeacherProfile,
  type TaughtClass,
} from "@/lib/teacher";
import { DOMAIN_LABELS } from "@/lib/competency-classifier";

export const Route = createFileRoute("/classroom")({
  component: ClassroomPage,
  head: () => ({ meta: [{ title: "LỚP HỌC — VeBinhSo" }] }),
});

type Tab = "overview" | "students" | "questions" | "import";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Tổng quan", icon: "📊" },
  { id: "students", label: "Học sinh", icon: "👥" },
  { id: "questions", label: "Câu hỏi", icon: "❓" },
  { id: "import", label: "Nhập dữ liệu", icon: "📥" },
];

function ClassroomPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MyTeacherProfile | null>(null);
  const [classes, setClasses] = useState<TaughtClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TaughtClass | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [addOpen, setAddOpen] = useState(false);

  const reloadClasses = async () => {
    try {
      const list = await listMyTaughtClasses();
      setClasses(list);
      if (selectedClass) {
        const updated = list.find((c) => c.id === selectedClass.id);
        if (updated) setSelectedClass(updated);
        else setSelectedClass(null);
      }
    } catch {}
  };

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate({ to: "/login" }); return; }
    (async () => {
      const p = await getMyTeacherProfile().catch(() => null);
      if (!p) { setProfile(null); return; }
      setProfile(p);
      if (p.isTeacher) reloadClasses();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (profile === null) return null;

  if (!profile.isTeacher) {
    return (
      <GameLayout showBack>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass-card max-w-md p-8 text-center">
            <div className="text-5xl mb-3">🧑‍🏫</div>
            <h1 className="text-2xl font-black mb-2">Chưa phải giáo viên</h1>
            {profile.teacherStatus === "pending" ? (
              <p className="font-bold text-muted-foreground">
                Yêu cầu đăng ký giáo viên của bạn <span className="text-orange-600">đang chờ duyệt</span>.
              </p>
            ) : profile.teacherStatus === "rejected" ? (
              <>
                <p className="font-bold text-red-600 mb-3">Yêu cầu trước đã bị từ chối.</p>
                <RequestForm onDone={() => getMyTeacherProfile().then(setProfile)} />
              </>
            ) : (
              <>
                <p className="font-bold text-muted-foreground mb-3">Gửi yêu cầu để trở thành giáo viên (cần admin duyệt).</p>
                <RequestForm onDone={() => getMyTeacherProfile().then(setProfile)} />
              </>
            )}
          </div>
        </div>
      </GameLayout>
    );
  }

  // Class list view (no class selected)
  if (!selectedClass) {
    return (
      <GameLayout showBack>
        <div className="flex-1 p-3 md:p-6">
          <div className="max-w-5xl mx-auto">
            <div className="glass-card p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-black">🧑‍🏫 LỚP HỌC CỦA TÔI</h1>
                <p className="text-xs md:text-sm font-bold text-muted-foreground">
                  {profile.teacherSchool || "—"} · {classes.length} lớp
                </p>
              </div>
              <button onClick={() => setAddOpen(true)} className="toy-button toy-button-primary text-sm">
                ➕ Thêm lớp học
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="text-4xl mb-2">📚</div>
                <p className="font-bold text-muted-foreground mb-3">Bạn chưa có lớp học nào.</p>
                <button onClick={() => setAddOpen(true)} className="toy-button toy-button-primary">
                  ➕ Tạo lớp đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {classes.map((c) => (
                  <div key={c.id} className="glass-card p-4 flex flex-col gap-2 hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-orange-300"
                       onClick={() => { setSelectedClass(c); setTab("overview"); }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-lg truncate">{c.name}</div>
                        <div className="text-xs font-bold text-muted-foreground truncate">{c.subject || "—"}</div>
                      </div>
                      <div className="bg-orange-100 border-2 border-orange-300 rounded-xl px-2 py-1 text-orange-700 font-black text-sm tracking-widest shrink-0">
                        {c.code}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                      <span>👥 {c.student_count} học sinh</span>
                      <span>❓ {c.question_count} câu hỏi</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedClass(c); setTab("overview"); }}
                              className="toy-button toy-button-primary text-xs flex-1">Mở lớp</button>
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Xoá lớp "${c.name}"? Học sinh sẽ bị gỡ khỏi lớp và các câu hỏi sẽ mất liên kết.`)) return;
                        try { await deleteClass(c.id); toast.success("Đã xoá"); reloadClasses(); }
                        catch (e: any) { toast.error(e?.message || "Lỗi"); }
                      }} className="toy-button text-xs bg-red-100">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {addOpen && <AddClassModal onClose={() => setAddOpen(false)} onCreated={(c) => { setAddOpen(false); reloadClasses(); setSelectedClass(c); setTab("overview"); }} />}
      </GameLayout>
    );
  }

  // Detail view for a specific class
  return (
    <GameLayout showBack>
      <div className="flex-1 p-3 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card p-4 mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <button onClick={() => setSelectedClass(null)} className="text-xs font-bold text-orange-600 hover:underline mb-1">← Tất cả lớp</button>
              <h1 className="text-xl md:text-2xl font-black truncate">{selectedClass.name}</h1>
              <p className="text-xs md:text-sm font-bold text-muted-foreground truncate">
                {selectedClass.subject || "—"}
              </p>
            </div>
            <ClassCodeCard code={selectedClass.code} />
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
              {tab === "overview" && <OverviewPanel classId={selectedClass.id} />}
              {tab === "students" && <StudentsPanel classId={selectedClass.id} />}
              {tab === "questions" && <QuestionsPanel classId={selectedClass.id} onCountChanged={reloadClasses} />}
              {tab === "import" && <ImportPanel classId={selectedClass.id} onDone={reloadClasses} />}
            </main>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}

function AddClassModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: TaughtClass) => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) { toast.error("Nhập tên lớp"); return; }
    setBusy(true);
    try {
      const c = await createClass(name.trim(), subject.trim());
      toast.success(`Đã tạo lớp "${c.name}" — mã ${c.code}`);
      onCreated(c);
    } catch (e: any) { toast.error(e?.message || "Lỗi tạo lớp"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border-4 border-orange-300" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-black mb-3">➕ Thêm lớp học</h3>
        <div className="flex flex-col gap-3">
          <label className="text-xs font-black">
            Tên lớp <span className="text-red-500">*</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Lớp 10A1 – Tin học"
              className="w-full mt-1 px-3 py-2 rounded-xl border-2 border-gray-200 font-bold" />
          </label>
          <label className="text-xs font-black">
            Môn học
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="VD: Tin học"
              className="w-full mt-1 px-3 py-2 rounded-xl border-2 border-gray-200 font-bold" />
          </label>
          <p className="text-[11px] text-muted-foreground font-bold">
            Mỗi lớp sẽ được cấp một mã tham gia riêng (tự động sinh).
          </p>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="toy-button flex-1">Huỷ</button>
          <button onClick={submit} disabled={busy} className="toy-button toy-button-primary flex-1">
            {busy ? "Đang tạo..." : "Tạo lớp"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const [school, setSchool] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!school.trim() || !subject.trim()) { toast.error("Nhập đủ trường và môn"); return; }
    setBusy(true);
    try {
      await requestTeacher(school.trim(), subject.trim());
      toast.success("Đã gửi yêu cầu, chờ admin duyệt");
      onDone();
    } catch (e: any) { toast.error(e?.message || "Lỗi"); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-2">
      <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Trường giảng dạy" className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 font-bold" />
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Môn giảng dạy" className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 font-bold" />
      <button onClick={submit} disabled={busy} className="toy-button toy-button-primary w-full">
        {busy ? "Đang gửi..." : "Gửi yêu cầu"}
      </button>
    </div>
  );
}

function ClassCodeCard({ code }: { code: string | null }) {
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); toast.success("Đã sao chép mã lớp"); } catch {}
  };
  return (
    <div className="bg-white/80 border-2 border-orange-300 rounded-2xl px-4 py-2 text-center shrink-0">
      <div className="text-[10px] font-black uppercase text-muted-foreground">Mã lớp</div>
      <button onClick={copy} className="text-2xl md:text-3xl font-black tracking-widest text-orange-600 hover:text-orange-500">
        {code || "—"}
      </button>
      <div className="text-[10px] font-bold text-muted-foreground">Bấm để sao chép</div>
    </div>
  );
}

function OverviewPanel({ classId }: { classId: string }) {
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [questions, setQuestions] = useState<TeacherQuestion[]>([]);
  useEffect(() => {
    getClassStudents(classId).then(setStudents).catch(() => {});
    listMyQuestions(classId).then(setQuestions).catch(() => {});
  }, [classId]);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard icon="👥" label="Học sinh" value={students.length} />
      <StatCard icon="❓" label="Câu hỏi" value={questions.length} />
      <StatCard icon="✅" label="Đang bật" value={questions.filter((q) => q.enabled !== false).length} />
      <StatCard icon="⭐" label="Có gắn bậc" value={questions.filter((q) => q.competencyLevel != null).length} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-white/80 border-2 border-orange-200 rounded-2xl p-4 shadow">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-xs font-black text-muted-foreground uppercase">{label}</div>
      <div className="text-2xl md:text-3xl font-black text-orange-600">{value}</div>
    </div>
  );
}

function StudentsPanel({ classId }: { classId: string }) {
  const [rows, setRows] = useState<ClassroomStudent[]>([]);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    getClassStudents(classId).then((s: ClassroomStudent[]) => { setRows(s); setBusy(false); }).catch(() => setBusy(false));
  }, [classId]);
  if (busy) return <p className="font-bold">Đang tải...</p>;
  if (rows.length === 0) return <p className="font-bold text-muted-foreground">Chưa có học sinh nào tham gia. Chia sẻ mã lớp cho học sinh!</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left border-b-2 border-orange-200">
          <tr className="font-black">
            <th className="py-2">#</th><th>Tên</th><th>Username</th><th>Email</th><th>Tham gia</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.user_id} className="border-b border-gray-100">
              <td className="py-2 font-bold">{i + 1}</td>
              <td className="font-bold">{r.display_name || r.username}</td>
              <td>{r.username}</td>
              <td className="text-muted-foreground">{r.email}</td>
              <td className="text-xs">{new Date(r.joined_at).toLocaleString("vi-VN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY_Q: TeacherQuestion = {
  text: "", choices: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
  correctIndexes: [0], reward: 10, category: "digital", competencyLevel: null, competencyDomain: null, enabled: true,
};

function QuestionsPanel({ classId, onCountChanged }: { classId: string; onCountChanged?: () => void }) {
  const [list, setList] = useState<TeacherQuestion[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<TeacherQuestion | null>(null);

  const reload = async () => {
    setBusy(true);
    try { setList(await listMyQuestions(classId)); } catch (e: any) { toast.error(e?.message || "Lỗi tải"); }
    setBusy(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [classId]);

  const save = async () => {
    if (!editing) return;
    const hasQ = !!editing.text.trim() || !!editing.imageUrl;
    if (!hasQ) { toast.error("Nhập nội dung câu hỏi hoặc thêm ảnh"); return; }
    const filled = editing.choices.filter((c) => (c.text || "").trim() || (c.imageUrl || "").trim());
    if (filled.length < 2) { toast.error("Cần ít nhất 2 đáp án (chữ hoặc ảnh)"); return; }
    if (!editing.correctIndexes || editing.correctIndexes.length === 0) { toast.error("Chọn ít nhất 1 đáp án đúng"); return; }
    try {
      const withClass = { ...editing, classId };
      if (editing.id) await updateMyQuestion(editing.id, withClass);
      else await createMyQuestion(withClass);
      toast.success("Đã lưu");
      setEditing(null);
      reload();
      onCountChanged?.();
    } catch (e: any) { toast.error(e?.message || "Lỗi lưu"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá câu hỏi này?")) return;
    try { await deleteMyQuestion(id); toast.success("Đã xoá"); reload(); onCountChanged?.(); }
    catch (e: any) { toast.error(e?.message || "Lỗi"); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-black">Câu hỏi của lớp ({list.length})</h2>
        <button onClick={() => setEditing({ ...EMPTY_Q, classId })} className="toy-button toy-button-primary text-sm">
          ➕ Thêm câu hỏi
        </button>
      </div>
      {busy ? <p className="font-bold">Đang tải...</p> : (
        list.length === 0 ? <p className="text-muted-foreground font-bold">Chưa có câu hỏi. Bấm "Thêm câu hỏi" hoặc dùng tab "Nhập dữ liệu".</p> : (
          <div className="grid gap-2">
            {list.map((q) => (
              <div key={q.id} className="bg-white/80 border-2 border-gray-200 rounded-2xl p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{q.text}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <span className="bg-orange-100 px-2 py-0.5 rounded">{q.category === "history" ? "Lịch sử-Văn hóa" : "Năng lực số"}</span>
                    {q.competencyLevel && <span className="bg-purple-100 px-2 py-0.5 rounded">Bậc {q.competencyLevel}</span>}
                    {q.competencyDomain && <span className="bg-blue-100 px-2 py-0.5 rounded">{DOMAIN_LABELS[q.competencyDomain] ?? `Miền ${q.competencyDomain}`}</span>}
                    <span>{q.choices.length} đáp án · 🎁{q.reward}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing({ ...q })} className="toy-button text-xs !py-1">✏️</button>
                  <button onClick={() => q.id && remove(q.id)} className="toy-button text-xs !py-1 bg-red-100">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {editing && <QuestionEditor q={editing} setQ={setEditing} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  );
}

function QuestionEditor({ q, setQ, onSave, onCancel }: {
  q: TeacherQuestion; setQ: (q: TeacherQuestion) => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-4 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-3">{q.id ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h3>
        <div className="flex flex-col gap-3">
          <textarea value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })}
            placeholder="Nội dung câu hỏi" rows={2}
            className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 font-bold" />
          <div className="grid grid-cols-1 gap-2">
            {q.choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox"
                  checked={q.correctIndexes.includes(i)}
                  onChange={(e) => {
                    const s = new Set(q.correctIndexes);
                    if (e.target.checked) s.add(i); else s.delete(i);
                    setQ({ ...q, correctIndexes: Array.from(s).sort((a, b) => a - b) });
                  }}
                  className="w-5 h-5 accent-green-500" />
                <input value={c.text}
                  onChange={(e) => {
                    const cs = q.choices.slice();
                    cs[i] = { ...cs[i], text: e.target.value };
                    setQ({ ...q, choices: cs });
                  }}
                  placeholder={`Đáp án ${i + 1}`}
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200" />
                {q.choices.length > 2 && (
                  <button onClick={() => setQ({ ...q, choices: q.choices.filter((_, idx) => idx !== i), correctIndexes: q.correctIndexes.filter((n) => n !== i).map((n) => (n > i ? n - 1 : n)) })} className="text-red-500 font-bold px-2">✕</button>
                )}
              </div>
            ))}
            <button onClick={() => setQ({ ...q, choices: [...q.choices, { text: "" }] })} className="toy-button text-xs w-fit">➕ Thêm đáp án</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-black">
              Danh mục
              <select value={q.category || "digital"} onChange={(e) => setQ({ ...q, category: e.target.value })}
                className="w-full mt-1 px-2 py-2 rounded-xl border-2 border-gray-200 font-bold">
                <option value="digital">Năng lực số</option>
                <option value="history">Lịch sử - Văn hoá</option>
              </select>
            </label>
            <label className="text-xs font-black">
              Thưởng (đ)
              <input type="number" value={q.reward} onChange={(e) => setQ({ ...q, reward: Number(e.target.value) || 0 })}
                className="w-full mt-1 px-2 py-2 rounded-xl border-2 border-gray-200 font-bold" />
            </label>
            <label className="text-xs font-black">
              Bậc (1-8)
              <select value={q.competencyLevel ?? ""} onChange={(e) => setQ({ ...q, competencyLevel: e.target.value ? Number(e.target.value) : null })}
                className="w-full mt-1 px-2 py-2 rounded-xl border-2 border-gray-200 font-bold">
                <option value="">— chưa gắn —</option>
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>Bậc {n}</option>)}
              </select>
            </label>
            <label className="text-xs font-black">
              Miền (1-6)
              <select value={q.competencyDomain ?? ""} onChange={(e) => setQ({ ...q, competencyDomain: e.target.value ? Number(e.target.value) : null })}
                className="w-full mt-1 px-2 py-2 rounded-xl border-2 border-gray-200 font-bold">
                <option value="">— chưa gắn —</option>
                {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{DOMAIN_LABELS[n]}</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={q.enabled !== false} onChange={(e) => setQ({ ...q, enabled: e.target.checked })} />
            Đang bật (học sinh sẽ gặp)
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="toy-button flex-1">Huỷ</button>
          <button onClick={onSave} className="toy-button toy-button-primary flex-1">💾 Lưu</button>
        </div>
      </div>
    </div>
  );
}

function ImportPanel({ classId, onDone }: { classId: string; onDone?: () => void }) {
  const [text, setText] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [preview, setPreview] = useState<TeacherQuestion[]>([]);
  const [busy, setBusy] = useState(false);

  const doParse = () => {
    try {
      const arr = format === "csv" ? parseQuestionsCSV(text) : parseQuestionsJSON(text);
      setPreview(arr);
      toast.success(`Đã đọc ${arr.length} câu hỏi`);
    } catch (e: any) {
      toast.error("Lỗi phân tích: " + (e?.message || ""));
      setPreview([]);
    }
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    const ext = name.slice(name.lastIndexOf(".") + 1);
    if (["csv", "json", "txt"].includes(ext)) {
      const t = await f.text();
      setText(t);
      setFormat(ext === "json" ? "json" : "csv");
      return;
    }
    if (["docx", "pptx", "xlsx", "doc", "ppt", "xls", "pdf"].includes(ext)) {
      toast.error("Định dạng " + ext.toUpperCase() + " chưa hỗ trợ đọc tự động. Vui lòng sao chép nội dung vào ô văn bản theo định dạng CSV/JSON.");
      return;
    }
    if (["mp4", "mov", "webm", "avi", "mkv", "m4a", "mp3", "wav"].includes(ext)) {
      toast.error("Tệp media (" + ext.toUpperCase() + ") chỉ đính kèm cho từng câu, không nhập hàng loạt.");
      return;
    }
    try {
      const t = await f.text();
      setText(t);
      setFormat("csv");
      toast("Đã đọc tệp dạng văn bản. Kiểm tra định dạng trước khi nhập.");
    } catch {
      toast.error("Không đọc được tệp này.");
    }
  };

  const doImport = async () => {
    if (preview.length === 0) { toast.error("Chưa có câu hỏi để nhập"); return; }
    setBusy(true);
    let ok = 0;
    for (const q of preview) {
      try { await createMyQuestion({ ...q, classId }); ok++; } catch { /* skip */ }
    }
    setBusy(false);
    toast.success(`Đã nhập ${ok}/${preview.length} câu hỏi`);
    setText(""); setPreview([]);
    onDone?.();
  };

  const csvSample = useMemo(() => `text,option1,option2,option3,option4,correct,reward,category,level,domain
"Máy tính viết tắt là gì?",PC,TV,AC,DC,1,10,digital,1,1
"Trận Bạch Đằng năm nào?",938,1288,1789,1288,"1,4",15,history,,`, []);
  const jsonSample = useMemo(() => JSON.stringify([
    { text: "Máy tính viết tắt là gì?", options: ["PC","TV","AC","DC"], correct: 0, reward: 10, category: "digital", level: 1, domain: 1 },
  ], null, 2), []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="font-black text-sm">Định dạng:</label>
        <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="px-2 py-1 rounded-lg border-2 border-gray-200 font-bold">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <label className="toy-button text-xs cursor-pointer">
          📁 Chọn file
          <input type="file" accept=".csv,.json,.txt,.docx,.pptx,.xlsx,.doc,.ppt,.xls,.pdf,.mp4,.mov,.webm,.mp3,.wav,.m4a" hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />
        </label>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={format === "csv" ? csvSample : jsonSample}
        rows={10}
        className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 font-mono text-xs"
      />
      <div className="flex gap-2">
        <button onClick={doParse} className="toy-button">🔍 Xem trước</button>
        <button onClick={doImport} disabled={busy || preview.length === 0} className="toy-button toy-button-primary disabled:opacity-50">
          {busy ? "Đang nhập..." : `📥 Nhập ${preview.length} câu`}
        </button>
      </div>
      {preview.length > 0 && (
        <div className="border-2 border-orange-200 rounded-2xl p-3 max-h-60 overflow-y-auto">
          <div className="font-black text-sm mb-2">Xem trước ({preview.length}):</div>
          <ol className="text-xs list-decimal pl-5 space-y-1">
            {preview.slice(0, 20).map((q, i) => <li key={i}><b>{q.text}</b> — {q.choices.length} đáp án · {q.category}</li>)}
            {preview.length > 20 && <li className="italic">... còn {preview.length - 20} câu</li>}
          </ol>
        </div>
      )}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3 text-xs">
        <div className="font-black mb-1">📋 Mẫu {format.toUpperCase()}:</div>
        <pre className="whitespace-pre-wrap font-mono">{format === "csv" ? csvSample : jsonSample}</pre>
      </div>
    </div>
  );
}
