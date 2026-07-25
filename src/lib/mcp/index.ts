import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get-profile";
import getGameStateTool from "./tools/get-game-state";
import getLeaderboardTool from "./tools/get-leaderboard";
import listFriendsTool from "./tools/list-friends";
import listPlacedItemsTool from "./tools/list-placed-items";

// Direct Supabase host (not the .lovable.cloud proxy) — mcp-js rejects a mismatched issuer.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ve-binh-so-mcp",
  title: "Vệ Binh Số",
  version: "0.1.0",
  instructions:
    "Các tool cho ứng dụng học tập/game Vệ Binh Số. Dùng để đọc hồ sơ, trạng thái game, bảng xếp hạng, bạn bè và nội thất đã đặt của người chơi đang đăng nhập.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfileTool,
    getGameStateTool,
    getLeaderboardTool,
    listFriendsTool,
    listPlacedItemsTool,
  ],
});
