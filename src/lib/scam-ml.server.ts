/** Scam advisory from the production Render V2 classification API.
 * The token is read only by the server and never sent to the browser.
 * Fail closed: unavailable results must not be interpreted as safe.
 */
export type ScamMlResult = {
  status: "risk_indicated" | "uncertain" | "no_clear_sign";
  model_version: string;
  review_required: true;
};

export async function checkScamMl(text: string): Promise<ScamMlResult | null> {
  const endpoint = process.env["AI_V2_API_URL"] || "https://vebinhso-ai-v2.onrender.com";
  const token = process.env["AI_V2_API_TOKEN"] || process.env["SCAM_API_TOKEN"];
  if (!endpoint || !token || text.length < 10 || text.length > 3000) return null;
  try {
    const url = new URL("/classify", endpoint);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) return null;
    const payload = await response.json() as { status?: string; model_version?: string };
    const status = payload?.status;
    if (status !== "risk_indicated" && status !== "uncertain" && status !== "no_clear_sign") return null;
    return { status, model_version: payload.model_version || "Vệ Binh Số AI V2", review_required: true };
  } catch {
    return null;
  }
}
