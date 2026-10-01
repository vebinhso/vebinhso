// Dùng chung client + server. KHÔNG import supabase ở đây.

export const FEEDBACK_REASONS = [
  { key: "wrong_level", vi: "Sai mức rủi ro", en: "Wrong risk level" },
  { key: "missing_signs", vi: "Thiếu dấu hiệu", en: "Missing signs" },
  { key: "bad_advice", vi: "Lời khuyên chưa đúng", en: "Unhelpful advice" },
  { key: "typo", vi: "Lỗi chữ", en: "Typo or wording error" },
  { key: "other", vi: "Khác", en: "Other" },
] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number]["key"];
export const FEEDBACK_REASON_KEYS = FEEDBACK_REASONS.map((r) => r.key) as readonly FeedbackReason[];

const SCORE_FIELDS = [
  "riskScore", "fakeScore", "tabloidScore", "aiScore", "editedScore", "deepfakeScore", "misinfoRisk", "confidence",
] as const;

export function pickScores(result: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!result || typeof result !== "object") return out;
  const r = result as Record<string, unknown>;
  for (const k of SCORE_FIELDS) {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

/** Che thông tin cá nhân trước khi lưu nội dung đính kèm. */
export function redactForFeedback(text: string): string {
  let s = String(text ?? "");
  // Link: bỏ query/fragment
  s = s.replace(/\b((?:https?:\/\/|www\.)[^\s?#]*)[?#][^\s]*/gi, "$1");
  // Email
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]");
  // Số điện thoại VN: 0xxx hoặc +84xxx, cho phép cách/chấm/gạch
  s = s.replace(/(?<![\d+])(?:\+84|0)(?:[\s.-]?\d){8,10}(?!\d)/g, (m) => {
    const compact = m.replace(/[\s.-]/g, "");
    if (compact.length < 9) return m;
    const head = compact.slice(0, 4);
    const tail = compact.slice(-2);
    return head + "x".repeat(Math.max(1, compact.length - 6)) + tail;
  });
  // Dãy số dài còn lại (CCCD, tài khoản...)
  s = s.replace(/\d{9,}/g, "[số]");
  return s.slice(0, 2000);
}

export type FeedbackRow = {
  skill_key: string | null;
  skill_version: number | null;
  reporter_role: "student" | "teacher" | "admin";
  rating: number;
  reason: string | null;
};

export type FeedbackSummary = {
  skillKey: string | null;
  skillVersion: number | null;
  students: { total: number; up: number };
  staff: { total: number; up: number };
  topReasons: { reason: string; count: number }[];
};

export function summarizeFeedback(rows: FeedbackRow[]): FeedbackSummary[] {
  const groups = new Map<string, { s: FeedbackSummary; reasons: Map<string, number> }>();
  for (const r of rows) {
    const id = `${r.skill_key ?? ""}::${r.skill_version ?? ""}`;
    let g = groups.get(id);
    if (!g) {
      g = {
        s: { skillKey: r.skill_key, skillVersion: r.skill_version, students: { total: 0, up: 0 }, staff: { total: 0, up: 0 }, topReasons: [] },
        reasons: new Map(),
      };
      groups.set(id, g);
    }
    const bucket = r.reporter_role === "student" ? g.s.students : g.s.staff;
    bucket.total += 1;
    if (r.rating > 0) bucket.up += 1;
    else if (r.reason) g.reasons.set(r.reason, (g.reasons.get(r.reason) ?? 0) + 1);
  }
  return [...groups.values()].map(({ s, reasons }) => ({
    ...s,
    topReasons: [...reasons.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count })),
  })).sort((a, b) =>
    (a.skillKey ?? "~").localeCompare(b.skillKey ?? "~") || (b.skillVersion ?? 0) - (a.skillVersion ?? 0));
}
