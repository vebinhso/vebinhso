import { useEffect, useState } from "react";
import { toast } from "sonner";
import LoadingPercent from "@/components/LoadingPercent";
import { PasteDropZone } from "@/components/PasteDropZone";
import { generateAiLesson } from "@/lib/ai-lesson.functions";
import {
  listAiLessons,
  saveAiLesson,
  setAiLessonPublished,
  deleteAiLesson,
  frameUrls,
  type AiLesson,
  type AiLessonBody,
  type AiQuestion,
} from "@/lib/ai-lessons";
import { uploadClassFile, openClassFile } from "@/lib/classroom-posts";
import { loadGame, saveGame } from "@/lib/game";

const REWARD_PER_Q = 10;

/* ---------------- Ảnh đính kèm ---------------- */

function AttachedImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let alive = true;
    frameUrls([path]).then((u) => alive && setUrl(u[0] || ""));
    return () => {
      alive = false;
    };
  }, [path]);

  if (!url)
    return (
      <button onClick={() => openClassFile(path)} className="text-xs font-black text-emerald-700 text-left">
        📎 Mở tệp đính kèm
      </button>
    );
  return (
    <img
      src={url}
      alt="Ảnh minh hoạ bài học"
      loading="lazy"
      className="w-full max-h-64 object-contain rounded-2xl bg-white border-2 border-orange-100"
    />
  );
}

/* ---------------- Bài học + câu hỏi ---------------- */

function LessonBody({ lesson }: { lesson: AiLessonBody }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {lesson.summary && <p className="font-bold">{lesson.summary}</p>}
      {!!lesson.parts?.length && (
        <div className="bg-orange-50 rounded-xl p-2">
          <div className="text-xs font-black mb-1">🧩 CÁC Ý CHÍNH</div>
          {lesson.parts.map((p, k) => (
            <div key={k} className="text-xs">
              <span className="font-black">{p.name}:</span> {p.role}
            </div>
          ))}
        </div>
      )}
      {lesson.sections?.map((s, k) => (
        <div key={k}>
          <div className="font-black text-sm">📖 {s.heading}</div>
          <p className="whitespace-pre-wrap">{s.body}</p>
        </div>
      ))}
      {!!lesson.keyPoints?.length && (
        <div className="bg-emerald-50 rounded-xl p-2">
          <div className="text-xs font-black mb-1">✅ GHI NHỚ</div>
          <ul className="list-disc pl-4 text-xs">
            {lesson.keyPoints.map((p, k) => (
              <li key={k}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Quiz({ lessonId, questions }: { lessonId: string; questions: AiQuestion[] }) {
  const claimKey = `ai_lesson_reward_${lessonId}`;
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    setClaimed(typeof window !== "undefined" && localStorage.getItem(claimKey) === "1");
  }, [claimKey]);

  const correct = questions.filter((q, k) => picked[k] === q.answer).length;
  const done = Object.keys(picked).length === questions.length && questions.length > 0;

  const claim = () => {
    if (claimed) return;
    const amount = correct * REWARD_PER_Q;
    const g = loadGame();
    saveGame({ ...g, money: (g.money ?? 0) + amount });
    localStorage.setItem(claimKey, "1");
    setClaimed(true);
    toast.success(`🎉 Nhận thưởng +${amount} đồng!`);
  };

  if (questions.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 border-t-2 border-orange-100 pt-2">
      <div className="text-xs font-black">📝 BÀI TẬP ({questions.length} câu · +{REWARD_PER_Q} đồng/câu đúng)</div>
      {questions.map((q, k) => (
        <div key={k} className="bg-white/80 rounded-xl p-2">
          <div className="text-sm font-bold">
            {k + 1}. {q.q}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {q.options?.map((o, oi) => {
              const chosen = picked[k] === oi;
              const state =
                picked[k] === undefined
                  ? "bg-gray-50 hover:bg-orange-50"
                  : oi === q.answer
                    ? "bg-emerald-100 border-emerald-400"
                    : chosen
                      ? "bg-red-100 border-red-400"
                      : "bg-gray-50";
              return (
                <button
                  key={oi}
                  disabled={picked[k] !== undefined}
                  onClick={() => setPicked((p) => ({ ...p, [k]: oi }))}
                  className={`text-left text-xs font-bold rounded-lg px-2 py-1.5 border-2 border-transparent ${state}`}
                >
                  {String.fromCharCode(65 + oi)}. {o}
                </button>
              );
            })}
          </div>
          {picked[k] !== undefined && q.explain && (
            <p className="text-[11px] mt-1 text-emerald-800 font-bold">💡 {q.explain}</p>
          )}
        </div>
      ))}
      {done && (
        <button
          onClick={claim}
          disabled={claimed}
          className="toy-button toy-button-primary justify-center text-sm disabled:opacity-50"
        >
          {claimed ? "✅ Đã nhận thưởng" : `🎁 Nhận ${correct * REWARD_PER_Q} đồng (đúng ${correct}/${questions.length})`}
        </button>
      )}
    </div>
  );
}

/* ---------------- Panel chính ---------------- */

export function AiMaterialPanel({ classId, canPost }: { classId: string; canPost: boolean }) {
  const [rows, setRows] = useState<AiLesson[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const reload = () => listAiLessons(classId, !canPost).then(setRows).catch(() => setRows([]));
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, canPost]);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {canPost && (
        <div className="bg-white/80 rounded-2xl p-3 border-2 border-violet-200">
          <button onClick={() => setOpenForm((v) => !v)} className="text-xs font-black text-violet-600">
            {openForm ? "▲ Đóng" : "🤖 Tạo học liệu AI (nội dung bài học + bài tập)"}
          </button>
          {openForm && <Generator classId={classId} onSaved={() => { setOpenForm(false); reload(); }} />}
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-xs font-bold text-muted-foreground">Chưa có học liệu AI nào.</p>
      )}
      {rows.map((r) => (
        <LessonCard key={r.id} row={r} canPost={canPost} onChanged={reload} />
      ))}
    </div>
  );
}

function LessonCard({ row, canPost, onChanged }: { row: AiLesson; canPost: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/90 rounded-2xl p-3 border-2 border-white shadow-sm min-w-0">
      <div className="flex items-start gap-2">
        <span className="text-lg">🤖</span>
        <button onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <div className="font-black text-sm truncate">{row.title}</div>
          <div className="text-[10px] font-bold text-muted-foreground">
            {new Date(row.created_at).toLocaleString("vi-VN")}
            {!row.published && " · 📝 NHÁP"}
          </div>
        </button>
        {canPost && (
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={async () => {
                await setAiLessonPublished(row.id, !row.published);
                onChanged();
              }}
              className="text-[10px] font-black text-violet-600"
            >
              {row.published ? "ẩn" : "đăng"}
            </button>
            <button
              onClick={async () => {
                if (!confirm("Xoá học liệu này?")) return;
                await deleteAiLesson(row.id);
                onChanged();
              }}
              className="text-[10px] font-bold text-red-500"
            >
              xoá
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-3">
          {row.source_image_url && <AttachedImage path={row.source_image_url} />}
          {row.description && <p className="text-sm whitespace-pre-wrap">{row.description}</p>}
          <LessonBody lesson={row.lesson} />
          <Quiz lessonId={row.id} questions={row.questions} />
        </div>
      )}
    </div>
  );
}

type Draft = {
  lesson: AiLessonBody;
  questions: AiQuestion[];
};

function Generator({ classId, onSaved }: { classId: string; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [revise, setRevise] = useState("");

  // Nén ảnh về tối đa 1024px + JPEG để gửi lên AI nhanh hơn
  const compress = (f: File) =>
    new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const src = String(r.result);
        const img = new Image();
        img.onload = () => {
          const max = 1024;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          const ctx = c.getContext("2d");
          if (!ctx) return resolve(src);
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => resolve(src);
        img.src = src;
      };
      r.readAsDataURL(f);
    });

  const pick = async (f: File | null) => {
    setFile(f);
    if (!f) return setPreview("");
    if (f.type.startsWith("image/")) setPreview(await compress(f));
    else setPreview("");
  };

  const run = async (reviseNote?: string) => {
    if (!title.trim()) return toast.error("Nhập tiêu đề bài học");
    if (!description.trim() && !preview) return toast.error("Nhập mô tả hoặc chọn ảnh");
    setBusy(true);
    setPhase("✍️ Đang soạn nội dung bài học...");
    try {
      const b64 = preview ? (preview.split(",")[1] ?? "") : undefined;
      const res = await generateAiLesson({
        data: {
          imageBase64: b64,
          mimeType: preview.startsWith("data:image/jpeg") ? "image/jpeg" : file?.type || "image/png",
          title: title.trim(),
          description,
          reviseNote,
        },
      });
      setDraft({ lesson: res.lesson as AiLessonBody, questions: res.questions as AiQuestion[] });
      toast.success("Đã tạo bản xem thử!");
    } catch (e: any) {
      toast.error(e?.message || "Không tạo được học liệu");
    }
    setPhase("");
    setBusy(false);
  };

  const publish = async (published: boolean) => {
    if (!draft) return;
    setBusy(true);
    setPhase("📤 Đang lưu...");
    try {
      let path: string | null = null;
      if (file) path = await uploadClassFile(classId, file);
      await saveAiLesson({
        classId,
        title: title.trim(),
        description,
        frames: [],
        lesson: draft.lesson,
        questions: draft.questions,
        sourceImageUrl: path,
        published,
      });
      toast.success(published ? "Đã đăng cho học sinh!" : "Đã lưu nháp");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi lưu");
    }
    setPhase("");
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tiêu đề bài học (VD: Cấu tạo trái tim)"
        className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Mô tả: bạn muốn truyền tải kiến thức nào? (AI sẽ dựa vào đây để soạn bài học)"
        className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
      />
      <PasteDropZone onFile={(f) => pick(f)} accept={() => true} className="border-2 border-dashed border-gray-200 p-2">
        <input type="file" onChange={(e) => pick(e.target.files?.[0] ?? null)} className="text-xs" />
      </PasteDropZone>
      <p className="text-[11px] font-bold text-muted-foreground">
        📎 Có thể chọn tệp hoặc dán / kéo thả ảnh vào đây (tuỳ chọn).
      </p>
      {preview && (
        <img src={preview} alt="Ảnh đính kèm" className="max-h-40 object-contain rounded-xl bg-white" />
      )}
      {file && !preview && (
        <div className="text-xs font-bold text-emerald-700 truncate">📎 {file.name}</div>
      )}

      {!draft && (
        <button
          onClick={() => run()}
          disabled={busy}
          className="toy-button toy-button-primary justify-center text-sm disabled:opacity-50"
        >
          {busy ? phase || "Đang xử lý..." : "✨ Tạo nội dung bài học"}
        </button>
      )}
      {busy && (
        <div className="flex justify-center">
          <LoadingPercent light={false} />
        </div>
      )}

      {draft && (
        <div className="flex flex-col gap-2 border-t-2 border-violet-100 pt-2">
          <div className="text-xs font-black text-violet-600">👀 XEM THỬ</div>
          <LessonBody lesson={draft.lesson} />
          <div className="text-xs font-black">📝 CÂU HỎI ĐỀ XUẤT ({draft.questions.length})</div>
          {draft.questions.map((q, k) => (
            <div key={k} className="text-xs bg-orange-50 rounded-lg px-2 py-1">
              <b>{k + 1}. {q.q}</b>
              <div>Đáp án: {q.options?.[q.answer]}</div>
            </div>
          ))}
          <input
            value={revise}
            onChange={(e) => setRevise(e.target.value)}
            placeholder="Yêu cầu chỉnh sửa (VD: nhấn mạnh van tim, thêm câu hỏi khó hơn)"
            className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => run(revise)}
              disabled={busy}
              className="toy-button justify-center text-xs disabled:opacity-50"
            >
              🔁 Yêu cầu chỉnh sửa
            </button>
            <button
              onClick={() => publish(false)}
              disabled={busy}
              className="toy-button justify-center text-xs disabled:opacity-50"
            >
              💾 Lưu nháp
            </button>
            <button
              onClick={() => publish(true)}
              disabled={busy}
              className="toy-button toy-button-primary justify-center text-xs disabled:opacity-50"
            >
              ✅ Đăng cho học sinh
            </button>
          </div>
          {busy && <p className="text-xs font-bold text-violet-600">{phase}</p>}
        </div>
      )}
    </div>
  );
}
