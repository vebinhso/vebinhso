import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useMemo, useState } from "react";
import { getAccounts, getCurrentUser } from "@/lib/auth";
import { listFriends } from "@/lib/friends";

export const Route = createFileRoute("/ranking")({ component: Ranking });

type Tab = "money" | "level" | "friends";

const LEVEL_MIN = [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4500, 6000, 8000];
function levelOf(money: number, correct: number) {
  let lvl = 0;
  for (let i = 1; i < LEVEL_MIN.length; i++) {
    if (money >= LEVEL_MIN[i] && correct >= i * 10) lvl = i; else break;
  }
  return lvl;
}

function readGame(uid: number): { money: number; correct: number } {
  if (typeof window === "undefined") return { money: 0, correct: 0 };
  try {
    const raw = localStorage.getItem("vebinhso_game_" + uid);
    if (!raw) return { money: 0, correct: 0 };
    const g = JSON.parse(raw);
    return { money: g.money ?? 0, correct: g.correctAnswers ?? 0 };
  } catch { return { money: 0, correct: 0 }; }
}

function Ranking() {
  const [tab, setTab] = useState<Tab>("money");
  const me = getCurrentUser();

  const rows = useMemo(() => {
    const accs = getAccounts();
    return accs.map((a) => {
      const g = readGame(a.id);
      return {
        id: a.id,
        name: a.username,
        money: g.money,
        level: levelOf(g.money, g.correct),
        friends: listFriends(a.id).length,
      };
    });
  }, []);

  const sorted = useMemo(() => {
    const arr = [...rows];
    if (tab === "money") arr.sort((a, b) => b.money - a.money);
    else if (tab === "level") arr.sort((a, b) => b.level - a.level || b.money - a.money);
    else arr.sort((a, b) => b.friends - a.friends);
    return arr.slice(0, 50);
  }, [rows, tab]);

  const badge = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank <= 10 ? "🏅" : "🐾";

  const valueOf = (r: typeof sorted[number]) =>
    tab === "money" ? `💰 ${r.money.toLocaleString()}đ`
      : tab === "level" ? `⭐ Cấp ${r.level}`
      : `🫂 ${r.friends} bạn`;

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`toy-button !text-xs !py-2 !px-3 ${tab === id ? "toy-button-primary !text-xs !py-2 !px-3" : ""}`}
    >{label}</button>
  );

  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-black text-center mb-4">XẾP HẠNG 📊</h1>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <TabBtn id="money" label="💰 Tiền" />
            <TabBtn id="level" label="⭐ Cấp độ" />
            <TabBtn id="friends" label="🫂 Bạn bè" />
          </div>
          <div className="flex flex-col gap-2">
            {sorted.length === 0 && (
              <p className="text-center text-sm font-bold text-muted-foreground italic">
                Chưa có người chơi nào.
              </p>
            )}
            {sorted.map((p, i) => {
              const rank = i + 1;
              const isMe = me && me.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-2xl p-3 border-2 ${
                    isMe ? "bg-yellow-100 border-yellow-400" : "bg-white/80 border-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl w-8 text-center">{badge(rank)}</span>
                    <span className="font-black text-sm w-8">#{rank}</span>
                    <span className="font-black truncate">
                      {p.name}{isMe && <span className="ml-1 text-xs text-yellow-700">(bạn)</span>}
                    </span>
                  </div>
                  <span className="font-bold text-yellow-700 whitespace-nowrap">{valueOf(p)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
