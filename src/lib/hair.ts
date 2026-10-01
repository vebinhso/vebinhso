// Danh mục kiểu tóc & màu nhuộm cho nhân vật.
export type HairStyleId =
  | "short" | "spiky" | "sidesweep" | "pompadour" | "curlyshort" | "bun"
  | "bob" | "longstraight" | "longwavy" | "longcurly" | "pigtails" | "twinbuns" | "sidebang";

export const HAIR_STYLES: { id: HairStyleId; vi: string; en: string }[] = [
  { id: "short", vi: "Tóc ngắn", en: "Short" },
  { id: "spiky", vi: "Tóc dựng", en: "Spiky" },
  { id: "sidesweep", vi: "Mái lệch", en: "Side swept" },
  { id: "pompadour", vi: "Vuốt ngược", en: "Pompadour" },
  { id: "curlyshort", vi: "Xoăn ngắn", en: "Short curly" },
  { id: "bun", vi: "Búi cao", en: "Top bun" },
  { id: "bob", vi: "Tóc bob", en: "Bob" },
  { id: "longstraight", vi: "Dài thẳng", en: "Long straight" },
  { id: "longwavy", vi: "Dài gợn sóng", en: "Long wavy" },
  { id: "longcurly", vi: "Dài xoăn", en: "Long curly" },
  { id: "pigtails", vi: "Buộc hai bên", en: "Pigtails" },
  { id: "twinbuns", vi: "Hai búi", en: "Twin buns" },
  { id: "sidebang", vi: "Mái dài một bên", en: "Long side bang" },
];

export const HAIR_COLORS: { hex: string; vi: string; en: string }[] = [
  { hex: "#1a1a1a", vi: "Đen", en: "Black" },
  { hex: "#3b2314", vi: "Nâu đen", en: "Dark brown" },
  { hex: "#7c2d12", vi: "Nâu", en: "Brown" },
  { hex: "#b7794a", vi: "Nâu sáng", en: "Light brown" },
  { hex: "#e8c36a", vi: "Vàng", en: "Blonde" },
  { hex: "#c2410c", vi: "Cam đồng", en: "Copper" },
  { hex: "#b91c1c", vi: "Đỏ", en: "Red" },
  { hex: "#ec4899", vi: "Hồng", en: "Pink" },
  { hex: "#7c3aed", vi: "Tím", en: "Purple" },
  { hex: "#2563eb", vi: "Xanh dương", en: "Blue" },
  { hex: "#0d9488", vi: "Xanh ngọc", en: "Teal" },
  { hex: "#d4d4d8", vi: "Bạch kim", en: "Platinum" },
];

export const HAIR_CHANGE_COST = 5;
export const HAIR_DYE_COST = 10;
export const DEFAULT_HAIR_STYLE: HairStyleId = "short";

export function isHairStyle(v: unknown): v is HairStyleId {
  return typeof v === "string" && HAIR_STYLES.some((s) => s.id === v);
}
