import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";

export const Route = createFileRoute("/missions")({ component: Missions });

const missions = [
  { title: "Cho thú cưng ăn 3 lần", reward: 100, done: true },
  { title: "Tắm cho thú cưng", reward: 80, done: true },
  { title: "Chơi với bạn bè 5 phút", reward: 150, done: false },
  { title: "Mua 1 món đồ mới", reward: 200, done: false },
  { title: "Đạt 5000 vàng", reward: 500, done: false },
];

function Missions() {
  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-black text-center mb-6">🎯 NHIỆM VỤ</h1>
          <div className="flex flex-col gap-3">
            {missions.map((m, i) => (
              <div key={i} className="flex items-center justify-between bg-white/85 rounded-2xl p-4 border-2 border-white">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${m.done ? "" : "grayscale opacity-50"}`}>{m.done ? "✅" : "⬜"}</span>
                  <span className="font-bold">{m.title}</span>
                </div>
                <button disabled={!m.done} className="toy-button toy-button-primary !text-sm !py-2 !px-4 disabled:opacity-50">
                  💰 {m.reward}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
