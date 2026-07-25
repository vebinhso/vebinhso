// Server functions for 1vs1 Duel Rooms inside houses.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAYOUT = 30;
const N_QUESTIONS = 10;

export type DuelTopic = {
  category: "digital" | "history";
  domain: number | null; // 1..6 or null (mixed)
  label: string;
  count: number;
};

export type DuelQuestion = {
  id: string;
  text: string;
  options: string[];
  imageUrl?: string | null;
  optionImages?: (string | null)[];
};

export type DuelSnapshot = {
  id: string;
  hostId: string;
  guestId: string;
  status: "pending" | "active" | "finished" | "cancelled";
  category: string | null;
  domain: number | null;
  hostScore: number;
  guestScore: number;
  winnerId: string | null;
  payout: number;
  questions: DuelQuestion[];
};

const DOMAIN_LABELS: Record<number, string> = {
  1: "Miền 1",
  2: "Miền 2",
  3: "Miền 3",
  4: "Miền 4",
  5: "Miền 5",
  6: "Miền 6",
};

/** Host creates a pending duel with a guest inside the same house. */
export const createDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { guestId: string; ownerId: string }) => {
    if (!input.guestId || typeof input.guestId !== "string") throw new Error("guestId required");
    if (!input.ownerId || typeof input.ownerId !== "string") throw new Error("ownerId required");
    return { guestId: input.guestId, ownerId: input.ownerId };
  })
  .handler(async ({ data, context }): Promise<{ duelId: string }> => {
    if (data.guestId === context.userId) throw new Error("Không thể mời chính mình");
    const { supabase, userId } = context;
    // Verify both users' presence points to the same house owner.
    const { data: rows, error: pErr } = await (supabase.from("presence") as any)
      .select("user_id, in_house_owner")
      .in("user_id", [userId, data.guestId]);
    if (pErr) throw new Error(pErr.message);
    const list = (rows ?? []) as Array<{ user_id: string; in_house_owner: string | null }>;
    const me = list.find((r) => r.user_id === userId);
    const them = list.find((r) => r.user_id === data.guestId);
    if (!me || me.in_house_owner !== data.ownerId) throw new Error("Bạn không ở trong căn nhà này");
    if (!them || them.in_house_owner !== data.ownerId) throw new Error("Đối thủ đã rời căn nhà này");

    const { data: ins, error } = await (supabase.from("duels") as any)
      .insert({
        host_id: userId,
        guest_id: data.guestId,
        house_owner: data.ownerId,
        status: "pending",
        payout: PAYOUT,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { duelId: String(ins.id) };
  });

/** Guest responds to invite: accept -> keep pending; decline -> cancelled. */
export const respondDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { duelId: string; accept: boolean }) => ({
    duelId: String(input.duelId),
    accept: !!input.accept,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await (supabase.from("duels") as any)
      .select("id, guest_id, status")
      .eq("id", data.duelId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Không tìm thấy phòng đấu");
    if (row.guest_id !== userId) throw new Error("Bạn không phải khách được mời");
    if (row.status !== "pending") return { ok: true, status: row.status };
    if (!data.accept) {
      await (supabase.from("duels") as any).update({ status: "cancelled" }).eq("id", data.duelId);
      return { ok: true, status: "cancelled" as const };
    }
    return { ok: true, status: "accepted" as const };
  });

/** List topics that have at least 10 enabled questions. */
export const listDuelTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DuelTopic[]> => {
    const { data, error } = await (context.supabase.from("questions_bank") as any)
      .select("category, competency_domain, enabled")
      .eq("enabled", true);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ category: string | null; competency_domain: number | null }>;
    const counter = new Map<string, { cat: "digital" | "history"; dom: number | null; n: number }>();
    for (const r of rows) {
      const cat: "digital" | "history" = r.category === "digital" ? "digital" : "history";
      const dom = typeof r.competency_domain === "number" ? r.competency_domain : null;
      for (const key of [`${cat}|all`, `${cat}|${dom ?? "none"}`]) {
        const cur = counter.get(key) ?? { cat, dom: key.endsWith("|all") ? null : dom, n: 0 };
        cur.n++;
        counter.set(key, cur);
      }
    }
    const out: DuelTopic[] = [];
    for (const [, v] of counter) {
      if (v.n < N_QUESTIONS) continue;
      const catLabel = v.cat === "digital" ? "Năng lực số" : "Lịch sử - Văn hoá";
      const label = v.dom == null ? `${catLabel} · Tất cả miền` : `${catLabel} · ${DOMAIN_LABELS[v.dom] ?? `Miền ${v.dom}`}`;
      out.push({ category: v.cat, domain: v.dom, label, count: v.n });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  });

/** Host picks a topic and starts the duel. Returns questions (without answers). */
export const startDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    duelId: string;
    category: "digital" | "history";
    domain: number | null;
  }) => ({
    duelId: String(input.duelId),
    category: input.category === "digital" ? ("digital" as const) : ("history" as const),
    domain: typeof input.domain === "number" ? input.domain : null,
  }))
  .handler(async ({ data, context }): Promise<DuelSnapshot> => {
    const { supabase, userId } = context;
    const { data: duel, error: dErr } = await (supabase.from("duels") as any)
      .select("*")
      .eq("id", data.duelId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!duel) throw new Error("Không tìm thấy phòng đấu");
    if (duel.host_id !== userId) throw new Error("Chỉ chủ phòng mới bắt đầu được");
    if (duel.status === "active" || duel.status === "finished") {
      return snapshotFromRow(duel, await loadQuestions(supabase, duel.question_ids));
    }
    // Pick 10 random enabled questions.
    let q = (supabase.from("questions_bank") as any)
      .select("id, text, choices, image_url, category, competency_domain, enabled")
      .eq("enabled", true)
      .eq("category", data.category);
    if (data.domain != null) q = q.eq("competency_domain", data.domain);
    const { data: pool, error: qErr } = await q.limit(500);
    if (qErr) throw new Error(qErr.message);
    const arr = ((pool ?? []) as any[]).filter((r) => Array.isArray(r.choices) && r.choices.length >= 2);
    if (arr.length < N_QUESTIONS) throw new Error("Không đủ câu hỏi cho chủ đề này");
    // Fisher-Yates shuffle, pick first 10
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const chosen = arr.slice(0, N_QUESTIONS);
    const ids = chosen.map((r) => String(r.id));

    const { data: updated, error: uErr } = await (supabase.from("duels") as any)
      .update({
        status: "active",
        topic_category: data.category,
        topic_domain: data.domain,
        question_ids: ids,
      })
      .eq("id", data.duelId)
      .select("*")
      .single();
    if (uErr) throw new Error(uErr.message);
    return snapshotFromRow(updated, chosen.map(mapQuestion));
  });

/** Get current duel snapshot (for guests who join after start). */
export const getDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { duelId: string }) => ({ duelId: String(input.duelId) }))
  .handler(async ({ data, context }): Promise<DuelSnapshot> => {
    const { supabase } = context;
    const { data: duel, error } = await (supabase.from("duels") as any)
      .select("*").eq("id", data.duelId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!duel) throw new Error("Không tìm thấy phòng đấu");
    const qs = await loadQuestions(supabase, duel.question_ids ?? []);
    return snapshotFromRow(duel, qs);
  });

/** Submit an answer. Graded server-side. */
export const submitDuelAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { duelId: string; qIndex: number; selected: number; ms: number }) => ({
    duelId: String(input.duelId),
    qIndex: Math.max(0, Math.floor(Number(input.qIndex) || 0)),
    selected: Math.floor(Number(input.selected) || 0),
    ms: Math.max(0, Math.floor(Number(input.ms) || 0)),
  }))
  .handler(async ({ data, context }): Promise<{ isCorrect: boolean; correctIndexes: number[] }> => {
    const { supabase, userId } = context;
    const { data: duel, error } = await (supabase.from("duels") as any)
      .select("id, host_id, guest_id, question_ids, status")
      .eq("id", data.duelId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!duel) throw new Error("Không tìm thấy phòng đấu");
    if (duel.host_id !== userId && duel.guest_id !== userId) throw new Error("Bạn không ở phòng này");
    if (duel.status !== "active") throw new Error("Phòng đấu chưa/không còn hoạt động");
    const qids = (duel.question_ids ?? []) as string[];
    const qid = qids[data.qIndex];
    if (!qid) throw new Error("Câu hỏi không tồn tại");

    const { data: g, error: gErr } = await supabase.rpc("grade_answer", { qid, selected: data.selected });
    if (gErr) throw new Error(gErr.message);
    const gr: any = Array.isArray(g) ? g[0] : g;
    const isCorrect = !!gr?.is_correct;
    const ci: number[] = Array.isArray(gr?.correct_indexes) ? gr.correct_indexes.map((x: any) => Number(x)) : [];

    // Idempotent insert: unique on (duel_id, q_index, user_id).
    await (supabase.from("duel_answers") as any).insert({
      duel_id: data.duelId,
      q_index: data.qIndex,
      user_id: userId,
      selected: data.selected,
      is_correct: isCorrect,
      ms: data.ms,
    });
    return { isCorrect, correctIndexes: ci };
  });

/** Finalize duel: compute winner and payout (idempotent). */
export const finishDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { duelId: string }) => ({ duelId: String(input.duelId) }))
  .handler(async ({ data, context }): Promise<DuelSnapshot> => {
    const { supabase } = context;
    const { data: duel, error } = await (supabase.from("duels") as any)
      .select("*").eq("id", data.duelId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!duel) throw new Error("Không tìm thấy phòng đấu");
    const qs = await loadQuestions(supabase, duel.question_ids ?? []);

    if (duel.status === "finished") return snapshotFromRow(duel, qs);

    // Fetch all answers, group by q_index, award point to first correct answer per question.
    const { data: ansRows, error: aErr } = await (supabase.from("duel_answers") as any)
      .select("q_index, user_id, is_correct, ms")
      .eq("duel_id", data.duelId)
      .order("q_index", { ascending: true });
    if (aErr) throw new Error(aErr.message);
    const answers = (ansRows ?? []) as Array<{ q_index: number; user_id: string; is_correct: boolean; ms: number }>;
    const perQ = new Map<number, Array<{ user_id: string; is_correct: boolean; ms: number }>>();
    for (const r of answers) {
      const list = perQ.get(r.q_index) ?? [];
      list.push({ user_id: r.user_id, is_correct: r.is_correct, ms: r.ms });
      perQ.set(r.q_index, list);
    }
    let hostScore = 0;
    let guestScore = 0;
    for (const [, list] of perQ) {
      const correct = list.filter((r) => r.is_correct).sort((a, b) => a.ms - b.ms);
      if (correct.length === 0) continue;
      const winner = correct[0].user_id;
      if (winner === duel.host_id) hostScore++;
      else if (winner === duel.guest_id) guestScore++;
    }
    let winner: string | null = null;
    if (hostScore > guestScore) winner = duel.host_id;
    else if (guestScore > hostScore) winner = duel.guest_id;

    // Payout via service role (net_worth adjust). Draw = no payout.
    if (winner) {
      const loser = winner === duel.host_id ? duel.guest_id : duel.host_id;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: wRow }, { data: lRow }] = await Promise.all([
        (supabaseAdmin.from("game_state") as any).select("net_worth, money").eq("user_id", winner).maybeSingle(),
        (supabaseAdmin.from("game_state") as any).select("net_worth, money").eq("user_id", loser).maybeSingle(),
      ]);
      const wNw = Number(wRow?.net_worth ?? 0);
      const wMoney = Number(wRow?.money ?? 0);
      const lNw = Number(lRow?.net_worth ?? 0);
      const lMoney = Number(lRow?.money ?? 0);
      await Promise.all([
        (supabaseAdmin.from("game_state") as any).update({
          net_worth: wNw + PAYOUT,
          money: wMoney + PAYOUT,
        }).eq("user_id", winner),
        (supabaseAdmin.from("game_state") as any).update({
          net_worth: Math.max(0, lNw - PAYOUT),
          money: Math.max(0, lMoney - PAYOUT),
        }).eq("user_id", loser),
      ]);
    }

    const { data: fin, error: fErr } = await (supabase.from("duels") as any)
      .update({
        status: "finished",
        host_score: hostScore,
        guest_score: guestScore,
        winner_id: winner,
        finished_at: new Date().toISOString(),
      })
      .eq("id", data.duelId)
      .select("*")
      .single();
    if (fErr) throw new Error(fErr.message);
    return snapshotFromRow(fin, qs);
  });

/* ------------------------- helpers ------------------------- */

function mapQuestion(row: any): DuelQuestion {
  const rawChoices: any[] = Array.isArray(row.choices) ? row.choices : [];
  return {
    id: String(row.id),
    text: String(row.text ?? ""),
    options: rawChoices.map((c) => (typeof c === "string" ? c : (c?.text ?? ""))),
    imageUrl: row.image_url ?? null,
    optionImages: rawChoices.map((c) => (typeof c === "string" ? null : (c?.imageUrl ?? null))),
  };
}

async function loadQuestions(supabase: any, ids: string[]): Promise<DuelQuestion[]> {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase
    .from("questions_bank")
    .select("id, text, choices, image_url")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const map = new Map<string, DuelQuestion>();
  for (const r of (data ?? []) as any[]) map.set(String(r.id), mapQuestion(r));
  return ids.map((id) => map.get(id)).filter(Boolean) as DuelQuestion[];
}

function snapshotFromRow(row: any, questions: DuelQuestion[]): DuelSnapshot {
  return {
    id: String(row.id),
    hostId: String(row.host_id),
    guestId: String(row.guest_id),
    status: row.status,
    category: row.topic_category ?? null,
    domain: row.topic_domain ?? null,
    hostScore: Number(row.host_score ?? 0),
    guestScore: Number(row.guest_score ?? 0),
    winnerId: row.winner_id ?? null,
    payout: Number(row.payout ?? PAYOUT),
    questions,
  };
}
