import { createServerFn } from "@tanstack/react-start";

/** Text-to-speech for the interactive film. Returns base64 mp3. */
export const speakLine = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; voice?: string }) => {
    if (!data?.text || typeof data.text !== "string") throw new Error("text required");
    return {
      text: data.text.slice(0, 600),
      voice: typeof data.voice === "string" ? data.voice.slice(0, 20) : "alloy",
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: data.voice,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`TTS error ${res.status}: ${t.slice(0, 200)}`);
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
