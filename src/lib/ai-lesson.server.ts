type GenInput = {
  imageBase64?: string;
  mimeType?: string;
  title: string;
  description: string;
  reviseNote?: string;
};

const GATEWAY = "https://api.groq.com/openai/v1";

export async function buildLesson(apiKey: string, input: GenInput) {
  const system = `Bạn là chuyên gia thiết kế bài giảng số cho học sinh Việt Nam lớp 6-12.
Trả về đúng một JSON object, không markdown:
{"objectName":"chủ đề","summary":"2 câu","parts":[{"name":"ý","role":"giải thích"}],"sections":[{"heading":"mục","body":"2-3 câu"}],"keyPoints":["ý chính"],"questions":[{"q":"câu hỏi","options":["A","B","C","D"],"answer":0,"explain":"giải thích"}]}
Tạo đúng 3 parts, 2 sections, 3 keyPoints và đúng 3 câu trắc nghiệm. Viết thật ngắn gọn (mỗi trường tối đa 1-2 câu), chính xác, dễ hiểu.`;

  const content: Array<Record<string, unknown>> = [{
    type: "text",
    text: `Tiêu đề: ${input.title}\nĐịnh hướng: ${input.description}${input.reviseNote ? `\nChỉnh sửa: ${input.reviseNote}` : ""}`,
  }];
  if (input.imageBase64) {
    content.push({ type: "image_url", image_url: { url: `data:${input.mimeType || "image/jpeg"};base64,${input.imageBase64}` } });
  }

  const hasImage = Boolean(input.imageBase64);
  const model = hasImage ? process.env["GROQ_CLASSROOM_VISION_MODEL"] : process.env["GROQ_CLASSROOM_MODEL"];
  if (!model) throw new Error("Chưa cấu hình mô hình Groq phù hợp cho lớp học.");
  if (hasImage && model === "meta-llama/llama-4-scout-17b-16e-instruct") throw new Error("Mô hình đọc ảnh đã ngừng khả dụng. Vui lòng chọn mô hình hỗ trợ ảnh trong Groq.");
  const response = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: hasImage ? [{ role: "user", content: [{ type: "text", text: system }, ...content] }] : [{ role: "system", content: system }, { role: "user", content }],
      ...(!hasImage ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.3,
      max_completion_tokens: 2400,
    }),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("Groq đang giới hạn lượt yêu cầu. Vui lòng thử lại sau.");
    if (response.status === 400 || response.status === 404) throw new Error("Groq không hỗ trợ mô hình hoặc định dạng đầu vào đã chọn.");
    if (response.status === 401 || response.status === 403) throw new Error("Khóa Groq lớp học không hợp lệ hoặc không có quyền truy cập.");
    throw new Error(`Groq gặp lỗi HTTP ${response.status}.`);
  }
  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  try {
    const raw = result.choices?.[0]?.message?.content;
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
    if (!parsed || !Array.isArray(parsed.questions) || !Array.isArray(parsed.parts)) throw new Error("shape");
    return parsed;
  } catch {
    throw new Error("Groq trả về bài giảng không đúng định dạng. Vui lòng thử lại.");
  }
}