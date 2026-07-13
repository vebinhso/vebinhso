// Tự động phân loại câu hỏi theo Khung năng lực số Việt Nam:
// - 8 bậc (level): 1 = cơ bản → 8 = chuyên gia
// - 6 miền (domain):
//   1. Vận hành thiết bị & phần mềm
//   2. Khai thác thông tin & dữ liệu
//   3. Giao tiếp & hợp tác trong môi trường số
//   4. Sáng tạo nội dung số
//   5. An toàn & bảo mật
//   6. Giải quyết vấn đề
//
// Câu hỏi không có dấu hiệu môi trường số → category: "history" (level & domain null).

export type CompetencyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;
export type CompetencyDomain = 1 | 2 | 3 | 4 | 5 | 6 | null;
export type QuestionCategory = "digital" | "history";

export type ClassifyResult = {
  category: QuestionCategory;
  level: CompetencyLevel;
  domain: CompetencyDomain;
};

export const DOMAIN_LABELS: Record<number, string> = {
  1: "Vận hành thiết bị & phần mềm",
  2: "Khai thác thông tin & dữ liệu",
  3: "Giao tiếp & hợp tác số",
  4: "Sáng tạo nội dung số",
  5: "An toàn & bảo mật",
  6: "Giải quyết vấn đề",
};

// Mỗi rule: (level, domain, keywords). Đặt bậc cao trước để tránh bị ăn bởi bậc thấp.
const RULES: { level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; domain: 1 | 2 | 3 | 4 | 5 | 6; keywords: string[] }[] = [
  // Bậc 8 — Chuyên gia / công dân số: AI, blockchain, đạo đức, pháp luật số
  { level: 8, domain: 6, keywords: ["tri tue nhan tao", " ai ", " ai.", "ai,", "ai?", "chatgpt", "gpt", "machine learning", "hoc may", "deep learning", "thuat toan", "big data", "du lieu lon", "data mining", "khai pha du lieu", "iot", "internet of things", "blockchain", "nft", "metaverse"] },
  { level: 8, domain: 5, keywords: ["dao duc so", "ban quyen", "so huu tri tue", "creative commons", "cong dan so", "phap luat so", "luat an ninh mang"] },

  // Bậc 7 — Nâng cao: khắc phục sự cố, tối ưu, lập trình
  { level: 7, domain: 6, keywords: ["khac phuc", "sua loi", "loi may", "loi phan mem", "loi he thong", "troubleshoot", "khong khoi dong", "khong bat duoc", "man hinh xanh", "lap trinh", "code", "python", "javascript", "html", "css"] },
  { level: 7, domain: 1, keywords: ["cai dat lai", "reinstall", "cap nhat", "update", "nang cap", "sao luu", "backup", "khoi phuc", "restore", "reset", "driver", "he dieu hanh loi"] },

  // Bậc 6 — Bảo mật, an toàn thông tin
  { level: 6, domain: 5, keywords: ["mat khau", "password", "bao mat", "an toan thong tin", "an ninh mang", "virus", "malware", "phishing", "lua dao", "gia mao", "rieng tu", "privacy", "quyen rieng tu", "xac thuc 2 lop", "2fa", "hai yeu to", "otp", "ma hoa", "encryption", "https", "chung chi so", "bat nat", "cyberbully", "quay roi", "lo thong tin"] },

  // Bậc 5 — Sáng tạo nội dung số
  { level: 5, domain: 4, keywords: ["word", "excel", "powerpoint", "google docs", "google sheet", "google slide", "canva", "photoshop", "figma", "capcut", "premiere", "chinh sua anh", "chinh sua video", "thiet ke", "do hoa", "soan thao", "tao slide", "tao bai thuyet trinh", "bang tinh", "cong thuc excel", "vlookup", "hlookup", "pivot", "podcast", "quay video", "dung phim", "infographic"] },

  // Bậc 4 — Giao tiếp & hợp tác
  { level: 4, domain: 3, keywords: ["email", "gmail", "outlook", "thu dien tu", "hop thu", "zalo", "messenger", "facebook", "instagram", "tiktok", "youtube", "mang xa hoi", "chat ", "tin nhan", "nhom chat", "zoom", "google meet", "microsoft teams", "hop truc tuyen", "hop online", "cong tac", "chia se tai lieu", "google drive", "onedrive", "dropbox"] },

  // Bậc 3 — Khai thác thông tin & dữ liệu (nâng cao)
  { level: 3, domain: 2, keywords: ["nguon tin", "kiem chung", "danh gia thong tin", "tin cay", "tin gia", "fake news", "tin sai su that", "sap xep du lieu", "loc du lieu"] },
  { level: 3, domain: 1, keywords: ["quan ly file", "quan ly du lieu", "thu muc", "folder", "sao chep file", "di chuyen file", "duoi file", "dinh dang file", "pdf", "docx", "xlsx", "png", "jpg", "mp3", "mp4"] },

  // Bậc 2 — Tìm kiếm thông tin cơ bản
  { level: 2, domain: 2, keywords: ["tim kiem", "google search", "cong cu tim kiem", "tu khoa", "keyword", "search engine"] },
  { level: 2, domain: 1, keywords: ["trinh duyet", "browser", "chrome", "firefox", "edge", "safari", "url", "duong dan", "website", "trang web", "link", "tab", "bookmark", "danh dau trang", "lich su duyet"] },

  // Bậc 1 — Vận hành cơ bản
  { level: 1, domain: 1, keywords: ["bat may", "tat may", "khoi dong", "shutdown", "chuot", "ban phim", "man hinh", "loa", "tai nghe", "usb", "the nho", "o cung", "ram", "cpu", "may tinh", "laptop", "dien thoai thong minh", "smartphone", "may tinh bang", "phan cung", "phan mem", "thiet bi so", "may in", "wifi", "bluetooth", "mang internet", "ket noi mang", "bieu tuong", "icon", "cua so", "desktop", "start menu"] },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

export function classifyQuestion(questionText: string, optionTexts: string[] = []): ClassifyResult {
  const hay = " " + normalize([questionText, ...optionTexts].join(" ")) + " ";
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (hay.includes(kw)) {
        return { category: "digital", level: rule.level, domain: rule.domain };
      }
    }
  }
  return { category: "history", level: null, domain: null };
}

// Giữ tương thích với API cũ
export function classifyCompetency(questionText: string, optionTexts: string[] = []): CompetencyLevel {
  return classifyQuestion(questionText, optionTexts).level;
}
