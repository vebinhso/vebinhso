import { createServerFn } from "@tanstack/react-start";
import { buildLesson } from "@/lib/ai-lesson.server";

type GenInput = {
  imageBase64?: string; // raw base64 (không có tiền tố data:)
  mimeType?: string;
  title: string;
  description: string;
  reviseNote?: string;
};


export const generateAiLesson = createServerFn({ method: "POST" })
  .inputValidator((data: GenInput) => {
    if (!data?.title?.trim() && !data?.description?.trim()) throw new Error("Thiếu nội dung");
    return {
      imageBase64: data.imageBase64 || undefined,
      mimeType: data.mimeType || "image/png",
      title: (data.title || "").slice(0, 200),
      description: (data.description || "").slice(0, 3000),
      reviseNote: (data.reviseNote || "").slice(0, 1000),
    } as GenInput;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI chưa được cấu hình");
    const lessonRaw = await buildLesson(apiKey, data);
    const lesson = lessonRaw || {};
    const questions = Array.isArray(lesson.questions) ? lesson.questions.slice(0, 8) : [];
    delete lesson.questions;
    return { lesson, questions };
  });
