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

function ProjectCodeGuidePage() {
  const allFiles = useMemo(
    () => ({ ...rootFiles, ...srcFiles, ...supabaseFiles, ...publicFiles }),
    [],
  );
  const markdown = useMemo(() => buildMarkdown(allFiles), [allFiles]);
  const hookTable = useMemo(() => buildHookTable(allFiles), [allFiles]);
  const [query, setQuery] = useState("");

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
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-black w-10">#</th>
                    <th className="px-3 py-2 text-left font-black w-56">Hook</th>
                    <th className="px-3 py-2 text-left font-black">Nhiệm vụ</th>
                    <th className="px-3 py-2 text-left font-black">Giải thích code</th>
                    <th className="px-3 py-2 text-left font-black">Mối liên hệ</th>
                    <th className="px-3 py-2 text-left font-black">Phụ thuộc</th>
                    <th className="px-3 py-2 text-left font-black">Trả về</th>
                    <th className="px-3 py-2 text-left font-black">Khi nào chạy</th>
                    <th className="px-3 py-2 text-left font-black">File liên quan</th>
                    <th className="px-3 py-2 text-left font-black">Nơi sử dụng</th>
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
                        <div className="text-[11px] text-muted-foreground font-mono mt-1 break-all">
                          {h.definedIn.replace(/^\//, "")}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-700 min-w-[200px]">{h.detail.task}</td>
                      <td className="px-3 py-3 text-gray-700 min-w-[260px] whitespace-pre-wrap">{h.detail.codeExplain}</td>
                      <td className="px-3 py-3 text-gray-700 min-w-[220px]">{h.detail.relations}</td>
                      <td className="px-3 py-3 min-w-[160px]">
                        {h.detail.deps.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        ) : (
                          <ul className="list-disc pl-4 space-y-0.5">
                            {h.detail.deps.map((d) => (
                              <li key={d} className="text-[12px] font-mono text-gray-800">{d}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-gray-700 min-w-[140px]">{h.detail.returns}</td>
                      <td className="px-3 py-3 text-[12px] text-gray-700 min-w-[160px]">{h.detail.trigger}</td>
                      <td className="px-3 py-3 min-w-[200px]">
                        {h.detail.related.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {h.detail.related.map((r) => (
                              <li key={r} className="text-[11px] font-mono text-blue-700 break-all">{r}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-3 min-w-[180px]">
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


          <h2 className="text-2xl font-black mb-3">2. 📁 Toàn bộ file source</h2>

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
