import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/project-code-guide")({
  head: () => ({
    meta: [
      { title: "Project Code Guide — Vệ binh số" },
      { name: "description", content: "Xem và tải toàn bộ source code của dự án dưới dạng .md" },
    ],
  }),
  component: ProjectCodeGuidePage,
});

// Bundle toàn bộ source code tại build time
const srcFiles = import.meta.glob(
  [
    "/src/**/*.{ts,tsx,js,jsx,css,md,json,html}",
    "!/src/routeTree.gen.ts",
    "!/src/**/*.gen.ts",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const rootFiles = import.meta.glob(
  "/*.{json,js,ts,mjs,cjs,md,toml,jsonc,yaml,yml,html}",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const supabaseFiles = import.meta.glob("/supabase/**/*.{toml,sql,ts,js,md}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const publicFiles = import.meta.glob("/public/**/*.{html,txt,md,json,svg}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function langFromPath(p: string): string {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "ts",
    tsx: "tsx",
    js: "js",
    jsx: "jsx",
    css: "css",
    md: "md",
    json: "json",
    jsonc: "json",
    toml: "toml",
    yaml: "yaml",
    yml: "yaml",
    html: "html",
    sql: "sql",
    svg: "xml",
    txt: "",
  };
  return map[ext] ?? "";
}

function buildMarkdown(allFiles: Record<string, string>): string {
  const paths = Object.keys(allFiles)
    .filter((p) => !p.includes("routeTree.gen"))
    .sort((a, b) => a.localeCompare(b));

  const lines: string[] = [];
  lines.push("# Project Code Guide — Vệ binh số");
  lines.push("");
  lines.push(`> Xuất tự động lúc ${new Date().toISOString()}`);
  lines.push(`> Tổng số file: **${paths.length}**`);
  lines.push("");
  lines.push("## Mục lục");
  lines.push("");
  for (const p of paths) {
    const anchor = p.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    lines.push(`- [\`${p.replace(/^\//, "")}\`](#${anchor})`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const p of paths) {
    const anchor = p.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const lang = langFromPath(p);
    lines.push(`<a id="${anchor}"></a>`);
    lines.push(`## \`${p.replace(/^\//, "")}\``);
    lines.push("");
    lines.push("```" + lang);
    lines.push((allFiles[p] ?? "").replace(/\r\n/g, "\n").trimEnd());
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

type HookDetail = {
  task: string;
  codeExplain: string;
  relations: string;
  related: string[];
  deps: string[];
  returns: string;
  trigger: string;
};

type HookInfo = {
  name: string;
  definedIn: string;
  usedIn: string[];
  detail: HookDetail;
};

const HOOK_DETAILS: Record<string, HookDetail> = {
  useAuthSync: {
    task:
      "Đồng bộ trạng thái đăng nhập Supabase với toàn app: hydrate user cache và làm mới router/query khi auth thay đổi.",
    codeExplain:
      "Trong useEffect đăng ký supabase.auth.onAuthStateChange. Nếu session = null → setCurrentUserCache(null) + resetGameCacheForLogout(). Nếu có session → setTimeout(0) gọi hydrateFromSession() (deferred để tránh đệ quy Supabase). Sau mỗi event đều router.invalidate() và queryClient.invalidateQueries() để UI fetch lại. Khi mount cũng gọi hydrateFromSession() lần đầu. Cleanup unsubscribe khi unmount.",
    relations:
      "Cầu nối giữa Supabase Auth ↔ TanStack Router ↔ TanStack Query ↔ cache trong @/lib/auth và @/lib/game. Mount duy nhất 1 lần trong AuthSyncBridge của __root.tsx nên ảnh hưởng toàn bộ app.",
    related: [
      "src/routes/__root.tsx (AuthSyncBridge gọi hook)",
      "src/integrations/supabase/client.ts",
      "src/lib/auth.ts (hydrateFromSession, setCurrentUserCache)",
      "src/lib/game.ts (resetGameCacheForLogout)",
      "src/lib/session.ts (startSessionTracker chạy song song)",
    ],
    deps: [
      "useEffect (React)",
      "useRouter (@tanstack/react-router)",
      "useQueryClient (@tanstack/react-query)",
      "supabase.auth.onAuthStateChange",
    ],
    returns: "void (side-effect hook).",
    trigger:
      "Mount 1 lần trong <AuthSyncBridge/>; tự kích hoạt lại mỗi khi user đăng nhập / đăng xuất / refresh token.",
  },
  useIsMobile: {
    task:
      "Phát hiện viewport mobile (<768px) bằng matchMedia để render UI responsive theo cách thuần JS thay vì chỉ dựa vào Tailwind.",
    codeExplain:
      "State isMobile khởi tạo undefined. useEffect tạo MediaQueryList max-width: 767px, đăng ký 'change' → setIsMobile(window.innerWidth < 768). Set lần đầu ngay sau mount. Cleanup removeEventListener. Return !!isMobile để luôn trả boolean (tránh undefined gây flicker render đầu).",
    relations:
      "Hook tiện ích thuần UI, không phụ thuộc auth/store. Dùng bởi component dùng chung như sidebar/drawer/dialog để chọn layout mobile vs desktop. Hiện chủ yếu phục vụ sidebar của shadcn/ui.",
    related: [
      "src/components/ui/sidebar.tsx (consumer điển hình)",
      "src/styles.css (breakpoint Tailwind md:768px tương ứng)",
    ],
    deps: ["React.useState", "React.useEffect", "window.matchMedia"],
    returns: "boolean — true nếu width < 768px.",
    trigger:
      "Mỗi component gọi hook sẽ subscribe; cập nhật mỗi khi user resize cửa sổ hoặc xoay thiết bị.",
  },
};

function defaultDetail(name: string, definedIn: string): HookDetail {
  return {
    task: `Custom hook ${name} — chưa có mô tả chi tiết. Xem trực tiếp ${definedIn.replace(/^\//, "")}.`,
    codeExplain: "—",
    relations: "—",
    related: [definedIn.replace(/^\//, "")],
    deps: [],
    returns: "—",
    trigger: "—",
  };
}

function buildHookTable(files: Record<string, string>): HookInfo[] {
  const defRegex = /export\s+(?:function|const)\s+(use[A-Z]\w*)/g;
  const defs = new Map<string, string>();
  for (const [path, src] of Object.entries(files)) {
    if (!/\.(ts|tsx)$/.test(path)) continue;
    for (const m of src.matchAll(defRegex)) {
      if (!defs.has(m[1])) defs.set(m[1], path);
    }
  }
  const hooks: HookInfo[] = [];
  for (const [name, definedIn] of defs.entries()) {
    const usedIn: string[] = [];
    const useRegex = new RegExp(`\\b${name}\\b`);
    for (const [path, src] of Object.entries(files)) {
      if (path === definedIn) continue;
      if (!/\.(ts|tsx)$/.test(path)) continue;
      if (useRegex.test(src)) usedIn.push(path);
    }
    hooks.push({
      name,
      definedIn,
      usedIn,
      detail: HOOK_DETAILS[name] ?? defaultDetail(name, definedIn),
    });
  }
  hooks.sort((a, b) => a.name.localeCompare(b.name));
  return hooks;
}

// ============ FILE ANALYSIS ============

type FileDetail = {
  task: string;
  role: string;
  codeExplain: string;
  relations: string;
};

const FILE_DETAILS: Record<string, FileDetail> = {
  "src/router.tsx": {
    task: "Khởi tạo TanStack Router với QueryClient context.",
    role: "Bootstrap router của toàn app.",
    codeExplain:
      "Tạo QueryClient mới cho mỗi request, build router từ routeTree.gen.ts, gắn context { queryClient } để loader/route truy cập.",
    relations:
      "Được src/start.ts và SSR entry dùng. Cung cấp context cho mọi route + useRouter trong components.",
  },
  "src/start.ts": {
    task: "Cấu hình TanStack Start (middleware client/server).",
    role: "Entry-point startup của Start framework.",
    codeExplain:
      "Đăng ký requestMiddleware (errorMiddleware) và functionMiddleware (attachSupabaseAuth) để mỗi serverFn tự gắn Bearer token Supabase.",
    relations:
      "Liên kết với @/integrations/supabase/auth-attacher, @/lib/error-capture. Mọi createServerFn dùng requireSupabaseAuth đều phụ thuộc file này.",
  },
  "src/server.ts": {
    task: "Server entry cho SSR/Worker runtime.",
    role: "Handler HTTP cấp cao nhất.",
    codeExplain: "Khởi tạo handler từ Start, trả về fetch handler cho Cloudflare Worker.",
    relations: "Dùng router từ src/router.tsx; deploy qua wrangler.jsonc.",
  },
  "src/routes/__root.tsx": {
    task: "Root layout: HTML shell + providers toàn cục.",
    role: "Layout cha của mọi route.",
    codeExplain:
      "Định nghĩa head() (meta, font Montserrat, styles.css), shellComponent (html/body), RootComponent (QueryClientProvider + AuthSyncBridge + <Outlet/>). AuthSyncBridge gọi useAuthSync + startSessionTracker.",
    relations:
      "Wrap tất cả routes. Phụ thuộc @/hooks/use-auth-sync, @/lib/session, @tanstack/react-query.",
  },
  "src/routes/index.tsx": {
    task: "Trang chủ /.",
    role: "Landing page.",
    codeExplain: "Render menu chính dẫn vào game, character, missions...",
    relations: "Link đến hầu hết route con qua <Link>.",
  },
  "src/routes/game.tsx": {
    task: "Trang game chính: build/place nội thất + tường + mái + sàn.",
    role: "Core gameplay screen.",
    codeExplain:
      "Quản lý state placedItems, wallMode/roofMode/floorMode, picks (4 cột), inventory, money. Khi đủ 4 cột thì gọi addSegment để tạo Wall/Roof/Floor. Floor chỉ cho phép xây mái khi tầng đã có ít nhất 1 sàn. Render GameWorld 3D.",
    relations:
      "Phụ thuộc @/lib/game (PlacedItem, WallSegment, RoofSegment, FloorSegment, save/load), @/game/GameWorld, @/game/catalog. State đồng bộ với Supabase qua game.ts.",
  },
  "src/routes/login.tsx": {
    task: "Form đăng nhập/đăng ký Supabase.",
    role: "Auth entry.",
    codeExplain:
      "Email+password signInWithPassword/signUp; nút Google OAuth; redirect về '/' sau khi thành công. useAuthSync sẽ tự hydrate cache.",
    relations: "Gọi supabase.auth từ @/integrations/supabase/client. Liên kết auth.callback.tsx.",
  },
  "src/routes/auth.callback.tsx": {
    task: "Xử lý callback OAuth/Magic Link.",
    role: "Trang trung gian auth.",
    codeExplain: "Đọc session từ URL hash, exchange token, redirect về /.",
    relations: "Supabase OAuth provider (Google).",
  },
  "src/routes/reset-password.tsx": {
    task: "Form đặt lại mật khẩu.",
    role: "Auth recovery.",
    codeExplain: "Gọi supabase.auth.updateUser({ password }) sau khi user click link reset.",
    relations: "Supabase Auth.",
  },
  "src/routes/verify.tsx": {
    task: "Trang xác nhận email.",
    role: "Hiển thị trạng thái verify.",
    codeExplain: "Đọc query param và hiển thị thông báo thành công/lỗi.",
    relations: "Supabase email confirm flow.",
  },
  "src/routes/character.tsx": {
    task: "Tùy chỉnh nhân vật (avatar, name, theme).",
    role: "Profile page.",
    codeExplain: "Form cập nhật @/lib/character; lưu xuống Supabase profiles table.",
    relations: "@/lib/character, @/lib/auth.",
  },
  "src/routes/chat.tsx": {
    task: "Chat với AI (Lovable AI Gateway).",
    role: "AI assistant.",
    codeExplain: "Gửi tin nhắn qua serverFn @/lib/ai.functions; stream phản hồi.",
    relations: "@/lib/ai.functions, gemini/gpt-5 models.",
  },
  "src/routes/missions.tsx": {
    task: "Danh sách nhiệm vụ học tập.",
    role: "Quest list.",
    codeExplain: "Đọc missions từ game state, hiển thị tiến độ, mở QuestionView.",
    relations: "@/game/questions, @/game/QuestionView.",
  },
  "src/routes/inventory.tsx": {
    task: "Kho đồ của user.",
    role: "Inventory screen.",
    codeExplain: "List item từ game state, cho phép trang bị/sử dụng.",
    relations: "@/lib/game, @/game/catalog.",
  },
  "src/routes/shop.tsx": {
    task: "Cửa hàng vật phẩm.",
    role: "Buy items.",
    codeExplain: "List catalog, trừ tiền khi mua, đẩy vào inventory.",
    relations: "@/game/catalog, @/lib/game.",
  },
  "src/routes/pets.tsx": {
    task: "Quản lý thú cưng.",
    role: "Pet collection.",
    codeExplain: "List pets owned, model 3D preview qua PetModels.",
    relations: "@/game/PetModels.",
  },
  "src/routes/play.tsx": {
    task: "Minigame mở rộng (stage2).",
    role: "Additional gameplay.",
    codeExplain: "Render stage2/stage2rooms tùy chế độ.",
    relations: "@/game/stage2, @/game/stage2rooms.",
  },
  "src/routes/ranking.tsx": {
    task: "Bảng xếp hạng người chơi.",
    role: "Leaderboard.",
    codeExplain: "Query top users theo điểm/level từ Supabase.",
    relations: "@/integrations/supabase/client.",
  },
  "src/routes/events.tsx": {
    task: "Sự kiện trong game.",
    role: "Events feed.",
    codeExplain: "List events đang/đã diễn ra.",
    relations: "@/lib/game.",
  },
  "src/routes/magic.tsx": {
    task: "Power-ups & ma thuật.",
    role: "Special abilities.",
    codeExplain: "Liệt kê powers từ @/lib/powers, cho phép kích hoạt.",
    relations: "@/lib/powers.",
  },
  "src/routes/tutorial.tsx": {
    task: "Hướng dẫn người chơi mới.",
    role: "Onboarding.",
    codeExplain: "Slide hướng dẫn từng bước.",
    relations: "Liên kết tới /game khi hoàn thành.",
  },
  "src/routes/admin.tsx": {
    task: "Trang admin (quản lý user, content).",
    role: "Admin dashboard.",
    codeExplain: "Check has_role('admin') trước khi render. CRUD qua serverFn.",
    relations: "@/lib/admin, @/lib/claims, RLS policies.",
  },
  "src/routes/project-code-guide.tsx": {
    task: "Trang xem & tải toàn bộ source code dưới dạng .md.",
    role: "Documentation viewer.",
    codeExplain:
      "Dùng import.meta.glob (?raw, eager) bundle mọi file lúc build. Phân tích hooks + files tự động (regex export/import). Render bảng chi tiết + cho phép tải .md.",
    relations: "Đứng độc lập, không phụ thuộc backend.",
  },
  "src/hooks/use-auth-sync.ts": {
    task: "Custom hook sync Supabase auth ↔ router/query.",
    role: "Auth bridge hook.",
    codeExplain: "Xem bảng Hooks ở mục 1.",
    relations: "Dùng ở __root.tsx.",
  },
  "src/hooks/use-mobile.tsx": {
    task: "Hook detect viewport mobile.",
    role: "Responsive helper.",
    codeExplain: "Xem bảng Hooks ở mục 1.",
    relations: "Dùng trong components/ui/sidebar.",
  },
  "src/lib/auth.ts": {
    task: "Cache user hiện tại + hydrate từ Supabase session.",
    role: "Auth state module (không phải hook).",
    codeExplain:
      "Lưu currentUser trong module-level cache; hydrateFromSession() gọi supabase.auth.getUser + load profile; setCurrentUserCache để useAuthSync xóa cache khi logout.",
    relations: "Dùng bởi use-auth-sync, mọi route cần user info.",
  },
  "src/lib/game.ts": {
    task: "Domain logic game: types (PlacedItem, WallSegment, RoofSegment, FloorSegment), save/load Supabase, resetGameCacheForLogout.",
    role: "Core game state module.",
    codeExplain:
      "Định nghĩa schema item/wall/roof/floor; serializer; serverFn lưu/đọc từ bảng game_states; cache local để giảm fetch.",
    relations: "Dùng bởi game.tsx, GameWorld, inventory, shop, missions.",
  },
  "src/lib/session.ts": {
    task: "Track session online + heartbeat.",
    role: "Telemetry.",
    codeExplain: "startSessionTracker setInterval ping Supabase để cập nhật last_seen.",
    relations: "Gọi từ __root AuthSyncBridge.",
  },
  "src/lib/character.ts": {
    task: "CRUD profile/character (tên, avatar, theme).",
    role: "Profile module.",
    codeExplain: "ServerFn đọc/ghi bảng profiles.",
    relations: "character.tsx.",
  },
  "src/lib/admin.ts": {
    task: "Helper kiểm tra/admin operations.",
    role: "Admin module.",
    codeExplain: "Kiểm has_role('admin') qua RPC.",
    relations: "admin.tsx.",
  },
  "src/lib/claims.ts": {
    task: "Đọc JWT claims (role) từ session.",
    role: "Auth claims helper.",
    codeExplain: "Decode access_token, extract custom claims.",
    relations: "admin.ts.",
  },
  "src/lib/friends.ts": {
    task: "Quản lý bạn bè (add, remove, list).",
    role: "Social module.",
    codeExplain: "ServerFn CRUD bảng friendships.",
    relations: "Dùng ở character/ranking.",
  },
  "src/lib/powers.ts": {
    task: "Định nghĩa danh sách power-ups và logic kích hoạt.",
    role: "Magic catalog.",
    codeExplain: "Export PowerDef[]; helper computeEffect.",
    relations: "magic.tsx.",
  },
  "src/lib/ai.functions.ts": {
    task: "ServerFn gọi Lovable AI Gateway (gemini/gpt).",
    role: "AI bridge.",
    codeExplain:
      "createServerFn POST nhận messages, gọi AI Gateway với LOVABLE_API_KEY (process.env trong handler), stream/return text.",
    relations: "chat.tsx.",
  },
  "src/lib/error-capture.ts": {
    task: "Bắt lỗi global cho client.",
    role: "Error boundary util.",
    codeExplain: "Wrap window.onerror + unhandledrejection để log.",
    relations: "__root error component.",
  },
  "src/lib/error-page.ts": {
    task: "Helper render error page.",
    role: "Error UI util.",
    codeExplain: "Format error message thân thiện.",
    relations: "errorComponent của router.",
  },
  "src/lib/utils.ts": {
    task: "cn() merge className (clsx + tailwind-merge).",
    role: "Tiện ích UI.",
    codeExplain: "export function cn(...) { return twMerge(clsx(...)) }.",
    relations: "Dùng trong mọi component shadcn.",
  },
  "src/game/GameWorld.tsx": {
    task: "Render 3D world (Three.js/R3F): nhà, tường, mái, sàn, items, nhân vật.",
    role: "3D scene root.",
    codeExplain:
      "Canvas R3F + Scene; map placedItems → Models; map walls/roofs/floors → mesh. Floor render như tường nằm ngang trên trần tầng.",
    relations: "Dùng Models, PetModels, types từ @/lib/game.",
  },
  "src/game/Models.tsx": {
    task: "Component 3D cho từng loại item nội thất.",
    role: "Furniture models.",
    codeExplain: "Switch theo catalog id → render geometry/glTF.",
    relations: "GameWorld.",
  },
  "src/game/PetModels.tsx": {
    task: "Component 3D cho từng loại thú cưng.",
    role: "Pet models.",
    codeExplain: "Tương tự Models nhưng cho pets, có animation idle.",
    relations: "GameWorld, pets.tsx.",
  },
  "src/game/QuestionView.tsx": {
    task: "UI hiển thị câu hỏi quiz và xử lý trả lời.",
    role: "Quiz component.",
    codeExplain: "Nhận Question, render choices, check đúng/sai, callback onAnswer.",
    relations: "missions.tsx, questions.ts.",
  },
  "src/game/catalog.ts": {
    task: "Catalog tất cả item mua được + giá + texture.",
    role: "Item database.",
    codeExplain: "Export ITEMS: ItemDef[].",
    relations: "shop, inventory, game.tsx, Models.",
  },
  "src/game/questions.ts": {
    task: "Bộ câu hỏi quiz (kỹ năng số).",
    role: "Question bank.",
    codeExplain: "Export QUESTIONS: Question[].",
    relations: "missions, QuestionView.",
  },
  "src/game/stage2.tsx": {
    task: "Minigame stage 2.",
    role: "Extra gameplay.",
    codeExplain: "Scene/logic riêng stage 2.",
    relations: "play.tsx.",
  },
  "src/game/stage2rooms.tsx": {
    task: "Map các phòng cho stage 2.",
    role: "Room definitions.",
    codeExplain: "Export room configs.",
    relations: "stage2.",
  },
  "src/components/GameLayout.tsx": {
    task: "Layout shell chung cho mọi trang game (header, back button, background).",
    role: "Shared layout.",
    codeExplain: "Wrapper div + tùy chọn showBack render nút quay lại qua useNavigate.",
    relations: "Dùng ở mọi route game/character/shop/...",
  },
  "src/components/ImageUploadField.tsx": {
    task: "Field upload ảnh lên Supabase Storage.",
    role: "Form field.",
    codeExplain: "Input file → upload qua serverFn → trả URL.",
    relations: "character.tsx, admin.",
  },
  "src/integrations/supabase/client.ts": {
    task: "Singleton Supabase client cho browser.",
    role: "Auto-generated, KHÔNG sửa tay.",
    codeExplain: "createClient với VITE_SUPABASE_URL + publishable key.",
    relations: "Mọi file gọi supabase.* trên client.",
  },
  "src/integrations/supabase/client.server.ts": {
    task: "Admin Supabase client (service role) cho server.",
    role: "Auto-generated, server-only.",
    codeExplain: "createClient với SERVICE_ROLE_KEY — bypass RLS.",
    relations: "Chỉ dùng trong serverFn/route đã verify auth.",
  },
  "src/integrations/supabase/auth-middleware.ts": {
    task: "Middleware requireSupabaseAuth cho serverFn.",
    role: "Auto-generated.",
    codeExplain:
      "Đọc Authorization header, verify với Supabase, inject { supabase, userId, claims } vào context. Throw 401 nếu thiếu/invalid.",
    relations: "Mọi protected serverFn.",
  },
  "src/integrations/supabase/auth-attacher.ts": {
    task: "Function middleware attach Bearer token vào RPC.",
    role: "Auto-generated.",
    codeExplain: "Trước mỗi serverFn call, đọc supabase.auth.getSession() và set header Authorization.",
    relations: "Đăng ký trong src/start.ts.",
  },
  "src/integrations/supabase/types.ts": {
    task: "Types tự sinh từ schema DB.",
    role: "Auto-generated.",
    codeExplain: "Database type cho supabase-js.",
    relations: "Mọi truy vấn typed.",
  },
  "src/integrations/lovable/index.ts": {
    task: "Tích hợp Lovable platform helpers.",
    role: "Auto-generated.",
    codeExplain: "Export utilities Lovable cung cấp.",
    relations: "Tùy chỗ dùng.",
  },
  "src/styles.css": {
    task: "Design tokens + Tailwind v4 entry.",
    role: "Global styles.",
    codeExplain: "@import 'tailwindcss'; định nghĩa biến oklch (--background, --primary...), toy-button utilities, glass-card.",
    relations: "Import bởi __root.tsx; mọi component dùng class Tailwind.",
  },
  "src/routeTree.gen.ts": {
    task: "Auto-generated route tree.",
    role: "KHÔNG sửa tay.",
    codeExplain: "Sinh bởi TanStack Router Vite plugin.",
    relations: "Dùng bởi router.tsx.",
  },
  "supabase/config.toml": {
    task: "Cấu hình project Supabase (project_id + per-function settings).",
    role: "Config file.",
    codeExplain: "TOML cho Supabase CLI.",
    relations: "Edge functions (nếu có).",
  },
  "package.json": {
    task: "Khai báo dependencies + scripts.",
    role: "npm manifest.",
    codeExplain: "Liệt kê react/tanstack/supabase/three/...; scripts dev/build.",
    relations: "Toàn project.",
  },
  "vite.config.ts": {
    task: "Cấu hình Vite + TanStack Start plugin.",
    role: "Build config.",
    codeExplain: "Plugin tanstackStart, alias '@' → src/, target Cloudflare.",
    relations: "Build pipeline.",
  },
  "tsconfig.json": {
    task: "TypeScript config (strict mode).",
    role: "TS config.",
    codeExplain: "paths '@/*' → src/*, strict: true.",
    relations: "Toàn project TS.",
  },
  "wrangler.jsonc": {
    task: "Cấu hình Cloudflare Worker deploy.",
    role: "Deploy config.",
    codeExplain: "Bindings, compatibility_date, nodejs_compat flag.",
    relations: "Deploy production.",
  },
  "eslint.config.js": {
    task: "Cấu hình ESLint.",
    role: "Lint config.",
    codeExplain: "Flat config TS + React rules.",
    relations: "Dev tooling.",
  },
  "components.json": {
    task: "Cấu hình shadcn/ui CLI.",
    role: "shadcn config.",
    codeExplain: "Alias + style + tailwind config cho shadcn add.",
    relations: "src/components/ui/*.",
  },
  ".env": {
    task: "Biến môi trường (VITE_SUPABASE_*).",
    role: "Auto-generated.",
    codeExplain: "Không sửa tay; Supabase tự inject.",
    relations: "client.ts.",
  },
};

function inferFromPath(p: string): FileDetail {
  const path = p.replace(/^\//, "");
  if (path.startsWith("src/components/ui/")) {
    const name = path.split("/").pop()?.replace(/\.tsx?$/, "");
    return {
      task: `shadcn/ui component: <${name}/>.`,
      role: "Primitive UI component (Radix + Tailwind).",
      codeExplain: "Auto-generated từ shadcn CLI; wrap Radix primitive với class Tailwind + cn().",
      relations: "Dùng khắp app cho UI building blocks.",
    };
  }
  if (path.startsWith("src/components/")) {
    return {
      task: `Component dùng chung trong app.`,
      role: "Shared component.",
      codeExplain: "Xem source bên dưới để biết chi tiết.",
      relations: "Import bởi nhiều route.",
    };
  }
  if (path.startsWith("src/routes/")) {
    return {
      task: `Route page TanStack — đường dẫn ${path.replace(/^src\/routes\//, "/").replace(/\.tsx?$/, "")}.`,
      role: "Page route.",
      codeExplain: "Export Route = createFileRoute(...) + component; xem source.",
      relations: "Render trong <Outlet/> của __root.",
    };
  }
  if (path.startsWith("src/lib/")) {
    return {
      task: `Module logic/util thuộc src/lib.`,
      role: "Library module.",
      codeExplain: "Xem source.",
      relations: "Import bởi route/component.",
    };
  }
  if (path.startsWith("src/game/")) {
    return {
      task: `Module thuộc game engine/UI.`,
      role: "Game module.",
      codeExplain: "Xem source.",
      relations: "Dùng bởi /game, /play.",
    };
  }
  if (path.startsWith("public/")) {
    return {
      task: "Asset tĩnh phục vụ trực tiếp.",
      role: "Public asset.",
      codeExplain: "Phục vụ từ /.",
      relations: "Tham chiếu bằng URL absolute.",
    };
  }
  if (path.startsWith("supabase/")) {
    return {
      task: "Tài nguyên Supabase (config/migration).",
      role: "Supabase resource.",
      codeExplain: "Quản lý bởi Supabase CLI.",
      relations: "Database/Auth.",
    };
  }
  return {
    task: "File cấu hình hoặc tài liệu project.",
    role: "Project file.",
    codeExplain: "Xem source.",
    relations: "—",
  };
}

type FileMeta = {
  path: string;        // không có leading /
  fullPath: string;    // có leading /
  exports: string[];
  imports: string[];   // module specifiers
  usedBy: string[];    // file paths import file này
  lines: number;
  bytes: number;
  detail: FileDetail;
};

function buildFileMeta(files: Record<string, string>): FileMeta[] {
  const entries = Object.entries(files).filter(
    ([p]) => !p.includes("routeTree.gen"),
  );

  // 1. exports + imports
  const exportRe = /export\s+(?:default\s+(?:function|class)?\s*(\w+)?|(?:async\s+)?function\s+(\w+)|const\s+(\w+)|class\s+(\w+)|type\s+(\w+)|interface\s+(\w+)|enum\s+(\w+))/g;
  const importRe = /import\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']/g;

  const metas: FileMeta[] = entries.map(([fullPath, src]) => {
    const path = fullPath.replace(/^\//, "");
    const exports: string[] = [];
    if (/\.(ts|tsx|js|jsx)$/.test(path)) {
      for (const m of src.matchAll(exportRe)) {
        const name = m[1] || m[2] || m[3] || m[4] || m[5] || m[6] || m[7];
        if (name && !exports.includes(name)) exports.push(name);
      }
      if (/export\s+default\b/.test(src) && !exports.some((e) => e === "default")) {
        exports.push("default");
      }
    }
    const imports: string[] = [];
    if (/\.(ts|tsx|js|jsx)$/.test(path)) {
      for (const m of src.matchAll(importRe)) {
        if (!imports.includes(m[1])) imports.push(m[1]);
      }
    }
    return {
      path,
      fullPath,
      exports,
      imports,
      usedBy: [],
      lines: src.split("\n").length,
      bytes: src.length,
      detail: FILE_DETAILS[path] ?? inferFromPath(fullPath),
    };
  });

  // 2. usedBy — resolve alias '@/x' → 'src/x', './' tương đối
  const byPath = new Map(metas.map((m) => [m.path, m]));
  function resolveSpec(fromPath: string, spec: string): string | null {
    let candidate: string | null = null;
    if (spec.startsWith("@/")) {
      candidate = "src/" + spec.slice(2);
    } else if (spec.startsWith("./") || spec.startsWith("../")) {
      const dir = fromPath.split("/").slice(0, -1);
      const parts = spec.split("/");
      for (const p of parts) {
        if (p === "..") dir.pop();
        else if (p !== ".") dir.push(p);
      }
      candidate = dir.join("/");
    } else {
      return null;
    }
    // thử với extension
    const exts = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];
    for (const ext of exts) {
      const k = candidate + ext;
      if (byPath.has(k)) return k;
    }
    return null;
  }
  for (const m of metas) {
    for (const spec of m.imports) {
      const resolved = resolveSpec(m.path, spec);
      if (resolved && resolved !== m.path) {
        const target = byPath.get(resolved)!;
        if (!target.usedBy.includes(m.path)) target.usedBy.push(m.path);
      }
    }
  }
  metas.sort((a, b) => a.path.localeCompare(b.path));
  return metas;
}


function ProjectCodeGuidePage() {
  const allFiles = useMemo(
    () => ({ ...rootFiles, ...srcFiles, ...supabaseFiles, ...publicFiles }),
    [],
  );
  const markdown = useMemo(() => buildMarkdown(allFiles), [allFiles]);
  const hookTable = useMemo(() => buildHookTable(allFiles), [allFiles]);
  const fileMetas = useMemo(() => buildFileMeta(allFiles), [allFiles]);
  const [query, setQuery] = useState("");
  const [fileQuery, setFileQuery] = useState("");

  const filteredMetas = useMemo(() => {
    if (!fileQuery.trim()) return fileMetas;
    const q = fileQuery.toLowerCase();
    return fileMetas.filter(
      (m) =>
        m.path.toLowerCase().includes(q) ||
        m.detail.task.toLowerCase().includes(q) ||
        m.detail.role.toLowerCase().includes(q),
    );
  }, [fileMetas, fileQuery]);


  const paths = useMemo(
    () =>
      Object.keys(allFiles)
        .filter((p) => !p.includes("routeTree.gen"))
        .sort((a, b) => a.localeCompare(b)),
    [allFiles],
  );

  const filteredPaths = useMemo(() => {
    if (!query.trim()) return paths;
    const q = query.toLowerCase();
    return paths.filter((p) => p.toLowerCase().includes(q));
  }, [paths, query]);

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `vebinhso-code-guide-${today}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalBytes = useMemo(
    () => paths.reduce((s, p) => s + (allFiles[p]?.length ?? 0), 0),
    [paths, allFiles],
  );

  return (
    <GameLayout showBack>
      <div className="flex-1 p-4 md:p-8">
        <div className="glass-card max-w-6xl mx-auto p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black">📘 Project Code Guide</h1>
              <p className="text-muted-foreground font-bold mt-1">
                Toàn bộ source code của dự án • {paths.length} file •{" "}
                {(totalBytes / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="toy-button toy-button-primary !text-base !py-3 !px-6"
            >
              ⬇️ TẢI VỀ .MD
            </button>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-black mb-3">
              1. 🪝 HOOKS — Chi tiết từng custom hook
            </h2>
            <p className="text-sm text-muted-foreground font-bold mb-3">
              Mỗi hook được tách thành: Nhiệm vụ • Giải thích code • Mối liên hệ • Phụ thuộc • Trả về • Khi nào chạy • Nơi sử dụng.
            </p>
            <div className="overflow-x-auto rounded-2xl border-2 border-gray-200">
              <table className="w-full text-sm" style={{ tableLayout: "auto" }}>
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-black w-10">#</th>
                    <th className="px-3 py-2 text-left font-black w-72">Hook</th>
                    <th className="px-3 py-2 text-left font-black w-56">Nhiệm vụ</th>
                    <th className="px-3 py-2 text-left font-black w-64">Giải thích code</th>
                    <th className="px-3 py-2 text-left font-black w-56">Mối liên hệ</th>
                    <th className="px-3 py-2 text-left font-black w-44">Phụ thuộc</th>
                    <th className="px-3 py-2 text-left font-black w-40">Trả về</th>
                    <th className="px-3 py-2 text-left font-black w-48">Khi nào chạy</th>
                    <th className="px-3 py-2 text-left font-black w-56">File liên quan</th>
                    <th className="px-3 py-2 text-left font-black w-52">Nơi sử dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {hookTable.map((h, i) => (
                    <tr key={h.name} className="border-t border-gray-200 align-top">
                      <td className="px-3 py-3 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3">
                        <code className="inline-block px-2 py-1 rounded-md bg-gray-900 text-emerald-300 font-mono text-xs font-bold">
                          {h.name}
                        </code>
                        <div className="text-[11px] text-muted-foreground font-mono mt-1 break-all leading-relaxed">
                          {h.definedIn.replace(/^\//, "")}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-700 whitespace-normal break-words leading-relaxed">{h.detail.task}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{h.detail.codeExplain}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-normal break-words leading-relaxed">{h.detail.relations}</td>
                      <td className="px-3 py-3 whitespace-normal break-words">
                        {h.detail.deps.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        ) : (
                          <ul className="list-disc pl-4 space-y-0.5">
                            {h.detail.deps.map((d) => (
                              <li key={d} className="text-[12px] font-mono text-gray-800 break-words leading-relaxed">{d}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-gray-700 whitespace-normal break-words leading-relaxed">{h.detail.returns}</td>
                      <td className="px-3 py-3 text-[12px] text-gray-700 whitespace-normal break-words leading-relaxed">{h.detail.trigger}</td>
                      <td className="px-3 py-3 whitespace-normal break-words">
                        {h.detail.related.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {h.detail.related.map((r) => (
                              <li key={r} className="text-[11px] font-mono text-blue-700 break-all leading-relaxed">{r}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-normal break-words">
                        {h.usedIn.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Chưa dùng</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {h.usedIn.map((u) => (
                              <code
                                key={u}
                                className="inline-block px-2 py-0.5 rounded bg-gray-900 text-amber-300 font-mono text-[11px]"
                              >
                                {u.replace(/^\/src\//, "").replace(/\.(tsx?|jsx?)$/, "")}
                              </code>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {hookTable.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground font-bold">
                        Chưa có custom hook nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>


          <section className="mb-8">
            <h2 className="text-2xl font-black mb-3">
              2. 📂 FILES — Giải thích chi tiết từng file
            </h2>
            <p className="text-sm text-muted-foreground font-bold mb-3">
              Mỗi file được phân tích: Nhiệm vụ • Vai trò • Giải thích code • Mối liên hệ • Exports tự trích • Imports • File nào đang dùng nó.
            </p>
            <input
              type="text"
              value={fileQuery}
              onChange={(e) => setFileQuery(e.target.value)}
              placeholder="🔍 Lọc theo path / nhiệm vụ / vai trò..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold mb-3"
            />
            <div className="text-sm font-bold text-muted-foreground mb-2">
              Hiển thị {filteredMetas.length} / {fileMetas.length} file
            </div>
            <div className="overflow-x-auto rounded-2xl border-2 border-gray-200 max-h-[80vh] overflow-y-auto">
              <table className="w-full text-sm" style={{ tableLayout: "auto" }}>
                <thead className="bg-gray-900 text-white sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-black w-10">#</th>
                    <th className="px-3 py-2 text-left font-black w-80">File</th>
                    <th className="px-3 py-2 text-left font-black w-56">Nhiệm vụ</th>
                    <th className="px-3 py-2 text-left font-black w-40">Vai trò</th>
                    <th className="px-3 py-2 text-left font-black w-64">Giải thích code</th>
                    <th className="px-3 py-2 text-left font-black w-56">Mối liên hệ</th>
                    <th className="px-3 py-2 text-left font-black w-44">Exports</th>
                    <th className="px-3 py-2 text-left font-black w-52">Imports</th>
                    <th className="px-3 py-2 text-left font-black w-52">Được dùng bởi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMetas.map((m, i) => (
                    <tr key={m.path} className="border-t border-gray-200 align-top hover:bg-orange-50/40">
                      <td className="px-3 py-3 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-3">
                        <code className="inline-block px-2 py-1 rounded-md bg-gray-900 text-emerald-300 font-mono text-[11px] font-bold break-all leading-relaxed">
                          {m.path}
                        </code>
                        <div className="text-[10px] text-muted-foreground font-mono mt-1 leading-relaxed">
                          {m.lines} dòng • {(m.bytes / 1024).toFixed(1)} KB
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-700 whitespace-normal break-words leading-relaxed">{m.detail.task}</td>
                      <td className="px-3 py-3 text-[12px] text-gray-700 whitespace-normal break-words leading-relaxed">{m.detail.role}</td>
                      <td className="px-3 py-3 text-[12px] text-gray-700 whitespace-normal break-words leading-relaxed">{m.detail.codeExplain}</td>
                      <td className="px-3 py-3 text-[12px] text-gray-700 whitespace-normal break-words leading-relaxed">{m.detail.relations}</td>
                      <td className="px-3 py-3 whitespace-normal break-words">
                        {m.exports.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {m.exports.slice(0, 12).map((e) => (
                              <code key={e} className="inline-block px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-200 font-mono text-[10px]">
                                {e}
                              </code>
                            ))}
                            {m.exports.length > 12 && (
                              <span className="text-[10px] text-muted-foreground">+{m.exports.length - 12}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-normal break-words">
                        {m.imports.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {m.imports.slice(0, 10).map((im) => (
                              <li key={im} className="text-[10px] font-mono text-blue-700 break-all leading-relaxed">{im}</li>
                            ))}
                            {m.imports.length > 10 && (
                              <li className="text-[10px] text-muted-foreground">+{m.imports.length - 10} more</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-normal break-words">
                        {m.usedBy.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">Chưa ai import</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {m.usedBy.slice(0, 8).map((u) => (
                              <code key={u} className="inline-block px-1.5 py-0.5 rounded bg-gray-900 text-amber-300 font-mono text-[10px]">
                                {u.replace(/^src\//, "")}
                              </code>
                            ))}
                            {m.usedBy.length > 8 && (
                              <span className="text-[10px] text-muted-foreground">+{m.usedBy.length - 8}</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <h2 className="text-2xl font-black mb-3">3. 📁 Toàn bộ file source</h2>


          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Lọc theo đường dẫn file..."
            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold mb-4"
          />

          <div className="text-sm font-bold text-muted-foreground mb-2">
            Hiển thị {filteredPaths.length} / {paths.length} file
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {filteredPaths.map((p) => (
              <FileBlock key={p} path={p} content={allFiles[p] ?? ""} />
            ))}
            {filteredPaths.length === 0 && (
              <div className="text-center text-muted-foreground font-bold py-8">
                Không có file nào khớp.
              </div>
            )}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}

function FileBlock({ path, content }: { path: string; content: string }) {
  const [open, setOpen] = useState(false);
  const lines = content.split("\n").length;
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white/70 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors"
      >
        <span className="font-mono text-sm font-bold truncate">
          {open ? "📂" : "📄"} {path.replace(/^\//, "")}
        </span>
        <span className="text-xs text-muted-foreground font-bold ml-2 shrink-0">
          {lines} dòng • {(content.length / 1024).toFixed(1)} KB
        </span>
      </button>
      {open && (
        <pre className="bg-gray-900 text-gray-100 text-xs overflow-x-auto p-4 max-h-[400px]">
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
}
