import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getParentConsentRequest, respondParentConsent, revokeParentConsentByToken } from "@/lib/ai-feedback.functions";

type ConsentState = "loading" | "pending" | "granted" | "declined" | "revoked" | "expired" | "invalid";

export const Route = createFileRoute("/phu-huynh/dong-y")({
  validateSearch: (search: Record<string, unknown>) => ({ t: typeof search.t === "string" ? search.t : "" }),
  component: ParentConsentPage,
  head: () => ({ meta: [
    { title: "Đồng ý của phụ huynh — Vệ Binh Số" },
    { name: "description", content: "Phụ huynh xem và quyết định quyền gửi nội dung đã che thông tin cá nhân để cải thiện kiểm tra an toàn." },
    { property: "og:title", content: "Đồng ý của phụ huynh — Vệ Binh Số" },
    { property: "og:description", content: "Trang xác nhận dành cho cha, mẹ hoặc người giám hộ." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ParentConsentPage() {
  const { t: token } = Route.useSearch();
  const readRequest = useServerFn(getParentConsentRequest);
  const respond = useServerFn(respondParentConsent);
  const revoke = useServerFn(revokeParentConsentByToken);
  const [state, setState] = useState<ConsentState>("loading");
  const [studentName, setStudentName] = useState("học sinh");
  const [parentName, setParentName] = useState("");
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    readRequest({ data: { token } }).then((result) => {
      if (!active) return;
      setState(result.state as ConsentState);
      if (result.studentName) setStudentName(result.studentName);
      if (result.parentName) setParentName(result.parentName);
    }).catch(() => active && setState("invalid"));
    return () => { active = false; };
  }, [readRequest, token]);

  const decide = async (approve: boolean) => {
    setBusy(true); setError("");
    try { setState((await respond({ data: { token, parentName, isGuardian: guardian, approve } })).state); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-background px-4 py-10 text-foreground">
    <section className="mx-auto max-w-xl space-y-6 rounded-lg border-2 border-border bg-card p-5 sm:p-8">
      <div><p className="text-sm font-black text-primary">VỆ BINH SỐ</p><h1 className="mt-1 text-3xl font-black">Đồng ý của phụ huynh</h1></div>
      {state === "loading" && <p className="text-lg font-bold">Đang kiểm tra liên kết…</p>}
      {state === "pending" && <>
        <p className="text-lg font-bold">{studentName} muốn gửi nội dung đã kiểm tra để giúp cải thiện tính năng kiểm tra an toàn.</p>
        <div className="space-y-2 text-base">
          <p>Hệ thống tự che email, số điện thoại và số căn cước.</p>
          <p>Nội dung đính kèm tự xóa sau 90 ngày. Phụ huynh có thể rút lại đồng ý bất cứ lúc nào.</p>
        </div>
        <label className="block space-y-2 font-bold">Họ tên phụ huynh<input value={parentName} maxLength={100} onChange={(e) => setParentName(e.target.value)} className="w-full rounded-md border-2 border-border bg-background p-3 text-lg" /></label>
        <label className="flex items-start gap-3 text-base font-bold"><input type="checkbox" className="mt-1 size-5" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} /><span>Tôi là cha, mẹ hoặc người giám hộ của học sinh này.</span></label>
        <div className="grid gap-3 sm:grid-cols-2"><Button disabled={busy} size="lg" onClick={() => void decide(true)}>Tôi đồng ý</Button><Button disabled={busy} size="lg" variant="outline" onClick={() => void decide(false)}>Tôi không đồng ý</Button></div>
      </>}
      {state === "granted" && <><h2 className="text-2xl font-black">Đã đồng ý</h2><p className="text-lg">Quyền gửi nội dung đã che thông tin cá nhân đã được bật cho {studentName}.</p><Button disabled={busy} variant="destructive" onClick={async () => { setBusy(true); try { setState((await revoke({ data: { token } })).state); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Rút lại đồng ý</Button></>}
      {state === "declined" && <><h2 className="text-2xl font-black">Đã từ chối</h2><p>Không có nội dung nào được phép gửi kèm theo liên kết này.</p></>}
      {state === "revoked" && <><h2 className="text-2xl font-black">Đã rút lại đồng ý</h2><p>Nội dung đính kèm trước đây của học sinh đã được xóa.</p></>}
      {state === "expired" && <><h2 className="text-2xl font-black">Liên kết đã hết hạn</h2><p>Hãy nhờ học sinh tạo một liên kết mới.</p></>}
      {state === "invalid" && <><h2 className="text-2xl font-black">Liên kết không hợp lệ</h2><p>Vui lòng kiểm tra lại liên kết đã nhận.</p></>}
      {error && <p className="font-bold text-destructive">{error}</p>}
      <p className="border-t pt-4 text-sm">Cần hỗ trợ? Liên hệ <a className="font-black text-primary underline" href="mailto:vebinhso.org@gmail.com">vebinhso.org@gmail.com</a></p>
    </section>
  </main>;
}