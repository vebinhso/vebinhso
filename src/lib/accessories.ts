// Danh mục phụ kiện nhân vật. Mua 1 lần, đeo/tháo miễn phí.
export type AccessorySlot = "beard" | "head" | "neck" | "wrist" | "finger";

export type AccessoryId =
  | "beard_mustache" | "beard_goatee" | "beard_full" | "beard_chinstrap" | "beard_long" | "beard_horseshoe"
  | "head_keffiyeh" | "head_hijab"
  | "neck_layered"
  | "wrist_bangle"
  | "finger_heart";

export const ACCESSORIES: { id: AccessoryId; slot: AccessorySlot; vi: string; en: string; price: number }[] = [
  { id: "beard_mustache", slot: "beard", vi: "Ria mép", en: "Mustache", price: 10 },
  { id: "beard_goatee", slot: "beard", vi: "Râu cằm", en: "Goatee", price: 10 },
  { id: "beard_full", slot: "beard", vi: "Râu quai nón", en: "Full beard", price: 15 },
  { id: "beard_chinstrap", slot: "beard", vi: "Râu viền hàm", en: "Chinstrap", price: 10 },
  { id: "beard_horseshoe", slot: "beard", vi: "Ria móng ngựa", en: "Horseshoe", price: 10 },
  { id: "beard_long", slot: "beard", vi: "Râu dài bạc", en: "Long white beard", price: 20 },
  { id: "head_keffiyeh", slot: "head", vi: "Khăn trùm đầu (keffiyeh)", en: "Keffiyeh", price: 20 },
  { id: "head_hijab", slot: "head", vi: "Khăn hijab", en: "Hijab", price: 20 },
  { id: "neck_layered", slot: "neck", vi: "Dây chuyền nhiều tầng", en: "Layered necklace", price: 25 },
  { id: "wrist_bangle", slot: "wrist", vi: "Vòng tay bạc", en: "Silver bangle", price: 15 },
  { id: "finger_heart", slot: "finger", vi: "Nhẫn kim cương trái tim", en: "Heart diamond ring", price: 30 },
];

export const SLOT_LABELS: Record<AccessorySlot, { vi: string; en: string }> = {
  beard: { vi: "Râu", en: "Beard" },
  head: { vi: "Khăn đội đầu", en: "Headwear" },
  neck: { vi: "Dây chuyền", en: "Necklace" },
  wrist: { vi: "Vòng tay", en: "Bracelet" },
  finger: { vi: "Nhẫn", en: "Ring" },
};

const IDS = new Set<string>(ACCESSORIES.map((a) => a.id));
export function cleanAccessoryList(v: unknown): AccessoryId[] {
  return Array.isArray(v) ? (v.filter((x) => typeof x === "string" && IDS.has(x)) as AccessoryId[]) : [];
}
export function slotOf(id: AccessoryId): AccessorySlot {
  return ACCESSORIES.find((a) => a.id === id)!.slot;
}
/** Phụ kiện đang đeo, mỗi vị trí tối đa 1 món. */
export function equippedBySlot(list: unknown): Partial<Record<AccessorySlot, AccessoryId>> {
  const out: Partial<Record<AccessorySlot, AccessoryId>> = {};
  for (const id of cleanAccessoryList(list)) out[slotOf(id)] = id;
  return out;
}
