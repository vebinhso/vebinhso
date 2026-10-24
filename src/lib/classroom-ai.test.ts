import { afterEach, describe, expect, it, vi } from "vitest";
import { classroomModel, lessonOutputSchema, noteInputSchema, parseClassroomJson } from "./classroom-ai";
import { requestClassroomJson } from "./classroom-ai.server";

// Synthetic fixtures only; never use real environment values in test output.
const config = { apiKey: "test-only-not-a-credential", model: "text-fixture", visionModel: "vision-fixture" };
afterEach(() => vi.unstubAllGlobals());

describe("classroom provider isolation", () => {
  it("selects text and vision independently", () => {
    expect(classroomModel(config, false)).toBe("text-fixture");
    expect(classroomModel(config, true)).toBe("vision-fixture");
    expect(() => classroomModel({ ...config, visionModel: "" }, true)).toThrow();
  });
  it("sends text only to Groq with JSON mode", async () => {
    const mocked = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
      const body = JSON.parse(String(init.body));
      expect(body.model).toBe("text-fixture");
      expect(body.response_format).toEqual({ type: "json_object" });
      return Response.json({ choices: [{ message: { content: '{"title":"Cây"}' } }] });
    });
    vi.stubGlobal("fetch", mocked);
    expect(await requestClassroomJson(config, "Return JSON", "Cây", {})).toEqual({ title: "Cây" });
    expect(mocked).toHaveBeenCalledTimes(1);
  });
  it("sends a data image to the configured vision model without unsupported system/JSON settings", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.model).toBe("vision-fixture");
      expect(body.response_format).toBeUndefined();
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe("user");
      expect(body.messages[0].content[1].image_url.url).toBe("data:image/png;base64,YQ==");
      return Response.json({ choices: [{ message: { content: '```json\n{"title":"Cây"}\n```' } }] });
    }));
    expect(await requestClassroomJson(config, "Return JSON", "Cây", { imageBase64: "YQ==", mimeType: "image/png" })).toEqual({ title: "Cây" });
  });
  it("never propagates provider response details", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("PRIVATE_PROVIDER_DETAIL", { status: 401 })));
    await expect(requestClassroomJson(config, "JSON", "Cây", {})).rejects.toThrow("Groq chưa chấp nhận cấu hình");
  });
  it("rejects truncated or malformed output rather than saving empty content", async () => {
    expect(() => parseClassroomJson("not json")).toThrow();
    expect(lessonOutputSchema.safeParse({}).success).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ choices: [{ finish_reason: "length", message: { content: "{}" } }] })));
    await expect(requestClassroomJson(config, "JSON", "Cây", {})).rejects.toThrow("chưa hoàn tất");
  });
  it("validates note mode and supported image types", () => {
    expect(noteInputSchema.safeParse({ mode: "feedback" }).success).toBe(true);
    expect(noteInputSchema.safeParse({ mode: "other" }).success).toBe(false);
    expect(noteInputSchema.safeParse({ mode: "material", mimeType: "image/svg+xml" }).success).toBe(false);
  });
});