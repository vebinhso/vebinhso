// Học liệu AI: mô hình 3D xoay 360° + bài học + câu hỏi do AI đề xuất
import { supabase } from "@/integrations/supabase/client";

export type AiQuestion = { q: string; options: string[]; answer: number; explain?: string };
export type AiLessonBody = {
  objectName?: string;
  summary?: string;
  parts?: { name: string; role: string }[];
  sections?: { heading: string; body: string }[];
  keyPoints?: string[];
};

export type AiLesson = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  source_image_url: string | null;
  frames: string[];
  lesson: AiLessonBody;
  questions: AiQuestion[];
  published: boolean;
  created_at: string;
};

const table = () => supabase.from("class_ai_lessons" as any);

export async function listAiLessons(classId: string, onlyPublished: boolean): Promise<AiLesson[]> {
  let q = table().select("*").eq("class_id", classId).order("created_at", { ascending: false });
  if (onlyPublished) q = q.eq("published", true);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as any[]) || []).map((r) => ({
    ...r,
    frames: Array.isArray(r.frames) ? r.frames : [],
    lesson: r.lesson || {},
    questions: Array.isArray(r.questions) ? r.questions : [],
  })) as AiLesson[];
}

function b64ToBlob(b64: string, mime = "image/png") {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Tải các khung ảnh 3D lên kho lưu trữ, trả về danh sách đường dẫn. */
export async function uploadFrames(classId: string, framesB64: string[]): Promise<string[]> {
  const stamp = Date.now();
  const out: string[] = [];
  for (let i = 0; i < framesB64.length; i++) {
    const path = `${classId}/ai3d/${stamp}_${i}.png`;
    const { error } = await supabase.storage
      .from("classroom")
      .upload(path, b64ToBlob(framesB64[i]), { upsert: true, contentType: "image/png" });
    if (error) throw error;
    out.push(path);
  }
  return out;
}

export async function saveAiLesson(p: {
  classId: string;
  title: string;
  description: string;
  frames: string[];
  lesson: AiLessonBody;
  questions: AiQuestion[];
  sourceImageUrl?: string | null;
  published: boolean;
}) {
  const { error } = await table().insert({
    class_id: p.classId,
    title: p.title,
    description: p.description || null,
    frames: p.frames,
    lesson: p.lesson,
    questions: p.questions,
    source_image_url: p.sourceImageUrl || null,
    published: p.published,
  } as any);
  if (error) throw error;
}

export async function setAiLessonPublished(id: string, published: boolean) {
  const { error } = await table().update({ published } as any).eq("id", id);
  if (error) throw error;
}

export async function deleteAiLesson(id: string) {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}

/** Link xem tạm thời cho nhiều khung ảnh. */
export async function frameUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage.from("classroom").createSignedUrls(paths, 60 * 60 * 4);
  if (error || !data) return [];
  return data.map((d) => d.signedUrl || "").filter(Boolean);
}
