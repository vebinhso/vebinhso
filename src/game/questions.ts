import { loadAdminConfig } from "@/lib/admin";

export type Question = {
  q: string;
  options: string[];
  answer: number; // index
  reward: number;
  imageUrl?: string;
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

export function getQuestions(): Question[] {
  try {
    const custom = loadAdminConfig().questions;
    if (custom && custom.length > 0) return custom as Question[];
  } catch { /* noop */ }
  return DEFAULT_QUESTIONS;
}

// Giữ tương thích — đọc động từ getter
export const QUESTIONS: Question[] = new Proxy([] as Question[], {
  get(_t, prop) {
    const arr = getQuestions();
    return (arr as any)[prop];
  },
}) as Question[];

export function randomQuestion(): Question {
  const arr = getQuestions();
  return arr[Math.floor(Math.random() * arr.length)];
}
