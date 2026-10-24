import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://api.groq.com/openai/v1";

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
  material: `Bạn là giáo viên Việt Nam. Người dùng đánh dấu một điểm trên ảnh, nhưng bạn CHỈ có văn bản OCR toàn ảnh, không có thông tin hình ảnh tại điểm đó. Không đoán chi tiết tại vị trí đánh dấu. Chỉ viết nội dung học liệu dựa trên chữ OCR và gợi ý của giáo viên.
Trả về CHÍNH XÁC JSON: {"title":"tên ngắn của chi tiết","content":"giải thích 2-4 câu, dễ hiểu, chính xác"}`,
  exercise: `Bạn là giáo viên Việt Nam. Người dùng đánh dấu một điểm trên ảnh, nhưng bạn CHỈ có văn bản OCR toàn ảnh. Không suy đoán nội dung hình ảnh tại điểm đánh dấu. Hãy tạo câu hỏi từ chữ OCR và gợi ý của giáo viên.
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
    const apiKey = process.env["GROQ_CLASSROOM_API_KEY"];
    if (!apiKey) throw new Error("AI chưa được cấu hình");

    const model = data.imageBase64 ? process.env["GROQ_CLASSROOM_VISION_MODEL"] : process.env["GROQ_CLASSROOM_MODEL"];
    if (!model) throw new Error("Chưa cấu hình mô hình Groq phù hợp cho ghi chú lớp học.");
    if (data.imageBase64 && model === "meta-llama/llama-4-scout-17b-16e-instruct") throw new Error("Mô hình đọc ảnh đã ngừng khả dụng. Vui lòng chọn mô hình Groq hỗ trợ ảnh.");

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
        model,
        max_completion_tokens: 900,
        messages: data.imageBase64
          ? [{ role: "user", content: [{ type: "text", text: SYS[data.mode] }, ...content] }]
          : [{ role: "system", content: SYS[data.mode] }, { role: "user", content }],
        ...(!data.imageBase64 ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("AI đang quá tải, thử lại sau ít phút nhé.");
      if (res.status === 402) throw new Error("Dịch vụ AI lớp học hết tín dụng.");
      if (res.status === 400 || res.status === 404) throw new Error("Groq không hỗ trợ mô hình hoặc định dạng đầu vào đã chọn.");
      if (res.status === 401 || res.status === 403) throw new Error("Khóa Groq lớp học không hợp lệ hoặc không có quyền truy cập.");
      throw new Error(`Groq gặp lỗi HTTP ${res.status}.`);
    }
    const j: any = await res.json();
    try {
      const raw = j?.choices?.[0]?.message?.content;
      if (!raw) throw new Error("empty");
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
      return parsed as {
        title?: string;
        content?: string;
        question?: string;
        expected?: string;
        grade?: string;
        feedback?: string;
      };
    } catch {
      throw new Error("Groq trả về ghi chú không đúng định dạng. Vui lòng thử lại.");
    }
  });
