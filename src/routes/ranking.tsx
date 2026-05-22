import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";

export const Route = createFileRoute("/ranking")({ component: Ranking });

const players = [
  { rank: 1, name: "Hùng Master", score: 12450, badge: "🥇" },
  { rank: 2, name: "Lan Anh", score: 11200, badge: "🥈" },
  { rank: 3, name: "Bảo Trâm", score: 9800, badge: "🥉" },
  { rank: 4, name: "Khoa Nguyễn", score: 8650, badge: "🏅" },
  { rank: 5, name: "Chủ nuôi Pro (bạn)", score: 2400, badge: "🐾" },
];

function Ranking() {
  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-black text-center mb-6">XẾP HẠNG 📊</h1>
          <div className="flex flex-col gap-3">
            {players.map((p) => (
              <div key={p.rank} className="flex items-center justify-between bg-white/80 rounded-2xl p-4 border-2 border-white">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.badge}</span>
                  <span className="font-black">#{p.rank} {p.name}</span>
                </div>
                <span className="font-bold text-yellow-700">💰 {p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
