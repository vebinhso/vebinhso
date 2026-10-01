// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
// Dev-only source tags break React Three Fiber (it treats "data-*" props as nested object paths),
// so strip them from any module that renders 3D scenes.
const stripTsdSourceFrom3D = {
  name: "strip-tsd-source-3d",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!/\.[jt]sx(\?|$)/.test(id) || !code.includes("data-tsd-source")) return null;
    if (!/@react-three|\/src\/game\//.test(code + id)) return null;
    return { code: code.replace(/ data-tsd-source="[^"]*"/g, ""), map: null };
  },
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin(), stripTsdSourceFrom3D],
  },
});
