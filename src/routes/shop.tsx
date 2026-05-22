import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";

export const Route = createFileRoute("/shop")({ component: Shop });

const items = [
  { icon: "🍗", name: "Đùi gà", price: 150 },
  { icon: "🦴", name: "Xương lớn", price: 200 },
  { icon: "🍖", name: "Sườn nướng", price: 320 },
  { icon: "🥩", name: "Bò tươi", price: 480 },
  { icon: "🐟", name: "Cá hồi", price: 550 },
  { icon: "🧴", name: "Sữa tắm", price: 90 },
  { icon: "🎾", name: "Bóng tennis", price: 120 },
  { icon: "🎀", name: "Nơ hồng", price: 80 },
];

function Shop() {
  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-5xl w-full mx-auto">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-black text-center mb-6">CỬA HÀNG 🛒</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((it) => (
              <div key={it.name} className="bg-white rounded-3xl border-4 border-orange-200 p-4 text-center shadow-md">
                <div className="text-5xl">{it.icon}</div>
                <p className="font-black mt-2">{it.name}</p>
                <p className="text-yellow-700 font-bold">💰 {it.price}</p>
                <button className="toy-button toy-button-primary !text-sm !py-2 !px-4 mt-2">MUA</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
