import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_placed_items",
  title: "Danh sách vật đã đặt trong nhà",
  description: "Liệt kê tất cả vật thể (nội thất, cửa, cửa sổ…) mà user đang đăng nhập đã đặt trong bản đồ nhà.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Chưa đăng nhập." }], isError: true };
    }
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("placed_items")
      .select("*")
      .eq("user_id", ctx.getUserId());
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
