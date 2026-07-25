import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_leaderboard",
  title: "Bảng xếp hạng",
  description: "Trả về bảng xếp hạng người chơi (theo tài sản ròng / level).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Số lượng người chơi muốn lấy (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Chưa đăng nhập." }], isError: true };
    }
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa.rpc("get_leaderboard", { p_limit: limit });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { leaderboard: data ?? [] },
    };
  },
});
