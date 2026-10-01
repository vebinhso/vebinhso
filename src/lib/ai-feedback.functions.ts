import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FEEDBACK_KINDS, type FeedbackKind } from "@/lib/ai-skills";
import { FEEDBACK_REASON_KEYS, redactForFeedback, type FeedbackReason } from "@/lib/ai-feedback";

type Role = "student" | "teacher" | "admin";
const DAILY_LIMIT = 30;
const TEXT_KINDS: FeedbackKind[] = ["link", "email", "text", "phone", "news"];

async function resolveRole(userId: string): Promise<{ role: Role; consent: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const set = new Set((roles ?? []).map((r: { role: string }) => r.role));
  const role: Role = set.has("admin") ? "admin" : set.has("teacher") ? "teacher" : "student";
  let consent = false;
  if (role === "student") {
    const { data, error } = await (supabaseAdmin.rpc as unknown as (f: string, a: object) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "has_parent_consent", { _user_id: userId },
    );
    if (error) console.warn("[ai-feedback] has_parent_consent:", error.message);
    consent = data === true;
  }
  return { role, consent };
}

export const getMyFeedbackPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { role, consent } = await resolveRole(context.userId);
    return { role, canAttach: role !== "student" || consent };
  });

type Input = {
  kind: FeedbackKind;
  skillKey: string | null;
  skillVersion: number | null;
  resultLevel: string | null;
  resultScores: Record<string, number>;
  rating: 1 | -1;
  reason: FeedbackReason | null;
  note: string | null;
  attachedContent: string | null;
  studentOptIn: boolean;
};

export const submitCheckFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown): Input => {
    const x = (d ?? {}) as Record<string, unknown>;
    if (!FEEDBACK_KINDS.includes(x.kind as FeedbackKind)) throw new Error("Loại kiểm tra không hợp lệ");
    if (x.rating !== 1 && x.rating !== -1) throw new Error("Đánh giá không hợp lệ");
    const reason = x.reason == null || x.reason === "" ? null : x.reason;
    if (reason !== null && !FEEDBACK_REASON_KEYS.includes(reason as FeedbackReason)) throw new Error("Lý do không hợp lệ");
    const scores: Record<string, number> = {};
    if (x.resultScores && typeof x.resultScores === "object") {
      for (const [k, v] of Object.entries(x.resultScores as Record<string, unknown>).slice(0, 12)) {
        if (typeof v === "number" && Number.isFinite(v)) scores[k.slice(0, 40)] = v;
      }
    }
    const strOrNull = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
    return {
      kind: x.kind as FeedbackKind,
      skillKey: strOrNull(x.skillKey, 80),
      skillVersion: typeof x.skillVersion === "number" && Number.isInteger(x.skillVersion) ? x.skillVersion : null,
      resultLevel: strOrNull(x.resultLevel, 40),
      resultScores: scores,
      rating: x.rating,
      reason: reason as FeedbackReason | null,
      note: strOrNull(x.note, 500),
      attachedContent: strOrNull(x.attachedContent, 8000),
      studentOptIn: x.studentOptIn === true,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Keep `from` bound to the client. Extracting the proxied method loses its
    // internal client context and makes Supabase query building read `.rest`
    // from undefined.
    const from = (table: string) => (supabaseAdmin.from as unknown as (t: string) => any)(table);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count, error: cErr } = await from("ai_check_feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if (cErr) throw new Error("Không gửi được phản hồi, thử lại sau nhé.");
    if ((count ?? 0) >= DAILY_LIMIT) {
      throw new Error("Bạn đã gửi nhiều phản hồi hôm nay, thử lại vào ngày mai nhé.");
    }

    const { role, consent } = await resolveRole(context.userId);
    const textKind = TEXT_KINDS.includes(data.kind);
    let note: string | null = null;
    let attached: string | null = null;
    let basis: "parent_and_student" | "staff" | null = null;
    let expires: string | null = null;
    if (role === "student") {
      if (textKind && data.attachedContent && data.studentOptIn && consent) {
        attached = redactForFeedback(data.attachedContent);
        basis = "parent_and_student";
        expires = new Date(Date.now() + 90 * 86400_000).toISOString();
      }
    } else {
      note = data.note;
      if (textKind && data.attachedContent) {
        attached = redactForFeedback(data.attachedContent);
        basis = "staff";
      }
    }

    const { error } = await from("ai_check_feedback").insert({
      user_id: context.userId,
      reporter_role: role,
      check_kind: data.kind,
      skill_key: data.skillKey,
      skill_version: data.skillVersion,
      result_level: data.resultLevel,
      result_scores: data.resultScores,
      rating: data.rating,
      reason: data.rating === -1 ? data.reason : null,
      note,
      attached_content: attached,
      consent_basis: basis,
      content_expires_at: expires,
    });
    if (error) {
      console.error("[ai-feedback] insert:", error.message);
      throw new Error("Không gửi được phản hồi, thử lại sau nhé.");
    }
    // Không có lịch chạy tự động: dọn nội dung hết hạn mỗi lần ghi.
    const { error: pErr } = await (supabaseAdmin.rpc as unknown as (f: string) => Promise<{ error: { message: string } | null }>)("purge_expired_feedback_content");
    if (pErr) console.warn("[ai-feedback] purge:", pErr.message);
    return { ok: true };
  });
