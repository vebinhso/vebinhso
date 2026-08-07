import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

type NoteInput = {
  mode: "material" | "exercise" | "feedback";
  imageBase64?: string;
  mimeType?: string;
  title?: string;
  hint?: string;
  /** Vị trí chấm ghi chú trên ảnh (theo %) để AI biết đang nói về vùng nào */
  x?: number;
  y?: number;
  question?: string;
  expected?: string;
  studentAnswer?: string;
};

const SYS: Record<NoteInput["mode"], string> = {
  material: `Bạn là giáo viên Việt Nam. Người dùng đánh dấu MỘT ĐIỂM trên ảnh minh hoạ và cần nội dung học liệu ngắn cho điểm đó.
Trả về CHÍNH XÁC JSON: {"title":"tên ngắn của chi tiết","content":"giải thích 2-4 câu, dễ hiểu, chính xác"}`,
  exercise: `Bạn là giáo viên Việt Nam. Người dùng đánh dấu MỘT ĐIỂM trên ảnh và cần một câu hỏi tự luận ngắn cho điểm đó.
Trả về CHÍNH XÁC JSON: {"title":"nhãn ngắn","question":"câu hỏi tự luận ngắn","expected":"đáp án gợi ý 1-3 câu"}`,
  feedback: `Bạn là giáo viên Việt Nam đang chấm bài tự luận ngắn của học sinh.
Trả về CHÍNH XÁC JSON: {"grade":"điểm dạng x/10","feedback":"nhận xét ngắn gọn, động viên, chỉ ra chỗ cần sửa"}`,
};

export const suggestNote = createServerFn({ method: "POST" })
  .inputValidator((data: NoteInput) => {
    if (!data?.mode) throw new Error("Thiếu chế độ");
    return {
      mode: data.mode,
      imageBase64: data.imageBase64 || undefined,
      mimeType: data.mimeType || "image/jpeg",
      title: (data.title || "").slice(0, 200),
      hint: (data.hint || "").slice(0, 1500),
      x: typeof data.x === "number" ? Math.round(data.x) : undefined,
      y: typeof data.y === "number" ? Math.round(data.y) : undefined,
      question: (data.question || "").slice(0, 1000),
      expected: (data.expected || "").slice(0, 1500),
      studentAnswer: (data.studentAnswer || "").slice(0, 3000),
    } as NoteInput;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI chưa được cấu hình");

    const lines = [
      data.title ? `Chủ đề/bài học: ${data.title}` : "",
      typeof data.x === "number" ? `Vị trí điểm ghi chú trên ảnh: ${data.x}% ngang, ${data.y}% dọc.` : "",
      data.hint ? `Gợi ý của giáo viên: ${data.hint}` : "",
      data.question ? `Câu hỏi: ${data.question}` : "",
      data.expected ? `Đáp án mong đợi: ${data.expected}` : "",
      data.studentAnswer ? `Bài làm của học sinh: ${data.studentAnswer}` : "",
    ].filter(Boolean);

    const content: any[] = [{ type: "text", text: lines.join("\n") || "Hãy đề xuất nội dung phù hợp." }];
    if (data.imageBase64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` },
      });
    }

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        max_tokens: 900,
        messages: [
          { role: "system", content: SYS[data.mode] },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("AI đang quá tải, thử lại sau ít phút nhé.");
      if (res.status === 402) throw new Error("Hết tín dụng AI của không gian làm việc.");
      throw new Error(`AI lỗi ${res.status}: ${t.slice(0, 160)}`);
    }
    const j: any = await res.json();
    try {
      return JSON.parse(j?.choices?.[0]?.message?.content ?? "{}") as {
        title?: string;
        content?: string;
        question?: string;
        expected?: string;
        grade?: string;
        feedback?: string;
      };
    } catch {
      return {};
    }
  });
