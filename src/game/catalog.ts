// Shop catalog. Sizes in grid cells (w x d), height in cells (1 cell = 1m visual).
export type CatalogItem = {
  id: string;
  name: string;
  category: "Vật liệu" | "Ngoại thất" | "Phòng khách" | "Phòng bếp" | "Phòng ngủ" | "Phòng tắm";
  price: number;
  w: number;
  d: number;
  h: number;
  color: string;
  icon: string;
  shape?: "box" | "cylinder";
};

export const CATALOG: CatalogItem[] = [
  // Vật liệu / khung nhà
  { id: "wall", name: "Tường (1x1)", category: "Vật liệu", price: 10, w: 1, d: 1, h: 3, color: "#f5e6c8", icon: "🧱" },
  { id: "pillar", name: "Cột bê tông", category: "Vật liệu", price: 7, w: 1, d: 1, h: 3, color: "#9ca3af", icon: "🏛️", shape: "cylinder" },
  { id: "door", name: "Cửa chính", category: "Vật liệu", price: 30, w: 1, d: 1, h: 3, color: "#8b4513", icon: "🚪" },
  { id: "floor", name: "Gạch lát sàn", category: "Vật liệu", price: 5, w: 1, d: 1, h: 0.1, color: "#d4a574", icon: "🟫" },
  // Ngoại thất
  { id: "lamp", name: "Cột đèn", category: "Ngoại thất", price: 15, w: 1, d: 1, h: 3, color: "#fbbf24", icon: "💡", shape: "cylinder" },
  { id: "mailbox", name: "Hòm thư", category: "Ngoại thất", price: 10, w: 1, d: 1, h: 1.5, color: "#dc2626", icon: "📫" },
  { id: "sign", name: "Bảng tên nhà", category: "Ngoại thất", price: 10, w: 2, d: 1, h: 1, color: "#f59e0b", icon: "🪧" },
  { id: "tree", name: "Cây xanh", category: "Ngoại thất", price: 20, w: 1, d: 1, h: 2.5, color: "#16a34a", icon: "🌳", shape: "cylinder" },
  // Phòng khách
  { id: "sofa", name: "Sofa", category: "Phòng khách", price: 120, w: 4, d: 2, h: 1, color: "#a78bfa", icon: "🛋️" },
  { id: "table", name: "Bàn phòng khách", category: "Phòng khách", price: 60, w: 3, d: 2, h: 0.8, color: "#92400e", icon: "🪑" },
  { id: "tv", name: "TV 55\"", category: "Phòng khách", price: 200, w: 3, d: 0.3, h: 1.5, color: "#1f2937", icon: "📺" },
  { id: "tvstand", name: "Kệ TV", category: "Phòng khách", price: 80, w: 4, d: 1, h: 0.8, color: "#7c2d12", icon: "🗄️" },
  // Phòng bếp
  { id: "fridge", name: "Tủ lạnh", category: "Phòng bếp", price: 180, w: 1, d: 1, h: 2.5, color: "#e5e7eb", icon: "🧊" },
  { id: "stove", name: "Bếp ga", category: "Phòng bếp", price: 90, w: 2, d: 1, h: 1, color: "#374151", icon: "🔥" },
  { id: "diningtable", name: "Bàn ăn 4 người", category: "Phòng bếp", price: 140, w: 4, d: 4, h: 1, color: "#a16207", icon: "🍽️" },
  // Phòng ngủ
  { id: "bed", name: "Giường đôi", category: "Phòng ngủ", price: 200, w: 4, d: 3, h: 1, color: "#f9a8d4", icon: "🛏️" },
  { id: "wardrobe", name: "Tủ quần áo", category: "Phòng ngủ", price: 150, w: 2, d: 1, h: 2.5, color: "#78350f", icon: "🚪" },
  { id: "desk", name: "Bàn học", category: "Phòng ngủ", price: 70, w: 2, d: 2, h: 1.5, color: "#b45309", icon: "📚" },
  // Phòng tắm
  { id: "toilet", name: "Bồn cầu", category: "Phòng tắm", price: 80, w: 1, d: 1.5, h: 1, color: "#f3f4f6", icon: "🚽" },
  { id: "sink", name: "Lavabo", category: "Phòng tắm", price: 60, w: 1, d: 1, h: 1, color: "#e0f2fe", icon: "🚰" },
];

export const CATEGORIES = ["Vật liệu", "Ngoại thất", "Phòng khách", "Phòng bếp", "Phòng ngủ", "Phòng tắm"] as const;

export function getItem(id: string) {
  return CATALOG.find((c) => c.id === id);
}
