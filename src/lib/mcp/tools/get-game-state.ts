import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_game_state",
  title: "Lấy trạng thái game",
  description:
    "Trả về trạng thái game của người chơi đang đăng nhập: tiền, level, tài sản ròng, số câu đúng, streak, vật liệu xây (gạch, bê tông, ngói).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Chưa đăng nhập." }], isError: true };
    }
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("game_state")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? {}, null, 2) }],
      structuredContent: { gameState: data },
    };
  },
});
