// Teacher & Classroom API wrappers
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/game/questions";

export type TeacherStatus = "none" | "pending" | "approved" | "rejected";

export type MyTeacherProfile = {
  teacherStatus: TeacherStatus;
  isTeacher: boolean;
  isAdmin: boolean;
  classCode: string | null;
  teacherSchool: string | null;
  teacherSubject: string | null;
};

export async function getMyTeacherProfile(): Promise<MyTeacherProfile> {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) {
    return { teacherStatus: "none", isTeacher: false, isAdmin: false, classCode: null, teacherSchool: null, teacherSubject: null };
  }
  const [{ data: prof }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("teacher_status,class_code,teacher_school,teacher_subject").eq("user_id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid),
  ]);
  const roleSet = new Set(((roles as any[]) || []).map((r) => r.role));
  return {
    teacherStatus: ((prof as any)?.teacher_status ?? "none") as TeacherStatus,
    isTeacher: roleSet.has("teacher"),
    isAdmin: roleSet.has("admin"),
    classCode: (prof as any)?.class_code ?? null,
    teacherSchool: (prof as any)?.teacher_school ?? null,
    teacherSubject: (prof as any)?.teacher_subject ?? null,
  };
}

export async function requestTeacher(school: string, subject: string) {
  const { error } = await supabase.rpc("request_teacher", { school, subject });
  if (error) throw error;
}

export async function joinClass(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_class", { code });
  if (error) throw error;
  return (data as any) as string;
}

export async function leaveClass(classId?: string) {
  const { error } = await supabase.rpc("leave_class", { _class_id: classId ?? null } as any);
  if (error) throw error;
}

export async function setActiveClass(classId: string | null) {
  const { error } = await supabase.rpc("set_active_class", { _class_id: classId } as any);
  if (error) throw error;
}

export async function getOrCreateMyClassCode(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_or_create_my_class_code");
  if (error) return null;
  return (data as any) ?? null;
}

// Student-side: joined classes
export type MyClass = {
  class_id: string;
  code: string;
  name: string;
  subject: string | null;
  teacher_id: string;
  teacher_name: string;
  teacher_school: string | null;
  is_active: boolean;
};
export async function getMyClasses(): Promise<MyClass[]> {
  const { data, error } = await supabase.rpc("get_my_classes");
  if (error) return [];
  return (data as any[]) || [];
}

// Teacher-side: owned classes
export type TaughtClass = {
  id: string;
  code: string;
  name: string;
  subject: string | null;
  student_count: number;
  question_count: number;
  created_at: string;
};
export async function listMyTaughtClasses(): Promise<TaughtClass[]> {
  const { data, error } = await supabase.rpc("list_my_taught_classes");
  if (error) throw error;
  return (data as any[]) || [];
}

export async function createClass(name: string, subject: string): Promise<TaughtClass> {
  const { data, error } = await supabase.rpc("create_class", { _name: name, _subject: subject } as any);
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return { id: row.id, code: row.code, name: row.name, subject: row.subject, student_count: 0, question_count: 0, created_at: row.created_at };
}

export async function deleteClass(classId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_class", { _class_id: classId } as any);
  if (error) throw error;
}

export type ClassroomStudent = { user_id: string; username: string; display_name: string; email: string; joined_at: string };
export async function getClassStudents(classId: string): Promise<ClassroomStudent[]> {
  const { data, error } = await supabase.rpc("get_class_students", { _class_id: classId } as any);
  if (error) throw error;
  return (data as any[]) || [];
}

export type PendingTeacher = {
  user_id: string; username: string; display_name: string; email: string;
  teacher_school: string | null; teacher_subject: string | null;
  teacher_status: TeacherStatus; class_code: string | null;
};
export async function listPendingTeachers(): Promise<PendingTeacher[]> {
  const { data, error } = await supabase.rpc("list_pending_teachers");
  if (error) throw error;
  return (data as any[]) || [];
}

export async function approveTeacher(uid: string): Promise<string> {
  const { data, error } = await supabase.rpc("approve_teacher", { uid });
  if (error) throw error;
  return (data as any) as string;
}

export async function rejectTeacher(uid: string) {
  const { error } = await supabase.rpc("reject_teacher", { uid });
  if (error) throw error;
}

// ===== Teacher-owned questions =====
export type TeacherQuestion = {
  id?: string;
  text: string;
  choices: { text: string; imageUrl?: string }[];
  correctIndexes: number[];
  reward: number;
  category?: string;           // "digital" | "history"
  competencyLevel?: number | null;
  competencyDomain?: number | null;
  enabled?: boolean;
  imageUrl?: string;
  classId?: string | null;
};

export async function listMyQuestions(classId?: string): Promise<TeacherQuestion[]> {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) return [];
  let q = supabase
    .from("questions_bank")
    .select("id,text,choices,correct_indexes,answer_index,reward,category,image_url,enabled,competency_level,competency_domain,class_id,created_at")
    .eq("teacher_id", uid)
    .order("created_at", { ascending: false });
  if (classId) q = q.eq("class_id", classId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data as any[]) || []).map((r) => ({
    id: r.id,
    text: r.text,
    choices: (Array.isArray(r.choices) ? r.choices : []).map((c: any) =>
      typeof c === "string" ? { text: c } : { text: c?.text ?? "", imageUrl: c?.imageUrl ?? "" }
    ),
    correctIndexes: Array.isArray(r.correct_indexes) && r.correct_indexes.length > 0
      ? r.correct_indexes.map((n: any) => Number(n))
      : [Number(r.answer_index ?? 0)],
    reward: Number(r.reward ?? 10),
    category: r.category ?? "digital",
    imageUrl: r.image_url ?? "",
    enabled: r.enabled ?? true,
    competencyLevel: r.competency_level ?? null,
    competencyDomain: r.competency_domain ?? null,
    classId: r.class_id ?? null,
  }));
}

function toRow(q: TeacherQuestion, teacherId: string) {
  return {
    text: q.text,
    choices: q.choices as any,
    answer_index: q.correctIndexes?.[0] ?? 0,
    correct_indexes: (q.correctIndexes && q.correctIndexes.length > 0 ? q.correctIndexes : [0]) as any,
    maps: ["all"] as any,
    reward: q.reward ?? 10,
    image_url: q.imageUrl || null,
    category: q.category || "digital",
    enabled: q.enabled ?? true,
    priority: 0,
    competency_level: (typeof q.competencyLevel === "number" && q.competencyLevel >= 1 && q.competencyLevel <= 8) ? q.competencyLevel : null,
    competency_domain: (typeof q.competencyDomain === "number" && q.competencyDomain >= 1 && q.competencyDomain <= 6) ? q.competencyDomain : null,
    teacher_id: teacherId,
    class_id: q.classId ?? null,
  };
}

export async function createMyQuestion(q: TeacherQuestion): Promise<string> {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("unauthorized");
  const { data, error } = await supabase.from("questions_bank").insert(toRow(q, uid) as any).select("id").single();
  if (error) throw error;
  return (data as any).id;
}

export async function updateMyQuestion(id: string, q: TeacherQuestion): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("unauthorized");
  const { error } = await supabase.from("questions_bank").update(toRow(q, uid) as any).eq("id", id);
  if (error) throw error;
}

export async function deleteMyQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions_bank").delete().eq("id", id);
  if (error) throw error;
}

// ===== Bulk import parsers =====
/**
 * CSV format:
 *   text,option1,option2,option3,option4,correct,reward,category,level,domain
 * `correct` = 1-based index (or comma-separated for multi).
 */
export function parseQuestionsCSV(csv: string): TeacherQuestion[] {
  const rows = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: TeacherQuestion[] = [];
  const start = rows[0]?.toLowerCase().includes("text") ? 1 : 0;
  for (let i = start; i < rows.length; i++) {
    const cells = splitCSVLine(rows[i]);
    if (cells.length < 6) continue;
    const [text, o1, o2, o3, o4, correctRaw, rewardRaw, categoryRaw, levelRaw, domainRaw] = cells;
    const options = [o1, o2, o3, o4].filter((c) => c !== undefined).map((t) => ({ text: (t || "").trim() }));
    const correctIndexes = String(correctRaw || "1")
      .split(/[,\s]+/).map((n) => Number(n) - 1).filter((n) => Number.isFinite(n) && n >= 0);
    out.push({
      text: (text || "").trim(),
      choices: options,
      correctIndexes: correctIndexes.length > 0 ? correctIndexes : [0],
      reward: Number(rewardRaw) > 0 ? Number(rewardRaw) : 10,
      category: (categoryRaw || "digital").trim().toLowerCase() === "history" ? "history" : "digital",
      competencyLevel: Number(levelRaw) >= 1 && Number(levelRaw) <= 8 ? Number(levelRaw) : null,
      competencyDomain: Number(domainRaw) >= 1 && Number(domainRaw) <= 6 ? Number(domainRaw) : null,
      enabled: true,
    });
  }
  return out;
}

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * JSON format: an array of objects with fields matching TeacherQuestion.
 * Accepts loose shapes: { q?, text?, options?[], choices?[], correct? | correctIndexes?[], reward?, category?, level?, domain? }
 */
export function parseQuestionsJSON(json: string): TeacherQuestion[] {
  const arr = JSON.parse(json);
  if (!Array.isArray(arr)) throw new Error("JSON phải là mảng câu hỏi.");
  return arr.map((r: any) => {
    const text = r.text ?? r.q ?? "";
    const rawOpts = r.choices ?? r.options ?? [];
    const choices = rawOpts.map((c: any) =>
      typeof c === "string" ? { text: c } : { text: c?.text ?? "", imageUrl: c?.imageUrl ?? "" }
    );
    let correctIndexes: number[] = [];
    if (Array.isArray(r.correctIndexes)) correctIndexes = r.correctIndexes.map((n: any) => Number(n));
    else if (typeof r.correct === "number") correctIndexes = [Number(r.correct)];
    else if (typeof r.answer === "number") correctIndexes = [Number(r.answer)];
    if (correctIndexes.length === 0) correctIndexes = [0];
    return {
      text,
      choices,
      correctIndexes,
      reward: Number(r.reward ?? 10),
      category: r.category === "history" ? "history" : "digital",
      competencyLevel: Number(r.level ?? r.competencyLevel) >= 1 && Number(r.level ?? r.competencyLevel) <= 8 ? Number(r.level ?? r.competencyLevel) : null,
      competencyDomain: Number(r.domain ?? r.competencyDomain) >= 1 && Number(r.domain ?? r.competencyDomain) <= 6 ? Number(r.domain ?? r.competencyDomain) : null,
      enabled: r.enabled !== false,
    } as TeacherQuestion;
  });
}

// Legacy re-export unused but avoids unused warnings
export type { Question };
