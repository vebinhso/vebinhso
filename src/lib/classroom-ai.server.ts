import { classroomModel, parseClassroomJson, type ClassroomAiConfig } from "./classroom-ai";

type ImageInput = { imageBase64?: string; mimeType?: string };

/** Shared by classroom features only; no Gateway and no provider fallback. */
export async function requestClassroomJson(
  config: ClassroomAiConfig,
  system: string,
  prompt: string,
  image: ImageInput,
) {
  const hasImage = Boolean(image.imageBase64);
  const model = classroomModel(config, hasImage);
  // Vision models may reject system+image combinations or JSON response_format.
  // Put instructions in the user message for vision, then validate JSON ourselves.
  const content: Array<Record<string, unknown>> = [{
    type: "text",
    text: hasImage ? `${system}\n\n${prompt}` : prompt,
  }];
  if (hasImage) content.push({
    type: "image_url",
    image_url: { url: `data:${image.mimeType || "image/jpeg"};base64,${image.imageBase64}` },
  });

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model,
        messages: hasImage
          ? [{ role: "user", content }]
          : [{ role: "system", content: system }, { role: "user", content }],
        ...(!hasImage ? { response_format: { type: "json_object" } } : {}),
        temperature: 0.3,
        max_completion_tokens: 2400,
      }),
    });
  } catch {
    throw new Error("Không kết nối được AI lớp học. Vui lòng thử lại sau.");
  }
  // Never log/return raw provider bodies: they may contain request details.
  if (!response.ok) {
    let category = "other";
    try {
      const body = await response.json() as { error?: { code?: unknown } };
      const code = body.error?.code;
      if (typeof code === "string" && ["model_not_found", "model_decommissioned", "invalid_api_key", "json_validate_failed", "rate_limit_exceeded"].includes(code)) category = code;
    } catch { /* Body details intentionally discarded. */ }
    console.warn("[Classroom Groq] request rejected", { status: response.status, category });
    if (response.status === 401 || response.status === 403) throw new Error("Groq chưa chấp nhận cấu hình AI lớp học. Chủ dự án cần kiểm tra Secrets.");
    if (response.status === 429) throw new Error("Groq đang giới hạn lượt AI lớp học. Vui lòng thử lại sau.");
    if (response.status === 400 || response.status === 404) throw new Error("Groq chưa chấp nhận model hoặc ảnh của AI lớp học. Chủ dự án cần kiểm tra cấu hình model.");
    throw new Error("Dịch vụ AI lớp học tạm thời không khả dụng. Vui lòng thử lại sau.");
  }
  let result: { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> };
  try {
    result = await response.json();
  } catch {
    throw new Error("AI lớp học trả về phản hồi không hợp lệ. Vui lòng thử lại.");
  }
  const choice = result.choices?.[0];
  if (choice?.finish_reason === "length") throw new Error("Nội dung AI lớp học chưa hoàn tất. Vui lòng thử lại với yêu cầu ngắn hơn.");
  return parseClassroomJson(choice?.message?.content);
}