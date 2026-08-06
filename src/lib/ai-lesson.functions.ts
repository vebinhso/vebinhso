import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

/** Các góc xoay dùng để dựng mô hình 360° (bước 30° = 12 khung, xoay mượt). */
const ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

type GenInput = {
  imageBase64: string; // raw base64 (không có tiền tố data:)
  mimeType: string;
  title: string;
  description: string;
  reviseNote?: string;
};

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("AI chưa được cấu hình");
  return k;
}

async function renderAngle(apiKey: string, input: GenInput, angle: number): Promise<string | null> {
  const prompt = `Dựng lại vật thể chính trong ảnh thành một MÔ HÌNH 3D render chất lượng cao (giống ảnh render từ phần mềm 3D), nhìn từ góc xoay ${angle} độ quanh trục dọc.
Yêu cầu bắt buộc:
- Giữ đúng hình dạng, tỉ lệ, màu sắc và cấu trúc của vật thể gốc.
- Nền TRẮNG trơn hoàn toàn, vật thể nằm chính giữa, cùng khoảng cách và cùng kích thước ở mọi góc.
- Ánh sáng studio mềm, có khối 3D rõ ràng, chi tiết giải phẫu/cấu tạo chính xác.
- TUYỆT ĐỐI KHÔNG có chữ, số, watermark hay nhãn trong ảnh.
${input.reviseNote ? `- Yêu cầu chỉnh sửa thêm của giáo viên: ${input.reviseNote}` : ""}
Bối cảnh bài học: ${input.description || input.title}`;

  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
            },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) return null;
  const j: any = await res.json();
  const b64 = j?.data?.[0]?.b64_json;
  return typeof b64 === "string" ? b64 : null;
}

async function buildLesson(apiKey: string, input: GenInput) {
  const sys = `Bạn là chuyên gia thiết kế bài giảng số cho học sinh Việt Nam (lớp 6-12).
Dựa trên ẢNH vật thể và MÔ TẢ của giáo viên, hãy soạn một bài học tương tác 3D.
Trả về CHÍNH XÁC một JSON object (không markdown):
{
 "objectName": "tên vật thể",
 "summary": "tóm tắt 2-3 câu",
 "parts": [{"name":"tên bộ phận","role":"chức năng ngắn gọn"}],
 "sections": [{"heading":"tiêu đề mục","body":"nội dung 3-5 câu"}],
 "keyPoints": ["ý chính 1", "..."],
 "questions": [{"q":"câu hỏi","options":["A","B","C","D"],"answer":0,"explain":"giải thích ngắn"}]
}
Yêu cầu: 4-6 bộ phận, 3-4 sections, 4-6 keyPoints, ĐÚNG 5 câu hỏi trắc nghiệm 4 lựa chọn. Tiếng Việt, chính xác khoa học, dễ hiểu.`;

  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Tiêu đề bài học: ${input.title}\nMô tả/định hướng của giáo viên: ${input.description}${
                input.reviseNote ? `\nYêu cầu chỉnh sửa: ${input.reviseNote}` : ""
              }`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
            },
          ],
        },
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
    if (!data?.imageBase64) throw new Error("Thiếu ảnh");
    return {
      imageBase64: data.imageBase64,
      mimeType: data.mimeType || "image/png",
      title: (data.title || "").slice(0, 200),
      description: (data.description || "").slice(0, 3000),
      reviseNote: (data.reviseNote || "").slice(0, 1000),
    } as GenInput;
  })
  .handler(async ({ data }) => {
    const apiKey = key();
    const [lessonRaw, ...frames] = await Promise.all([
      buildLesson(apiKey, data),
      ...ANGLES.map((a) => renderAngle(apiKey, data, a)),
    ]);

    const lesson = lessonRaw || {};
    const questions = Array.isArray(lesson.questions) ? lesson.questions.slice(0, 8) : [];
    delete lesson.questions;

    return {
      frames: (frames as (string | null)[]).filter((f): f is string => !!f),
      angles: ANGLES,
      lesson,
      questions,
    };
  });
