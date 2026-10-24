import { lessonOutputSchema, type ClassroomAiConfig, type LessonInput } from "./classroom-ai";
import { requestClassroomJson } from "./classroom-ai.server";

export async function buildLesson(config: ClassroomAiConfig, input: LessonInput) {
  const system = `Bạn là chuyên gia thiết kế bài giảng số cho học sinh Việt Nam lớp 6-12.
Trả về đúng một JSON object, không markdown:
{"objectName":"chủ đề","summary":"2 câu","parts":[{"name":"ý","role":"giải thích"}],"sections":[{"heading":"mục","body":"2-3 câu"}],"keyPoints":["ý chính"],"questions":[{"q":"câu hỏi","options":["A","B","C","D"],"answer":0,"explain":"giải thích"}]}
Tạo đúng 3 parts, 2 sections, 3 keyPoints và đúng 3 câu trắc nghiệm. Viết thật ngắn gọn (mỗi trường tối đa 1-2 câu), chính xác, dễ hiểu.`;

  const raw = await requestClassroomJson(config, system,
    `Tiêu đề: ${input.title}\nĐịnh hướng: ${input.description}${input.reviseNote ? `\nChỉnh sửa: ${input.reviseNote}` : ""}`, input);
  const result = lessonOutputSchema.safeParse(raw);
  if (!result.success) throw new Error("AI lớp học trả về bài học thiếu hoặc sai cấu trúc. Vui lòng thử lại.");
  return result.data;
}