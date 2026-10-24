import { z } from "zod";

export const classroomImageSchema = z.object({
  imageBase64: z.string().max(6_000_000).regex(/^[A-Za-z0-9+/]*={0,2}$/).optional(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
});

export const lessonInputSchema = classroomImageSchema.extend({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(3000),
  reviseNote: z.string().max(1000).optional(),
});

export const noteInputSchema = classroomImageSchema.extend({
  mode: z.enum(["material", "exercise", "feedback"]),
  title: z.string().max(200).optional(),
  hint: z.string().max(1500).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  question: z.string().max(1000).optional(),
  expected: z.string().max(1500).optional(),
  studentAnswer: z.string().max(3000).optional(),
});

const text = z.string().trim().min(1);
export const lessonOutputSchema = z.object({
  objectName: text,
  summary: text,
  parts: z.array(z.object({ name: text, role: text })).length(3),
  sections: z.array(z.object({ heading: text, body: text })).length(2),
  keyPoints: z.array(text).length(3),
  questions: z.array(z.object({
    q: text,
    options: z.array(text).length(4),
    answer: z.number().int().min(0).max(3),
    explain: text,
  })).length(3),
});

export const noteOutputSchemas = {
  material: z.object({ title: text, content: text }),
  exercise: z.object({ title: text, question: text, expected: text }),
  feedback: z.object({ grade: text, feedback: text }),
};

export type ClassroomAiConfig = { apiKey: string; model: string; visionModel: string };
export type LessonInput = z.input<typeof lessonInputSchema>;
export type NoteInput = z.input<typeof noteInputSchema>;

/** No environment access here: handlers supply configuration at request time. */
export function classroomModel(config: ClassroomAiConfig, hasImage: boolean) {
  if (!config.apiKey || !(hasImage ? config.visionModel : config.model)) {
    throw new Error("AI lớp học chưa được cấu hình đầy đủ trong Secrets.");
  }
  return hasImage ? config.visionModel : config.model;
}

export function parseClassroomJson(content: unknown): unknown {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI lớp học trả về nội dung trống. Vui lòng thử lại.");
  }
  const clean = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("AI lớp học trả về JSON không hợp lệ. Vui lòng thử lại.");
  }
}