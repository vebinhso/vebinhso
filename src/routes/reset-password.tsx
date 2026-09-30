import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { isPasswordValid } from "@/lib/password";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [
    { title: "Đặt lại mật khẩu | VỆ BINH SỐ" },
    { name: "description", content: "Đặt lại mật khẩu tài khoản VỆ BINH SỐ." },
    { property: "og:title", content: "Đặt lại mật khẩu | VỆ BINH SỐ" },
    { property: "og:description", content: "Đặt lại mật khẩu tài khoản VỆ BINH SỐ." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ResetPasswordPage() {
  const en = useLocale() === "en";
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
    if (!isPasswordValid(password)) { setError(en ? "Your password does not meet all five requirements below." : "Mật khẩu chưa đủ mạnh! Hãy hoàn thành đủ 5 tiêu chí bên dưới ô mật khẩu."); return; }
    if (password !== confirm) { setError(en ? "The passwords do not match." : "Mật khẩu xác nhận không khớp."); return; }
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (e) { setError(e.message); return; }
    setMsg(en ? "Password reset. Redirecting to sign in..." : "Đã đặt lại mật khẩu. Đang chuyển về trang đăng nhập...");
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/login" }), 1500);
  };

  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">🔐</div>
            <h1 className="text-2xl font-black">{en ? "Reset password" : "Đặt lại mật khẩu"}</h1>
          </div>

          {!ready && <p className="text-center font-bold text-muted-foreground">{en ? "Checking your link..." : "Đang kiểm tra liên kết..."}</p>}

          {ready && !hasSession && (
            <p className="text-sm font-bold text-red-600 bg-red-50 rounded-xl p-3 text-center">
              {en ? "This link is invalid or has expired. Request a new reset email." : "Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu email khôi phục mới."}
            </p>
          )}

          {ready && hasSession && (
            <>
              {msg && <p className="text-sm font-bold text-green-700 bg-green-50 rounded-xl p-3">{msg}</p>}
              <div className="space-y-1">
                <label className="text-sm font-bold">{en ? "New password" : "Mật khẩu mới"}</label>
                <PasswordInput value={password} onChange={setPassword} />
              </div>
              <PasswordChecklist password={password} />
              <div className="space-y-1">
                <label className="text-sm font-bold">{en ? "Confirm new password" : "Xác nhận mật khẩu mới"}</label>
                <PasswordInput value={confirm} onChange={setConfirm} />
              </div>
              {error && <p className="text-sm font-bold text-red-600">{error}</p>}
              <button onClick={handleSubmit} disabled={busy} className="toy-button toy-button-primary w-full">
                {busy ? (en ? "Saving..." : "Đang lưu...") : (en ? "Reset password" : "Đặt lại mật khẩu")}
              </button>
            </>
          )}
          <Link to="/login" className="toy-button w-full inline-block text-center">{en ? "Back to sign in" : "Về trang đăng nhập"}</Link>
        </div>
      </div>
    </GameLayout>
  );
}

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const en = useLocale() === "en";
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? (en ? "Hide password" : "Ẩn mật khẩu") : (en ? "Show password" : "Hiện mật khẩu")}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500 text-xl leading-none select-none"
        tabIndex={-1}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
