import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { localize, useLocale } from "@/lib/locale";
import { FEEDBACK_REASONS, pickScores, type FeedbackReason } from "@/lib/ai-feedback";
import type { FeedbackKind } from "@/lib/ai-skills";
import { getMyFeedbackPermissions, submitCheckFeedback } from "@/lib/ai-feedback.functions";

type Perms = { role: "student" | "teacher" | "admin"; canAttach: boolean };
let permsCache: Promise<Perms> | null = null;

type Props = { kind: FeedbackKind; result: any; input?: string };

export function CheckFeedback({ kind, result, input }: Props) {
  const locale = useLocale();
  const t = (vi: string, en: string) => localize(locale, vi, en);
  const fetchPerms = useServerFn(getMyFeedbackPermissions);
  const submit = useServerFn(submitCheckFeedback);
  const [perms, setPerms] = useState<Perms | null>(null);
  const [stage, setStage] = useState<"idle" | "reasons" | "sending" | "done">("idle");
  const [optIn, setOptIn] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!permsCache) {
      permsCache = fetchPerms().catch((e) => { permsCache = null; throw e; });
    }
    let alive = true;
    permsCache.then((p) => { if (alive) setPerms(p); }).catch(() => { /* ẩn tùy chọn đính kèm */ });
    return () => { alive = false; };
  }, [fetchPerms]);

  // Kết quả mới → trở lại trạng thái ban đầu
  useEffect(() => {
    setStage("idle"); setOptIn(false); setNote(""); setErr(null);
  }, [result]);

  const isStudent = perms?.role === "student";
  const isStaff = perms && perms.role !== "student";
  const hasInput = !!input && input.trim().length > 0;

  const send = async (rating: 1 | -1, reason: FeedbackReason | null) => {
    setStage("sending"); setErr(null);
    try {
      await submit({
        data: {
          kind,
          skillKey: result?.skillKey ?? null,
          skillVersion: result?.skillVersion ?? null,
          resultLevel: (result?.level ?? result?.verdict ?? null) as string | null,
          resultScores: pickScores(result),
          rating,
          reason,
          note: isStaff ? note : null,
          attachedContent: hasInput && optIn ? input! : null,
          studentOptIn: !!isStudent && optIn,
        },
      });
      setStage("done");
    } catch (e) {
      setErr((e as Error)?.message || t("Không gửi được phản hồi.", "Could not send feedback."));
      setStage(rating === -1 ? "reasons" : "idle");
    }
  };

  if (stage === "done") {
    return (
      <div className="mt-3 rounded-xl border-2 border-border bg-background/70 p-3 text-sm font-black">
        {t("Cảm ơn em!", "Thanks!")}
      </div>
    );
  }

  const busy = stage === "sending";
  return (
    <div className="mt-3 rounded-xl border-2 border-border bg-background/70 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-black">{t("Kết quả này có đúng không?", "Was this result right?")}</span>
        <button type="button" disabled={busy} onClick={() => void send(1, null)}
          aria-label={t("Đúng", "Right")} className="toy-button !text-base !py-1 !px-3">👍</button>
        <button type="button" disabled={busy} onClick={() => setStage("reasons")}
          aria-label={t("Chưa đúng", "Not right")}
          className={`toy-button !text-base !py-1 !px-3 ${stage === "reasons" ? "toy-button-primary" : ""}`}>👎</button>
      </div>

      {stage === "reasons" && (
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_REASONS.map((r) => (
            <button key={r.key} type="button" disabled={busy} onClick={() => void send(-1, r.key)}
              className="rounded-full border-2 border-border bg-background px-3 py-1 text-xs font-bold hover:bg-muted">
              {t(r.vi, r.en)}
            </button>
          ))}
        </div>
      )}

      {isStudent && hasInput && perms?.canAttach && (
        <label className="flex items-start gap-2 text-xs font-bold">
          <input type="checkbox" className="mt-0.5" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
          <span>{t(
            "Gửi kèm nội dung này để thầy cô cải thiện AI. Hệ thống tự che thông tin cá nhân và tự xóa sau 90 ngày.",
            "Attach this content so teachers can improve the AI. Personal info is hidden automatically and deleted after 90 days.",
          )}</span>
        </label>
      )}
      {isStudent && hasInput && perms && !perms.canAttach && (
        <p className="text-[11px] font-bold text-muted-foreground">
          {t("Muốn gửi kèm nội dung, phụ huynh cần đồng ý qua thầy cô.", "To attach content, a parent must give consent through your teacher.")}
        </p>
      )}
      {isStaff && (
        <>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2}
            placeholder={t("Ghi chú (không bắt buộc)", "Note (optional)")}
            className="w-full rounded-lg border-2 border-border bg-background p-2 text-xs font-bold" />
          {hasInput && (
            <label className="flex items-start gap-2 text-xs font-bold">
              <input type="checkbox" className="mt-0.5" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
              <span>{t(
                "Đính kèm nội dung đã kiểm tra (tự che email, số điện thoại, số CCCD)",
                "Attach the checked content (emails, phone numbers and ID numbers are hidden)",
              )}</span>
            </label>
          )}
        </>
      )}
      {err && <p className="text-xs font-bold text-destructive">{err}</p>}
    </div>
  );
}
