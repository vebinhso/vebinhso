// Tự động phân loại câu hỏi vào 8 bậc Khung năng lực số Việt Nam.
// Chỉ áp dụng cho câu hỏi liên quan đến môi trường số — câu không có
// dấu hiệu số hoá trả về `null`.

export type CompetencyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;

// Từ khoá (đã bỏ dấu, lowercase) cho từng bậc. Thứ tự trong `LEVEL_RULES`
// quan trọng — bậc cao (chuyên sâu) được kiểm tra trước để tránh bị bậc
// thấp "ăn" mất khi câu có nhiều nghĩa (VD: "AI" gặp cả bậc 8 và bậc 5).
const LEVEL_RULES: { level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; keywords: string[] }[] = [
  {
    level: 8,
    keywords: [
      "tri tue nhan tao", "ai ", " ai.", "ai,", "ai?", "chatgpt", "gpt",
      "machine learning", "hoc may", "deep learning", "thuat toan",
      "lap trinh", "code", "python", "javascript", "html", "css",
      "dao duc so", "ban quyen", "so huu tri tue", "creative commons",
      "blockchain", "nft", "metaverse", "iot", "internet of things",
      "big data", "du lieu lon", "data mining", "khai pha du lieu",
      "cong dan so", "phap luat so", "luat an ninh mang",
    ],
  },
  {
    level: 7,
    keywords: [
      "khac phuc", "sua loi", "loi may", "loi phan mem", "loi he thong",
      "cai dat lai", "reinstall", "cap nhat", "update", "nang cap",
      "sao luu", "backup", "khoi phuc", "restore", "reset",
      "khac phuc su co", "troubleshoot", "driver", "he dieu hanh loi",
      "khong khoi dong", "khong bat duoc", "man hinh xanh",
    ],
  },
  {
    level: 6,
    keywords: [
      "mat khau", "password", "bao mat", "an toan thong tin", "an ninh mang",
      "virus", "malware", "phishing", "lua dao", "gia mao",
      "rieng tu", "privacy", "quyen rieng tu", "hai co ban",
      "xac thuc 2 lop", "2fa", "hai yeu to", "otp",
      "ma hoa", "encryption", "https", "chung chi so",
      "bat nat", "cyberbully", "quay roi", "lo thong tin",
    ],
  },
  {
    level: 5,
    keywords: [
      "word", "excel", "powerpoint", "google docs", "google sheet", "google slide",
      "canva", "photoshop", "figma", "capcut", "premiere",
      "chinh sua anh", "chinh sua video", "thiet ke", "do hoa",
      "soan thao", "tao slide", "tao bai thuyet trinh", "bang tinh",
      "cong thuc excel", "vlookup", "hlookup", "pivot",
      "podcast", "quay video", "dung phim", "infographic",
    ],
  },
  {
    level: 4,
    keywords: [
      "email", "gmail", "outlook", "thu dien tu", "hop thu",
      "zalo", "messenger", "facebook", "instagram", "tiktok", "youtube",
      "mang xa hoi", "chat ", "tin nhan", "nhom chat",
      "zoom", "google meet", "microsoft teams", "hop truc tuyen", "hop online",
      "cong tac", "chia se tai lieu", "google drive", "onedrive", "dropbox",
    ],
  },
  {
    level: 3,
    keywords: [
      "nguon tin", "kiem chung", "danh gia thong tin", "tin cay",
      "tin gia", "fake news", "tin sai su that",
      "quan ly file", "quan ly du lieu", "thu muc", "folder",
      "sao chep file", "di chuyen file", "duoi file", "dinh dang file",
      "pdf", "docx", "xlsx", "png", "jpg", "mp3", "mp4",
      "sap xep du lieu", "loc du lieu",
    ],
  },
  {
    level: 2,
    keywords: [
      "tim kiem", "google search", "cong cu tim kiem",
      "trinh duyet", "browser", "chrome", "firefox", "edge", "safari",
      "url", "duong dan", "website", "trang web", "link",
      "tab", "bookmark", "danh dau trang", "lich su duyet",
      "tu khoa", "keyword", "search engine",
    ],
  },
  {
    level: 1,
    keywords: [
      "bat may", "tat may", "khoi dong", "shutdown",
      "chuot", "ban phim", "man hinh", "loa", "tai nghe",
      "usb", "the nho", "o cung", "ram", "cpu",
      "may tinh", "laptop", "dien thoai thong minh", "smartphone", "may tinh bang",
      "phan cung", "phan mem", "thiet bi so", "may in",
      "wifi", "bluetooth", "mang internet", "ket noi mang",
      "bieu tuong", "icon", "cua so", "desktop", "start menu",
    ],
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

export function classifyCompetency(
  questionText: string,
  optionTexts: string[] = [],
): CompetencyLevel {
  const hay = " " + normalize([questionText, ...optionTexts].join(" ")) + " ";
  for (const rule of LEVEL_RULES) {
    for (const kw of rule.keywords) {
      if (hay.includes(kw)) return rule.level;
    }
  }
  return null;
}
