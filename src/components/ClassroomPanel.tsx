import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listClassPosts,
  createClassPost,
  deleteClassPost,
  getClassRoster,
  listSubmissions,
  submitAssignment,
  uploadClassFile,
  openClassFile,
  type ClassPost,
  type ClassSubmission,
  type RosterMember,
} from "@/lib/classroom-posts";
import { AiMaterialPanel } from "@/components/AiMaterialPanel";
import { AnnotatedImagePanel } from "@/components/AnnotatedImagePanel";
import { PasteDropZone } from "@/components/PasteDropZone";


type Tab = "announcement" | "material" | "assignment" | "people";

export function ClassroomPanel({
  classId,
  canPost,
  compact,
  defaultTab,
}: {
  classId: string;
  canPost: boolean;
  compact?: boolean;
  defaultTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab ?? "material");
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex gap-1 flex-wrap">
        {([
          { id: "announcement", label: "📢 Thông báo" },
          { id: "material", label: "📚 Học liệu" },
          { id: "assignment", label: "📝 Bài tập" },
          { id: "people", label: "👥 Thành viên" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              tab === t.id ? "bg-orange-500 text-white shadow" : "bg-white/70 hover:bg-orange-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "people" ? (
        <PeopleTab classId={classId} />
      ) : tab === "material" ? (
        <MaterialTab classId={classId} canPost={canPost} compact={compact} />
      ) : tab === "assignment" ? (
        <AssignmentTab classId={classId} canPost={canPost} compact={compact} />
      ) : (
        <PostsTab classId={classId} kind={tab} canPost={canPost} compact={compact} />
      )}
    </div>
  );
}

function MaterialTab({ classId, canPost, compact }: { classId: string; canPost: boolean; compact?: boolean }) {
  const [mode, setMode] = useState<"ai" | "classic" | "pin">("classic");
  if (!canPost) {
    // Học sinh: gộp tất cả học liệu vào một dòng chảy duy nhất
    return (
      <div className="flex flex-col gap-4 min-w-0">
        <PostsTab classId={classId} kind="material" canPost={false} compact={compact} />
        <AiMaterialPanel classId={classId} canPost={false} />
        <AnnotatedImagePanel classId={classId} canPost={false} kind="material" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setMode("classic")}
          className={`px-3 py-1 rounded-xl text-[11px] font-black transition ${
            mode === "classic" ? "bg-orange-500 text-white shadow" : "bg-white/70 hover:bg-orange-100"
          }`}
        >
          📗 HỌC LIỆU TRUYỀN THỐNG
        </button>
        <button
          onClick={() => setMode("ai")}
          className={`px-3 py-1 rounded-xl text-[11px] font-black transition ${
            mode === "ai" ? "bg-violet-600 text-white shadow" : "bg-white/70 hover:bg-violet-100"
          }`}
        >
          🤖 HỌC LIỆU AI
        </button>
        <button
          onClick={() => setMode("pin")}
          className={`px-3 py-1 rounded-xl text-[11px] font-black transition ${
            mode === "pin" ? "bg-sky-600 text-white shadow" : "bg-white/70 hover:bg-sky-100"
          }`}
        >
          📍 ẢNH CÓ GHI CHÚ
        </button>
      </div>
      {mode === "ai" ? (
        <AiMaterialPanel classId={classId} canPost={canPost} />
      ) : mode === "pin" ? (
        <AnnotatedImagePanel classId={classId} canPost={canPost} kind="material" />
      ) : (
        <PostsTab classId={classId} kind="material" canPost={canPost} compact={compact} />
      )}

    </div>

  );
}

function AssignmentTab({ classId, canPost, compact }: { classId: string; canPost: boolean; compact?: boolean }) {
  const [mode, setMode] = useState<"classic" | "pin">("classic");
  if (!canPost) {
    return (
      <div className="flex flex-col gap-4 min-w-0">
        <PostsTab classId={classId} kind="assignment" canPost={false} compact={compact} />
        <AnnotatedImagePanel classId={classId} canPost={false} kind="exercise" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setMode("classic")}
          className={`px-3 py-1 rounded-xl text-[11px] font-black transition ${
            mode === "classic" ? "bg-orange-500 text-white shadow" : "bg-white/70 hover:bg-orange-100"
          }`}
        >
          📝 BÀI TẬP TRUYỀN THỐNG
        </button>
        <button
          onClick={() => setMode("pin")}
          className={`px-3 py-1 rounded-xl text-[11px] font-black transition ${
            mode === "pin" ? "bg-sky-600 text-white shadow" : "bg-white/70 hover:bg-sky-100"
          }`}
        >
          📍 BÀI TẬP TRÊN ẢNH
        </button>
      </div>
      {mode === "pin" ? (
        <AnnotatedImagePanel classId={classId} canPost={canPost} kind="exercise" />
      ) : (
        <PostsTab classId={classId} kind="assignment" canPost={canPost} compact={compact} />
      )}
    </div>
  );
}



function PeopleTab({ classId }: { classId: string }) {
  const [rows, setRows] = useState<RosterMember[]>([]);
  useEffect(() => {
    getClassRoster(classId).then(setRows).catch(() => setRows([]));
  }, [classId]);
  return (
    <div className="flex flex-col gap-1.5">
      {rows.length === 0 && <p className="text-xs font-bold text-muted-foreground">Chưa có thành viên.</p>}
      {rows.map((r) => (
        <div
          key={`${r.user_id}-${r.is_teacher}`}
          className="flex items-center gap-2 bg-white/80 rounded-xl px-3 py-2 text-sm font-bold"
        >
          <span>{r.is_teacher ? "🧑‍🏫" : "🧑‍🎓"}</span>
          <span className="truncate">{r.display_name || r.username}</span>
          {r.is_teacher && (
            <span className="ml-auto text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
              GIÁO VIÊN
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function PostsTab({
  classId,
  kind,
  canPost,
  compact,
}: {
  classId: string;
  kind: "material" | "assignment" | "announcement";
  canPost: boolean;
  compact?: boolean;
}) {
  const [posts, setPosts] = useState<ClassPost[]>([]);
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const reload = () => listClassPosts(classId, kind).then(setPosts).catch(() => setPosts([]));
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, kind]);

  const save = async () => {
    if (!title.trim()) return toast.error("Nhập tiêu đề");
    setBusy(true);
    try {
      let fileUrl: string | undefined;
      if (file) fileUrl = await uploadClassFile(classId, file);
      await createClassPost({
        classId,
        kind,
        title: title.trim(),
        content,
        linkUrl,
        fileUrl,
        dueAt: kind === "assignment" && dueAt ? new Date(dueAt).toISOString() : null,
      });
      setTitle("");
      setContent("");
      setLinkUrl("");
      setDueAt("");
      setFile(null);
      setOpenForm(false);
      reload();
      toast.success("Đã đăng!");
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi đăng");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {canPost && (
        <div className="bg-white/80 rounded-2xl p-3 border-2 border-orange-200">
          <button onClick={() => setOpenForm((v) => !v)} className="text-xs font-black text-orange-600">
            {openForm ? "▲ Đóng" : `➕ Đăng ${kind === "material" ? "học liệu" : kind === "assignment" ? "bài tập" : "thông báo"}`}
          </button>
          {openForm && (
            <div className="flex flex-col gap-2 mt-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề"
                className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mô tả / hướng dẫn"
                rows={3}
                className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
              />
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Link video / tài liệu (YouTube, Drive...)"
                className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
              />
              {kind === "assignment" && (
                <label className="text-xs font-bold flex items-center gap-2">
                  Hạn nộp:
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="px-2 py-1 rounded-lg border-2 border-gray-200"
                  />
                </label>
              )}
              <PasteDropZone onFile={(f) => setFile(f)} accept={() => true} className="p-2 border-2 border-dashed border-gray-200">
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </PasteDropZone>
              {busy && <LoadingPercent percent={upPct} done={upPct >= 100} light={false} />}
              <button
                onClick={save}
                disabled={busy}
                className="toy-button toy-button-primary text-sm justify-center disabled:opacity-50"
              >
                {busy ? "Đang đăng..." : "📤 Đăng"}
              </button>

            </div>
          )}
        </div>
      )}

      {posts.length === 0 && (
        <p className="text-xs font-bold text-muted-foreground">
          Chưa có {kind === "material" ? "học liệu" : kind === "assignment" ? "bài tập" : "thông báo"} nào.
        </p>
      )}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} canPost={canPost} onChanged={reload} compact={compact} />
      ))}
    </div>
  );
}

function PostCard({
  post,
  canPost,
  onChanged,
  compact,
}: {
  post: ClassPost;
  canPost: boolean;
  onChanged: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<ClassSubmission[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSubs = () => listSubmissions(post.id).then(setSubs).catch(() => setSubs([]));
  useEffect(() => {
    if (open && post.kind === "assignment") loadSubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const doSubmit = async () => {
    setBusy(true);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      if (file) {
        fileUrl = await uploadClassFile(post.class_id, file);
        fileName = file.name;
      }
      await submitAssignment({ postId: post.id, classId: post.class_id, fileUrl, fileName, note });
      setFile(null);
      setNote("");
      loadSubs();
      toast.success("Đã nộp bài!");
    } catch (e: any) {
      toast.error(e?.message || "Không nộp được");
    }
    setBusy(false);
  };

  return (
    <div className="bg-white/90 rounded-2xl p-3 border-2 border-white shadow-sm min-w-0">
      <div className="flex items-start gap-2">
        <span className="text-lg">{post.kind === "material" ? "📚" : post.kind === "announcement" ? "📢" : "📝"}</span>
        <div className="flex-1 min-w-0">
          <button onClick={() => setOpen((v) => !v)} className="text-left w-full">
            <div className="font-black text-sm truncate">{post.title}</div>
            <div className="text-[10px] font-bold text-muted-foreground">
              {new Date(post.created_at).toLocaleString("vi-VN")}
              {post.due_at && ` · Hạn: ${new Date(post.due_at).toLocaleString("vi-VN")}`}
            </div>
          </button>
        </div>
        {canPost && (
          <button
            onClick={async () => {
              if (!confirm("Xoá bài đăng này?")) return;
              await deleteClassPost(post.id);
              onChanged();
            }}
            className="text-red-500 text-xs font-bold"
          >
            xoá
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-2 text-sm">
          {post.content && <p className="whitespace-pre-wrap break-words">{post.content}</p>}
          {post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all text-xs font-bold"
            >
              🔗 {post.link_url}
            </a>
          )}
          {post.file_url && (
            <button
              onClick={() => openClassFile(post.file_url!)}
              className="w-full text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl px-3 py-2 shadow border-2 border-emerald-700 text-center"
            >
              📎 TẢI TỆP ĐÍNH KÈM
            </button>
          )}


          {post.kind === "assignment" && (
            <div className="border-t-2 border-orange-100 pt-2">
              {canPost ? (
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-black">Bài nộp ({subs.length})</div>
                  {subs.map((s) => (
                    <div key={s.id} className="text-xs bg-orange-50 rounded-lg px-2 py-1 flex items-center gap-2">
                      <span className="truncate flex-1">{s.file_name || s.note || "(không có tệp)"}</span>
                      {s.file_url && (
                        <button
                          onClick={() => openClassFile(s.file_url!)}
                          className="font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg px-2 py-1 shrink-0"
                        >
                          📥 TẢI
                        </button>
                      )}
                    </div>

                  ))}
                  {subs.length === 0 && <p className="text-xs text-muted-foreground">Chưa có bài nộp.</p>}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {subs.length > 0 && (
                    <div className="text-xs font-black text-emerald-700">
                      ✅ Đã nộp: {subs[0].file_name || subs[0].note}
                    </div>
                  )}
                  <PasteDropZone onFile={(f) => setFile(f)} accept={() => true} className="p-2 border-2 border-dashed border-gray-200">
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </PasteDropZone>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú (tuỳ chọn)"
                    className="px-2 py-1 rounded-lg border-2 border-gray-200 text-xs"
                  />
                  <button
                    onClick={doSubmit}
                    disabled={busy}
                    className={`toy-button toy-button-primary justify-center disabled:opacity-50 ${compact ? "!text-xs !py-1.5" : "text-sm"}`}
                  >
                    {busy ? "Đang nộp..." : "📤 Nộp bài"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
