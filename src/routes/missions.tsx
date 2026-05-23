import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getLoginAt, getCurrentUser, getLoginStreak } from "@/lib/auth";
import { loadGame, computeLevel } from "@/lib/game";
import { isClaimed, setClaimed } from "@/lib/claims";

export const Route = createFileRoute("/missions")({ component: Utilities });


type Tab = "daily" | "weekly" | "level";

type Milestone = {
  label: string;       // mục tiêu hiển thị
  target: number;      // giá trị cần đạt (giây với daily/weekly, level với level)
  reward: string;      // thưởng dạng text
  icon: string;
};

const DAILY: Milestone[] = [
  { icon: "⏱️", label: "Online liên tục 5 phút",  target: 5 * 60,  reward: "+8đ" },
  { icon: "⏱️", label: "Online liên tục 10 phút", target: 10 * 60, reward: "+10đ" },
  { icon: "⏱️", label: "Online liên tục 15 phút", target: 15 * 60, reward: "+15đ" },
  { icon: "⏱️", label: "Online liên tục 20 phút", target: 20 * 60, reward: "+20đ" },
  { icon: "🔥", label: "Streak trả lời đúng 5 câu",  target: 5,  reward: "+5 viên gạch" },
  { icon: "🔥", label: "Streak trả lời đúng 10 câu", target: 10, reward: "+10 viên gạch" },
  { icon: "🔥", label: "Streak trả lời đúng 15 câu", target: 15, reward: "+15 viên gạch" },
  { icon: "📅", label: "Đăng nhập hôm nay",          target: 1,  reward: "+5đ" },
];

const WEEKLY: Milestone[] = [
  { icon: "📆", label: "Đăng nhập liên tục 3 ngày", target: 3, reward: "+80đ" },
  { icon: "📆", label: "Đăng nhập liên tục 5 ngày", target: 5, reward: "+150đ" },
  { icon: "📆", label: "Đăng nhập liên tục 7 ngày", target: 7, reward: "Thẻ đổi tên" },
  { icon: "⬆️", label: "Lên 3 Level trong tuần",   target: 3, reward: "Thẻ đổi màu nội thất" },
  { icon: "🏆", label: "Top 2 BXH tuần",            target: 2, reward: "Nội thất giới hạn" },
];

const LEVELS: Milestone[] = [
  { icon: "🧱", label: "Level 1",  target: 1,  reward: "50đ + 20 Gạch" },
  { icon: "🧱", label: "Level 2",  target: 2,  reward: "5 Vữa" },
  { icon: "🪟", label: "Level 3",  target: 3,  reward: "1 Cửa sổ FREE" },
  { icon: "🌀", label: "Level 4",  target: 4,  reward: "1 Quạt" },
  { icon: "🏷️", label: "Level 5",  target: 5,  reward: "Bảng tên nhà mới" },
  { icon: "💰", label: "Level 6",  target: 6,  reward: "+100đ" },
  { icon: "🪟", label: "Level 7",  target: 7,  reward: "Rèm cửa FREE 5 ô" },
  { icon: "🖼️", label: "Level 8",  target: 8,  reward: "Random tranh treo tường" },
  { icon: "⚡", label: "Level 9",  target: 9,  reward: "Thẻ quyền năng tuỳ chọn" },
  { icon: "🎨", label: "Level 10", target: 10, reward: "Palette màu tường" },
  { icon: "💡", label: "Level 11", target: 11, reward: "2 Cột đèn" },
  { icon: "🍵", label: "Level 12", target: 12, reward: "Bộ ấm trà" },
];

function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function ProgressRow({
  m, current, mode, claimed, onClaim,
}: {
  m: Milestone; current: number; mode: Tab; claimed: boolean; onClaim: () => void;
}) {
  const pct = Math.min(100, Math.round((current / m.target) * 100));
  const done = current >= m.target;
  const isTime = mode === "daily" && m.target >= 60;
  const canClaim = done && !claimed;
  return (
    <div className={`rounded-2xl border-2 p-4 bg-white/85 ${claimed ? "border-gray-300 opacity-80" : done ? "border-emerald-400" : "border-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{m.icon}</span>
          <span className="font-black text-sm">{m.label}</span>
        </div>
        <button
          disabled={!canClaim}
          onClick={onClaim}
          className={`toy-button !text-xs !py-1.5 !px-3 disabled:opacity-40 ${claimed ? "!bg-gray-300 !text-gray-600" : "toy-button-primary"}`}
        >
          {claimed ? "✅ ĐÃ LẤY" : `🎁 ${m.reward}`}
        </button>
      </div>
      <div className="h-3 rounded-full bg-black/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] font-bold text-muted-foreground mt-1">
        <span>
          {isTime
            ? `${fmtTime(Math.min(current, m.target))} / ${fmtTime(m.target)}`
            : `${Math.min(current, m.target)} / ${m.target}`}
        </span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}


function Utilities() {
  const [tab, setTab] = useState<Tab>("daily");
  // Đồng hồ phiên: tính từ lúc người chơi ĐĂNG NHẬP, không phải lúc mở trang tiện ích
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () => setSeconds(Math.floor((Date.now() - getLoginAt()) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Level + streak thực tế
  const [playerLevel, setPlayerLevel] = useState(0);
  const [answerStreak, setAnswerStreak] = useState(0);
  useEffect(() => {
    const g = loadGame();
    setPlayerLevel(computeLevel(g));
    setAnswerStreak(g.answerStreak || 0);
  }, []);

  const userId = getCurrentUser()?.id ?? 0;
  const [claimTick, setClaimTick] = useState(0);

  const loginStreak = userId ? getLoginStreak(userId) : { currentStreak: 0, totalDays: 0, lastLoginDate: 0 };
  const loginDays = loginStreak.currentStreak; // streak liên tục theo ngày (sai chuỗi => 1)
  const weekLevels = 0;
  const weekRank = 99;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "daily",  label: "Quà hằng ngày", icon: "🎁" },
    { id: "weekly", label: "Quà theo tuần", icon: "📅" },
    { id: "level",  label: "Quà theo level", icon: "⭐" },
  ];

  const list = tab === "daily" ? DAILY : tab === "weekly" ? WEEKLY : LEVELS;

  const getProgress = (m: Milestone): number => {
    if (tab === "daily") {
      if (m.target >= 60) return seconds;
      if (m.label.startsWith("Streak")) return answerStreak;
      if (m.label.startsWith("Đăng nhập")) return 1;
    }
    if (tab === "weekly") {
      if (m.label.includes("Đăng nhập")) return loginDays;
      if (m.label.includes("Lên")) return weekLevels;
      if (m.label.includes("Top")) return weekRank <= m.target ? m.target : 0;
    }
    if (tab === "level") return playerLevel;
    return 0;
  };

  const claimKey = (m: Milestone) => `${tab}:${m.label}`;
  const levelOf = (m: Milestone) => (tab === "level" ? m.target : undefined);

  const handleClaim = (m: Milestone) => {
    if (!userId) { toast.error("Vui lòng đăng nhập."); return; }
    setClaimed(userId, claimKey(m), tab, levelOf(m));
    toast.success(`🎉 Đã cộng quà tặng: ${m.reward}`);
    setClaimTick((t) => t + 1);
  };

  return (
    <GameLayout showBack>
      <div className="p-4 md:p-8 max-w-5xl w-full mx-auto">
        <div className="glass-card p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-black text-center mb-4">🎁 TIỆN ÍCH</h1>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            {/* Sidebar trái */}
            <div className="flex md:flex-col gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 md:flex-none text-left px-4 py-3 rounded-2xl font-black text-sm border-2 transition ${
                    tab === t.id
                      ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white border-amber-600 shadow"
                      : "bg-white/80 border-white hover:bg-white"
                  }`}
                >
                  <span className="text-xl mr-2">{t.icon}</span>
                  {t.label}
                </button>
              ))}
              <div className="hidden md:block mt-3 rounded-2xl bg-white/70 p-3 border border-black/10">
                <div className="text-[11px] font-bold text-muted-foreground">⏱️ Phiên online</div>
                <div className="text-xl font-black text-orange-600">{fmtTime(seconds)}</div>
              </div>
            </div>

            {/* List milestones */}
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {list.map((m) => (
                <ProgressRow
                  key={m.label + ":" + claimTick}
                  m={m}
                  current={getProgress(m)}
                  mode={tab}
                  claimed={!!userId && isClaimed(userId, claimKey(m), tab, levelOf(m))}
                  onClaim={() => handleClaim(m)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
