import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined,
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let done = false;
    const go = (path: string) => {
      if (done) return;
      done = true;
      const target = path === "/" && next ? next : path;
      if (target !== "/" && next && target === next) {
        window.location.href = target;
        return;
      }
      navigate({ to: target, replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) go("/");
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) { setError(error.message); return; }
      if (data.session) go("/");
    });

    const t = setTimeout(() => {
      if (!done) {
        supabase.auth.getSession().then(({ data }) => {
          go(data.session ? "/" : "/login");
        });
      }
    }, 6000);

    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, [navigate, next]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 text-center">
        <div className="text-5xl mb-3 animate-spin inline-block">⏳</div>
        <div className="text-lg font-black">Đang đăng nhập...</div>
        {error && <div className="mt-3 text-sm text-red-600 font-bold">{error}</div>}
      </div>
    </div>
  );
}
