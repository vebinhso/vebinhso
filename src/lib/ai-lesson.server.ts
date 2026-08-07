type GenInput = {
  imageBase64?: string;
  mimeType?: string;
  title: string;
  description: string;
  reviseNote?: string;
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

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

  const response = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-lite",
      messages: [{ role: "system", content: system }, { role: "user", content }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1200,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI lỗi ${response.status}: ${message.slice(0, 160)}`);
  }
  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  try {
    return JSON.parse(result.choices?.[0]?.message?.content ?? "{}");
  } catch {
    return {};
  }
}