import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";

export const Route = createFileRoute("/inventory")({ component: Inventory });

const bag = [
  { icon: "🍗", name: "Đùi gà", qty: 5 },
  { icon: "🦴", name: "Xương", qty: 3 },
  { icon: "🎾", name: "Bóng", qty: 2 },
  { icon: "🎀", name: "Nơ", qty: 1 },
  { icon: "🧴", name: "Sữa tắm", qty: 4 },
  { icon: "💊", name: "Vitamin", qty: 6 },
];

function Inventory() {
  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-black text-center mb-6">🎒 HÀNH TRANG</h1>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {bag.map((it) => (
              <div key={it.name} className="bg-white rounded-3xl border-4 border-amber-200 p-4 text-center shadow-md relative">
                <span className="absolute top-1 right-2 bg-orange-500 text-white text-xs font-black rounded-full px-2 py-1">x{it.qty}</span>
                <div className="text-5xl">{it.icon}</div>
                <p className="font-black mt-2 text-sm">{it.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
