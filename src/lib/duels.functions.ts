// Server functions for 1vs1 Duel Rooms inside houses.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import systemQuestionEnglish from "@/game/system-question-en.json";

const DEFAULT_PAYOUT = 30;
const N_QUESTIONS = 10;

export type DuelTopic = {
  category: "digital" | "history";
  domain: number | null; // 1..6 or null (history)
  label: string;
  count: number;   // số câu enabled trong DB
  enough: boolean; // >= N_QUESTIONS
};

export type DuelQuestion = {
  id: string;
  text: string;
  textEn?: string | null;
  options: string[];
  optionsEn?: string[];
  imageUrl?: string | null;
  optionImages?: (string | null)[];
};

export type DuelPlayerInfo = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type DuelSnapshot = {
  id: string;
  hostId: string;
  guestId: string;
  host: DuelPlayerInfo | null;
  guest: DuelPlayerInfo | null;
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
  1: "Miền 1 – Vận hành thiết bị & phần mềm",
  2: "Miền 2 – Khai thác thông tin & dữ liệu",
  3: "Miền 3 – Giao tiếp & hợp tác số",
  4: "Miền 4 – An toàn số",
  5: "Miền 5 – Sáng tạo nội dung số",
  6: "Miền 6 – Học tập & phát triển số",
};

/** Fixed 7 topics: 6 digital domains + 1 history-culture. */
const FIXED_TOPICS: Array<{ category: "digital" | "history"; domain: number | null; label: string }> = [
  ...([1, 2, 3, 4, 5, 6] as const).map((d) => ({
    category: "digital" as const,
    domain: d as number,
    label: `🌐 ${DOMAIN_LABELS[d]}`,
  })),
  { category: "history", domain: null, label: "🏛️ Lịch sử – Văn hoá" },
];

async function loadPayout(supabase: any): Promise<number> {
  const { data } = await supabase.from("admin_config").select("value").eq("key", "duel_payout").maybeSingle();
  const v = (data as any)?.value;
  const n = typeof v === "number" ? v : (v && typeof v.amount === "number" ? v.amount : NaN);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_PAYOUT;
}

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
    const { data: rows, error: pErr } = await (supabase.from("presence") as any)
      .select("user_id, in_house_owner")
      .in("user_id", [userId, data.guestId]);
    if (pErr) throw new Error(pErr.message);
    const list = (rows ?? []) as Array<{ user_id: string; in_house_owner: string | null }>;
    const me = list.find((r) => r.user_id === userId);
    const them = list.find((r) => r.user_id === data.guestId);
    if (!me || me.in_house_owner !== data.ownerId) throw new Error("Bạn không ở trong căn nhà này");
    if (!them || them.in_house_owner !== data.ownerId) throw new Error("Đối thủ đã rời căn nhà này");

    const payout = await loadPayout(supabase);
    const { data: ins, error } = await (supabase.from("duels") as any)
      .insert({
        host_id: userId,
        guest_id: data.guestId,
        house_owner: data.ownerId,
        status: "pending",
        payout,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { duelId: String(ins.id) };
  });

/** Guest responds to invite. */
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

/** List the 7 fixed topics; disabled when the pool is smaller than N_QUESTIONS. */
export const listDuelTopics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DuelTopic[]> => {
    const { data, error } = await (context.supabase.from("questions_bank") as any)
      .select("category, competency_domain, enabled")
      .eq("enabled", true);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ category: string | null; competency_domain: number | null }>;
    const counter = new Map<string, number>();
    for (const r of rows) {
      const cat = r.category === "digital" ? "digital" : "history";
      if (cat === "history") {
        counter.set("history|null", (counter.get("history|null") ?? 0) + 1);
      } else if (typeof r.competency_domain === "number") {
        const k = `digital|${r.competency_domain}`;
        counter.set(k, (counter.get(k) ?? 0) + 1);
      }
    }
    return FIXED_TOPICS.map((t) => {
      const k = `${t.category}|${t.domain ?? "null"}`;
      const count = counter.get(k) ?? 0;
      return { ...t, count, enough: count >= N_QUESTIONS };
    });
  });

/** Host picks a topic and starts the duel. */
export const startDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    duelId: string;
    category: "digital" | "history";
    domain: number | null;
    count?: number;
  }) => ({
    duelId: String(input.duelId),
    category: input.category === "digital" ? ("digital" as const) : ("history" as const),
    domain: typeof input.domain === "number" ? input.domain : null,
    count: Math.min(30, Math.max(10, Math.floor(Number(input.count) || 10))),
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
      return snapshotFromRow(supabase, duel, await loadQuestions(supabase, duel.question_ids));
    }

    let q = (supabase.from("questions_bank") as any)
      .select("id, text, text_en, choices, choices_en, image_url, category, competency_domain, enabled")
      .eq("enabled", true)
      .eq("category", data.category);
    if (data.category === "digital" && data.domain != null) {
      q = q.eq("competency_domain", data.domain);
    }
    const { data: pool, error: qErr } = await q.limit(500);
    if (qErr) throw new Error(qErr.message);
    const arr = ((pool ?? []) as any[]).filter((r) => Array.isArray(r.choices) && r.choices.length >= 2);
    if (arr.length < N_QUESTIONS) throw new Error(`Chủ đề chưa đủ ${N_QUESTIONS} câu (chỉ có ${arr.length})`);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const wanted = Math.min(data.count, arr.length);
    const chosen = arr.slice(0, wanted);
    const ids = chosen.map((r) => String(r.id));

    const payout = await loadPayout(supabase);
    const { data: updated, error: uErr } = await (supabase.from("duels") as any)
      .update({
        status: "active",
        topic_category: data.category,
        topic_domain: data.domain,
        question_ids: ids,
        payout,
      })
      .eq("id", data.duelId)
      .select("*")
      .single();
    if (uErr) throw new Error(uErr.message);
    return snapshotFromRow(supabase, updated, chosen.map(mapQuestion));
  });

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
    return snapshotFromRow(supabase, duel, qs);
  });

/** Submit an answer. Server grades and reports the first-correct winner for that round. */
export const submitDuelAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { duelId: string; qIndex: number; selected: number; ms: number }) => ({
    duelId: String(input.duelId),
    qIndex: Math.max(0, Math.floor(Number(input.qIndex) || 0)),
    selected: Math.floor(Number(input.selected) || 0),
    ms: Math.max(0, Math.floor(Number(input.ms) || 0)),
  }))
  .handler(async ({ data, context }): Promise<{
    isCorrect: boolean;
    correctIndexes: number[];
    winnerUserId: string | null;
  }> => {
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

    await (supabase.from("duel_answers") as any).insert({
      duel_id: data.duelId,
      q_index: data.qIndex,
      user_id: userId,
      selected: data.selected,
      is_correct: isCorrect,
      ms: data.ms,
    });

    // Fetch first correct answer for this round (server-authoritative winner).
    const { data: winRows } = await (supabase.from("duel_answers") as any)
      .select("user_id, is_correct, ms")
      .eq("duel_id", data.duelId)
      .eq("q_index", data.qIndex)
      .eq("is_correct", true)
      .order("ms", { ascending: true })
      .limit(1);
    const winnerUserId = (winRows?.[0]?.user_id as string | undefined) ?? null;

    return { isCorrect, correctIndexes: ci, winnerUserId };
  });

/** Finalize duel; per-round payout accumulates. */
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

    if (duel.status === "finished") return snapshotFromRow(supabase, duel, qs);

    const { data: ansRows, error: aErr } = await (supabase.from("duel_answers") as any)
      .select("q_index, user_id, is_correct, ms")
      .eq("duel_id", data.duelId)
      .order("q_index", { ascending: true });
    if (aErr) throw new Error(aErr.message);
    const answers = (ansRows ?? []) as Array<{ q_index: number; user_id: string; is_correct: boolean; ms: number }>;
    const perQ = new Map<number, Array<{ user_id: string; is_correct: boolean; ms: number }>>();
    for (const r of answers) {
      const list = perQ.get(r.q_index) ?? [];
      list.push(r);
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

    const payout = Number(duel.payout ?? DEFAULT_PAYOUT) || DEFAULT_PAYOUT;
    if (winner) {
      const loser = winner === duel.host_id ? duel.guest_id : duel.host_id;
      const diff = Math.abs(hostScore - guestScore) * payout;
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
          net_worth: wNw + diff,
          money: wMoney + diff,
        }).eq("user_id", winner),
        (supabaseAdmin.from("game_state") as any).update({
          net_worth: Math.max(0, lNw - diff),
          money: Math.max(0, lMoney - diff),
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
    return snapshotFromRow(supabase, fin, qs);
  });

/* ------------------------- helpers ------------------------- */

type SystemEnglishQuestion = { id: string; text_en: string; choices_en: unknown[] };
const SYSTEM_ENGLISH_BY_ID = new Map(
  (systemQuestionEnglish as SystemEnglishQuestion[]).map((question) => [question.id, question]),
);

function mapQuestion(row: any): DuelQuestion {
  const rawChoices: any[] = Array.isArray(row.choices) ? row.choices : [];
  const bundled = SYSTEM_ENGLISH_BY_ID.get(String(row.id));
  const candidateChoices = bundled?.choices_en ?? row.choices_en;
  const rawChoicesEn: any[] = Array.isArray(candidateChoices) && candidateChoices.length === rawChoices.length
    ? candidateChoices
    : [];
  return {
    id: String(row.id),
    text: String(row.text ?? ""),
    textEn: bundled?.text_en ?? (row.text_en ? String(row.text_en) : null),
    options: rawChoices.map((c) => (typeof c === "string" ? c : (c?.text ?? ""))),
    optionsEn: rawChoicesEn.map((c) => String(typeof c === "string" ? c : (c?.text ?? ""))),
    imageUrl: row.image_url ?? null,
    optionImages: rawChoices.map((c) => (typeof c === "string" ? null : (c?.imageUrl ?? null))),
  };
}

async function loadQuestions(supabase: any, ids: string[]): Promise<DuelQuestion[]> {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase
    .from("questions_bank")
    .select("id, text, text_en, choices, choices_en, image_url")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const map = new Map<string, DuelQuestion>();
  for (const r of (data ?? []) as any[]) map.set(String(r.id), mapQuestion(r));
  return ids.map((id) => map.get(id)).filter(Boolean) as DuelQuestion[];
}

async function loadPlayers(supabase: any, ids: string[]): Promise<Map<string, DuelPlayerInfo>> {
  const map = new Map<string, DuelPlayerInfo>();
  if (!ids.length) return map;
  const { data } = await (supabase.from("profiles") as any)
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", ids);
  for (const r of ((data ?? []) as any[])) {
    map.set(String(r.user_id), {
      userId: String(r.user_id),
      username: String(r.username ?? "player"),
      displayName: r.display_name ?? null,
      avatarUrl: r.avatar_url ?? null,
    });
  }
  return map;
}

async function snapshotFromRow(supabase: any, row: any, questions: DuelQuestion[]): Promise<DuelSnapshot> {
  const players = await loadPlayers(supabase, [row.host_id, row.guest_id]);
  return {
    id: String(row.id),
    hostId: String(row.host_id),
    guestId: String(row.guest_id),
    host: players.get(String(row.host_id)) ?? null,
    guest: players.get(String(row.guest_id)) ?? null,
    status: row.status,
    category: row.topic_category ?? null,
    domain: row.topic_domain ?? null,
    hostScore: Number(row.host_score ?? 0),
    guestScore: Number(row.guest_score ?? 0),
    winnerId: row.winner_id ?? null,
    payout: Number(row.payout ?? DEFAULT_PAYOUT),
    questions,
  };
}
