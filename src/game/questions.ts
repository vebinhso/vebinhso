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
        .select("id,text,choices,category,image_url,priority,enabled,maps,reward,created_at,updated_at")
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
      // Answers are hidden from clients — resolved server-side via grade_answer rpc.
      const maps: string[] = Array.isArray(row.maps) && row.maps.length > 0 ? row.maps : ["all"];
      const enabled = row.enabled === false ? false : true;
      const priority = typeof row.priority === "number" ? row.priority : 0;
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
  if (PRIORITY_MODE) {
    const zone = arr.filter((q) => (q.priority ?? 0) > 0);
    if (zone.length > 0) {
      return pickAvoidingRecent(zone);
    }
  }
  return pickAvoidingRecent(arr);
}
