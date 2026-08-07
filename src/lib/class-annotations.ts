// Học liệu / bài tập dạng ẢNH CÓ CHÚ THÍCH: giáo viên chấm điểm lên ảnh, mỗi chấm là một ghi chú
import { supabase } from "@/integrations/supabase/client";

export type NoteKind = "material" | "exercise";

export type ImageNote = {
  id: string;
  x: number; // %
  y: number; // %
  color: string;
  title: string;
  /** Học liệu: nội dung kiến thức */
  content?: string;
  /** Bài tập: câu hỏi + đáp án gợi ý */
  question?: string;
  expected?: string;
};

export type AnnotatedImage = {
  id: string;
  class_id: string;
  kind: NoteKind;
  title: string;
  description: string | null;
  image_url: string | null;
  notes: ImageNote[];
  published: boolean;
  created_at: string;
};

export type NoteAnswer = {
  id: string;
  image_id: string;
  class_id: string;
  note_id: string;
  student_id: string;
  answer: string;
  grade: string | null;
  feedback: string | null;
  updated_at: string;
};

export const NOTE_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#0f172a",
];

const table = () => supabase.from("class_annotated_images" as any);
const answers = () => supabase.from("class_note_answers" as any);

export async function listAnnotatedImages(
  classId: string,
  kind: NoteKind,
  onlyPublished: boolean,
): Promise<AnnotatedImage[]> {
  let q = table()
    .select("*")
    .eq("class_id", classId)
    .eq("kind", kind)
    .order("created_at", { ascending: false });
  if (onlyPublished) q = q.eq("published", true);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as any[]) || []).map((r) => ({
    ...r,
    notes: Array.isArray(r.notes) ? r.notes : [],
  })) as AnnotatedImage[];
}

export async function saveAnnotatedImage(p: {
  id?: string;
  classId: string;
  kind: NoteKind;
  title: string;
  description?: string;
  imageUrl?: string | null;
  notes: ImageNote[];
  published: boolean;
}) {
  const payload: any = {
    class_id: p.classId,
    kind: p.kind,
    title: p.title,
    description: p.description || null,
    notes: p.notes,
    published: p.published,
  };
  if (p.imageUrl !== undefined) payload.image_url = p.imageUrl;
  if (p.id) {
    const { error } = await table().update(payload).eq("id", p.id);
    if (error) throw error;
    return p.id;
  }
  const { data, error } = await table().insert(payload).select("id").single();
  if (error) throw error;
  return (data as any)?.id as string;
}

export async function deleteAnnotatedImage(id: string) {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}

export async function listMyAnswers(imageId: string): Promise<NoteAnswer[]> {
  const { data, error } = await answers().select("*").eq("image_id", imageId);
  if (error) throw error;
  return ((data as any[]) || []) as NoteAnswer[];
}

export async function submitNoteAnswer(p: {
  imageId: string;
  classId: string;
  noteId: string;
  answer: string;
}) {
  const { data: sess } = await supabase.auth.getUser();
  const uid = sess?.user?.id;
  if (!uid) throw new Error("Bạn cần đăng nhập");
  const { error } = await answers().upsert(
    {
      image_id: p.imageId,
      class_id: p.classId,
      note_id: p.noteId,
      student_id: uid,
      answer: p.answer,
    } as any,
    { onConflict: "image_id,note_id,student_id" },
  );
  if (error) throw error;
}

export async function gradeNoteAnswer(id: string, grade: string, feedback: string) {
  const { error } = await answers().update({ grade, feedback } as any).eq("id", id);
  if (error) throw error;
}

/** Ảnh trong kho lưu trữ lớp học → link xem tạm thời */
const urlCache = new Map<string, { url: string; exp: number }>();
const urlPending = new Map<string, Promise<string>>();

/** Lấy nhiều link một lượt (nhanh hơn gọi từng cái) và nạp sẵn ảnh vào bộ nhớ đệm trình duyệt. */
export async function prefetchClassUrls(paths: string[]): Promise<void> {
  const now = Date.now();
  const need = [...new Set(paths.filter((p) => p && !(urlCache.get(p)?.exp ?? 0) })].filter(Boolean);
  if (need.length === 0) return;
  const { data } = await supabase.storage.from("classroom").createSignedUrls(need, 60 * 60 * 8);
  for (const d of data || []) {
    if (d?.signedUrl && d.path) {
      urlCache.set(d.path, { url: d.signedUrl, exp: now + 1000 * 60 * 60 * 7 });
      if (typeof window !== "undefined") {
        const img = new Image();
        img.decoding = "async";
        img.src = d.signedUrl;
      }
    }
  }
}

export async function signedClassUrl(path: string): Promise<string> {
  const now = Date.now();
  const hit = urlCache.get(path);
  if (hit && hit.exp > now) return hit.url;
  const inflight = urlPending.get(path);
  if (inflight) return inflight;
  const p = supabase.storage
    .from("classroom")
    .createSignedUrl(path, 60 * 60 * 8)
    .then(({ data }) => {
      const url = data?.signedUrl || "";
      if (url) urlCache.set(path, { url, exp: now + 1000 * 60 * 60 * 7 });
      urlPending.delete(path);
      return url;
    })
    .catch((e) => {
      urlPending.delete(path);
      throw e;
    });
  urlPending.set(path, p);
  return p;
}
