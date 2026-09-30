import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
  head: () => ({ meta: [
    { title: "Xác nhận email | VỆ BINH SỐ" },
    { name: "description", content: "Xác nhận email tài khoản VỆ BINH SỐ." },
    { property: "og:title", content: "Xác nhận email | VỆ BINH SỐ" },
    { property: "og:description", content: "Xác nhận email tài khoản VỆ BINH SỐ." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function VerifyPage() {
  const en = useLocale() === "en";
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
          <h1 className="text-2xl font-black">{en ? "Verifying..." : "Đang xác nhận..."}</h1>
          <p className="font-bold text-muted-foreground">
            {en ? "Once verification succeeds, you will return to the home page." : "Nếu đã xác nhận thành công bạn sẽ được chuyển về trang chủ."}
          </p>
          <Link to="/login" className="toy-button inline-block">{en ? "Back to sign in" : "Về trang đăng nhập"}</Link>
        </div>
      </div>
    </GameLayout>
  );
}
