import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useState } from "react";
import {
  getAccounts,
  setCurrentUser,
  findAccount,
  createPendingRegistration,
} from "@/lib/auth";

export const Route = createFileRoute("/login")({ component: LoginPage });

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

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black uppercase">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="mt-1 w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold"
      />
    </label>
  );
}

function Login({ setView }: { setView: (v: View) => void }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    const account = findAccount(identifier, password);
    if (!account) {
      setError("Sai tên đăng nhập / email hoặc mật khẩu!");
      return;
    }
    setCurrentUser(account);
    navigate({ to: "/" });
  };

  return (
    <>
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">🏠</div>
        <h1 className="text-3xl font-black">VỆ BINH SỐ</h1>
        <p className="text-muted-foreground font-bold">Đăng nhập để tiếp tục</p>
      </div>
      <div className="flex flex-col gap-3">
        <Field label="Tên đăng nhập / Email" value={identifier} onChange={setIdentifier} />
        <Field label="Mật khẩu" type="password" value={password} onChange={setPassword} />
        <button
          onClick={() => setView("forgot")}
          className="text-right text-sm font-bold text-orange-600"
        >
          Quên mật khẩu?
        </button>
        {error && (
          <div className="text-red-600 font-bold text-sm text-center bg-red-50 rounded-xl p-2">
            {error}
          </div>
        )}
        <button
          onClick={handleLogin}
          className="toy-button toy-button-primary w-full !text-lg !py-3"
        >
          🔑 ĐĂNG NHẬP
        </button>
        <div className="text-center text-sm">
          Chưa có tài khoản?{" "}
          <button onClick={() => setView("register")} className="font-black text-orange-600">
            Đăng ký ngay
          </button>
        </div>
      </div>
    </>
  );
}

function Register({ setView }: { setView: (v: View) => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [verifyUrl, setVerifyUrl] = useState("");

  const handleRegister = () => {
    setError("");
    setSuccess("");
    setVerifyUrl("");

    if (!username.trim() || !email.trim() || !password || !confirm) {
      setError("Vui lòng điền đầy đủ các trường!");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Email không hợp lệ!");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    const accounts = getAccounts();
    if (accounts.some((a) => a.username.toLowerCase() === username.trim().toLowerCase())) {
      setError("Tên đăng nhập đã từng được sử dụng!");
      return;
    }
    if (accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) {
      setError("Email đã từng được sử dụng!");
      return;
    }

    const { token } = createPendingRegistration({
      username: username.trim(),
      email: email.trim(),
      password,
    });
    const url = `${window.location.origin}/verify?token=${token}`;
    setVerifyUrl(url);
    setSuccess(
      `Đã gửi email xác nhận tới ${email.trim()}. Vui lòng bấm vào link bên dưới (mô phỏng) để kích hoạt tài khoản. Link có hiệu lực trong 1 giờ.`,
    );
  };

  return (
    <>
      <h2 className="text-2xl font-black text-center mb-4">Đăng ký mới</h2>
      <div className="flex flex-col gap-3">
        <Field label="Tên đăng nhập (*)" value={username} onChange={setUsername} />
        <Field
          label="Email (*)"
          type="email"
          placeholder="ten@vi-du.com"
          value={email}
          onChange={setEmail}
        />
        <Field label="Mật khẩu (*)" type="password" value={password} onChange={setPassword} />
        <Field
          label="Xác nhận mật khẩu (*)"
          type="password"
          value={confirm}
          onChange={setConfirm}
        />
        {error && (
          <div className="text-red-600 font-bold text-sm text-center bg-red-50 rounded-xl p-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-700 font-bold text-sm text-center bg-green-50 rounded-xl p-2">
            {success}
          </div>
        )}
        <button onClick={handleRegister} className="toy-button toy-button-green w-full !text-lg">
          Tạo tài khoản ✨
        </button>
        <button onClick={() => setView("login")} className="toy-button w-full">
          Quay lại Đăng nhập
        </button>
      </div>
    </>
  );
}

function Forgot({ setView }: { setView: (v: View) => void }) {
  return (
    <>
      <h2 className="text-2xl font-black text-center mb-4">Lấy lại mật khẩu</h2>
      <div className="flex flex-col gap-3">
        <Field label="Tên đăng nhập" />
        <Field label="Email đã đăng ký" type="email" />
        <Field label="Mật khẩu mới" type="password" />
        <Field label="Xác nhận mật khẩu mới" type="password" />
        <button className="toy-button toy-button-accent w-full !text-lg">
          Thay đổi mật khẩu 🛠️
        </button>
        <button onClick={() => setView("login")} className="toy-button w-full">
          Hủy bỏ
        </button>
      </div>
    </>
  );
}
