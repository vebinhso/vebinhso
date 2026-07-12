import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ranking")({ component: Ranking });

type Tab = "money" | "level" | "friends";

type Row = { id: string; name: string; money: number; level: number; friends: number };

async function fetchRanking(): Promise<Row[]> {
  // Cross-player financial/progression data is fetched from the public leaderboard
  // view (net_worth + level only) — game_state SELECT is restricted to owners.
  const [board, friends] = await Promise.all([
    supabase.from("leaderboard").select("user_id, username, net_worth, level"),
    supabase.from("friends").select("user_id, friend_id, status"),
  ]);
  const friendCount = new Map<string, number>();
  (friends.data || []).forEach((f: any) => {
    if (f.status !== "accepted") return;
    friendCount.set(f.user_id, (friendCount.get(f.user_id) || 0) + 1);
    friendCount.set(f.friend_id, (friendCount.get(f.friend_id) || 0) + 1);
  });
  return ((board.data as any[]) || []).map((r: any) => ({
    id: r.user_id,
    name: r.username,
    money: r.net_worth || 0,
    level: r.level || 0,
    friends: friendCount.get(r.user_id) || 0,
  }));
}

function Ranking() {
  const [tab, setTab] = useState<Tab>("money");
  const me = getCurrentUser();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["ranking"], queryFn: fetchRanking });

  const sorted = useMemo(() => {
    const arr = [...rows];
    if (tab === "money") arr.sort((a, b) => b.money - a.money);
    else if (tab === "level") arr.sort((a, b) => b.level - a.level || b.money - a.money);
    else arr.sort((a, b) => b.friends - a.friends);
    return arr.slice(0, 50);
  }, [rows, tab]);

  const badge = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank <= 10 ? "🏅" : "🐾";

  const valueOf = (r: Row) =>
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
            {isLoading && (
              <p className="text-center text-sm font-bold text-muted-foreground italic">Đang tải...</p>
            )}
            {!isLoading && sorted.length === 0 && (
              <p className="text-center text-sm font-bold text-muted-foreground italic">Chưa có người chơi nào.</p>
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
