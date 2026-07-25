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
  name: "get_profile",
  title: "Lấy hồ sơ người chơi",
  description: "Trả về hồ sơ (username, display name, avatar) của user đang đăng nhập.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Chưa đăng nhập." }], isError: true };
    }
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("profiles")
      .select("username, display_name, avatar_url, created_at")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? {}, null, 2) }],
      structuredContent: { profile: data },
    };
  },
});
