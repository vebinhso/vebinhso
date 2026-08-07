import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import LoadingPercent from "@/components/LoadingPercent";
import { PasteDropZone } from "@/components/PasteDropZone";
import { uploadClassFile, getClassRoster, type RosterMember } from "@/lib/classroom-posts";
import { suggestNote } from "@/lib/ai-note.functions";
import { useImageProgress, warmImage } from "@/lib/image-progress";
import {
  listAnnotatedImages,
  saveAnnotatedImage,
  deleteAnnotatedImage,
  listMyAnswers,
  submitNoteAnswer,
  gradeNoteAnswer,
  signedClassUrl,
  cachedClassUrl,
  prefetchClassUrls,
  NOTE_COLORS,
  type AnnotatedImage,
  type ImageNote,
  type NoteAnswer,
  type NoteKind,
} from "@/lib/class-annotations";

const uid = () => Math.random().toString(36).slice(2, 9);

/** Bộ nhớ đệm danh sách để mở lại lớp là thấy ngay, không phải chờ tải lại. */
const LIST_STORE_KEY = "vbs_class_ann_list_v1";
const listCache = new Map<string, AnnotatedImage[]>();
if (typeof window !== "undefined") {
  try {
    const raw = window.sessionStorage.getItem(LIST_STORE_KEY);
    if (raw)
      for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, AnnotatedImage[]>))
        listCache.set(k, v);
  } catch {
    /* ignore */
  }
}
let listPersistTimer: ReturnType<typeof setTimeout> | null = null;
function rememberList(key: string, rows: AnnotatedImage[]) {
  listCache.set(key, rows);
  if (typeof window === "undefined") return;
  if (listPersistTimer) clearTimeout(listPersistTimer);
  listPersistTimer = setTimeout(() => {
    try {
      window.sessionStorage.setItem(LIST_STORE_KEY, JSON.stringify(Object.fromEntries(listCache)));
    } catch {
      /* ignore */
    }
  }, 300);
}

/** Thu nhỏ ảnh trước khi gửi AI để phản hồi nhanh hơn nhiều. */
const shrinkForAi = (src: string) =>
  new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 640;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(src);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

/* ---------- Ảnh + các chấm ghi chú ---------- */

function NotePopup({
  note,
  index,
  children,
  onClose,
}: {
  note: ImageNote;
  index: number;
  children: ReactNode;
  onClose: () => void;
}) {
  const tx = note.x <= 60 ? "8px" : "calc(-100% - 8px)";
  const ty = note.y <= 70 ? "-50%" : "calc(-100% - 8px)";
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute z-20"
      style={{ left: `${note.x}%`, top: `${note.y}%`, transform: `translate(${tx}, ${ty})` }}
    >
      <div
        className="w-[min(420px,calc(100vw-32px))] max-h-[420px] overflow-y-auto rounded-lg border-2 bg-white/95 p-4 shadow-xl"
        style={{ borderColor: note.color }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-xs font-black" style={{ color: note.color }}>
            📍 Ghi chú {index + 1}
          </div>
          <button
            onClick={onClose}
            className="text-[11px] font-black text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PinnedImage({
  src,
  notes,
  activeId,
  onPick,
  onAdd,
  renderActive,
}: {
  src: string;
  notes: ImageNote[];
  activeId?: string | null;
  onPick: (id: string | null) => void;
  onAdd?: (x: number, y: number) => void;
  renderActive?: (note: ImageNote) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { src: imgSrc, percent, ready } = useImageProgress(src);
  const activeIndex = notes.findIndex((n) => n.id === activeId);
  const activeNote = activeIndex >= 0 ? notes[activeIndex] : null;
  return (
    <div
      ref={ref}
      className={`relative w-full rounded-2xl bg-white overflow-visible ${
        onAdd ? "cursor-crosshair" : ""
      }`}
      onClick={(e) => {
        if (!onAdd || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        onAdd(Math.max(1, Math.min(99, x)), Math.max(1, Math.min(99, y)));
      }}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt="Ảnh học liệu có chú thích"
          decoding="async"
          // @ts-expect-error thuộc tính chuẩn của trình duyệt
          fetchpriority="high"
          className="w-full object-contain rounded-2xl border-2 border-orange-100 bg-white"
        />
      ) : (
        <div className="w-full min-h-[160px] rounded-2xl border-2 border-orange-100 bg-orange-50/70" />
      )}
      {!ready && (
        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-orange-50/70">
          <LoadingPercent percent={percent} done={percent >= 100} light={false} />
        </div>
      )}
      {notes.map((n, i) => (
        <button
          key={n.id}
          onClick={(e) => {
            e.stopPropagation();
            onPick(n.id);
          }}
          style={{ left: `${n.x}%`, top: `${n.y}%`, background: n.color || "#ef4444" }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full text-white text-[11px] font-black shadow-lg ring-2 ring-white transition ${
            activeId === n.id ? "h-8 w-8 scale-110" : "h-6 w-6 hover:scale-110"
          }`}
          title={n.title || `Ghi chú ${i + 1}`}
        >
          {i + 1}
        </button>
      ))}
      {activeNote && renderActive && (
        <NotePopup note={activeNote} index={activeIndex} onClose={() => onPick(null)}>
          {renderActive(activeNote)}
        </NotePopup>
      )}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-[11px] font-black text-muted-foreground">🎨 Màu:</span>
      {NOTE_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{ background: c }}
          className={`h-6 w-6 rounded-full ring-2 transition ${
            value === c ? "ring-foreground scale-110" : "ring-white"
          }`}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 rounded border-0 bg-transparent p-0"
        title="Màu tuỳ chọn"
      />
    </div>
  );
}

/* ---------- Trình soạn của giáo viên ---------- */

function Editor({
  classId,
  kind,
  row,
  onDone,
}: {
  classId: string;
  kind: NoteKind;
  row?: AnnotatedImage;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [notes, setNotes] = useState<ImageNote[]>(row?.notes ?? []);
  const [active, setActive] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(() => cachedClassUrl(row?.image_url) || "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (row?.image_url && !preview) signedClassUrl(row.image_url).then(setPreview).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.image_url]);

  const compress = (f: File) =>
    new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const src = String(r.result);
        const img = new Image();
        img.onload = () => {
          const max = 1400;
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
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Hãy chọn một tấm ảnh");
    setFile(f);
    setPreview(await compress(f));
  };

  const note = notes.find((n) => n.id === active) || null;
  const patch = (p: Partial<ImageNote>) =>
    setNotes((all) => all.map((n) => (n.id === active ? { ...n, ...p } : n)));

  const askAi = async () => {
    if (!note) return;
    setBusy(true);
    setProgress(12);
    try {
      const small = preview.startsWith("data:") ? await shrinkForAi(preview) : "";
      const b64 = small ? (small.split(",")[1] ?? "") : undefined;
      setProgress(28);
      const res = await suggestNote({
        data: {
          mode: kind === "material" ? "material" : "exercise",
          ...(b64 ? { imageBase64: b64, mimeType: "image/jpeg" } : {}),
          title: title || "Học liệu",
          hint: note.title || description,
          x: note.x,
          y: note.y,
        },
      });
      patch({
        title: note.title || res.title || "",
        ...(kind === "material"
          ? { content: res.content || "" }
          : { question: res.question || "", expected: res.expected || "" }),
      });
      setProgress(100);
      toast.success("AI đã đề xuất nội dung!");
    } catch (e: any) {
      toast.error(e?.message || "Không gọi được AI");
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
    setBusy(false);
    setProgress(0);
  };

  const save = async (published: boolean) => {
    if (!title.trim()) return toast.error("Nhập tiêu đề");
    if (!preview) return toast.error("Chọn một tấm ảnh");
    setBusy(true);
    setProgress(10);
    try {
      let path: string | null | undefined = undefined;
      if (file) {
        setProgress(25);
        path = await uploadClassFile(classId, file);
      }
      setProgress(70);
      await saveAnnotatedImage({
        ...(row?.id ? { id: row.id } : {}),
        classId,
        kind,
        title: title.trim(),
        description,
        ...(path !== undefined ? { imageUrl: path } : {}),
        notes,
        published,
      });
      setProgress(100);
      toast.success(published ? "Đã đăng cho học sinh!" : "Đã lưu nháp");
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi lưu");
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
    setBusy(false);
    setProgress(0);
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "material" ? "Tiêu đề học liệu (VD: Cấu tạo trái tim)" : "Tiêu đề bài tập"}
        className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Mô tả chung (tuỳ chọn) — AI cũng dựa vào đây để đề xuất"
        className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
      />

      {!preview ? (
        <PasteDropZone
          onFile={(f) => pick(f)}
          hint="Ctrl+V dán ảnh · hoặc kéo thả ảnh vào đây"
          className="border-2 border-dashed border-gray-200 p-2"
        >
          <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0] ?? null)} className="text-xs" />
        </PasteDropZone>
      ) : (
        <>
          <p className="text-[11px] font-black text-orange-600">
            👉 Bấm vào vị trí bất kỳ trên ảnh để thêm một chấm ghi chú.
          </p>
          <PinnedImage
            src={preview}
            notes={notes}
            activeId={active}
            onPick={setActive}
            onAdd={(x, y) => {
              const n: ImageNote = {
                id: uid(),
                x,
                y,
                color: NOTE_COLORS[notes.length % NOTE_COLORS.length] ?? "#ef4444",
                title: "",
              };
              setNotes((all) => [...all, n]);
              setActive(n.id);
            }}
            renderActive={(n) => (
              <div className="flex flex-col gap-2">
                <ColorPicker value={n.color} onChange={(c) => patch({ color: c })} />
                <input
                  value={n.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Tên chi tiết (VD: Van 2 lá)"
                  className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold"
                />
                {kind === "material" ? (
                  <textarea
                    value={n.content ?? ""}
                    onChange={(e) => patch({ content: e.target.value })}
                    rows={4}
                    placeholder="Nội dung học liệu tại điểm này (tự nhập hoặc bấm AI đề xuất)"
                    className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
                  />
                ) : (
                  <>
                    <textarea
                      value={n.question ?? ""}
                      onChange={(e) => patch({ question: e.target.value })}
                      rows={3}
                      placeholder="Câu hỏi cho học sinh tại điểm này"
                      className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
                    />
                    <textarea
                      value={n.expected ?? ""}
                      onChange={(e) => patch({ expected: e.target.value })}
                      rows={2}
                      placeholder="Đáp án gợi ý (chỉ giáo viên thấy)"
                      className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
                    />
                  </>
                )}
                <button
                  onClick={askAi}
                  disabled={busy}
                  className="toy-button justify-center text-xs disabled:opacity-50 self-start"
                >
                  🤖 AI đề xuất nội dung cho chấm này
                </button>
                <button
                  onClick={() => {
                    setNotes((all) => all.filter((x) => x.id !== n.id));
                    setActive(null);
                  }}
                  className="text-[11px] font-black text-red-500 self-start"
                >
                  xoá chấm
                </button>
              </div>
            )}
          />
          <button
            onClick={() => {
              setPreview("");
              setFile(null);
            }}
            className="self-start text-[11px] font-black text-red-500"
          >
            ✕ Đổi ảnh khác
          </button>
        </>
      )}

      {busy && (
        <div className="flex justify-center">
          <LoadingPercent percent={progress} done={progress === 100} light={false} />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => save(false)} disabled={busy} className="toy-button justify-center text-xs disabled:opacity-50">
          💾 Lưu nháp
        </button>
        <button
          onClick={() => save(true)}
          disabled={busy}
          className="toy-button toy-button-primary justify-center text-xs disabled:opacity-50"
        >
          ✅ Đăng cho học sinh
        </button>
        <button onClick={onDone} className="toy-button justify-center text-xs">
          Đóng
        </button>
      </div>
    </div>
  );
}

/* ---------- Xem & làm bài ---------- */

function Viewer({ row, canPost }: { row: AnnotatedImage; canPost: boolean }) {
  const [src, setSrc] = useState(() => cachedClassUrl(row.image_url) || "");
  const [active, setActive] = useState<string | null>(null);
  const [mine, setMine] = useState<NoteAnswer[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const reloadMine = useCallback(() => {
    listMyAnswers(row.id)
      .then((rows) => {
        setMine(rows);
        setDraft((d) => {
          const next = { ...d };
          rows.forEach((r) => {
            if (next[r.note_id] === undefined) next[r.note_id] = r.answer;
          });
          return next;
        });
      })
      .catch(() => setMine([]));
  }, [row.id]);

  useEffect(() => {
    if (row.image_url) {
      const c = cachedClassUrl(row.image_url);
      if (c) setSrc(c);
      else signedClassUrl(row.image_url).then(setSrc).catch(() => {});
    }
    if (row.kind === "exercise") reloadMine();
  }, [row.image_url, row.kind, reloadMine]);

  const send = async (noteId: string) => {
    const text = (draft[noteId] || "").trim();
    if (!text) return toast.error("Hãy điền câu trả lời");
    setBusy(true);
    try {
      await submitNoteAnswer({ imageId: row.id, classId: row.class_id, noteId, answer: text });
      toast.success("Đã nộp bài!");
      reloadMine();
    } catch (e: any) {
      toast.error(e?.message || "Không nộp được");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {row.description && <p className="text-sm whitespace-pre-wrap">{row.description}</p>}
      {src ? (
        <PinnedImage
          src={src}
          notes={row.notes}
          activeId={active}
          onPick={setActive}
          renderActive={(note) => (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-black" style={{ color: note.color }}>
                📍 {note.title || "Ghi chú"}
              </div>
              {row.kind === "material" ? (
                <p className="text-sm whitespace-pre-wrap">{note.content || "(chưa có nội dung)"}</p>
              ) : (
                <>
                  <p className="text-sm font-bold whitespace-pre-wrap">{note.question || "(chưa có câu hỏi)"}</p>
                  {canPost ? (
                    note.expected && (
                      <p className="text-xs font-bold text-emerald-700 whitespace-pre-wrap">
                        ✅ Đáp án gợi ý: {note.expected}
                      </p>
                    )
                  ) : (
                    <>
                      <textarea
                        value={draft[note.id] ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [note.id]: e.target.value }))}
                        rows={3}
                        placeholder="Câu trả lời của bạn..."
                        className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
                      />
                      <button
                        onClick={() => send(note.id)}
                        disabled={busy}
                        className="toy-button toy-button-primary justify-center text-xs disabled:opacity-50 self-start"
                      >
                        {mine.find((m) => m.note_id === note.id) ? "🔁 Nộp lại" : "📤 Nộp câu trả lời"}
                      </button>
                      {(() => {
                        const a = mine.find((m) => m.note_id === note.id);
                        return a?.grade ? (
                          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-2 text-xs font-bold">
                            🏅 Điểm: {a.grade}
                            {a.feedback && <div className="mt-1">💬 {a.feedback}</div>}
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        />
      ) : (
        <div className="flex justify-center py-4">
          <LoadingPercent light={false} />
        </div>
      )}
      <p className="text-[11px] font-black text-muted-foreground">
        👉 Bấm vào các chấm màu trên ảnh để xem {row.kind === "material" ? "học liệu" : "câu hỏi"}.
      </p>

      {canPost && row.kind === "exercise" && <GradingList row={row} />}
    </div>
  );
}

/* ---------- Chấm bài của giáo viên ---------- */

function GradingList({ row }: { row: AnnotatedImage }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NoteAnswer[] | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [edit, setEdit] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(() => {
    listMyAnswers(row.id)
      .then((r) => {
        setRows(r);
        setEdit(
          Object.fromEntries(r.map((a) => [a.id, { grade: a.grade ?? "", feedback: a.feedback ?? "" }])),
        );
      })
      .catch(() => setRows([]));
    getClassRoster(row.class_id).then(setRoster).catch(() => setRoster([]));
  }, [row.id, row.class_id]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const nameOf = useMemo(
    () => (id: string) => roster.find((m) => m.user_id === id)?.display_name || "Học sinh",
    [roster],
  );

  const aiFeedback = async (a: NoteAnswer) => {
    const note = row.notes.find((n) => n.id === a.note_id);
    setBusy(a.id);
    try {
      const res = await suggestNote({
        data: {
          mode: "feedback",
          title: row.title,
          question: note?.question || "",
          expected: note?.expected || "",
          studentAnswer: a.answer,
        },
      });
      setEdit((e) => ({
        ...e,
        [a.id]: { grade: res.grade || e[a.id]?.grade || "", feedback: res.feedback || "" },
      }));
      toast.success("AI đã đề xuất nhận xét!");
    } catch (e: any) {
      toast.error(e?.message || "Không gọi được AI");
    }
    setBusy(null);
  };

  const save = async (a: NoteAnswer) => {
    const v = edit[a.id];
    if (!v) return;
    setBusy(a.id);
    try {
      await gradeNoteAnswer(a.id, v.grade, v.feedback);
      toast.success("Đã chấm!");
      reload();
    } catch (e: any) {
      toast.error(e?.message || "Không lưu được");
    }
    setBusy(null);
  };

  return (
    <div className="border-t-2 border-orange-100 pt-2">
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-black text-orange-600">
        {open ? "▲ Đóng bài nộp" : "📥 Xem & chấm bài nộp của học sinh"}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {!rows && <LoadingPercent light={false} />}
          {rows?.length === 0 && <p className="text-xs font-bold text-muted-foreground">Chưa có bài nộp nào.</p>}
          {rows?.map((a) => {
            const note = row.notes.find((n) => n.id === a.note_id);
            const v = edit[a.id] ?? { grade: "", feedback: "" };
            return (
              <div key={a.id} className="rounded-2xl bg-white/90 border-2 border-orange-100 p-2 flex flex-col gap-1.5">
                <div className="text-xs font-black">
                  <span style={{ color: note?.color }}>📍 {note?.title || "Ghi chú"}</span> · {nameOf(a.student_id)}
                </div>
                <p className="text-sm whitespace-pre-wrap">{a.answer}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <input
                    value={v.grade}
                    onChange={(e) => setEdit((s) => ({ ...s, [a.id]: { ...v, grade: e.target.value } }))}
                    placeholder="Điểm"
                    className="w-20 px-2 py-1 rounded-lg border-2 border-gray-200 text-xs font-bold"
                  />
                  <input
                    value={v.feedback}
                    onChange={(e) => setEdit((s) => ({ ...s, [a.id]: { ...v, feedback: e.target.value } }))}
                    placeholder="Nhận xét"
                    className="flex-1 min-w-[140px] px-2 py-1 rounded-lg border-2 border-gray-200 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => aiFeedback(a)}
                    disabled={busy === a.id}
                    className="text-[11px] font-black text-violet-600 disabled:opacity-50"
                  >
                    🤖 AI đề xuất chấm
                  </button>
                  <button
                    onClick={() => save(a)}
                    disabled={busy === a.id}
                    className="text-[11px] font-black text-emerald-600 disabled:opacity-50"
                  >
                    💾 Lưu chấm
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Panel chính ---------- */

export function AnnotatedImagePanel({
  classId,
  canPost,
  kind,
}: {
  classId: string;
  canPost: boolean;
  kind: NoteKind;
}) {
  const cacheKey = `${classId}|${kind}|${canPost ? "t" : "s"}`;
  const [rows, setRows] = useState<AnnotatedImage[] | null>(() => listCache.get(cacheKey) ?? null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const reload = useCallback(() => {
    listAnnotatedImages(classId, kind, !canPost)
      .then((r) => {
        rememberList(cacheKey, r);
        setRows(r);
        // nạp sẵn link + ảnh để mở bài là hiện ngay
        prefetchClassUrls(r.map((x) => x.image_url || "").filter(Boolean)).catch(() => {});
      })
      .catch(() => setRows((prev) => prev ?? []));
  }, [classId, kind, canPost, cacheKey]);

  useEffect(() => {
    setRows(listCache.get(cacheKey) ?? null);
    reload();
  }, [reload, cacheKey]);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {canPost && (
        <div className="bg-white/80 rounded-2xl p-3 border-2 border-orange-200">
          <button
            onClick={() => {
              setCreating((v) => !v);
              setEditingId(null);
            }}
            className="text-xs font-black text-orange-600"
          >
            {creating
              ? "▲ Đóng"
              : kind === "material"
                ? "📍 Tạo học liệu ảnh có ghi chú"
                : "📍 Tạo bài tập trên ảnh"}
          </button>
          {creating && (
            <Editor
              classId={classId}
              kind={kind}
              onDone={() => {
                setCreating(false);
                reload();
              }}
            />
          )}
        </div>
      )}

      {!rows && <LoadingPercent light={false} />}
      {rows?.length === 0 && (
        <p className="text-xs font-bold text-muted-foreground">
          Chưa có {kind === "material" ? "học liệu" : "bài tập"} ảnh có ghi chú nào.
        </p>
      )}

      {rows?.map((r) => (
        <div key={r.id} className="bg-white/90 rounded-2xl p-3 border-2 border-white shadow-sm min-w-0">
          <div className="flex items-start gap-2">
            <span className="text-lg">📍</span>
            <button
              onClick={() => setOpenId((v) => (v === r.id ? null : r.id))}
              className="flex-1 min-w-0 text-left"
            >
              <div className="font-black text-sm truncate">{r.title}</div>
              <div className="text-[10px] font-bold text-muted-foreground">
                {r.notes.length} ghi chú · {new Date(r.created_at).toLocaleString("vi-VN")}
                {!r.published && " · 📝 NHÁP"}
              </div>
            </button>
            {canPost && (
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingId((v) => (v === r.id ? null : r.id));
                    setOpenId(null);
                  }}
                  className="text-[10px] font-black text-orange-600"
                >
                  sửa
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Xoá mục này?")) return;
                    await deleteAnnotatedImage(r.id);
                    reload();
                  }}
                  className="text-[10px] font-bold text-red-500"
                >
                  xoá
                </button>
              </div>
            )}
          </div>

          {editingId === r.id && (
            <Editor
              classId={classId}
              kind={kind}
              row={r}
              onDone={() => {
                setEditingId(null);
                reload();
              }}
            />
          )}
          {openId === r.id && (
            <div className="mt-2">
              <Viewer row={r} canPost={canPost} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default AnnotatedImagePanel;
