// Dùng chung client + server. KHÔNG import supabase ở đây.
import Papa from "papaparse";

export const EVAL_KINDS = ["text", "link", "email", "phone", "news"] as const;
export type EvalKind = (typeof EVAL_KINDS)[number];
export type EvalLabel = "scam" | "legit";
export type Band = "high" | "mid" | "low";

export const EVAL_KIND_LABELS: Record<EvalKind, string> = {
  text: "Văn bản/tin nhắn",
  link: "Link",
  email: "Email",
  phone: "Số điện thoại",
  news: "Tin tức",
};

export const EVAL_CSV_COLUMNS = ["loai", "noi_dung", "nhan", "boi_canh", "nhom", "nguon"] as const;

export function isEvalKind(v: unknown): v is EvalKind {
  return typeof v === "string" && (EVAL_KINDS as readonly string[]).includes(v);
}

export function riskScoreOf(kind: EvalKind, result: unknown): number | null {
  const r = (result ?? {}) as Record<string, unknown>;
  const key = kind === "text" ? "misinfoRisk" : kind === "news" ? "fakeScore" : "riskScore";
  const v = r[key];
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}

export function bandOf(score: number): Band {
  return score >= 70 ? "high" : score >= 40 ? "mid" : "low";
}

export function predictLabel(score: number): EvalLabel {
  return score >= 70 ? "scam" : "legit";
}

export type EvalRow = {
  check_kind: EvalKind;
  content: string;
  label: EvalLabel;
  context: string | null;
  grp: string | null;
  source: string | null;
};

/** Kiểm tra một dòng; trả về lỗi (chuỗi) hoặc dòng đã chuẩn hoá. */
export function validateEvalRow(raw: Record<string, unknown>): EvalRow | string {
  const kind = String(raw.check_kind ?? raw.loai ?? "").trim().toLowerCase();
  if (!isEvalKind(kind)) return `Loại "${kind}" không hợp lệ (text, link, email, phone, news)`;
  const content = String(raw.content ?? raw.noi_dung ?? "").trim();
  const rawLabel = String(raw.label ?? raw.nhan ?? "").trim().toLowerCase();
  const label: EvalLabel | null =
    rawLabel === "lua_dao" || rawLabel === "scam" ? "scam" : rawLabel === "that" || rawLabel === "legit" ? "legit" : null;
  if (!label) return `Nhãn "${rawLabel}" không hợp lệ (lua_dao hoặc that)`;
  const min: Record<EvalKind, number> = { text: 20, email: 5, news: 15, link: 3, phone: 0 };
  if (kind === "phone") {
    if (content.replace(/\D/g, "").length < 8) return "Số điện thoại phải có ít nhất 8 chữ số";
  } else if (content.length < min[kind]) {
    return `Nội dung quá ngắn (tối thiểu ${min[kind]} ký tự)`;
  }
  const max = kind === "link" ? 500 : 6000;
  if (content.length > max) return `Nội dung quá dài (tối đa ${max} ký tự)`;
  const opt = (v: unknown, n: number) => {
    const s = String(v ?? "").trim();
    return s ? s.slice(0, n) : null;
  };
  return {
    check_kind: kind,
    content,
    label,
    context: opt(raw.context ?? raw.boi_canh, 1500),
    grp: opt(raw.grp ?? raw.nhom, 100),
    source: opt(raw.source ?? raw.nguon, 300),
  };
}

export function parseEvalCsv(text: string): { rows: EvalRow[]; errors: { line: number; message: string }[] } {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const rows: EvalRow[] = [];
  const errors: { line: number; message: string }[] = [];
  const fields = parsed.meta.fields ?? [];
  const missing = ["loai", "noi_dung", "nhan"].filter((c) => !fields.includes(c));
  if (missing.length) return { rows, errors: [{ line: 1, message: `Thiếu cột: ${missing.join(", ")}` }] };
  parsed.data.forEach((r, i) => {
    const line = i + 2; // dòng 1 là tiêu đề
    const v = validateEvalRow(r);
    if (typeof v === "string") errors.push({ line, message: v });
    else rows.push(v);
  });
  return { rows, errors };
}

export type EvalResultLite = {
  case_id: string;
  attempt: number;
  check_kind: string;
  label: string;
  risk_score: number | null;
  band: string | null;
  predicted: string | null;
  correct: boolean | null;
  skill_key: string | null;
  skill_version: number | null;
  margin: number | null;
  error: string | null;
};

type Core = {
  total: number; correct: number; accuracy: number | null;
  legitTotal: number; falsePositives: number; falsePositiveRate: number | null;
  scamTotal: number; misses: number; missRate: number | null;
  midCount: number; errorCount: number;
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function core(results: EvalResultLite[]): Core {
  const ok = results.filter((r) => !r.error && r.predicted);
  const legit = ok.filter((r) => r.label === "legit");
  const scam = ok.filter((r) => r.label === "scam");
  const correct = ok.filter((r) => r.correct).length;
  const fp = legit.filter((r) => r.predicted === "scam").length;
  const miss = scam.filter((r) => r.predicted === "legit").length;
  return {
    total: ok.length, correct, accuracy: ratio(correct, ok.length),
    legitTotal: legit.length, falsePositives: fp, falsePositiveRate: ratio(fp, legit.length),
    scamTotal: scam.length, misses: miss, missRate: ratio(miss, scam.length),
    midCount: ok.filter((r) => r.band === "mid").length,
    errorCount: results.filter((r) => !!r.error || !r.predicted).length,
  };
}

export type EvalMetrics = Core & {
  byKind: Record<string, Core>;
  avgMarginCorrect: number | null;
  avgMarginWrong: number | null;
  stability: { same: number; total: number; rate: number | null } | null;
  versionsUsed: string[];
};

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export function computeMetrics(results: EvalResultLite[]): EvalMetrics {
  const byKind: Record<string, Core> = {};
  for (const k of EVAL_KINDS) {
    const sub = results.filter((r) => r.check_kind === k);
    if (sub.length) byKind[k] = core(sub);
  }
  const ok = results.filter((r) => !r.error && r.predicted);
  const margins = (c: boolean) => ok.filter((r) => !!r.correct === c && typeof r.margin === "number").map((r) => r.margin as number);
  let stability: EvalMetrics["stability"] = null;
  if (results.some((r) => r.attempt === 2)) {
    const byCase = new Map<string, Map<number, string>>();
    for (const r of ok) {
      if (!byCase.has(r.case_id)) byCase.set(r.case_id, new Map());
      byCase.get(r.case_id)!.set(r.attempt, r.predicted!);
    }
    let same = 0, total = 0;
    for (const m of byCase.values()) {
      if (m.has(1) && m.has(2)) { total++; if (m.get(1) === m.get(2)) same++; }
    }
    stability = { same, total, rate: ratio(same, total) };
  }
  const versions = new Set<string>();
  for (const r of results) if (r.skill_key) versions.add(`${r.skill_key}@${r.skill_version ?? "?"}`);
  return {
    ...core(results),
    byKind,
    avgMarginCorrect: avg(margins(true)),
    avgMarginWrong: avg(margins(false)),
    stability,
    versionsUsed: [...versions].sort(),
  };
}

/** Có skill nào xuất hiện với hơn 1 phiên bản không. */
export function hasMixedVersions(versionsUsed: string[]): boolean {
  const seen = new Map<string, number>();
  for (const v of versionsUsed) {
    const k = v.split("@")[0];
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen.values()].some((n) => n > 1);
}

/** So sánh theo lần chạy 1 của mỗi câu. */
export function compareRuns(a: EvalResultLite[], b: EvalResultLite[]) {
  const pick = (rs: EvalResultLite[]) => {
    const m = new Map<string, EvalResultLite>();
    for (const r of rs) if (r.attempt === 1 && !r.error && r.predicted) m.set(r.case_id, r);
    return m;
  };
  const ma = pick(a), mb = pick(b);
  const fixed: { caseId: string; a: EvalResultLite; b: EvalResultLite }[] = [];
  const broken: { caseId: string; a: EvalResultLite; b: EvalResultLite }[] = [];
  for (const [id, ra] of ma) {
    const rb = mb.get(id);
    if (!rb) continue;
    if (!ra.correct && rb.correct) fixed.push({ caseId: id, a: ra, b: rb });
    else if (ra.correct && !rb.correct) broken.push({ caseId: id, a: ra, b: rb });
  }
  return { fixed, broken };
}

export function fmtPct(n: number, d: number): string {
  if (!d) return "—";
  return `${((n / d) * 100).toFixed(1).replace(".", ",")}% (${n}/${d})`;
}

export const SAMPLE_EVAL_CSV = [
  EVAL_CSV_COLUMNS.join(","),
  `text,"[NganHang ABC] Tai khoan cua quy khach bi tam khoa. Xac minh ngay tai http://abc-bank-xacminh.top de tranh bi phong toa.",lua_dao,,gia danh ngan hang,hu cau`,
  `text,"Thông báo: Trường THCS Ví Dụ cho học sinh nghỉ học thứ Sáu để tổ chức hội thao. Phụ huynh xem chi tiết trên cổng thông tin của trường.",that,,thong bao truong,hu cau`,
  `text,"Ma OTP cua ban la 482913. Ma co hieu luc trong 5 phut. Khong chia se ma nay cho bat ky ai.",that,,OTP ngan hang,hu cau`,
  `link,shopee.vn.uudai-2026.click/dang-nhap,lua_dao,,link gia,hu cau`,
].join("\n");
