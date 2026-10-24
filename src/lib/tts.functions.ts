import { createServerFn } from "@tanstack/react-start";

/** No paid TTS gateway: the client can use its existing browser speech fallback. */
export const speakLine = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; voice?: string; instructions?: string; speed?: number; locale?: "vi" | "en" }) => {
    if (!data?.text || typeof data.text !== "string") throw new Error("text required");
    return { text: data.text.slice(0, 600), locale: data.locale === "en" ? "en" as const : "vi" as const };
  })
  .handler(async () => ({ audio: "", error: "Use browser speech synthesis" }));
