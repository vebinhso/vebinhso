import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import { signInWithPassword, signUpWithPassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { isPasswordValid } from "@/lib/password";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined,
  }),
  component: LoginPage,
});

function useNextTarget(): string {
  try {
    return Route.useSearch().next ?? "/";
  } catch {
    return "/";
  }
}


type View = "login" | "register" | "forgot";

function LoginPage() {
  const [view, setView] = useState<View>("login");
  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8">
          {view === "login" && <Login setView={setView} />}
          {view === "register" && <Register setView={setView} />}
          {view === "forgot" && <Forgot setView={setView} />}
        </div>
      </div>
    </GameLayout>
  );
}

function Field({ label, type = "text", placeholder, value, onChange }: {
  label: string; type?: string; placeholder?: string; value?: string; onChange?: (v: string) => void;
}) {
  const isPassword = type === "password";
  const [show, setShow] = useState(false);
  const inputType = isPassword ? (show ? "text" : "password") : type;
  return (
    <label className="block">
      <span className="text-sm font-black uppercase">{label}</span>
      <div className="relative">
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={`mt-1 w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-1/2 -translate-y-1/2 mt-[2px] text-gray-500 hover:text-orange-500 text-xl leading-none select-none"
            tabIndex={-1}
          >
            {show ? "🙈" : "👁️"}
          </button>
        )}
      </div>
    </label>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const next = useNextTarget();
  const handle = async () => {
    setBusy(true);
    const cb = `${window.location.origin}/auth/callback${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: cb });
    if (r.error) {
      setBusy(false);
      alert("Lỗi đăng nhập Google: " + (r.error.message || "không rõ"));
    }
  };

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-2xl py-3 font-black text-sm shadow"
    >
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C41 35.3 44 30 44 24c0-1.3-.1-2.3-.4-3.5z" />
      </svg>
      {busy ? "Đang chuyển hướng..." : "Đăng nhập với Google"}
    </button>
  );
}

function Login({ setView }: { setView: (v: View) => void }) {
  const navigate = useNavigate();
  const next = useNextTarget();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) { setError("Vui lòng nhập đầy đủ thông tin!"); return; }
    setBusy(true);
    try {
      await signInWithPassword(email.trim(), password);
      if (next !== "/") { window.location.href = next; return; }
      navigate({ to: "/" });
    } catch (e: any) {
      setError(e?.message || "Đăng nhập thất bại");
    } finally { setBusy(false); }
  };


  return (
    <>
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">🏠</div>
        <h1 className="text-3xl font-black">VỆ BINH SỐ</h1>
        <p className="text-muted-foreground font-bold">Đăng nhập để tiếp tục</p>
      </div>
      <div className="flex flex-col gap-3">
        <GoogleButton />
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <div className="flex-1 h-px bg-gray-200" /> HOẶC <div className="flex-1 h-px bg-gray-200" />
        </div>
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Mật khẩu" type="password" value={password} onChange={setPassword} />
        <button
          onClick={() => setView("forgot")}
          className="text-right text-sm font-bold text-orange-600"
        >Quên mật khẩu?</button>
        {error && (
          <div className="text-red-600 font-bold text-sm text-center bg-red-50 rounded-xl p-2">{error}</div>
        )}
        <button
          onClick={handleLogin}
          disabled={busy}
          className="toy-button toy-button-primary w-full !text-base sm:!text-lg !py-3 disabled:opacity-60 truncate"
        >🔑 {busy ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}</button>
        <div className="text-center text-sm">
          Chưa có tài khoản?{" "}
          <button onClick={() => setView("register")} className="font-black text-orange-600">Đăng ký ngay</button>
        </div>
      </div>
    </>
  );
}

function Register({ setView }: { setView: (v: View) => void }) {
  const navigate = useNavigate();
  const next = useNextTarget();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherSchool, setTeacherSchool] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    setError(""); setSuccess("");
    if (!username.trim() || !email.trim() || !password || !confirm) { setError("Vui lòng điền đầy đủ các trường!"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Email không hợp lệ!"); return; }
    if (!isPasswordValid(password)) { setError("Mật khẩu chưa đủ mạnh! Hãy hoàn thành đủ 5 tiêu chí bên dưới ô mật khẩu."); return; }
    if (password !== confirm) { setError("Mật khẩu xác nhận không khớp!"); return; }
    if (isTeacher && (!teacherSchool.trim() || !teacherSubject.trim())) {
      setError("Đăng ký giáo viên: vui lòng nhập Trường và Môn giảng dạy."); return;
    }
    setBusy(true);
    try {
      await signUpWithPassword({
        email: email.trim(), password, username: username.trim(),
        isTeacher, teacherSchool: teacherSchool.trim(), teacherSubject: teacherSubject.trim(),
      });
      await signInWithPassword(email.trim(), password);
      if (isTeacher) {
        setSuccess("Đã đăng ký giáo viên. Chờ quản trị viên duyệt để nhận mã lớp.");
        setTimeout(() => {
          if (next !== "/") { window.location.href = next; return; }
          navigate({ to: "/" });
        }, 1500);
        return;
      }
      if (next !== "/") { window.location.href = next; return; }
      navigate({ to: "/" });
    } catch (e: any) {
      setError(e?.message || "Đăng ký thất bại");
    } finally { setBusy(false); }
  };


  return (
    <>
      <h2 className="text-2xl font-black text-center mb-4">Đăng ký mới</h2>
      <div className="flex flex-col gap-3">
        <GoogleButton />
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <div className="flex-1 h-px bg-gray-200" /> HOẶC <div className="flex-1 h-px bg-gray-200" />
        </div>
        <Field label="Tên hiển thị (*)" value={username} onChange={setUsername} />
        <Field label="Email (*)" type="email" placeholder="ten@vi-du.com" value={email} onChange={setEmail} />
        <Field label="Mật khẩu (*)" type="password" value={password} onChange={setPassword} />
        <PasswordChecklist password={password} />
        <Field label="Xác nhận mật khẩu (*)" type="password" value={confirm} onChange={setConfirm} />

        <label className="flex items-start gap-2 mt-1 p-3 rounded-2xl bg-orange-50 border-2 border-orange-200 cursor-pointer">
          <input type="checkbox" checked={isTeacher} onChange={(e) => setIsTeacher(e.target.checked)} className="mt-1 w-5 h-5 accent-orange-500" />
          <div className="flex-1">
            <div className="font-black text-sm">🧑‍🏫 Đăng ký giáo viên</div>
            <div className="text-xs text-muted-foreground">Yêu cầu quản trị viên duyệt trước khi được nhận mã lớp.</div>
          </div>
        </label>
        {isTeacher && (
          <>
            <Field label="Trường giảng dạy (*)" value={teacherSchool} onChange={setTeacherSchool} placeholder="VD: THPT Chuyên KHTN" />
            <Field label="Môn giảng dạy (*)" value={teacherSubject} onChange={setTeacherSubject} placeholder="VD: Tin học" />
          </>
        )}

        {error && (
          <div className="text-red-600 font-bold text-sm text-center bg-red-50 rounded-xl p-2">{error}</div>
        )}
        {success && (
          <div className="text-green-700 font-bold text-sm bg-green-50 rounded-xl p-3">{success}</div>
        )}
        <button onClick={handleRegister} disabled={busy} className="toy-button toy-button-green w-full !text-base sm:!text-lg disabled:opacity-60 truncate">
          {busy ? "Đang tạo..." : "Tạo tài khoản ✨"}
        </button>
        <button onClick={() => setView("login")} className="toy-button w-full">Quay lại Đăng nhập</button>
      </div>
    </>
  );
}

function Forgot({ setView }: { setView: (v: View) => void }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setMsg(""); setErr("");
    if (!email.trim()) { setErr("Nhập email."); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Đã gửi email khôi phục. Hãy kiểm tra hộp thư.");
  };
  return (
    <>
      <h2 className="text-2xl font-black text-center mb-4">Lấy lại mật khẩu</h2>
      <div className="flex flex-col gap-3">
        <Field label="Email đã đăng ký" type="email" value={email} onChange={setEmail} />
        {err && <div className="text-red-600 font-bold text-sm bg-red-50 rounded-xl p-2">{err}</div>}
        {msg && <div className="text-green-700 font-bold text-sm bg-green-50 rounded-xl p-2">{msg}</div>}
        <button onClick={send} disabled={busy} className="toy-button toy-button-accent w-full !text-base sm:!text-lg disabled:opacity-60 truncate">
          {busy ? "Đang gửi..." : "Gửi email khôi phục 📧"}
        </button>
        <button onClick={() => setView("login")} className="toy-button w-full">Hủy bỏ</button>
      </div>
    </>
  );
}
