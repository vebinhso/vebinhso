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
import { getStudentAnswerStats, type StudentAnswerStat } from "@/lib/teacher";
import { ImageUploadField } from "@/components/ImageUploadField";
import { extractTextFromFile, parseQuestionsFromText } from "@/lib/question-file-parser";

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
  const [qVersion, setQVersion] = useState(0);
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
    <GameLayout showBack backLabel="← TẤT CẢ LỚP" onBack={() => setSelectedClass(null)}>
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
              {tab === "overview" && <OverviewPanel classId={selectedClass.id} refreshKey={qVersion} />}
              {tab === "students" && <StudentsPanel classId={selectedClass.id} />}
              {tab === "questions" && <QuestionsPanel classId={selectedClass.id} onCountChanged={() => { setQVersion((v) => v + 1); reloadClasses(); }} />}
              {tab === "import" && <ImportPanel classId={selectedClass.id} onDone={() => { setQVersion((v) => v + 1); reloadClasses(); }} />}
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

function OverviewPanel({ classId, refreshKey }: { classId: string; refreshKey?: number }) {
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [questions, setQuestions] = useState<TeacherQuestion[]>([]);
  useEffect(() => {
    getClassStudents(classId).then(setStudents).catch(() => {});
    listMyQuestions(classId).then(setQuestions).catch(() => {});
  }, [classId, refreshKey]);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <StatCard icon="👥" label="Học sinh" value={students.length} />
      <StatCard icon="❓" label="Câu hỏi" value={questions.length} />
      <StatCard icon="✅" label="Đang bật" value={questions.filter((q) => q.enabled !== false).length} />
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
  const [openStudent, setOpenStudent] = useState<ClassroomStudent | null>(null);
  useEffect(() => {
    getClassStudents(classId).then((s: ClassroomStudent[]) => { setRows(s); setBusy(false); }).catch(() => setBusy(false));
  }, [classId]);
  if (busy) return <p className="font-bold">Đang tải...</p>;
  if (rows.length === 0) return <p className="font-bold text-muted-foreground">Chưa có học sinh nào tham gia. Chia sẻ mã lớp cho học sinh!</p>;
  return (
    <>
      <p className="text-xs font-bold text-muted-foreground mb-2">💡 Bấm vào tên học sinh để xem thống kê câu trả lời.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b-2 border-orange-200">
            <tr className="font-black">
              <th className="py-2">#</th><th>Tên</th><th>Username</th><th>Email</th><th>Tham gia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.user_id} className="border-b border-gray-100 hover:bg-orange-50 cursor-pointer" onClick={() => setOpenStudent(r)}>
                <td className="py-2 font-bold">{i + 1}</td>
                <td className="font-bold text-orange-600 hover:underline">{r.display_name || r.username}</td>
                <td>{r.username}</td>
                <td className="text-muted-foreground">{r.email}</td>
                <td className="text-xs">{new Date(r.joined_at).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openStudent && (
        <StudentStatsModal classId={classId} student={openStudent} onClose={() => setOpenStudent(null)} />
      )}
    </>
  );
}

function StudentStatsModal({ classId, student, onClose }: { classId: string; student: ClassroomStudent; onClose: () => void }) {
  const [rows, setRows] = useState<StudentAnswerStat[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getStudentAnswerStats(classId, student.user_id)
      .then(setRows)
      .catch((e) => setErr(e?.message || "Lỗi tải"));
  }, [classId, student.user_id]);

  const totals = useMemo(() => {
    const list = rows || [];
    const attempts = list.reduce((s, r) => s + (r.attempts || 0), 0);
    const correct = list.reduce((s, r) => s + (r.correct_count || 0), 0);
    const wrong = list.reduce((s, r) => s + (r.wrong_count || 0), 0);
    const answered = list.filter((r) => (r.attempts || 0) > 0).length;
    return { attempts, correct, wrong, answered, totalQ: list.length };
  }, [rows]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-3xl border-4 border-orange-300 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b-2 border-orange-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-black truncate">📊 {student.display_name || student.username}</h3>
            <p className="text-xs text-muted-foreground font-bold truncate">{student.email}</p>
          </div>
          <button onClick={onClose} className="toy-button text-sm">✕</button>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-orange-100">
          <MiniStat label="Đã làm" value={`${totals.answered}/${totals.totalQ}`} tone="orange" />
          <MiniStat label="Tổng lượt" value={totals.attempts} tone="gray" />
          <MiniStat label="Đúng" value={totals.correct} tone="green" />
          <MiniStat label="Sai" value={totals.wrong} tone="red" />
          <MiniStat
            label="Tỉ lệ đúng"
            value={totals.attempts > 0 ? `${Math.round((totals.correct / totals.attempts) * 100)}%` : "—"}
            tone="purple"
          />
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {err && <p className="text-red-600 font-bold">{err}</p>}
          {!rows && !err && <p className="font-bold">Đang tải...</p>}
          {rows && rows.length === 0 && <p className="font-bold text-muted-foreground">Lớp chưa có câu hỏi để thống kê.</p>}
          {rows && rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left border-b-2 border-orange-200 sticky top-0 bg-white">
                <tr className="font-black">
                  <th className="py-2">#</th><th>Câu hỏi</th>
                  <th className="text-center">Lượt</th>
                  <th className="text-center text-green-700">Đúng</th>
                  <th className="text-center text-red-700">Sai</th>
                  <th className="text-center">Lần cuối</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const done = (r.attempts || 0) > 0;
                  return (
                    <tr key={r.question_id} className={`border-b border-gray-100 ${!done ? "opacity-60" : ""}`}>
                      <td className="py-2 font-bold">{i + 1}</td>
                      <td className="max-w-[24ch] truncate" title={r.question_text}>{r.question_text}</td>
                      <td className="text-center font-bold">{r.attempts}</td>
                      <td className="text-center font-bold text-green-700">{r.correct_count}</td>
                      <td className="text-center font-bold text-red-700">{r.wrong_count}</td>
                      <td className="text-center text-xs">
                        {!done ? <span className="text-muted-foreground">chưa làm</span> :
                          r.last_correct ? <span className="text-green-700 font-black">✓</span> :
                          <span className="text-red-700 font-black">✗</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: "orange" | "green" | "red" | "gray" | "purple" }) {
  const bg = {
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  }[tone];
  return (
    <div className={`rounded-xl border-2 p-2 text-center ${bg}`}>
      <div className="text-[10px] font-black uppercase opacity-70">{label}</div>
      <div className="text-lg md:text-xl font-black">{value}</div>
    </div>
  );
}

function emptyDraft(): TeacherQuestion {
  return {
    text: "",
    choices: [
      { text: "", imageUrl: "" },
      { text: "", imageUrl: "" },
      { text: "", imageUrl: "" },
      { text: "", imageUrl: "" },
    ],
    correctIndexes: [0],
    reward: 10,
    category: "digital",
    competencyLevel: null,
    competencyDomain: null,
    enabled: true,
    imageUrl: "",
  };
}

function QuestionsPanel({ classId, onCountChanged }: { classId: string; onCountChanged?: () => void }) {
  const [list, setList] = useState<TeacherQuestion[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<TeacherQuestion>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashSaved = (m = "✅ Đã lưu") => { setFlash(m); setTimeout(() => setFlash(null), 1800); };

  const reload = async () => {
    setBusy(true);
    try { setList(await listMyQuestions(classId)); }
    catch (e: any) { toast.error("Lỗi tải: " + (e?.message || "")); }
    setBusy(false);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [classId]);

  const setOptionText = (i: number, text: string) => {
    const cs = draft.choices.slice(); cs[i] = { ...cs[i], text };
    setDraft({ ...draft, choices: cs });
  };
  const setOptionImage = (i: number, imageUrl: string) => {
    const cs = draft.choices.slice(); cs[i] = { ...cs[i], imageUrl };
    setDraft({ ...draft, choices: cs });
  };
  const addOption = () => {
    if (draft.choices.length >= 6) return;
    setDraft({ ...draft, choices: [...draft.choices, { text: "", imageUrl: "" }] });
  };
  const removeOption = (i: number) => {
    if (draft.choices.length <= 2) return;
    const cs = draft.choices.filter((_, idx) => idx !== i);
    const ci = draft.correctIndexes.filter((n) => n !== i).map((n) => (n > i ? n - 1 : n));
    setDraft({ ...draft, choices: cs, correctIndexes: ci.length ? ci : [0] });
  };
  const toggleCorrect = (i: number) => {
    const has = draft.correctIndexes.includes(i);
    const ci = has ? draft.correctIndexes.filter((x) => x !== i) : [...draft.correctIndexes, i].sort((a, b) => a - b);
    setDraft({ ...draft, correctIndexes: ci.length ? ci : [i] });
  };

  const validate = (): TeacherQuestion | null => {
    const text = (draft.text || "").trim();
    const hasQ = !!text || !!(draft.imageUrl || "").trim();
    if (!hasQ) { toast.error("Nhập nội dung câu hỏi hoặc thêm ảnh"); return null; }
    const kept: { text: string; imageUrl?: string }[] = [];
    const indexMap = new Map<number, number>();
    draft.choices.forEach((c, i) => {
      const t = (c.text || "").trim();
      const img = (c.imageUrl || "").trim();
      if (t || img) { indexMap.set(i, kept.length); kept.push({ text: t, imageUrl: img || undefined }); }
    });
    if (kept.length < 2) { toast.error("Cần ít nhất 2 đáp án (chữ hoặc ảnh)"); return null; }
    const correct = (draft.correctIndexes || [])
      .map((n) => indexMap.get(n))
      .filter((n): n is number => typeof n === "number");
    if (correct.length === 0) { toast.error("Tick ít nhất 1 đáp án đúng"); return null; }
    return {
      ...draft,
      text,
      choices: kept,
      correctIndexes: Array.from(new Set(correct)).sort((a, b) => a - b),
      reward: Number(draft.reward) > 0 ? Number(draft.reward) : 10,
      category: "history",
      competencyLevel: null,
      competencyDomain: null,
      classId,
    };
  };

  const add = async () => {
    if (saving) return;
    const cleaned = validate(); if (!cleaned) return;
    setSaving(true);
    try {
      await createMyQuestion(cleaned);
      flashSaved("✅ Đã thêm câu hỏi");
      setDraft(emptyDraft());
      await reload();
      onCountChanged?.();
    } catch (e: any) {
      console.error("[classroom save]", e);
      toast.error("Lỗi lưu: " + (e?.message || "không rõ"));
    } finally { setSaving(false); }
  };

  const startEdit = (q: TeacherQuestion) => {
    setEditingId(q.id!);
    setDraft({
      ...q,
      choices: q.choices.map((c) => ({ text: c.text || "", imageUrl: c.imageUrl || "" })),
      correctIndexes: [...(q.correctIndexes || [0])],
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditingId(null); setDraft(emptyDraft()); };
  const saveEdit = async () => {
    if (!editingId || saving) return;
    const cleaned = validate(); if (!cleaned) return;
    setSaving(true);
    try {
      await updateMyQuestion(editingId, cleaned);
      flashSaved("✅ Đã lưu thay đổi");
      cancelEdit();
      await reload();
      onCountChanged?.();
    } catch (e: any) {
      console.error("[classroom update]", e);
      toast.error("Lỗi cập nhật: " + (e?.message || "không rõ"));
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá câu hỏi này?")) return;
    try { await deleteMyQuestion(id); flashSaved("✅ Đã xoá"); if (editingId === id) cancelEdit(); reload(); onCountChanged?.(); }
    catch (e: any) { toast.error(e?.message || "Lỗi"); }
  };

  return (
    <div className="flex flex-col gap-4">
      {flash && (
        <div className="sticky top-1 z-10 self-start bg-emerald-500 text-white font-black text-xs px-3 py-1.5 rounded-full shadow">
          {flash}
        </div>
      )}

      {/* Form nhập/sửa câu hỏi — giống trang admin */}
      <div className="bg-white/90 border-2 border-orange-200 rounded-2xl p-3">
        <div className="font-black mb-2">
          {editingId ? "✏️ Đang sửa câu hỏi" : "➕ Thêm câu hỏi mới vào lớp"}
        </div>
        <input
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder="Nội dung câu hỏi (text)"
          className="w-full px-3 py-2 rounded-xl border-2 border-orange-200 mb-3 font-bold"
        />

        <div className="space-y-2 mb-3">
          {draft.choices.map((o, i) => {
            const isCorrect = draft.correctIndexes.includes(i);
            return (
              <div key={i} className={`rounded-xl p-2 border-2 transition ${isCorrect ? "bg-green-50 border-green-500" : "bg-white border-orange-100"}`}>
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg font-black text-sm ${isCorrect ? "bg-green-500 text-white" : "bg-gray-100"}`}>
                    <input type="checkbox" className="w-5 h-5 accent-green-600" checked={isCorrect} onChange={() => toggleCorrect(i)} />
                    {isCorrect ? "✓ Đúng" : "Đúng?"}
                  </label>
                  <input
                    value={o.text}
                    onChange={(e) => setOptionText(i, e.target.value)}
                    placeholder={`Đáp án ${i + 1}`}
                    className="flex-1 min-w-0 px-2 py-1 rounded border-2 border-orange-100 text-sm font-bold"
                  />
                  <button onClick={() => removeOption(i)} disabled={draft.choices.length <= 2}
                    className="text-red-600 font-black text-lg px-1 disabled:opacity-30" title="Xoá đáp án">🗑</button>
                </div>
                <div className="mt-1">
                  <ImageUploadField value={o.imageUrl || ""} onChange={(url) => setOptionImage(i, url)} label={`ảnh đáp án ${String.fromCharCode(65 + i)}`} />
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={addOption} disabled={draft.choices.length >= 6}
          className="toy-button text-xs bg-orange-400 mb-3 disabled:opacity-40">
          ➕ Thêm đáp án ({draft.choices.length}/6)
        </button>

        {/* Không phân loại tự động — câu hỏi giáo viên nhập giữ nguyên. */}

        <div className="flex gap-2 items-center mb-2 flex-wrap">
          <label className="text-sm font-bold">Điểm thưởng (đ):</label>
          <input type="number" value={draft.reward}
            onChange={(e) => setDraft({ ...draft, reward: parseInt(e.target.value) || 10 })}
            className="w-24 px-2 py-1 rounded border-2 border-orange-100 font-bold" />
          <label className="flex items-center gap-2 text-sm font-bold ml-2">
            <input type="checkbox" checked={draft.enabled !== false}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            Đang bật
          </label>
        </div>

        <div className="mb-3">
          <div className="text-sm font-bold mb-1">🖼️ Ảnh câu hỏi (tùy chọn):</div>
          <ImageUploadField value={draft.imageUrl || ""} onChange={(url) => setDraft({ ...draft, imageUrl: url })} label="ảnh câu hỏi" />
        </div>

        {editingId ? (
          <div className="flex gap-2 items-center flex-wrap sticky bottom-0 bg-white/95 backdrop-blur -mx-3 px-3 py-2 rounded-b-2xl border-t-2 border-green-200">
            <button onClick={saveEdit} disabled={saving}
              className="toy-button bg-green-600 hover:bg-green-700 text-white font-black !text-base !px-6 !py-2 shadow-lg border-2 border-green-800">
              💾 LƯU THAY ĐỔI
            </button>
            <button onClick={cancelEdit} disabled={saving} className="toy-button text-sm bg-gray-500">✕ Huỷ</button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <button onClick={add} disabled={saving}
              className="toy-button text-sm bg-emerald-600 !py-2 !px-4 font-black">
              {saving ? "Đang lưu..." : "💾 + Thêm & Lưu câu hỏi"}
            </button>
            <button onClick={() => setDraft(emptyDraft())} disabled={saving} className="toy-button text-sm">🧹 Xoá nội dung</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-black">Câu hỏi của lớp ({list.length})</h2>
        <button onClick={reload} className="toy-button text-xs">🔄 Làm mới</button>
      </div>

      {busy ? <p className="font-bold">Đang tải...</p> : (
        list.length === 0 ? <p className="text-muted-foreground font-bold">Chưa có câu hỏi. Dùng biểu mẫu trên hoặc tab "Nhập dữ liệu".</p> : (
          <div className="grid gap-2">
            {list.map((q) => {
              const isEditing = q.id === editingId;
              return (
                <div key={q.id} className={`bg-white/80 border-2 rounded-2xl p-3 flex items-start gap-3 ${isEditing ? "border-green-500 ring-2 ring-green-300" : "border-gray-200"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{q.text || <span className="italic text-muted-foreground">(chỉ có ảnh)</span>}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                      <span>{q.choices.length} đáp án · 🎁{q.reward}</span>
                      {q.enabled === false && <span className="bg-gray-200 px-2 py-0.5 rounded">Đang tắt</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(q)} className="toy-button text-xs !py-1">✏️ Sửa</button>
                    <button onClick={() => q.id && remove(q.id)} className="toy-button text-xs !py-1 bg-red-100">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
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
    const errs: string[] = [];
    for (let i = 0; i < preview.length; i++) {
      try { await createMyQuestion({ ...preview[i], classId }); ok++; }
      catch (e: any) { errs.push(`Câu ${i + 1}: ${e?.message || "lỗi không rõ"}`); }
    }
    setBusy(false);
    if (ok > 0) toast.success(`Đã nhập ${ok}/${preview.length} câu hỏi`);
    if (errs.length) {
      toast.error(errs[0]);
      console.error("[import errors]", errs);
    }
    if (ok > 0) { setText(""); setPreview([]); onDone?.(); }
  };

  const csvSample = useMemo(() => `text,option1,option2,option3,option4,correct,reward
"Máy tính viết tắt là gì?",PC,TV,AC,DC,1,10
"Trận Bạch Đằng năm 938 do ai lãnh đạo?","Ngô Quyền","Lý Thường Kiệt","Trần Hưng Đạo","Lê Lợi",1,15`, []);
  const jsonSample = useMemo(() => JSON.stringify([
    { text: "Máy tính viết tắt là gì?", options: ["PC","TV","AC","DC"], correct: 0, reward: 10 },
    { text: "Trận Bạch Đằng năm 938 do ai lãnh đạo?", options: ["Ngô Quyền","Lý Thường Kiệt","Trần Hưng Đạo","Lê Lợi"], correct: 0, reward: 15 },
  ], null, 2), []);

  const downloadSample = () => {
    const content = format === "csv" ? csvSample : jsonSample;
    const mime = format === "csv" ? "text/csv" : "application/json";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mau-cau-hoi.${format}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="font-black text-sm">Định dạng:</label>
        <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="px-2 py-1 rounded-lg border-2 border-gray-200 font-bold">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <button onClick={downloadSample} className="toy-button text-xs">⬇️ Tải mẫu {format.toUpperCase()}</button>
        <label className="toy-button text-xs cursor-pointer">
          📁 Chọn file
          <input type="file" accept=".csv,.json,.txt,.docx,.pptx,.xlsx,.doc,.ppt,.xls,.pdf,.mp4,.mov,.webm,.mp3,.wav,.m4a" hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />
        </label>
      </div>
      <p className="text-[11px] font-bold text-muted-foreground">
        Cột bắt buộc: <b>text, option1..4, correct, reward</b>. Không cần điền miền/bậc — hệ thống sẽ tự phân loại sau khi lưu.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={format === "csv" ? csvSample : jsonSample}
        rows={10}
        className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 font-mono text-xs"
      />
      <div className="flex gap-2 flex-wrap">
        <button onClick={doParse} className="toy-button">🔍 Xem trước</button>
        <button onClick={doImport} disabled={busy || preview.length === 0} className="toy-button toy-button-primary disabled:opacity-50">
          {busy ? "Đang nhập..." : `📥 Nhập ${preview.length} câu`}
        </button>
      </div>
      {preview.length > 0 && (
        <div className="border-2 border-orange-200 rounded-2xl p-3 max-h-60 overflow-y-auto">
          <div className="font-black text-sm mb-2">Xem trước ({preview.length}):</div>
          <ol className="text-xs list-decimal pl-5 space-y-1">
            {preview.slice(0, 20).map((q, i) => <li key={i}><b>{q.text}</b> — {q.choices.length} đáp án · đúng: {q.correctIndexes.map((n) => String.fromCharCode(65 + n)).join(",")}</li>)}
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

