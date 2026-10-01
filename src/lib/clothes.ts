// Danh mục quần áo dựng sẵn. Mua 1 lần, mặc/đổi miễn phí.
export type TopPattern = "plain" | "stripes" | "star" | "heart" | "cat" | "bow" | "trim" | "ranger" | "floral" | "number";
export type BottomKind = "pants" | "wide" | "skirt" | "longskirt" | "shorts";
export type BottomPattern = "plain" | "plaid" | "stripes";

export type Top = {
  id: string; vi: string; en: string; price: number;
  color: string; color2: string; pattern: TopPattern;
  long?: boolean; hood?: boolean; suit?: string; helmet?: boolean;
};
export type Bottom = {
  id: string; vi: string; en: string; price: number;
  color: string; color2: string; kind: BottomKind; pattern: BottomPattern; hidden?: boolean;
};

const ranger = (k: string, vi: string, en: string, c: string): Top =>
  ({ id: `ranger_${k}`, vi: `Siêu nhân ${vi}`, en: `${en} Ranger`, price: 40, color: c, color2: "#ffffff", pattern: "ranger", suit: `rpants_${k}`, helmet: true });
const rpants = (k: string, c: string): Bottom =>
  ({ id: `rpants_${k}`, vi: "Quần siêu nhân", en: "Ranger pants", price: 0, color: c, color2: "#ffffff", kind: "pants", pattern: "plain", hidden: true });

export const TOPS: Top[] = [
  { id: "tee_strawberry", vi: "Áo thun dâu", en: "Strawberry tee", price: 10, color: "#ffffff", color2: "#ef4444", pattern: "heart" },
  { id: "stripe_pink", vi: "Áo sọc hồng", en: "Pink stripes", price: 10, color: "#ffffff", color2: "#f9a8b8", pattern: "stripes" },
  { id: "sweater_star", vi: "Áo len ngôi sao", en: "Star sweater", price: 15, color: "#1f1f1f", color2: "#f9a8d4", pattern: "star" },
  { id: "hoodie_cat", vi: "Hoodie mèo đen", en: "Cat hoodie", price: 20, color: "#fafafa", color2: "#111111", pattern: "cat", hood: true },
  { id: "hoodie_pink", vi: "Hoodie hồng", en: "Pink hoodie", price: 20, color: "#f4b6c8", color2: "#ffffff", pattern: "plain", hood: true },
  { id: "jersey_99", vi: "Áo số 99", en: "Jersey 99", price: 15, color: "#5b3a29", color2: "#ffffff", pattern: "number" },
  { id: "school_bow", vi: "Sơ mi nơ đỏ", en: "School bow shirt", price: 15, color: "#ffffff", color2: "#b91c1c", pattern: "bow" },
  { id: "cardigan_red", vi: "Cardigan viền đỏ", en: "Red-trim cardigan", price: 20, color: "#f3ead8", color2: "#9f1239", pattern: "trim" },
  { id: "knit_navy", vi: "Áo len xanh đậm", en: "Navy knit", price: 15, color: "#1e2a4a", color2: "#1e2a4a", pattern: "plain" },
  { id: "denim_shirt", vi: "Sơ mi jean", en: "Denim shirt", price: 15, color: "#9db7d5", color2: "#ffffff", pattern: "plain" },
  { id: "black_star", vi: "Áo đen sao trắng", en: "Black star tee", price: 10, color: "#ffffff", color2: "#111111", pattern: "star" },
  { id: "aodai_red", vi: "Áo dài đỏ", en: "Red áo dài", price: 30, color: "#c2410c", color2: "#fde68a", pattern: "floral", long: true },
  { id: "aodai_blue", vi: "Áo dài xanh", en: "Blue áo dài", price: 30, color: "#1d4ed8", color2: "#bfdbfe", pattern: "floral", long: true },
  { id: "aodai_yellow", vi: "Áo dài vàng", en: "Yellow áo dài", price: 30, color: "#d4a017", color2: "#fff7d6", pattern: "floral", long: true },
  { id: "aodai_pink", vi: "Áo dài hồng", en: "Pink áo dài", price: 30, color: "#f08a8a", color2: "#ffe4e6", pattern: "floral", long: true },
  { id: "giao_linh", vi: "Áo giao lĩnh xưa", en: "Ancient cross-collar robe", price: 35, color: "#2f7d4a", color2: "#d4b04c", pattern: "trim", long: true },
  ranger("red", "đỏ", "Red", "#dc2626"),
  ranger("blue", "xanh", "Blue", "#1d4ed8"),
  ranger("yellow", "vàng", "Yellow", "#facc15"),
  ranger("green", "lục", "Green", "#15803d"),
  ranger("black", "đen", "Black", "#111111"),
];

export const BOTTOMS: Bottom[] = [
  { id: "skirt_white", vi: "Váy trắng xếp ly", en: "White pleated skirt", price: 10, color: "#fafafa", color2: "#e5e5e5", kind: "skirt", pattern: "plain" },
  { id: "skirt_plaid_red", vi: "Váy kẻ đỏ", en: "Red plaid skirt", price: 15, color: "#b91c1c", color2: "#1f1f1f", kind: "skirt", pattern: "plaid" },
  { id: "skirt_plaid_pink", vi: "Váy kẻ hồng", en: "Pink plaid skirt", price: 15, color: "#f9a8b8", color2: "#be185d", kind: "skirt", pattern: "plaid" },
  { id: "skirt_black_long", vi: "Váy đen dài", en: "Long black skirt", price: 15, color: "#151515", color2: "#151515", kind: "longskirt", pattern: "plain" },
  { id: "skirt_red_long", vi: "Váy đỏ rượu dài", en: "Long burgundy skirt", price: 15, color: "#7f1d1d", color2: "#7f1d1d", kind: "longskirt", pattern: "plain" },
  { id: "jeans_wide", vi: "Quần jean ống rộng", en: "Wide jeans", price: 15, color: "#6f8db5", color2: "#6f8db5", kind: "wide", pattern: "plain" },
  { id: "pants_white", vi: "Quần trắng ống rộng", en: "White wide pants", price: 15, color: "#f1ede4", color2: "#f1ede4", kind: "wide", pattern: "plain" },
  { id: "pants_pink", vi: "Quần hồng", en: "Pink pants", price: 10, color: "#f4b6c8", color2: "#f4b6c8", kind: "wide", pattern: "plain" },
  { id: "cargo_beige", vi: "Quần túi hộp be", en: "Beige cargo", price: 15, color: "#e8dcc0", color2: "#e8dcc0", kind: "pants", pattern: "plain" },
  { id: "cargo_brown", vi: "Quần túi hộp nâu", en: "Brown cargo", price: 15, color: "#7a5a43", color2: "#7a5a43", kind: "pants", pattern: "plain" },
  { id: "plaid_red", vi: "Quần kẻ đỏ", en: "Red plaid pants", price: 15, color: "#b91c1c", color2: "#1f1f1f", kind: "wide", pattern: "plaid" },
  { id: "stripe_green", vi: "Quần sọc xanh", en: "Green stripe pants", price: 15, color: "#e7efe2", color2: "#86a37a", kind: "wide", pattern: "stripes" },
  { id: "aodai_pants", vi: "Quần lụa trắng", en: "White silk pants", price: 10, color: "#ffffff", color2: "#ffffff", kind: "wide", pattern: "plain" },
  { id: "shorts_pink", vi: "Quần short hồng", en: "Pink shorts", price: 10, color: "#f4b6c8", color2: "#f4b6c8", kind: "shorts", pattern: "plain" },
  { id: "shorts_gray", vi: "Quần short xám", en: "Gray shorts", price: 10, color: "#6b7280", color2: "#6b7280", kind: "shorts", pattern: "plain" },
  { id: "shorts_black", vi: "Quần short đen", en: "Black shorts", price: 10, color: "#1f1f1f", color2: "#1f1f1f", kind: "shorts", pattern: "plain" },
  rpants("red", "#dc2626"), rpants("blue", "#1d4ed8"), rpants("yellow", "#facc15"), rpants("green", "#15803d"), rpants("black", "#111111"),
];

export const topOf = (id?: string) => TOPS.find((t) => t.id === id);
export const bottomOf = (id?: string) => BOTTOMS.find((b) => b.id === id);
