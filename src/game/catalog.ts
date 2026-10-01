// Shop catalog đầy đủ theo file CSV "BẢNG QUY ĐỔI" + "CHI TIẾT XÂY DỰNG"
import { STRICT_ENGLISH_UI } from "@/lib/strict-english.generated";
// Đơn vị: 1 grid cell = 1m. w x d (mặt phẳng), h (chiều cao)
export type CatalogItem = {
  id: string;
  name: string;
  category:
    | "Vật liệu"
    | "Ngoại thất"
    | "Phòng khách"
    | "Phòng bếp"
    | "Phòng ngủ"
    | "Phòng tắm"
    | "Sân vườn"
    | "Ban công";
  price: number;
  w: number;
  d: number;
  h: number;
  color: string;
  icon: string;
  shape?: "box" | "cylinder";
  // "place" (mặc định): chọn rồi đặt; "brick"/"concrete": mua dồn kho vật liệu;
  // "palette": mở khung chọn màu sơn tường
  kind?: "place" | "brick" | "concrete" | "palette" | "rooftile" | "paint";
  qty?: number; // số lượng cộng vào kho mỗi lần mua
  roofStyle?: "tile" | "ton"; // chỉ áp dụng khi kind = "rooftile"
};

export const CATALOG: CatalogItem[] = [
  // ===== Vật liệu / khung nhà =====
  // Cột bê tông: dùng ĐẦU TIÊN để định hình bề ngang trước khi xây tường
  { id: "pillar", name: "Cột bê tông (đặt trước)", category: "Vật liệu", price: 7, w: 1, d: 1, h: 5, color: "#9ca3af", icon: "🏛️", shape: "cylinder" },
  // Vật liệu xây: mua dồn vào kho, hệ thống tự quy đổi khi xây tường
  // Quy đổi: 1m dài × 5m cao = 10 viên gạch + 1 xô bê tông tươi
  { id: "brick_pack", name: "Gạch (10 viên)", category: "Vật liệu", price: 10, w: 1, d: 1, h: 0.5, color: "#c1440e", icon: "🧱", kind: "brick", qty: 10 },
  { id: "concrete", name: "Bê tông tươi (1 xô)", category: "Vật liệu", price: 4, w: 1, d: 1, h: 0.1, color: "#71717a", icon: "🪣", shape: "cylinder", kind: "concrete", qty: 1 },
  { id: "door", name: "Cửa chính", category: "Vật liệu", price: 30, w: 1, d: 0.25, h: 3, color: "#8b4513", icon: "🚪" },
  { id: "floor", name: "Gạch lát sàn", category: "Vật liệu", price: 5, w: 1, d: 1, h: 0.1, color: "#d4a574", icon: "🟫" },
  // Mái nhà: mua dồn kho "gạch mái nhà". Khi xây sẽ chọn 4 cột trụ → tự dựng mái theo diện tích (1m² = 1 gạch mái).
  { id: "roof", name: "Gạch mái ngói (10 miếng)", category: "Vật liệu", price: 50, w: 1, d: 1, h: 0.3, color: "#7f1d1d", icon: "🧱", kind: "rooftile", qty: 10, roofStyle: "tile" },
  { id: "roof_ton", name: "Gạch mái tôn (10 miếng)", category: "Vật liệu", price: 40, w: 1, d: 1, h: 0.15, color: "#b91c1c", icon: "🟥", kind: "rooftile", qty: 10, roofStyle: "ton" },
  { id: "window", name: "Cửa sổ (gắn tường)", category: "Vật liệu", price: 10, w: 1, d: 0.1, h: 1.5, color: "#bae6fd", icon: "🪟" },
  { id: "curtain", name: "Rèm cửa", category: "Vật liệu", price: 50, w: 2, d: 0.1, h: 4, color: "#fda4af", icon: "🪟" },

  // ===== Ngoại thất =====
  { id: "lamp", name: "Cột đèn", category: "Ngoại thất", price: 15, w: 1, d: 1, h: 3, color: "#fbbf24", icon: "💡", shape: "cylinder" },
  { id: "mailbox", name: "Hòm thư", category: "Ngoại thất", price: 10, w: 1, d: 1, h: 1.5, color: "#dc2626", icon: "📫" },
  { id: "sign", name: "Bảng tên nhà (chạm để chỉnh)", category: "Ngoại thất", price: 20, w: 2, d: 0.2, h: 1.5, color: "#f59e0b", icon: "🪧" },
  { id: "tree", name: "Cây xanh", category: "Ngoại thất", price: 20, w: 1, d: 1, h: 2.5, color: "#16a34a", icon: "🌳" },

  // ===== Phòng khách =====
  { id: "sofa", name: "Ghế sofa", category: "Phòng khách", price: 130, w: 4, d: 2, h: 1.8, color: "#2587c7", icon: "🛋️" },
  { id: "sofa_large", name: "Ghế sofa to", category: "Phòng khách", price: 260, w: 5, d: 4, h: 1.65, color: "#e7e5e4", icon: "🛋️" },
  { id: "table", name: "Bàn phòng khách", category: "Phòng khách", price: 100, w: 3, d: 2, h: 1, color: "#92400e", icon: "🪑" },
  { id: "roundtable", name: "Bàn trà", category: "Phòng khách", price: 80, w: 2, d: 2, h: 1.05, color: "#713b1e", icon: "🍵", shape: "cylinder" },
  { id: "painting", name: "Bức tranh treo tường", category: "Phòng khách", price: 40, w: 2.4, d: 0.15, h: 1.6, color: "#9dc0e0", icon: "🖼️" },
  { id: "fan", name: "Quạt máy đứng", category: "Phòng khách", price: 25, w: 1, d: 1, h: 2, color: "#cbd5e1", icon: "🌀" },
  { id: "tv", name: "Tivi", category: "Phòng khách", price: 300, w: 3, d: 0.65, h: 1.5, color: "#111315", icon: "📺" },
  { id: "soundbar", name: "Bộ loa TV", category: "Phòng khách", price: 220, w: 4, d: 2, h: 1.4, color: "#17171a", icon: "🔊" },
  { id: "bookshelf_speaker", name: "Loa TV (loại nhỏ)", category: "Phòng khách", price: 90, w: 2, d: 1, h: 1, color: "#6b4a2f", icon: "🔈" },
  { id: "tvstand", name: "Kệ TV", category: "Phòng khách", price: 30, w: 4, d: 1, h: 1, color: "#7c2d12", icon: "🗄️" },
  { id: "speaker", name: "Loa karaoke", category: "Phòng khách", price: 180, w: 2, d: 1, h: 1.65, color: "#18181b", icon: "🔊" },
  { id: "clock", name: "Đồng hồ treo tường", category: "Phòng khách", price: 35, w: 1, d: 0.15, h: 1.5, color: "#f3f4f6", icon: "🕰️" },

  // ===== Phòng bếp =====
  { id: "stove", name: "Bếp ga 2 bếp", category: "Phòng bếp", price: 80, w: 2, d: 1, h: 1, color: "#1f2937", icon: "🔥" },
  { id: "diningtable", name: "Bàn ăn 4 người", category: "Phòng bếp", price: 120, w: 4, d: 4, h: 1, color: "#a16207", icon: "🍽️" },
  { id: "fridge", name: "Tủ lạnh", category: "Phòng bếp", price: 140, w: 1, d: 1, h: 2.5, color: "#e5e7eb", icon: "🧊" },
  { id: "fridge3", name: "Tủ lạnh 3 cánh", category: "Phòng bếp", price: 250, w: 2, d: 1, h: 2.5, color: "#d1d5db", icon: "🧊" },
  { id: "cabinet", name: "Tủ bếp", category: "Phòng bếp", price: 105, w: 4, d: 1, h: 1, color: "#78350f", icon: "🗄️" },
  { id: "sink", name: "Bồn rửa chén", category: "Phòng bếp", price: 95, w: 2, d: 1, h: 1, color: "#e0f2fe", icon: "🚰" },
  { id: "hood", name: "Máy hút mùi", category: "Phòng bếp", price: 150, w: 2, d: 1, h: 1, color: "#374151", icon: "💨" },
  { id: "microwave", name: "Lò vi sóng", category: "Phòng bếp", price: 85, w: 2, d: 1, h: 1, color: "#1f2937", icon: "♨️" },
  { id: "oven", name: "Lò nướng", category: "Phòng bếp", price: 160, w: 2, d: 1, h: 1, color: "#0f172a", icon: "♨️" },
  { id: "dishwasher", name: "Máy rửa chén", category: "Phòng bếp", price: 180, w: 2, d: 1, h: 1, color: "#e5e7eb", icon: "🍽️" },
  { id: "ricecooker", name: "Nồi cơm điện", category: "Phòng bếp", price: 70, w: 1, d: 1, h: 1, color: "#f9fafb", icon: "🍚", shape: "cylinder" },

  // ===== Phòng ngủ =====
  { id: "singlebed", name: "Giường đơn", category: "Phòng ngủ", price: 90, w: 2, d: 3, h: 1, color: "#fde68a", icon: "🛏️" },
  { id: "bed", name: "Giường đôi", category: "Phòng ngủ", price: 160, w: 4, d: 3, h: 1, color: "#f9a8d4", icon: "🛏️" },
  { id: "bunkbed", name: "Giường tầng", category: "Phòng ngủ", price: 180, w: 2, d: 2.5, h: 3, color: "#fcd34d", icon: "🛏️" },
  { id: "wardrobe", name: "Tủ quần áo", category: "Phòng ngủ", price: 120, w: 2, d: 1, h: 2.5, color: "#78350f", icon: "👔" },
  { id: "desk", name: "Bàn học + ghế", category: "Phòng ngủ", price: 70, w: 2, d: 2, h: 2, color: "#b45309", icon: "📚" },
  { id: "bookshelf", name: "Kệ sách", category: "Phòng ngủ", price: 65, w: 2, d: 1, h: 3, color: "#92400e", icon: "📚" },
  { id: "aircon", name: "Điều hòa", category: "Phòng ngủ", price: 250, w: 2, d: 0.5, h: 0.8, color: "#f9fafb", icon: "❄️" },
  { id: "mirror", name: "Gương toàn thân", category: "Phòng ngủ", price: 75, w: 1, d: 0.2, h: 3, color: "#bae6fd", icon: "🪞" },
  { id: "vanity", name: "Bàn trang điểm", category: "Phòng ngủ", price: 140, w: 2, d: 1, h: 2, color: "#fbcfe8", icon: "💄" },
  { id: "rug", name: "Thảm phòng ngủ", category: "Phòng ngủ", price: 50, w: 4, d: 3, h: 0.05, color: "#fb7185", icon: "🟥" },

  // ===== Phòng tắm =====
  { id: "toilet", name: "Bồn cầu", category: "Phòng tắm", price: 90, w: 1, d: 1.5, h: 1, color: "#f9fafb", icon: "🚽" },
  { id: "lavabo", name: "Lavabo", category: "Phòng tắm", price: 70, w: 1, d: 1, h: 1, color: "#e0f2fe", icon: "🚰" },
  { id: "bathtub", name: "Bồn tắm", category: "Phòng tắm", price: 250, w: 4, d: 2, h: 1, color: "#f0f9ff", icon: "🛁" },
  { id: "shower", name: "Vòi sen", category: "Phòng tắm", price: 65, w: 1, d: 1, h: 2.5, color: "#cbd5e1", icon: "🚿" },
  { id: "washer", name: "Máy giặt", category: "Phòng tắm", price: 380, w: 2, d: 2, h: 1, color: "#f3f4f6", icon: "🧺" },

  // ===== Sân vườn =====
  { id: "fence", name: "Hàng rào", category: "Sân vườn", price: 70, w: 2, d: 0.2, h: 1.5, color: "#fef3c7", icon: "🪵" },
  { id: "gate", name: "Cổng nhà", category: "Sân vườn", price: 100, w: 3, d: 0.2, h: 3, color: "#475569", icon: "🚪" },
  { id: "pot", name: "Chậu cây", category: "Sân vườn", price: 15, w: 1, d: 1, h: 1, color: "#a16207", icon: "🪴", shape: "cylinder" },
  { id: "bigtree", name: "Cây cảnh lớn", category: "Sân vườn", price: 57, w: 2, d: 2, h: 4, color: "#15803d", icon: "🌳" },
  { id: "stonebench", name: "Ghế đá", category: "Sân vườn", price: 25, w: 2, d: 1, h: 0.6, color: "#9ca3af", icon: "🪑" },
  { id: "fishpond", name: "Hồ cá mini", category: "Sân vườn", price: 110, w: 3, d: 2, h: 0.4, color: "#38bdf8", icon: "🐟" },
  { id: "gardenlamp", name: "Đèn sân vườn", category: "Sân vườn", price: 30, w: 1, d: 1, h: 1.5, color: "#fde047", icon: "💡", shape: "cylinder" },
  { id: "grass", name: "Bãi cỏ nhân tạo", category: "Sân vườn", price: 79, w: 2, d: 2, h: 0.05, color: "#65a30d", icon: "🌱" },
  { id: "trashcan", name: "Thùng rác", category: "Sân vườn", price: 40, w: 1, d: 1, h: 1, color: "#22c55e", icon: "🗑️", shape: "cylinder" },
  { id: "pool", name: "Bể bơi mini", category: "Sân vườn", price: 200, w: 4, d: 3, h: 0.5, color: "#0ea5e9", icon: "🏊" },
  { id: "pethouse", name: "Chuồng thú cưng", category: "Sân vườn", price: 50, w: 3, d: 2, h: 1.5, color: "#92400e", icon: "🐕" },

  // ===== Ban công =====
  { id: "teaset", name: "Bộ ghế + bàn trà", category: "Ban công", price: 300, w: 3, d: 2, h: 1, color: "#fbbf24", icon: "🫖" },
  { id: "smallpot", name: "Chậu nhỏ", category: "Ban công", price: 10, w: 1, d: 1, h: 1, color: "#b45309", icon: "🌵", shape: "cylinder" },
  { id: "midpot", name: "Chậu trung bình", category: "Ban công", price: 20, w: 1, d: 1, h: 1, color: "#9a3412", icon: "🪴", shape: "cylinder" },
  { id: "tallpot", name: "Chậu cao", category: "Ban công", price: 50, w: 1, d: 1, h: 1.5, color: "#7c2d12", icon: "🌿", shape: "cylinder" },
  { id: "patternpot_s", name: "Chậu nhỏ hoạ tiết", category: "Ban công", price: 30, w: 1, d: 1, h: 1, color: "#c2410c", icon: "🌷", shape: "cylinder" },
  { id: "patternpot_m", name: "Chậu trung hoạ tiết", category: "Ban công", price: 55, w: 1, d: 1, h: 1, color: "#9f1239", icon: "🌹", shape: "cylinder" },
  { id: "patternpot_l", name: "Chậu cao hoạ tiết", category: "Ban công", price: 90, w: 1, d: 1, h: 1.5, color: "#7f1d1d", icon: "🌺", shape: "cylinder" },
  { id: "seed_cactus", name: "Hạt giống xương rồng", category: "Ban công", price: 8, w: 1, d: 1, h: 0.2, color: "#84cc16", icon: "🌵" },
  { id: "seed_paper", name: "Hạt giống hoa giấy", category: "Ban công", price: 12, w: 1, d: 1, h: 0.2, color: "#f472b6", icon: "🌸" },
  { id: "seed_rose", name: "Hạt giống hoa hồng", category: "Ban công", price: 18, w: 1, d: 1, h: 0.2, color: "#e11d48", icon: "🌹" },
  { id: "seed_fern", name: "Hạt giống dương xỉ", category: "Ban công", price: 14, w: 1, d: 1, h: 0.2, color: "#16a34a", icon: "🌿" },
  { id: "seed_mystery", name: "Hạt giống bí ẩn", category: "Ban công", price: 50, w: 1, d: 1, h: 0.2, color: "#a855f7", icon: "✨" },
  { id: "balconychair", name: "Ghế ban công", category: "Ban công", price: 40, w: 1, d: 2, h: 1, color: "#facc15", icon: "🪑" },
  { id: "balconytable", name: "Bàn trà ban công", category: "Ban công", price: 70, w: 2, d: 2, h: 1, color: "#a16207", icon: "🍵" },

  // ===== Bổ sung phòng khách =====
  { id: "ceilingfan", name: "Quạt trần", category: "Phòng khách", price: 110, w: 4, d: 4, h: 0.85, color: "#f8fafc", icon: "🌀" },
  { id: "decolamp", name: "Đèn trang trí", category: "Phòng khách", price: 45, w: 1, d: 1, h: 0.5, color: "#fde68a", icon: "💡" },

  // ===== Bổ sung phòng bếp =====
  { id: "waterfilter", name: "Máy lọc nước", category: "Phòng bếp", price: 200, w: 1, d: 1, h: 1, color: "#bae6fd", icon: "💧" },
  { id: "kitchenlamp", name: "Đèn bếp", category: "Phòng bếp", price: 35, w: 1, d: 1, h: 0.5, color: "#fde68a", icon: "💡" },

  // ===== Bổ sung phòng ngủ =====
  { id: "chair", name: "Ghế nhựa", category: "Phòng ngủ", price: 30, w: 1, d: 1, h: 1.65, color: "#dc2626", icon: "🪑" },
  { id: "nightlamp", name: "Đèn ngủ", category: "Phòng ngủ", price: 25, w: 1, d: 1, h: 0.5, color: "#fde68a", icon: "🕯️" },
  { id: "bedroompainting", name: "Tranh phòng ngủ", category: "Phòng ngủ", price: 20, w: 2, d: 0.1, h: 1, color: "#f9a8d4", icon: "🖼️" },

  // ===== Bổ sung phòng tắm =====
  { id: "bathmirror", name: "Gương phòng tắm", category: "Phòng tắm", price: 40, w: 1, d: 0.1, h: 3, color: "#bae6fd", icon: "🪞" },
  { id: "lavabocab", name: "Tủ lavabo", category: "Phòng tắm", price: 110, w: 2, d: 1, h: 1, color: "#78350f", icon: "🗄️" },
  { id: "massagebath", name: "Bồn tắm massage", category: "Phòng tắm", price: 480, w: 5, d: 3, h: 1, color: "#e0f2fe", icon: "🛁" },
  { id: "waterheater", name: "Máy nước nóng", category: "Phòng tắm", price: 130, w: 1, d: 0.5, h: 1, color: "#f3f4f6", icon: "♨️" },
  { id: "towelshelf", name: "Kệ khăn", category: "Phòng tắm", price: 20, w: 1, d: 0.5, h: 1, color: "#fde68a", icon: "🧻" },
  { id: "bathlamp", name: "Đèn phòng tắm", category: "Phòng tắm", price: 30, w: 1, d: 1, h: 0.5, color: "#fef9c3", icon: "💡" },

  // ===== Bổ sung sân vườn =====
  { id: "stonepath", name: "Lót sân bằng đá", category: "Sân vườn", price: 60, w: 5, d: 2, h: 0.2, color: "#9ca3af", icon: "🪨" },
  { id: "stringlight", name: "Dây đèn trang trí", category: "Sân vườn", price: 35, w: 3, d: 1, h: 0.1, color: "#fde047", icon: "✨" },
  { id: "biggardenlamp", name: "Đèn sân (nâng cấp)", category: "Sân vườn", price: 75, w: 1, d: 1, h: 2, color: "#fde047", icon: "🏮", shape: "cylinder" },

  // ===== Bổ sung vật liệu =====
  { id: "tile_plain", name: "Gạch thường (ban công)", category: "Vật liệu", price: 4, w: 1, d: 1, h: 0.1, color: "#e7e5e4", icon: "▫️" },
  { id: "tile_waterproof", name: "Gạch chống thấm", category: "Vật liệu", price: 8, w: 1, d: 1, h: 0.1, color: "#a8a29e", icon: "🟦" },
  { id: "tile_pattern", name: "Gạch hoạ tiết", category: "Vật liệu", price: 12, w: 1, d: 1, h: 0.1, color: "#fcd34d", icon: "🟨" },
  { id: "tile_pattern_wp", name: "Gạch hoạ tiết chống thấm", category: "Vật liệu", price: 18, w: 1, d: 1, h: 0.1, color: "#fb923c", icon: "🟧" },
  { id: "paint", name: "Sơn (xô)", category: "Vật liệu", price: 5, w: 1, d: 1, h: 0.5, color: "#f43f5e", icon: "🎨", shape: "cylinder", kind: "paint", qty: 1 },
  { id: "palette", name: "Palette màu tường (mở khung chọn)", category: "Vật liệu", price: 100, w: 1, d: 1, h: 0.2, color: "#a78bfa", icon: "🎨", kind: "palette" },
];

export const CATEGORIES = [
  "Vật liệu",
  "Ngoại thất",
  "Phòng khách",
  "Phòng bếp",
  "Phòng ngủ",
  "Phòng tắm",
  "Sân vườn",
  "Ban công",
] as const;

export function getItem(id: string) {
  return CATALOG.find((c) => c.id === id);
}

/** English labels for every catalog item/category, sourced from the audited UI dictionary. */
export function catalogLabel(value: string, english: boolean) {
  return english ? (STRICT_ENGLISH_UI[value] ?? value) : value;
}

// ===== Stack-on-Y system =====
// Items có mặt nóc phẳng — có thể đặt vật khác lên trên
export const STACK_SURFACES = new Set<string>([
  "tvstand", "cabinet", "lavabocab", "table", "roundtable", "desk",
  "diningtable", "balconytable", "fridge", "fridge3",
  "wardrobe", "bookshelf", "washer", "stonebench", "sink",
]);

// Items có thể xếp chồng lên nóc surface
export const STACK_TOPPERS = new Set<string>([
  "tv", "microwave", "oven", "ricecooker", "hood", "speaker", "clock",
  "decolamp", "nightlamp", "kitchenlamp", "bathlamp", "lamp",
  "smallpot", "midpot", "tallpot", "patternpot_s", "patternpot_m", "patternpot_l",
  "pot", "waterfilter", "waterheater", "bathmirror", "mirror",
  "painting", "bedroompainting", "fan",
]);

export function canStackOn(topperId: string, surfaceId: string): boolean {
  return STACK_TOPPERS.has(topperId) && STACK_SURFACES.has(surfaceId);
}

// Thảm / bãi cỏ / gạch lát — vật phẳng sát đất. Cho phép đặt vật khác
// lên trên cùng vị trí (không tính là va chạm).
export const FLAT_MATS = new Set<string>([
  "grass", "rug", "tile_plain", "tile_waterproof", "tile_pattern", "tile_pattern_wp",
]);

export function isFlatMat(id: string): boolean {
  if (FLAT_MATS.has(id)) return true;
  const it = getItem(id);
  return !!it && it.h <= 0.12;
}


// Chiều cao thực của mặt NÓC (đỉnh) của surface, đo từ đáy model.
// Nếu không khai báo → dùng catalog.h.
const SURFACE_TOP_Y: Record<string, number> = {
  tvstand: 0.9,       // mesh 0..0.9
  cabinet: 1.0,
  lavabocab: 1.0,
  table: 1.0,
  roundtable: 1.0,
  desk: 2.0,
  diningtable: 1.0,
  balconytable: 1.0,
  fridge: 2.5,
  fridge3: 2.5,
  wardrobe: 2.5,
  bookshelf: 3.0,
  washer: 1.0,
  stonebench: 0.6,
  sink: 1.0,
};

// Chiều cao đáy thực của topper (khoảng cách từ gốc model đến điểm thấp nhất
// muốn tiếp xúc với mặt nóc surface). Không khai báo → 0.
const TOPPER_BOTTOM_Y: Record<string, number> = {
  tv: 0.06,       // chân đế TV nằm ở y=0.06..0.14
};

export function surfaceTopY(id: string): number {
  const it = CATALOG.find((c) => c.id === id);
  return SURFACE_TOP_Y[id] ?? (it?.h ?? 0);
}

export function topperBottomY(id: string): number {
  return TOPPER_BOTTOM_Y[id] ?? 0;
}
