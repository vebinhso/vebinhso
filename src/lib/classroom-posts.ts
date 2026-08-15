// Học liệu / bài tập / bài nộp trong lớp học (kiểu Google Classroom)
import { supabase } from "@/integrations/supabase/client";

export type PostKind = "material" | "assignment" | "announcement";

export type ClassPost = {
  id: string;
  class_id: string;
  kind: PostKind;
  title: string;
  content: string | null;
  link_url: string | null;
  file_url: string | null;
  due_at: string | null;
  created_at: string;
};

export type ClassSubmission = {
  id: string;
  post_id: string;
  class_id: string;
  student_id: string;
  file_url: string | null;
  file_name: string | null;
  note: string | null;
  grade: string | null;
  feedback: string | null;
  created_at: string;
};

export type RosterMember = {
  user_id: string;
  display_name: string;
  username: string;
  is_teacher: boolean;
};

export async function listClassPosts(classId: string, kind?: PostKind): Promise<ClassPost[]> {
  let q = supabase.from("class_posts").select("*").eq("class_id", classId).order("created_at", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return (data as any[]) as ClassPost[];
}

export async function createClassPost(p: {
  classId: string;
  kind: PostKind;
  title: string;
  content?: string;
  linkUrl?: string;
  fileUrl?: string;
  dueAt?: string | null;
}) {
  const { error } = await supabase.from("class_posts").insert({
    class_id: p.classId,
    kind: p.kind,
    title: p.title,
    content: p.content || null,
    link_url: p.linkUrl || null,
    file_url: p.fileUrl || null,
    due_at: p.dueAt || null,
  } as any);
  if (error) throw error;
}

export async function deleteClassPost(id: string) {
  const { error } = await supabase.from("class_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function getClassRoster(classId: string): Promise<RosterMember[]> {
  const { data, error } = await supabase.rpc("get_class_roster", { _class_id: classId } as any);
  if (error) throw error;
  return ((data as any[]) || []) as RosterMember[];
}

export async function listSubmissions(postId: string): Promise<ClassSubmission[]> {
  const { data, error } = await supabase
    .from("class_submissions")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any[]) as ClassSubmission[];
}

export async function submitAssignment(p: {
  postId: string;
  classId: string;
  fileUrl?: string;
  fileName?: string;
  note?: string;
}) {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("unauthorized");
  const { error } = await supabase.from("class_submissions").upsert(
    {
      post_id: p.postId,
      class_id: p.classId,
      student_id: uid,
      file_url: p.fileUrl || null,
      file_name: p.fileName || null,
      note: p.note || null,
    } as any,
    { onConflict: "post_id,student_id" },
  );
  if (error) throw error;
}

/** Nén ảnh phía trình duyệt trước khi tải lên (nhanh hơn nhiều, vẫn nét). */
export async function compressImage(file: File, maxDim = 1800, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 400 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function putWithProgress(url: string, file: File, onProgress?: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Tải tệp thất bại (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Mất kết nối khi tải tệp"));
    xhr.ontimeout = () => reject(new Error("Tải tệp quá lâu, thử lại nhé"));
    xhr.send(file);
  });
}

/** Tải tệp lên kho "classroom", trả về đường dẫn nội bộ. Có % tiến trình thật. */
export async function uploadClassFile(
  classId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const prepared = await compressImage(file);
  const safe = prepared.name.replace(/[^\w.\-]+/g, "_");
  const path = `${classId}/${Date.now()}_${safe}`;

  // Ưu tiên tải qua URL ký sẵn để đọc được % tiến trình thật.
  const signed = await supabase.storage.from("classroom").createSignedUploadUrl(path);
  if (!signed.error && signed.data?.signedUrl) {
    await putWithProgress(signed.data.signedUrl, prepared, onProgress);
    onProgress?.(100);
    return path;
  }

  const { error } = await supabase.storage.from("classroom").upload(path, prepared, { upsert: false });
  if (error) throw error;
  onProgress?.(100);
  return path;
}


/** Link tải tạm thời (kho riêng tư). */
export async function signedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("classroom").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function openClassFile(path: string) {
  const url = await signedUrl(path);
  if (url) window.open(url, "_blank", "noopener");
}

/** Số yêu cầu tham gia đang chờ, gom theo lớp (dành cho giáo viên). */
export async function pendingRequestCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("class_join_requests")
    .select("class_id")
    .eq("status", "pending");
  if (error) return {};
  const out: Record<string, number> = {};
  for (const r of (data as any[]) || []) out[r.class_id] = (out[r.class_id] || 0) + 1;
  return out;
}

/** Thời điểm thông báo mới nhất của mỗi lớp (dành cho học sinh). */
export async function latestAnnouncementAt(classIds: string[]): Promise<Record<string, string>> {
  if (classIds.length === 0) return {};
  const { data, error } = await supabase
    .from("class_posts")
    .select("class_id, created_at")
    .in("class_id", classIds)
    .eq("kind", "announcement")
    .order("created_at", { ascending: false });
  if (error) return {};
  const out: Record<string, string> = {};
  for (const r of (data as any[]) || []) if (!out[r.class_id]) out[r.class_id] = r.created_at;
  return out;
}

const SEEN_KEY = "class_ann_seen";
function seenMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch { return {}; }
}
export function getSeenAnnouncement(classId: string): string | null {
  return seenMap()[classId] ?? null;
}
export function markAnnouncementSeen(classId: string, at?: string) {
  const m = seenMap();
  m[classId] = at || new Date().toISOString();
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } catch {}
}

// ===== Theo dõi tiến độ bài tập của 1 học sinh (dành cho giáo viên) =====
export type StudentAssignmentRow = {
  post_id: string;
  title: string;
  due_at: string | null;
  submitted_at: string | null;
  file_url: string | null;
  file_name: string | null;
  note: string | null;
  grade: string | null;
  feedback: string | null;
};

export type StudentNoteTaskRow = {
  image_id: string;
  image_title: string;
  note_id: string;
  question: string;
  answer: string | null;
  grade: string | null;
  feedback: string | null;
  submitted_at: string | null;
};

export async function getStudentAssignmentProgress(
  classId: string,
  studentId: string,
): Promise<StudentAssignmentRow[]> {
  const [{ data: posts, error: e1 }, { data: subs, error: e2 }] = await Promise.all([
    supabase
      .from("class_posts")
      .select("id,title,due_at,created_at")
      .eq("class_id", classId)
      .eq("kind", "assignment")
      .order("created_at", { ascending: false }),
    supabase.from("class_submissions").select("*").eq("class_id", classId).eq("student_id", studentId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const byPost = new Map<string, any>();
  for (const s of (subs as any[]) || []) byPost.set(s.post_id, s);
  return ((posts as any[]) || []).map((p) => {
    const s = byPost.get(p.id);
    return {
      post_id: p.id,
      title: p.title,
      due_at: p.due_at ?? null,
      submitted_at: s?.created_at ?? null,
      file_url: s?.file_url ?? null,
      file_name: s?.file_name ?? null,
      note: s?.note ?? null,
      grade: s?.grade ?? null,
      feedback: s?.feedback ?? null,
    };
  });
}

export async function getStudentNoteTaskProgress(
  classId: string,
  studentId: string,
): Promise<StudentNoteTaskRow[]> {
  const [{ data: imgs, error: e1 }, { data: ans, error: e2 }] = await Promise.all([
    supabase
      .from("class_annotated_images")
      .select("id,title,notes,kind,created_at")
      .eq("class_id", classId)
      .eq("kind", "exercise")
      .order("created_at", { ascending: false }),
    supabase.from("class_note_answers").select("*").eq("class_id", classId).eq("student_id", studentId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const key = (i: string, n: string) => `${i}::${n}`;
  const byNote = new Map<string, any>();
  for (const a of (ans as any[]) || []) byNote.set(key(a.image_id, a.note_id), a);
  const out: StudentNoteTaskRow[] = [];
  for (const img of ((imgs as any[]) || [])) {
    const notes = Array.isArray(img.notes) ? img.notes : [];
    notes.forEach((n: any, idx: number) => {
      const a = byNote.get(key(img.id, n.id));
      out.push({
        image_id: img.id,
        image_title: img.title,
        note_id: n.id,
        question: n.question || n.title || `Ghi chú ${idx + 1}`,
        answer: a?.answer ?? null,
        grade: a?.grade ?? null,
        feedback: a?.feedback ?? null,
        submitted_at: a?.created_at ?? null,
      });
    });
  }
  return out;
}
