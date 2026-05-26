import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallbackPage });

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let done = false;
    const go = (path: string) => {
      if (done) return;
      done = true;
      navigate({ to: path, replace: true });
    };

    // Listen for the SIGNED_IN event triggered after Supabase parses the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) go("/");
    });

    // Also check current session in case it's already established
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) { setError(error.message); return; }
      if (data.session) go("/");
    });

    // Safety fallback: if nothing happens in 6s, go back to /login
    const t = setTimeout(() => {
      if (!done) {
        supabase.auth.getSession().then(({ data }) => {
          go(data.session ? "/" : "/login");
        });
      }
    }, 6000);

    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, [navigate]);

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
