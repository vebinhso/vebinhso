export const PARK_ORIGIN = [-70, -4] as const;
export const GARDEN_ORIGIN = [70, -4] as const;
export const GARDEN_COLS = 8;
export const GARDEN_ROWS = 5;
export const gardenGoods = [
  { id: "seed_rose", vi: "Hạt giống hoa hồng", en: "Rose seeds", price: 18, icon: "🌹", days: 2 },
  { id: "seed_mango", vi: "Hạt giống xoài", en: "Mango seeds", price: 30, icon: "🥭", days: 4 },
  { id: "seed_sunflower", vi: "Hạt giống hướng dương", en: "Sunflower seeds", price: 12, icon: "🌻", days: 2 },
  { id: "seed_paper", vi: "Hạt giống hoa giấy", en: "Bougainvillea seeds", price: 12, icon: "🌸", days: 3 },
  { id: "watering_use", vi: "Vòi tưới cây (1 lần tưới)", en: "Watering hose (one use)", price: 5, icon: "🚿", days: 0 },
] as const;
export type GardenGoodId = (typeof gardenGoods)[number]["id"];
export type GardenPlant = { id: string; owner_id: string; owner_name: string; species: string; slot: number; planted_at: string; watered_at: string | null; grow_days: number; growth: number };
export type GardenSnapshot = { plants: GardenPlant[]; inventory: Record<string, number>; money: number; server_time: string };
export type RideKind = "coaster" | "wheel" | "carousel";
export const rideNames: Record<RideKind, { vi: string; en: string }> = {
  coaster: { vi: "Tàu lượn siêu tốc", en: "Roller coaster" },
  wheel: { vi: "Vòng đu quay", en: "Ferris wheel" },
  carousel: { vi: "Mâm xoay", en: "Carousel" },
};
// Frame bridge: scene-only pose avoids React re-renders for every animation frame.
export const ridePose = { active: false, x: 0, y: 0, z: 0, yaw: 0 };
export function gardenSlotPosition(slot: number): [number, number] {
  return [GARDEN_ORIGIN[0] - 17.5 + (slot % GARDEN_COLS) * 5, GARDEN_ORIGIN[1] - 12 + Math.floor(slot / GARDEN_COLS) * 5];
}
// Điểm đến khi người chơi chọn một khu hoạt động trên bản đồ.
export const neighborhoodTravel = { destination: null as "park" | "garden" | null };
