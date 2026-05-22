import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getAccounts, type Account } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Máy chủ - Quản lý tài khoản" }] }),
});

function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    setAccounts(getAccounts().sort((a, b) => a.id - b.id));
  }, []);

  return (
    <GameLayout showBack>
      <div className="flex-1 p-4 md:p-8">
        <div className="glass-card max-w-5xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">🖥️ MÁY CHỦ — TÀI KHOẢN</h1>
              <p className="font-bold text-muted-foreground text-sm">
                Tổng số tài khoản: {accounts.length}
              </p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center font-bold">
              Chưa có tài khoản nào được tạo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-orange-100 font-black">
                    <th className="p-3 rounded-l-xl">STT</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">Tên đăng nhập</th>
                    <th className="p-3">Email</th>
                    <th className="p-3 rounded-r-xl">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a, idx) => (
                    <tr key={a.id} className="border-b border-gray-200 font-bold">
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3 text-orange-600">#{a.id}</td>
                      <td className="p-3">{a.username}</td>
                      <td className="p-3 text-muted-foreground">{a.email}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
