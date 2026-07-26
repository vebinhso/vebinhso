import { supabase } from "@/integrations/supabase/client";

export type Question = {
  id?: string;
  q: string;
  options: string[];
  answer: number; // index (first correct) — in current display order
  reward: number;
  imageUrl?: string;
  correctIndexes?: number[];
  optionImages?: string[];
  maps?: string[];
  enabled?: boolean;
  priority?: number;
  category?: string; // "digital" | "history"
  competencyLevel?: number | null; // 1..8
  competencyDomain?: number | null; // 1..6
  /** Mapping displayIndex -> originalIndex (in DB `choices` order). Present when answers were shuffled. */
  optionOrder?: number[];
};

export const DEFAULT_QUESTIONS: Question[] = [];


let QUESTION_CACHE: Question[] = [];
let CLASS_MODE = false;      // đang nhận câu hỏi của lớp
let CLASS_QUEUE: number[] = []; // hàng đợi index trong QUESTION_CACHE
let PRIORITY_MODE = false;
let CAT_TOGGLES: { digital: boolean; history: boolean } = { digital: true, history: true };
let RECENT_IDS: string[] = [];
const MAX_RECENT = 20;

export async function loadCategoryToggles(): Promise<{ digital: boolean; history: boolean }> {
  try {
    const { data } = await supabase
      .from("admin_config")
      .select("value")
      .eq("key", "category_toggles")
      .maybeSingle();
    const v: any = (data as any)?.value || {};
    CAT_TOGGLES = { digital: v.digital !== false, history: v.history !== false };
  } catch {}
  return CAT_TOGGLES;
}

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

async function getActiveClassId(): Promise<string | null> {
  try {
    const { data: session } = await supabase.auth.getUser();
    const uid = session?.user?.id;
    if (!uid) return null;
    const { data } = await supabase.from("profiles").select("active_class_id").eq("user_id", uid).maybeSingle();
    return ((data as any)?.active_class_id as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function loadQuestionsFromDB(map?: string): Promise<Question[]> {
  try {
    const [{ data, error }, , , activeClassId] = await Promise.all([
      supabase
        .from("questions_bank")
        .select("id,text,choices,category,image_url,priority,enabled,maps,reward,competency_level,competency_domain,class_id,created_at,updated_at")
        .order("created_at", { ascending: true })
        .range(0, 4999),
      loadPriorityMode(),
      loadCategoryToggles(),
      getActiveClassId(),
    ]);
    if (error) throw error;
    // Khi học sinh đang tham gia một lớp: chỉ dùng câu hỏi của lớp đó.
    // Khi không tham gia lớp nào: dùng ngân hàng câu hỏi mặc định.
    const rows = (data ?? []).filter((r: any) =>
      activeClassId ? r.class_id === activeClassId : !r.class_id,
    );
    const mapped: Question[] = rows.map((row: any) => {
      const rawChoices: any[] = Array.isArray(row.choices) ? row.choices : [];
      const options = rawChoices.map((c) => (typeof c === "string" ? c : (c?.text ?? "")));
      const optionImages = rawChoices.map((c) => (typeof c === "string" ? "" : (c?.imageUrl ?? "")));
      const maps: string[] = Array.isArray(row.maps) && row.maps.length > 0 ? row.maps : ["all"];
      const enabled = row.enabled === false ? false : true;
      const priority = typeof row.priority === "number" ? row.priority : 0;
      const cl = typeof row.competency_level === "number" ? row.competency_level : null;
      const cd = typeof row.competency_domain === "number" ? row.competency_domain : null;
      const cat = (row.category === "digital" || row.category === "history") ? row.category : "history";
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
        category: cat,
        competencyLevel: cl,
        competencyDomain: cd,
      };
    });
    void map;
    const enabledOnly = mapped.filter((q) => q.enabled !== false);
    QUESTION_CACHE = enabledOnly;
    CLASS_MODE = !!activeClassId;
    CLASS_QUEUE = [];
    RECENT_IDS = [];
    return enabledOnly;
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
  // Nếu options đã bị xáo trộn, dịch index hiển thị -> index gốc trước khi chấm
  const order = question.optionOrder;
  const selectedOriginal = order && order[selected] != null ? order[selected] : selected;
  const toDisplay = (origIdx: number) => {
    if (!order) return origIdx;
    const j = order.indexOf(origIdx);
    return j >= 0 ? j : origIdx;
  };

  if (!question.id) {
    const ci = question.correctIndexes && question.correctIndexes.length > 0
      ? question.correctIndexes
      : [question.answer];
    return { isCorrect: ci.includes(selected), correctIndexes: ci, reward: question.reward ?? 10 };
  }
  try {
    const { data, error } = await supabase.rpc("grade_answer", { qid: question.id, selected: selectedOriginal });
    if (error) throw error;
    const row: any = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("no grade result");
    const ciOrig: number[] = Array.isArray(row.correct_indexes) ? row.correct_indexes.map((x: any) => Number(x)) : [];
    const ciDisplay = ciOrig.map(toDisplay);
    question.correctIndexes = ciDisplay;
    question.answer = ciDisplay[0] ?? -1;
    return { isCorrect: !!row.is_correct, correctIndexes: ciDisplay, reward: Number(row.reward ?? question.reward ?? 10) };
  } catch (e) {
    console.error("[questions] gradeAnswer failed", e);
    return { isCorrect: false, correctIndexes: [], reward: question.reward ?? 10 };
  }
}

/** Trả về một bản sao câu hỏi với các đáp án đã được xáo trộn ngẫu nhiên. */
function withShuffledChoices(q: Question): Question {
  if (!q.options || q.options.length <= 1) return q;
  const n = q.options.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return {
    ...q,
    options: idx.map((i) => q.options[i]),
    optionImages: q.optionImages ? idx.map((i) => q.optionImages![i] ?? "") : q.optionImages,
    optionOrder: idx,
    correctIndexes: [],
    answer: -1,
  };
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

function pickAvoidingRecent(pool: Question[]): Question | null {
  if (pool.length === 0) return null;
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

  // Chế độ lớp học: chỉ dùng câu hỏi của lớp, lần lượt hết mới lặp lại.
  if (CLASS_MODE) {
    if (arr.length === 0) return { q: "", options: [], answer: -1, reward: 0 };
    if (CLASS_QUEUE.length === 0) {
      const idx = arr.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      CLASS_QUEUE = idx;
    }
    const next = CLASS_QUEUE.shift()!;
    return withShuffledChoices(arr[next] ?? arr[0]);
  }

  const digitalOn = CAT_TOGGLES.digital;
  const historyOn = CAT_TOGGLES.history;


  // ƯU TIÊN là trên hết: khi bật, CHỈ dùng câu có priority > 0.
  const scope = PRIORITY_MODE ? arr.filter((q) => (q.priority ?? 0) > 0) : arr;

  // Mỗi chủ đề (nếu bật) chỉ dùng câu ĐÃ GẮN BẬC (1..8).
  // Câu không bậc trong chủ đề đó sẽ KHÔNG hiện.
  const hasLevel = (q: Question) =>
    typeof q.competencyLevel === "number" && q.competencyLevel! >= 1 && q.competencyLevel! <= 8;
  let digitalPool = digitalOn
    ? scope.filter((q) => q.category === "digital" && hasLevel(q))
    : [];
  let historyPool = historyOn
    ? scope.filter((q) => q.category !== "digital" && hasLevel(q))
    : [];
  // Fallback: nếu chủ đề không có câu nào gắn bậc (ví dụ câu hỏi giáo
  // viên nhập vào lớp học chưa được phân loại bậc), dùng toàn bộ câu
  // của chủ đề đó để học sinh vẫn có bài để làm.
  if (digitalOn && digitalPool.length === 0) {
    digitalPool = scope.filter((q) => q.category === "digital");
  }
  if (historyOn && historyPool.length === 0) {
    historyPool = scope.filter((q) => q.category !== "digital");
  }

  const tryDigital = () =>
    digitalPool.length > 0 ? nextFrameworkQuestion(digitalPool, "digital") : null;
  const tryHistory = () =>
    historyPool.length > 0 ? nextFrameworkQuestion(historyPool, "history") : null;

  // Nếu chỉ 1 chủ đề còn câu, chủ đề còn lại tự bị bỏ qua.
  const bothHave = digitalPool.length > 0 && historyPool.length > 0;
  const order: Array<() => Question | null> = bothHave
    ? (Math.random() < 0.5 ? [tryDigital, tryHistory] : [tryHistory, tryDigital])
    : [tryDigital, tryHistory];

  for (const fn of order) {
    const q = fn();
    if (q) return withShuffledChoices(q);
  }

  // Không có câu hợp lệ (thiếu bậc / thiếu ưu tiên) — placeholder rỗng.
  return { q: "", options: [], answer: -1, reward: 0 };
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

function queueStorageKey(cat: string): string {
  return `vbs_qqueue_${cat}_${currentUserSeed()}`;
}
function loadQueueState(cat: string): DigitalState | null {
  try {
    const raw = localStorage.getItem(queueStorageKey(cat));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveQueueState(cat: string, s: DigitalState) {
  try { localStorage.setItem(queueStorageKey(cat), JSON.stringify(s)); } catch {}
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

function nextFrameworkQuestion(pool: Question[], cat: string): Question | null {
  const fp = makeFingerprint(pool);
  const rng = mulberry32(hash32(currentUserSeed() + "|" + cat + "|" + fp));
  let st = loadQueueState(cat);
  if (!st || st.fp !== fp) {
    st = { fp, order: buildOrder(pool, rng), pos: 0, retry: {}, done: [] };
    saveQueueState(cat, st);
  }
  // Hết vòng → reshuffle & reset (bắt đầu vòng lặp mới, không lặp trước khi hết vòng)
  if (st.pos >= st.order.length) {
    st = { fp, order: buildOrder(pool, rng), pos: 0, retry: {}, done: [] };
    saveQueueState(cat, st);
  }
  // Bỏ qua câu đã done trong vòng hiện tại
  while (st.pos < st.order.length) {
    const id = st.order[st.pos];
    if (st.done.includes(id)) { st.pos++; continue; }
    const q = pool.find((x) => x.id === id);
    if (!q) { st.pos++; continue; }
    saveQueueState(cat, st);
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
  const cat = question.category === "digital" ? "digital" : "history";
  const st = loadQueueState(cat);
  if (!st) return;
  const id = question.id;
  if (correct) {
    if (!st.done.includes(id)) st.done.push(id);
    st.pos++;
  } else {
    const times = st.retry[id] ?? 0;
    if (times < 1) {
      // Re-insert 3 vị trí phía sau để xuất hiện lại một lần trong CÙNG vòng
      st.retry[id] = times + 1;
      const insertAt = Math.min(st.order.length, st.pos + 3);
      st.order.splice(insertAt, 0, id);
    }
    st.pos++;
  }
  saveQueueState(cat, st);
}
