import { createServerFn } from "@tanstack/react-start";

/** Text-to-speech for the interactive film. Returns base64 mp3. */
export const speakLine = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; voice?: string; instructions?: string; speed?: number }) => {
    if (!data?.text || typeof data.text !== "string") throw new Error("text required");
    return {
      text: data.text.slice(0, 600),
      voice: typeof data.voice === "string" ? data.voice.slice(0, 20) : "alloy",
      instructions: typeof data.instructions === "string" ? data.instructions.slice(0, 400) : undefined,
      speed: typeof data.speed === "number" ? Math.min(2, Math.max(0.5, data.speed)) : undefined,
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    // Không ném lỗi: phim vẫn chạy với phụ đề (và giọng đọc của trình duyệt) khi TTS lỗi.
    if (!apiKey) return { audio: "", error: "AI not configured" };

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini-tts",
          input: data.text,
          voice: data.voice,
          ...(data.instructions ? { instructions: data.instructions } : {}),
          ...(data.speed ? { speed: data.speed } : {}),
          response_format: "mp3",
        }),
      });
    } catch {
      return { audio: "", error: "TTS network error" };
    }

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`TTS error ${res.status}: ${t.slice(0, 200)}`);
      return {
        audio: "",
        error:
          res.status === 402 || res.status === 403
            ? "Hết tín dụng AI — tạm thời không có lồng tiếng."
            : `TTS error ${res.status}`,
      };
    }

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return { audio: btoa(bin) };
  });
