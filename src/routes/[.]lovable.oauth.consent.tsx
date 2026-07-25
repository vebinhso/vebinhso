import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};
const authOauth = () =>
  (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
      approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
      denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
    };
  }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <p>Không tải được yêu cầu xác thực: {String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as OAuthDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = authOauth();
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Máy chủ ủy quyền không trả về URL chuyển hướng.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "ứng dụng bên ngoài";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-2xl font-black mb-2">Cho phép {clientName} truy cập?</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ứng dụng này sẽ có thể đọc hồ sơ, trạng thái game, bạn bè và vật phẩm của bạn trong Vệ Binh Số dưới danh nghĩa của bạn.
        </p>
        {error && <p role="alert" className="text-red-600 font-bold text-sm mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-2xl border-2 border-gray-300 py-3 font-black hover:bg-gray-50 disabled:opacity-60"
          >
            Từ chối
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 toy-button toy-button-primary !py-3"
          >
            {busy ? "Đang xử lý…" : "Cho phép"}
          </button>
        </div>
      </div>
    </main>
  );
}
