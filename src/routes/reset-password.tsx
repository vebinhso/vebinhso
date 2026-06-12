import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { isPasswordValid } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase recovery link sets a session automatically when the page loads
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
      setReady(true);
    });
    check();
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async () => {
    setError(""); setMsg("");
    if (!isPasswordValid(password)) { setError("Mật khẩu chưa đủ mạnh! Hãy hoàn thành đủ 5 tiêu chí bên dưới ô mật khẩu."); return; }
    if (password !== confirm) { setError("Mật khẩu xác nhận không khớp."); return; }
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (e) { setError(e.message); return; }
    setMsg("Đã đặt lại mật khẩu. Đang chuyển về trang đăng nhập...");
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/login" }), 1500);
  };

  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">🔐</div>
            <h1 className="text-2xl font-black">Đặt lại mật khẩu</h1>
          </div>

          {!ready && <p className="text-center font-bold text-muted-foreground">Đang kiểm tra liên kết...</p>}

          {ready && !hasSession && (
            <p className="text-sm font-bold text-red-600 bg-red-50 rounded-xl p-3 text-center">
              Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu email khôi phục mới.
            </p>
          )}

          {ready && hasSession && (
            <>
              {msg && <p className="text-sm font-bold text-green-700 bg-green-50 rounded-xl p-3">{msg}</p>}
              <div className="space-y-1">
                <label className="text-sm font-bold">Mật khẩu mới</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold" />
              </div>
              <PasswordChecklist password={password} />
              <div className="space-y-1">
                <label className="text-sm font-bold">Xác nhận mật khẩu mới</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold" />
              </div>
              {error && <p className="text-sm font-bold text-red-600">{error}</p>}
              <button onClick={handleSubmit} disabled={busy} className="toy-button toy-button-primary w-full">
                {busy ? "Đang lưu..." : "Đặt lại mật khẩu"}
              </button>
            </>
          )}
          <Link to="/login" className="toy-button w-full inline-block text-center">Về trang đăng nhập</Link>
        </div>
      </div>
    </GameLayout>
  );
}
