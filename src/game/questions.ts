import { supabase } from "@/integrations/supabase/client";

export type Question = {
  id?: string;
  q: string;
  options: string[];
  answer: number; // index (first correct)
  reward: number;
  imageUrl?: string;
  // Extended (for future use)
  correctIndexes?: number[];
  optionImages?: string[];
  maps?: string[];
  enabled?: boolean;
  priority?: number;
  competencyLevel?: number | null; // 1..8 khung năng lực số
};

export const DEFAULT_QUESTIONS: Question[] = [
  { q: "Thủ đô Việt Nam là?", options: ["Hà Nội", "TP.HCM", "Đà Nẵng", "Huế"], answer: 0, reward: 15 },
  { q: "1 + 2 × 3 = ?", options: ["9", "7", "6", "8"], answer: 1, reward: 10 },
  { q: "Nước nào có hình chữ S?", options: ["Lào", "Thái Lan", "Việt Nam", "Campuchia"], answer: 2, reward: 15 },
  { q: "Mặt trời mọc hướng nào?", options: ["Tây", "Nam", "Bắc", "Đông"], answer: 3, reward: 10 },
  { q: "Bao nhiêu ngày 1 tuần?", options: ["7", "5", "10", "6"], answer: 0, reward: 10 },
  { q: "Con vật nào lớn nhất biển?", options: ["Cá heo", "Cá voi xanh", "Cá mập", "Bạch tuộc"], answer: 1, reward: 20 },
  { q: "Sông dài nhất Việt Nam?", options: ["Sông Hồng", "Sông Mã", "Sông Đồng Nai", "Sông Cửu Long"], answer: 3, reward: 25 },
  { q: "Chu vi hình vuông cạnh 5?", options: ["10", "15", "20", "25"], answer: 2, reward: 15 },
  { q: "Năm Bác Hồ đọc Tuyên ngôn độc lập?", options: ["1945", "1954", "1975", "1930"], answer: 0, reward: 20 },
  { q: "Hành tinh gần Mặt trời nhất?", options: ["Kim", "Thủy", "Hỏa", "Trái Đất"], answer: 1, reward: 20 },
  { q: "Nước H₂O gồm những nguyên tố nào?", options: ["H + O", "H + N", "C + O", "H + C"], answer: 0, reward: 15 },
  { q: "12 × 12 = ?", options: ["124", "144", "121", "132"], answer: 1, reward: 15 },
];

let QUESTION_CACHE: Question[] = [];
let PRIORITY_MODE = false;
let RECENT_IDS: string[] = [];
const MAX_RECENT = 20;

export async function loadPriorityMode(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("admin_config")
      .select("value")
      .eq("key", "priority_mode")
      .maybeSingle();
    const val: any = (data as any)?.value;
    PRIORITY_MODE = !!(val?.enabled);
    return PRIORITY_MODE;
  } catch (e) {
    console.error("[questions] loadPriorityMode failed", e);
    return PRIORITY_MODE;
  }
}

export async function loadQuestionsFromDB(map?: string): Promise<Question[]> {
  try {
    const [{ data, error }] = await Promise.all([
      supabase
        .from("questions_bank")
        .select("id,text,choices,category,image_url,priority,enabled,maps,reward,competency_level,created_at,updated_at")
        .order("created_at", { ascending: true })
        .range(0, 4999),
      loadPriorityMode(),
    ]);
    if (error) throw error;
    const rows = data ?? [];
    const mapped: Question[] = rows.map((row: any) => {
      const rawChoices: any[] = Array.isArray(row.choices) ? row.choices : [];
      const options = rawChoices.map((c) => (typeof c === "string" ? c : (c?.text ?? "")));
      const optionImages = rawChoices.map((c) => (typeof c === "string" ? "" : (c?.imageUrl ?? "")));
      const maps: string[] = Array.isArray(row.maps) && row.maps.length > 0 ? row.maps : ["all"];
      const enabled = row.enabled === false ? false : true;
      const priority = typeof row.priority === "number" ? row.priority : 0;
      const cl = typeof row.competency_level === "number" ? row.competency_level : null;
      return {
        id: row.id ? String(row.id) : undefined,
        q: row.text ?? "",
        options,
        answer: -1,
        reward: row.reward ?? 10,
        imageUrl: row.image_url ?? undefined,
        correctIndexes: [],
        optionImages,
        maps,
        enabled,
        priority,
        competencyLevel: cl,
      };
    });
    const enabledOnly = mapped.filter((q) => q.enabled !== false);
    const filtered = map
      ? enabledOnly.filter((q) => (q.maps ?? ["all"]).includes(map) || (q.maps ?? ["all"]).includes("all"))
      : enabledOnly;
    QUESTION_CACHE = filtered;
    RECENT_IDS = []; // reset khi đổi map/cache mới
    return filtered;
  } catch (e) {
    console.error("[questions] loadQuestionsFromDB failed", e);
    return QUESTION_CACHE;
  }
}

/**
 * Server-side grading. Client never learns correct answers before submitting.
 * Returns { isCorrect, correctIndexes, reward }. Mutates `question` to cache
 * revealed answers so existing UI code (which reads `question.correctIndexes`)
 * can display feedback.
 */
export async function gradeAnswer(
  question: Question,
  selected: number,
): Promise<{ isCorrect: boolean; correctIndexes: number[]; reward: number }> {
  if (!question.id) {
    const ci = question.correctIndexes && question.correctIndexes.length > 0
      ? question.correctIndexes
      : [question.answer];
    return { isCorrect: ci.includes(selected), correctIndexes: ci, reward: question.reward ?? 10 };
  }
  try {
    const { data, error } = await supabase.rpc("grade_answer", { qid: question.id, selected });
    if (error) throw error;
    const row: any = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("no grade result");
    const ci: number[] = Array.isArray(row.correct_indexes) ? row.correct_indexes.map((x: any) => Number(x)) : [];
    question.correctIndexes = ci;
    question.answer = ci[0] ?? -1;
    return { isCorrect: !!row.is_correct, correctIndexes: ci, reward: Number(row.reward ?? question.reward ?? 10) };
  } catch (e) {
    console.error("[questions] gradeAnswer failed", e);
    return { isCorrect: false, correctIndexes: [], reward: question.reward ?? 10 };
  }
}

export function getQuestions(): Question[] {
  if (QUESTION_CACHE.length > 0) return QUESTION_CACHE;
  return DEFAULT_QUESTIONS;
}

export function hasLoadedQuestions(): boolean {
  return QUESTION_CACHE.length > 0;
}

// Giữ tương thích — đọc động từ getter
export const QUESTIONS: Question[] = new Proxy([] as Question[], {
  get(_t, prop) {
    const arr = getQuestions();
    return (arr as any)[prop];
  },
}) as Question[];

function pickAvoidingRecent(pool: Question[]): Question {
  if (pool.length === 0) {
    const fallback = getQuestions();
    return fallback[0] ?? DEFAULT_QUESTIONS[0];
  }
  const avoidCount = Math.min(MAX_RECENT, pool.length - 1);
  const recentSlice = avoidCount > 0 ? RECENT_IDS.slice(-avoidCount) : [];
  let candidates = recentSlice.length > 0
    ? pool.filter((q) => !(q.id && recentSlice.includes(q.id)))
    : pool;
  if (candidates.length === 0) candidates = pool;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  if (pick?.id) {
    RECENT_IDS.push(pick.id);
    if (RECENT_IDS.length > MAX_RECENT) RECENT_IDS = RECENT_IDS.slice(-MAX_RECENT);
  }
  return pick;
}

export function randomQuestion(): Question {
  const arr = getQuestions();
  // Khung năng lực số — nếu có bất kỳ câu có competencyLevel, ưu tiên hết
  const framework = arr.filter((q) => typeof q.competencyLevel === "number" && q.competencyLevel! >= 1 && q.competencyLevel! <= 8);
  if (framework.length > 0) {
    const q = nextFrameworkQuestion(framework);
    if (q) return q;
  }
  if (PRIORITY_MODE) {
    const zone = arr.filter((q) => (q.priority ?? 0) > 0);
    if (zone.length > 0) {
      return pickAvoidingRecent(zone);
    }
  }
  return pickAvoidingRecent(arr);
}

/* ===================== KHUNG NĂNG LỰC SỐ — Hàng đợi theo user ===================== */

function currentUserSeed(): string {
  try {
    // Đọc user id từ Supabase session cache (localStorage)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const j = JSON.parse(raw);
          const uid = j?.user?.id || j?.currentSession?.user?.id;
          if (uid) return String(uid);
        } catch {}
      }
    }
  } catch {}
  return "anon";
}

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type DigitalState = {
  fp: string;              // fingerprint để rebuild khi bộ câu đổi
  order: string[];         // hàng đợi id
  pos: number;
  retry: Record<string, number>; // số lần đã re-appear khi sai
  done: string[];          // id đã trả lời đúng
};

function digitalStorageKey(): string {
  return `vbs_digital_queue_${currentUserSeed()}`;
}
function loadDigitalState(): DigitalState | null {
  try {
    const raw = localStorage.getItem(digitalStorageKey());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveDigitalState(s: DigitalState) {
  try { localStorage.setItem(digitalStorageKey(), JSON.stringify(s)); } catch {}
}
function makeFingerprint(pool: Question[]): string {
  const parts = pool
    .map((q) => `${q.id ?? ""}:${q.competencyLevel ?? 0}`)
    .sort();
  return String(parts.length) + "|" + hash32(parts.join(",")).toString(36);
}
function buildOrder(pool: Question[], rng: () => number): string[] {
  const byLvl = new Map<number, Question[]>();
  for (const q of pool) {
    const lvl = q.competencyLevel ?? 0;
    if (!byLvl.has(lvl)) byLvl.set(lvl, []);
    byLvl.get(lvl)!.push(q);
  }
  const levels = Array.from(byLvl.keys()).sort((a, b) => a - b);
  const out: string[] = [];
  for (const lvl of levels) {
    const shuffled_ = shuffled(byLvl.get(lvl)!, rng);
    for (const q of shuffled_) if (q.id) out.push(q.id);
  }
  return out;
}

function nextFrameworkQuestion(pool: Question[]): Question | null {
  const fp = makeFingerprint(pool);
  const rng = mulberry32(hash32(currentUserSeed() + "|" + fp));
  let st = loadDigitalState();
  if (!st || st.fp !== fp) {
    st = { fp, order: buildOrder(pool, rng), pos: 0, retry: {}, done: [] };
    saveDigitalState(st);
  }
  // Nếu hết queue → reshuffle & reset done (nhưng giữ nhớ done trong session hiện tại)
  if (st.pos >= st.order.length) {
    st = { fp, order: buildOrder(pool, rng), pos: 0, retry: {}, done: [] };
    saveDigitalState(st);
  }
  // Bỏ qua câu đã done
  while (st.pos < st.order.length) {
    const id = st.order[st.pos];
    if (st.done.includes(id)) { st.pos++; continue; }
    const q = pool.find((x) => x.id === id);
    if (!q) { st.pos++; continue; }
    saveDigitalState(st);
    return q;
  }
  return null;
}

/**
 * Báo kết quả sau khi grade — để queue biết bỏ qua (đúng) hay re-appear (sai).
 * Gọi ngay sau gradeAnswer với câu hỏi đã dùng.
 */
export function reportAnswerResult(question: Question | null | undefined, correct: boolean) {
  if (!question?.id || typeof question.competencyLevel !== "number") return;
  const st = loadDigitalState();
  if (!st) return;
  const id = question.id;
  if (correct) {
    if (!st.done.includes(id)) st.done.push(id);
    st.pos++;
  } else {
    const times = st.retry[id] ?? 0;
    if (times < 1) {
      // Re-insert 2 vị trí phía sau để xuất hiện lại một lần
      st.retry[id] = times + 1;
      const insertAt = Math.min(st.order.length, st.pos + 3);
      st.order.splice(insertAt, 0, id);
    }
    st.pos++;
  }
  saveDigitalState(st);
}
