/** Experimental scam advice from the independent Render AI API.
 * The token is read only by the server and never sent to the browser.
 * Fail closed: unavailable results must not be interpreted as safe.
 */
export type ScamMlResult = {
  status: "risk_indicated" | "uncertain" | "no_clear_sign";
  model_version: string;
  review_required: true;
};

export async function checkScamMl(text: string): Promise<ScamMlResult | null> {
  const endpoint = process.env["SCAM_API_URL"];
  const token = process.env["SCAM_API_TOKEN"];
  if (!endpoint || !token || text.length < 10 || text.length > 3000) return null;
  try {
    const url = new URL("/v1/analyze", endpoint);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Bạn là trợ lý giáo dục an toàn số cho học sinh. Phân tích dấu hiệu lừa đảo trong văn bản. Chỉ trả về JSON có trường status nhận một trong risk_indicated, uncertain, no_clear_sign; trường explanation là giải thích ngắn gọn. Không khẳng định chắc chắn an toàn khi thiếu dữ liệu." },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(95000),
      redirect: "error",
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices;
    const raw = choices?.[0]?.message?.content;
    if (typeof raw !== "string") return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const status = (parsed as { status?: unknown }).status;
    if (status !== "risk_indicated" && status !== "uncertain" && status !== "no_clear_sign") return null;
    return { status, model_version: "Render Gemini experimental", review_required: true };
  } catch {
    return null;
  }
}
