import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { verifyRegistration, setCurrentUser } from "@/lib/auth";

type Search = { token?: string };

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<{ ok: boolean; msg: string; id?: number } | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ ok: false, msg: "Thiếu mã xác nhận." });
      return;
    }
    const res = verifyRegistration(token);
    if (res.ok) {
      setState({ ok: true, msg: "Xác nhận thành công!", id: res.account.id });
      setCurrentUser(res.account);
      setTimeout(() => navigate({ to: "/" }), 1800);
    } else {
      setState({ ok: false, msg: res.reason });
    }
  }, [token, navigate]);

  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center space-y-4">
          <div className="text-6xl">{state?.ok ? "🎉" : state ? "⚠️" : "⏳"}</div>
          <h1 className="text-2xl font-black">
            {state?.ok ? "Tài khoản đã kích hoạt" : state ? "Không xác nhận được" : "Đang xác nhận..."}
          </h1>
          <p className="font-bold text-muted-foreground">{state?.msg}</p>
          {state?.ok && state.id !== undefined && (
            <p className="font-black text-orange-600">ID của bạn: #{state.id}</p>
          )}
          {state && !state.ok && (
            <Link to="/login" className="toy-button toy-button-primary inline-block">
              Quay lại đăng ký
            </Link>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
