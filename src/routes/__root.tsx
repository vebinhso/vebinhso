import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useAuthSync } from "@/hooks/use-auth-sync";
import { useEffect } from "react";
import { startSessionTracker } from "@/lib/session";
import { setBgm, unlockAudioOnUserGesture, playSfx } from "@/lib/audio";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SavedToast } from "@/components/SavedToast";
import { LanguageToggle } from "@/components/LanguageToggle";
import { StrictEnglishGuard } from "@/components/StrictEnglishGuard";
import { useLocale } from "@/lib/locale";

import appCss from "../styles.css?url";


function NotFoundComponent() {
  const locale = useLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{locale === "en" ? "Page not found" : "Không tìm thấy trang"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {locale === "en" ? "The page you're looking for doesn't exist or has been moved." : "Trang bạn cần không tồn tại hoặc đã được chuyển đi."}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {locale === "en" ? "Go home" : "Về trang chính"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {locale === "en" ? "This page didn't load" : "Trang này chưa tải được"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {locale === "en" ? "Something went wrong. Try again or return home." : "Đã xảy ra lỗi. Bạn có thể thử lại hoặc trở về trang chính."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {locale === "en" ? "Try again" : "Thử lại"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {locale === "en" ? "Go home" : "Về trang chính"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VỆ BINH SỐ — Digital Safety Learning Game" },
      { name: "description", content: "Learn digital safety through games, interactive stories, and creative building." },
      { name: "author", content: "VỆ BINH SỐ" },
      { property: "og:title", content: "VỆ BINH SỐ — Digital Safety Learning Game" },
      { property: "og:description", content: "Learn digital safety through games, interactive stories, and creative building." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "VỆ BINH SỐ — Digital Safety Learning Game" },
      { name: "twitter:description", content: "Learn digital safety through games, interactive stories, and creative building." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/17d77c20-77d8-460e-95f1-65190a93a354/id-preview-050a7e93--f35aafa9-00d3-41f4-91f4-ed8fec6bb8f1.lovable.app-1779725233383.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/17d77c20-77d8-460e-95f1-65190a93a354/id-preview-050a7e93--f35aafa9-00d3-41f4-91f4-ed8fec6bb8f1.lovable.app-1779725233383.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap&subset=vietnamese" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Trên bản đồ nhà (/game) nút 🏡 Về trang chủ chiếm góc phải trên,
  // nên dịch ⚙️ Cài đặt + VI/EN sang trái để nằm cạnh nút home.
  const onHomeMap = pathname === "/game";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSyncBridge />
      <AudioBridge />
      <StrictEnglishGuard />
      <SettingsPanel offset={onHomeMap} />
      <div className={`fixed top-3 z-50 ${onHomeMap ? "right-[12.75rem]" : "right-16"}`}><LanguageToggle compact /></div>
      <SavedToast />
      <Toaster position="top-center" richColors closeButton />
      <Outlet />
    </QueryClientProvider>
  );
}

function AuthSyncBridge() {
  useAuthSync();
  useEffect(() => {
    const stop = startSessionTracker();
    return stop;
  }, []);
  return null;
}

function AudioBridge() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    unlockAudioOnUserGesture();
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // chỉ kêu khi click vào nút bấm / link bấm được, tránh ồn ào khi chọn vùng đặt đồ
      const btn = t.closest("button, a, [role='button']");
      if (!btn) return;
      // bỏ qua nút bị disabled
      if (btn instanceof HTMLButtonElement && btn.disabled) return;
      playSfx("click");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  useEffect(() => {
    // /game tự set "house"; /magic tự set "magic" sau intro.
    // /roleplay (trang chọn bài) vẫn có nhạc nền; chỉ tắt khi vào một bài nhập vai cụ thể.
    if (pathname.startsWith("/game")) return;
    if (pathname.startsWith("/magic")) return;
    if (pathname.startsWith("/roleplay/") || pathname.startsWith("/roleplay.")) { setBgm(null); return; }
    setBgm("home");
  }, [pathname]);
  return null;
}

