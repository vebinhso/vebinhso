import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EVAL_KINDS, validateEvalRow, riskScoreOf, bandOf, predictLabel, computeMetrics,
  type EvalKind, type EvalRow, type EvalResultLite,
} from "@/lib/ai-eval";
import { redactForFeedback } from "@/lib/ai-feedback";

const MAX_CASES = 200;

type Ctx = { supabase: { rpc: (f: string, a: object) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string };

async function admin(context: unknown) {
  const c = context as Ctx;
  const { data, error } = await c.supabase.rpc("has_role", { _user_id: c.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Chỉ admin được dùng chức năng này");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const from = (t: string) => (supabaseAdmin.from as unknown as (t: string) => any)(t);
  return { from, userId: c.userId };
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const uuid = (v: unknown) => {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error("ID không hợp lệ");
  return v;
};
const must = <T,>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

export const createEvalSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; description?: string }) => {
    const name = str(d?.name, 120);
    if (!name) throw new Error("Hãy đặt tên bộ đề");
    return { name, description: str(d?.description, 1000) || null };
  })
  .handler(async ({ data, context }) => {
    const { from, userId } = await admin(context);
    return must(await from("ai_eval_sets").insert({ ...data, created_by: userId }).select("*").single()) as { id: string };
  });

export const importEvalCases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { setId: string; rows: unknown[] }) => ({
    setId: uuid(d?.setId),
    rows: Array.isArray(d?.rows) ? d.rows.slice(0, MAX_CASES + 1) : [],
  }))
  .handler(async ({ data, context }) => {
    const { from } = await admin(context);
    const { count } = await from("ai_eval_cases").select("id", { count: "exact", head: true }).eq("set_id", data.setId);
    const errors: { line: number; message: string }[] = [];
    const ok: EvalRow[] = [];
    data.rows.forEach((r, i) => {
      const v = validateEvalRow((r ?? {}) as Record<string, unknown>);
      if (typeof v === "string") errors.push({ line: i + 2, message: v });
      else ok.push(v);
    });
    if ((count ?? 0) + ok.length > MAX_CASES) throw new Error(`Mỗi bộ đề tối đa ${MAX_CASES} câu (đang có ${count ?? 0})`);
    const insert = ok.map((r) => ({
      set_id: data.setId,
      ...r,
      content: r.check_kind === "link" || r.check_kind === "phone" ? r.content : redactForFeedback(r.content),
      context: r.context ? redactForFeedback(r.context) : null,
    }));
    if (insert.length) must(await from("ai_eval_cases").insert(insert));
    return { inserted: insert.length, errors };
  });

export const listEvalSets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { from } = await admin(context);
    const sets = must(await from("ai_eval_sets").select("*").order("created_at", { ascending: false })) as { id: string; name: string; description: string | null; created_at: string }[];
    const cases = must(await from("ai_eval_cases").select("set_id")) as { set_id: string }[];
    return sets.map((s) => ({ ...s, case_count: cases.filter((c) => c.set_id === s.id).length }));
  });

export type EvalCase = { id: string; set_id: string; check_kind: EvalKind; content: string; context: string | null; label: "scam" | "legit"; grp: string | null; source: string | null };

export const listEvalCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { setId: string }) => ({ setId: uuid(d?.setId) }))
  .handler(async ({ data, context }) => {
    const { from } = await admin(context);
    return must(await from("ai_eval_cases").select("*").eq("set_id", data.setId).order("created_at")) as EvalCase[];
  });

export const deleteEvalCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d?.id) }))
  .handler(async ({ data, context }) => {
    const { from } = await admin(context);
    must(await from("ai_eval_cases").delete().eq("id", data.id));
    return { ok: true };
  });

export const deleteEvalSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d?.id) }))
  .handler(async ({ data, context }) => {
    const { from } = await admin(context);
    must(await from("ai_eval_sets").delete().eq("id", data.id));
    return { ok: true };
  });

export type SkillSnapshot = Record<string, { skill_key: string | null; version: number | null; enabled: boolean | null }>;

async function readSnapshot(from: (t: string) => any): Promise<SkillSnapshot> {
  const map = must(await from("ai_check_skill").select("check_kind, skill_key").in("check_kind", [...EVAL_KINDS])) as { check_kind: string; skill_key: string | null }[];
  const skills = must(await from("ai_skills").select("key, version, enabled")) as { key: string; version: number; enabled: boolean }[];
  const snap: SkillSnapshot = {};
  for (const k of EVAL_KINDS) {
    const key = map.find((m) => m.check_kind === k)?.skill_key ?? null;
    const s = key ? skills.find((x) => x.key === key) : undefined;
    snap[k] = { skill_key: key, version: s?.version ?? null, enabled: s?.enabled ?? null };
  }
  return snap;
}

export const getCurrentSkillSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { from } = await admin(context);
    return readSnapshot(from);
  });

export const createEvalRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { setId: string; label: string; attempts: number }) => ({
    setId: uuid(d?.setId),
    label: str(d?.label, 120) || "Lượt",
    attempts: d?.attempts === 2 ? 2 : 1,
  }))
  .handler(async ({ data, context }) => {
    const { from, userId } = await admin(context);
    const snap = await readSnapshot(from);
    return must(await from("ai_eval_runs").insert({
      set_id: data.setId, label: data.label, attempts: data.attempts, skill_snapshot: snap, created_by: userId,
    }).select("*").single()) as EvalRun;
  });

export const saveEvalResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; caseId: string; attempt: number; result?: unknown; error?: string; durationMs?: number }) => ({
    runId: uuid(d?.runId),
    caseId: uuid(d?.caseId),
    attempt: d?.attempt === 2 ? 2 : 1,
    result: d?.result && typeof d.result === "object" ? (d.result as Record<string, unknown>) : null,
    error: d?.error ? str(d.error, 500) : null,
    durationMs: typeof d?.durationMs === "number" ? Math.max(0, Math.round(d.durationMs)) : null,
  }))
  .handler(async ({ data, context }) => {
    const { from } = await admin(context);
    const c = must(await from("ai_eval_cases").select("check_kind, label").eq("id", data.caseId).single()) as { check_kind: EvalKind; label: string };
    const r = data.result;
    const score = !data.error && r ? riskScoreOf(c.check_kind, r) : null;
    const predicted = score == null ? null : predictLabel(score);
    const acc = (r?.accuracy ?? {}) as { margin?: unknown };
    const signs = ([] as unknown[])
      .concat(r?.redFlags ?? [], r?.scamSigns ?? [])
      .filter((x): x is string => typeof x === "string")
      .slice(0, 5)
      .map((x) => x.slice(0, 200));
    const row = {
      run_id: data.runId, case_id: data.caseId, attempt: data.attempt,
      check_kind: c.check_kind, label: c.label,
      risk_score: score, band: score == null ? null : bandOf(score),
      predicted, correct: predicted == null ? null : predicted === c.label,
      skill_key: typeof r?.skillKey === "string" ? r.skillKey : null,
      skill_version: typeof r?.skillVersion === "number" ? r.skillVersion : null,
      margin: typeof acc.margin === "number" ? Math.round(acc.margin) : null,
      detail: { summary: typeof r?.summary === "string" ? r.summary.slice(0, 300) : "", signs },
      error: data.error ?? (r && score == null ? "Không đọc được điểm" : null),
      duration_ms: data.durationMs,
    };
    must(await from("ai_eval_results").upsert(row, { onConflict: "run_id,case_id,attempt" }));
    return { ok: true };
  });

export type EvalRun = { id: string; set_id: string; label: string; attempts: number; status: "running" | "done"; skill_snapshot: SkillSnapshot; metrics: ReturnType<typeof computeMetrics> | null; created_at: string; finished_at: string | null };
export type EvalResultRow = EvalResultLite & { id: string; detail: { summary?: string; signs?: string[] }; duration_ms: number | null };

export const finishEvalRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => ({ runId: uuid(d?.runId) }))
  .handler(async ({ data, context }) => {
    const { from } = await admin(context);
    const rows = must(await from("ai_eval_results").select("*").eq("run_id", data.runId)) as EvalResultLite[];
    const metrics = computeMetrics(rows);
    must(await from("ai_eval_runs").update({ metrics, status: "done", finished_at: new Date().toISOString() }).eq("id", data.runId));
    return metrics;
  });

export const listEvalRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { setId: string }) => ({ setId: uuid(d?.setId) }))
  .handler(async ({ data, context }) => {
    const { from } = await admin(context);
    return must(await from("ai_eval_runs").select("*").eq("set_id", data.setId).order("created_at")) as EvalRun[];
  });

export const getEvalRunResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => ({ runId: uuid(d?.runId) }))
  .handler(async ({ data, context }) => {
    const { from } = await admin(context);
    return must(await from("ai_eval_results").select("*").eq("run_id", data.runId)) as EvalResultRow[];
  });
