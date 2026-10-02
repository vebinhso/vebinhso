import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FEEDBACK_KINDS, type FeedbackKind } from "@/lib/ai-skills";
import { FEEDBACK_REASON_KEYS, redactForFeedback, type FeedbackReason } from "@/lib/ai-feedback";
import { phonePrefix, registrableDomain } from "@/lib/ai-signals";

type Role = "student" | "teacher" | "admin";
const DAILY_LIMIT = 30;
const TEXT_KINDS: FeedbackKind[] = ["link", "email", "text", "phone", "news"];

async function resolveRole(userId: string): Promise<{ role: Role; consent: boolean; consentSource: "class" | "parent_link" | "staff" | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const set = new Set((roles ?? []).map((r: { role: string }) => r.role));
  const role: Role = set.has("admin") ? "admin" : set.has("teacher") ? "teacher" : "student";
  let consent = false;
  let consentSource: "class" | "parent_link" | "staff" | null = role === "student" ? null : "staff";
  if (role === "student") {
    const { data, error } = await (supabaseAdmin.rpc as unknown as (f: string, a: object) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "has_parent_consent", { _user_id: userId },
    );
    if (error) console.warn("[ai-feedback] has_parent_consent:", error.message);
    consent = data === true;
    if (consent) {
      const [{ data: classConsent }, { data: linkConsent }] = await Promise.all([
        supabaseAdmin.from("classroom_members").select("student_id").eq("student_id", userId).eq("parent_consent_ai", true).limit(1),
        supabaseAdmin.from("parent_consents").select("id").eq("student_id", userId).eq("status", "granted").limit(1),
      ]);
      consentSource = (classConsent?.length ?? 0) > 0 ? "class" : (linkConsent?.length ?? 0) > 0 ? "parent_link" : null;
    }
  }
  return { role, consent, consentSource };
}

export const getMyFeedbackPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { role, consent, consentSource } = await resolveRole(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pending } = role === "student" ? await supabaseAdmin.from("parent_consents")
      .select("id").eq("student_id", context.userId).eq("status", "pending").gt("expires_at", new Date().toISOString()).limit(1) : { data: [] };
    return { role, canAttach: role !== "student" || consent, consentSource, hasPendingRequest: (pending?.length ?? 0) > 0 };
  });

const tokenHash = async (token: string) => {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
};

export const createParentConsentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { role } = await resolveRole(context.userId);
    if (role !== "student") throw new Error("Chỉ tài khoản học sinh mới cần xin phép phụ huynh.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 86400_000).toISOString();
    const { count } = await supabaseAdmin.from("parent_consents").select("id", { count: "exact", head: true })
      .eq("student_id", context.userId).gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("Hôm nay em đã tạo đủ 3 liên kết. Hãy dùng lại liên kết đã gửi.");
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...tokenBytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const { error } = await supabaseAdmin.from("parent_consents").insert({
      student_id: context.userId,
      token_hash: await tokenHash(token),
      expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    });
    if (error) throw new Error("Không tạo được liên kết, thử lại sau nhé.");
    return { url: `https://vebinhso.vn/phu-huynh/dong-y?t=${encodeURIComponent(token)}` };
  });

const readConsent = async (token: string) => {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("parent_consents")
    .select("id, status, expires_at, student_id, parent_name").eq("token_hash", await tokenHash(token)).maybeSingle();
  return data;
};

export const getParentConsentRequest = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => ({ token: String(d?.token ?? "").slice(0, 100) }))
  .handler(async ({ data }) => {
    const row = await readConsent(data.token);
    if (!row) return { state: "invalid" as const, studentName: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("display_name, username").eq("user_id", row.student_id).maybeSingle();
    const expired = new Date(row.expires_at).getTime() <= Date.now();
    return { state: expired && row.status === "pending" ? "expired" as const : row.status, studentName: profile?.display_name || profile?.username || "học sinh", parentName: row.parent_name };
  });

export const respondParentConsent = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; parentName: string; isGuardian: boolean; approve: boolean }) => {
    const parentName = String(d?.parentName ?? "").trim().slice(0, 100);
    if (parentName.length < 2) throw new Error("Vui lòng nhập họ tên phụ huynh.");
    if (d?.isGuardian !== true) throw new Error("Vui lòng xác nhận vai trò cha, mẹ hoặc người giám hộ.");
    return { token: String(d?.token ?? "").slice(0, 100), parentName, approve: d?.approve === true };
  })
  .handler(async ({ data }) => {
    const row = await readConsent(data.token);
    if (!row || row.status !== "pending" || new Date(row.expires_at).getTime() <= Date.now()) throw new Error("Liên kết không còn hiệu lực.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("parent_consents").update({
      status: data.approve ? "granted" : "declined", parent_name: data.parentName, responded_at: new Date().toISOString(),
    }).eq("id", row.id).eq("status", "pending");
    if (error) throw new Error("Không lưu được lựa chọn, vui lòng thử lại.");
    return { state: data.approve ? "granted" as const : "declined" as const };
  });

export const revokeParentConsentByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => ({ token: String(d?.token ?? "").slice(0, 100) }))
  .handler(async ({ data }) => {
    const row = await readConsent(data.token);
    if (!row || row.status !== "granted") throw new Error("Không tìm thấy đồng ý đang có hiệu lực.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("revoke_all_parent_consent", { _student_id: row.student_id });
    if (error) throw new Error("Chưa rút lại được đồng ý, vui lòng thử lại.");
    return { state: "revoked" as const };
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
  signalKey: string | null;
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
      signalKey: strOrNull(x.signalKey, 253),
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

    const { role, consent, consentSource } = await resolveRole(context.userId);
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
      consent_source: basis === "staff" ? "staff" : basis ? consentSource : null,
    });
    if (error) {
      console.error("[ai-feedback] insert:", error.message);
      throw new Error("Không gửi được phản hồi, thử lại sau nhé.");
    }
    // Không có lịch chạy tự động: dọn nội dung hết hạn mỗi lần ghi.
    const { error: pErr } = await (supabaseAdmin.rpc as unknown as (f: string) => Promise<{ error: { message: string } | null }>)("purge_expired_feedback_content");
    if (pErr) console.warn("[ai-feedback] purge:", pErr.message);
    if ((data.kind === "link" || data.kind === "phone") && data.signalKey) {
      const normalized = data.kind === "link" ? registrableDomain(data.signalKey) : phonePrefix(data.signalKey);
      if (normalized) {
        const { error: rErr } = await supabaseAdmin.rpc("bump_signal_rating", { _table: data.kind === "link" ? "domain" : "phone", _key: normalized, _rating: data.rating });
        if (rErr) console.warn("[ai-feedback] signal rating:", rErr.message);
      }
    }
    return { ok: true };
  });
