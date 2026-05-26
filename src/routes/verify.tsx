import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify")({ component: VerifyPage });

function VerifyPage() {
  const navigate = useNavigate();
  useEffect(() => {
    // Supabase auto-handles the email verification token in URL hash.
    // Just wait for session, then redirect home.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center space-y-4">
          <div className="text-6xl">⏳</div>
          <h1 className="text-2xl font-black">Đang xác nhận...</h1>
          <p className="font-bold text-muted-foreground">
            Nếu đã xác nhận thành công bạn sẽ được chuyển về trang chủ.
          </p>
          <Link to="/login" className="toy-button inline-block">Về trang đăng nhập</Link>
        </div>
      </div>
    </GameLayout>
  );
}
