/** Optional experimental scam classifier, server-side only.
 * Disabled by default. Configure a trusted HTTPS endpoint and token in the server environment.
 */
export type ScamMlResult = {
  status: "risk_indicated" | "uncertain" | "no_clear_sign";
  model_version: string;
  review_required: true;
};
export async function checkScamMl(text: string): Promise<ScamMlResult | null> {
  const endpoint = process.env["SCAM_ML_API_URL"];
  const token = process.env["SCAM_ML_API_TOKEN"];
  if (!endpoint || !token || process.env["SCAM_ML_ENABLED"] !== "true") return null;
  let url: URL;
  try {
    url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
  } catch {
    return null;
  }
  if (text.length < 10 || text.length > 3000) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) return null;
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== "object") return null;
    const data = parsed as Record<string, unknown>;
    if (!["risk_indicated", "uncertain", "no_clear_sign"].includes(String(data.status))) return null;
    return {
      status: data.status as ScamMlResult["status"],
      model_version: typeof data.model_version === "string" ? data.model_version.slice(0, 80) : "unknown",
      review_required: true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
