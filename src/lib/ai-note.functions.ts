import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { noteInputSchema, noteOutputSchemas, type NoteInput } from "./classroom-ai";
import { requestClassroomJson } from "./classroom-ai.server";

const SYS: Record<NoteInput["mode"], string> = {
  material: `Bạn là giáo viên Việt Nam. Người dùng đánh dấu MỘT ĐIỂM trên ảnh minh hoạ và cần nội dung học liệu ngắn cho điểm đó.
Trả về CHÍNH XÁC JSON: {"title":"tên ngắn của chi tiết","content":"giải thích 2-4 câu, dễ hiểu, chính xác"}`,
  exercise: `Bạn là giáo viên Việt Nam. Người dùng đánh dấu MỘT ĐIỂM trên ảnh và cần một câu hỏi tự luận ngắn cho điểm đó.
Trả về CHÍNH XÁC JSON: {"title":"nhãn ngắn","question":"câu hỏi tự luận ngắn","expected":"đáp án gợi ý 1-3 câu"}`,
  feedback: `Bạn là giáo viên Việt Nam đang chấm bài tự luận ngắn của học sinh.
Trả về CHÍNH XÁC JSON: {"grade":"điểm dạng x/10","feedback":"nhận xét ngắn gọn, động viên, chỉ ra chỗ cần sửa"}`,
};

export const suggestNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: NoteInput) => noteInputSchema.parse(data))
  .handler(async ({ data }) => {
    const config = {
      apiKey: process.env["GROQ_CLASSROOM_API_KEY"] || "",
      model: process.env["GROQ_CLASSROOM_MODEL"] || "",
      visionModel: process.env["GROQ_CLASSROOM_VISION_MODEL"] || "",
    };

    const lines = [
      data.title ? `Chủ đề/bài học: ${data.title}` : "",
      typeof data.x === "number" ? `Vị trí điểm ghi chú trên ảnh: ${data.x}% ngang, ${data.y}% dọc.` : "",
      data.hint ? `Gợi ý của giáo viên: ${data.hint}` : "",
      data.question ? `Câu hỏi: ${data.question}` : "",
      data.expected ? `Đáp án mong đợi: ${data.expected}` : "",
      data.studentAnswer ? `Bài làm của học sinh: ${data.studentAnswer}` : "",
    ].filter(Boolean);

    const raw = await requestClassroomJson(config, SYS[data.mode], lines.join("\n") || "Hãy đề xuất nội dung phù hợp.", data);
    const result = noteOutputSchemas[data.mode].safeParse(raw);
    if (!result.success) throw new Error("AI lớp học trả về ghi chú thiếu hoặc sai cấu trúc. Vui lòng thử lại.");
    return result.data as { title?: string; content?: string; question?: string; expected?: string; grade?: string; feedback?: string };
  });
