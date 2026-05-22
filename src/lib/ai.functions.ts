import { createServerFn } from "@tanstack/react-start";

export const generateOutfit = createServerFn({ method: "POST" })
  .inputValidator((data: { description: string }) => {
    if (!data?.description || typeof data.description !== "string") {
      throw new Error("description required");
    }
    return { description: data.description.slice(0, 500) };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const sys = `Bạn là nhà thiết kế nhân vật game cartoon. Dựa trên mô tả trang phục của người chơi, trả về CHÍNH XÁC một JSON object (không markdown, không giải thích) với các khoá hex màu cho nhân vật game 3D:
{"skin":"#hex","hair":"#hex","shirt":"#hex","pants":"#hex","shoes":"#hex","hat":"#hex|null","accent":"#hex"}
Chọn màu tươi sáng, hài hoà, đúng tinh thần mô tả. Trả về JSON thuần.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: data.description },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const hex = (v: any, fb: string) =>
      typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb;
    return {
      skin: hex(parsed.skin, "#fde68a"),
      hair: hex(parsed.hair, "#7c2d12"),
      shirt: hex(parsed.shirt, "#ef4444"),
      pants: hex(parsed.pants, "#1e40af"),
      shoes: hex(parsed.shoes, "#1f2937"),
      hat: typeof parsed.hat === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed.hat) ? parsed.hat : undefined,
      accent: hex(parsed.accent, "#fcd34d"),
    };
  });
