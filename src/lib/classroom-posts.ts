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

/** Tải tệp lên kho "classroom", trả về đường dẫn nội bộ. */
export async function uploadClassFile(classId: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${classId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from("classroom").upload(path, file, { upsert: false });
  if (error) throw error;
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
