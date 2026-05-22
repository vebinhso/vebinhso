import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";

export const Route = createFileRoute("/pets")({ component: Pets });

const pets = [
  { icon: "🐕", name: "Shiba", level: 12, active: true },
  { icon: "🐈", name: "Mèo Mun", level: 8 },
  { icon: "🐰", name: "Thỏ Bông", level: 5 },
  { icon: "🦊", name: "Cáo Nhỏ", level: 3 },
  { icon: "🐼", name: "Panda", level: 1 },
];

function Pets() {
  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-4xl w-full mx-auto">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-black text-center mb-6">🐾 THÚ CƯNG CỦA TÔI</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {pets.map((p) => (
              <div key={p.name} className={`rounded-3xl border-4 p-4 text-center shadow-md ${p.active ? "border-orange-400 bg-orange-50" : "border-white bg-white"}`}>
                <div className="text-6xl">{p.icon}</div>
                <p className="font-black mt-2">{p.name}</p>
                <p className="text-xs font-bold text-muted-foreground">Lv. {p.level}</p>
                <button className={`toy-button !text-xs !py-2 !px-3 mt-2 ${p.active ? "toy-button-green" : ""}`}>
                  {p.active ? "ĐANG CHƠI" : "CHỌN"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
