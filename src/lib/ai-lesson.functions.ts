import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

/** Các mức chất lượng mô hình 3D: số khung của vòng quay turntable. */
export type Quality = "fast" | "smooth" | "real";

const ANGLE_SETS: Record<Quality, number[]> = {
  fast: [0, 45, 90, 135, 180, 225, 270, 315],
  smooth: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
  real: [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5],
};

const MODEL_BY_QUALITY: Record<Quality, string> = {
  fast: "google/gemini-3.1-flash-lite-image",
  smooth: "google/gemini-3.1-flash-image",
  real: "google/gemini-3-pro-image",
};

type GenInput = {
  imageBase64: string; // raw base64 (không có tiền tố data:)
  mimeType: string;
  title: string;
  description: string;
  reviseNote?: string;
  quality?: Quality;
};

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("AI chưa được cấu hình");
  return k;
}

async function renderAngle(apiKey: string, input: GenInput, angle: number): Promise<string | null> {
  const quality: Quality = input.quality || "fast";
  const realism =
    quality === "real"
      ? `- Render CHÂN THẬT như ảnh chụp studio: vật liệu PBR, bề mặt có độ nhám/bóng đúng thực tế, đổ bóng mềm trên chính vật thể, độ sâu và khối rõ.`
      : `- Render 3D sạch, có khối và chiều sâu rõ ràng.`;
  const prompt = `Bạn là phần mềm dựng hình 3D. Hãy tái tạo VẬT THỂ CHÍNH trong ảnh thành MỘT MÔ HÌNH 3D và xuất ra 1 khung hình của vòng quay turntable ở góc ${angle}° quanh trục dọc (0° = đúng góc nhìn của ảnh gốc, quay theo chiều kim đồng hồ).
Yêu cầu bắt buộc (rất quan trọng để các khung ghép lại thành mô hình xoay mượt):
- Cùng MỘT mô hình duy nhất ở mọi khung: giữ nguyên hình dạng, tỉ lệ, màu sắc, vật liệu và mọi chi tiết của vật thể gốc.
- Camera CỐ ĐỊNH: cùng tiêu cự, cùng độ cao ngang tầm mắt, cùng khoảng cách; vật thể luôn nằm CHÍNH GIỮA và chiếm đúng cùng một tỉ lệ khung hình.
- Ánh sáng studio ba điểm cố định, mềm, không đổi giữa các khung.
${realism}
- Nền TRẮNG trơn tuyệt đối, không bóng đổ nền, không sàn, không đạo cụ, không hậu cảnh.
- Ảnh vuông, render sạch, chi tiết giải phẫu/cấu tạo chính xác khoa học.
- TUYỆT ĐỐI KHÔNG có chữ, số, mũi tên, watermark hay nhãn trong ảnh.
${input.reviseNote ? `- Yêu cầu chỉnh sửa thêm của giáo viên: ${input.reviseNote}` : ""}
Bối cảnh bài học: ${input.description || input.title}`;


  const model = MODEL_BY_QUALITY[quality];
  const body =
    quality === "fast"
      ? {
          model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }
      : {
          model,
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
        };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${GATEWAY}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        return null;
      }
      const j: any = await res.json();
      const b64 =
        j?.data?.[0]?.b64_json ??
        j?.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(",")[1];
      if (typeof b64 === "string") return b64;

    } catch {
      /* thử lại */
    }
  }
  return null;
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

    const pairs = (frames as (string | null)[])
      .map((f, i) => ({ f, a: ANGLES[i] }))
      .filter((p): p is { f: string; a: number } => !!p.f);

    return {
      frames: pairs.map((p) => p.f),
      angles: pairs.map((p) => p.a),
      lesson,
      questions,
    };
  });
