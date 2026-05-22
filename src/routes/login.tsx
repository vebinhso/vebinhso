import { createFileRoute, Link } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useState } from "react";

export const Route = createFileRoute("/login")({ component: LoginPage });

type View = "menu" | "login" | "register" | "forgot";

function LoginPage() {
  const [view, setView] = useState<View>("menu");
  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8">
          {view === "menu" && <Menu setView={setView} />}
          {view === "login" && <Login setView={setView} />}
          {view === "register" && <Register setView={setView} />}
          {view === "forgot" && <Forgot setView={setView} />}
        </div>
      </div>
    </GameLayout>
  );
}

function Menu({ setView }: { setView: (v: View) => void }) {
  return (
    <>
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">🏠</div>
        <h1 className="text-3xl font-black">VỆ BINH SỐ</h1>
        <p className="text-muted-foreground font-bold">Đăng nhập để xây dựng thế giới!</p>
      </div>
      <div className="flex flex-col gap-3">
        <button className="toy-button w-full" style={{ background: "#1877F2", color: "white" }}>📘 ĐĂNG NHẬP BẰNG FACEBOOK</button>
        <button className="toy-button w-full" style={{ background: "white" }}>🔍 ĐĂNG NHẬP BẰNG GOOGLE</button>
        <div className="text-center text-muted-foreground font-bold">— HOẶC —</div>
        <button onClick={() => setView("login")} className="toy-button toy-button-primary w-full !text-lg !py-3">🔑 ĐĂNG NHẬP TÀI KHOẢN</button>
        <button onClick={() => setView("register")} className="toy-button toy-button-green w-full">✨ ĐĂNG KÝ MỚI</button>
      </div>
    </>
  );
}

function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-black uppercase">{label}</span>
      <input type={type} placeholder={placeholder} className="mt-1 w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold" />
    </label>
  );
}

function Login({ setView }: { setView: (v: View) => void }) {
  return (
    <>
      <h2 className="text-2xl font-black text-center mb-4">Đăng nhập</h2>
      <div className="flex flex-col gap-3">
        <Field label="Tên đăng nhập / Email" />
        <Field label="Mật khẩu" type="password" />
        <button onClick={() => setView("forgot")} className="text-right text-sm font-bold text-orange-600">Quên mật khẩu?</button>
        <Link to="/" className="toy-button toy-button-primary w-full text-center !text-lg">VÀO GAME 🚀</Link>
        <div className="text-center text-sm">
          Chưa có tài khoản? <button onClick={() => setView("register")} className="font-black text-orange-600">Đăng ký ngay</button>
        </div>
        <button onClick={() => setView("menu")} className="toy-button w-full">« Quay lại</button>
      </div>
    </>
  );
}

function Register({ setView }: { setView: (v: View) => void }) {
  return (
    <>
      <h2 className="text-2xl font-black text-center mb-4">Đăng ký mới</h2>
      <div className="flex flex-col gap-3">
        <Field label="Tên đăng nhập (*)" />
        <Field label="Email (*)" type="email" placeholder="ten@vi-du.com" />
        <Field label="Mật khẩu (*)" type="password" />
        <Field label="Xác nhận mật khẩu (*)" type="password" />
        <button className="toy-button toy-button-green w-full !text-lg">Tạo tài khoản ✨</button>
        <button onClick={() => setView("menu")} className="toy-button w-full">Quay lại Đăng nhập</button>
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
        <button className="toy-button toy-button-accent w-full !text-lg">Thay đổi mật khẩu 🛠️</button>
        <button onClick={() => setView("menu")} className="toy-button w-full">Hủy bỏ</button>
      </div>
    </>
  );
}
