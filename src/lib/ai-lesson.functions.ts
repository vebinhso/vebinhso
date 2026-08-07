import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

type GenInput = {
  imageBase64?: string; // raw base64 (không có tiền tố data:)
  mimeType?: string;
  title: string;
  description: string;
  reviseNote?: string;
};

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("AI chưa được cấu hình");
  return k;
}

async function buildLesson(apiKey: string, input: GenInput) {
  const sys = `Bạn là chuyên gia thiết kế bài giảng số cho học sinh Việt Nam (lớp 6-12).
Dựa trên MÔ TẢ (và ẢNH nếu có) của giáo viên, hãy soạn một bài học.
Trả về CHÍNH XÁC một JSON object (không markdown):
{
 "objectName": "chủ đề bài học",
 "summary": "tóm tắt 2-3 câu",
 "parts": [{"name":"ý/khái niệm","role":"giải thích ngắn gọn"}],
 "sections": [{"heading":"tiêu đề mục","body":"nội dung 3-5 câu"}],
 "keyPoints": ["ý chính 1", "..."],
 "questions": [{"q":"câu hỏi","options":["A","B","C","D"],"answer":0,"explain":"giải thích ngắn"}]
}
Yêu cầu: 4-6 mục parts, 3-4 sections, 4-6 keyPoints, ĐÚNG 5 câu hỏi trắc nghiệm 4 lựa chọn. Tiếng Việt, chính xác khoa học, dễ hiểu.`;

  const userContent: any[] = [
    {
      type: "text",
      text: `Tiêu đề bài học: ${input.title}\nMô tả/định hướng của giáo viên: ${input.description}${
        input.reviseNote ? `\nYêu cầu chỉnh sửa: ${input.reviseNote}` : ""
      }`,
    },
  ];
  if (input.imageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${input.mimeType || "image/png"};base64,${input.imageBase64}` },
    });
  }

  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI lỗi ${res.status}: ${t.slice(0, 160)}`);
  }
  const j: any = await res.json();
  const content = j?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

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
    const lessonRaw = await buildLesson(key(), data);
    const lesson = lessonRaw || {};
    const questions = Array.isArray(lesson.questions) ? lesson.questions.slice(0, 8) : [];
    delete lesson.questions;
    return { lesson, questions };
  });
