import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import { FILM_POSTER as FILM1_POSTER } from "@/lib/film-scam-police";
import { FILM_POSTER as FILM2_POSTER } from "@/lib/film-scam-police-2";
import { FILM_POSTER as FILM3_POSTER } from "@/lib/film-3";

export const Route = createFileRoute("/roleplay/")({
  component: RoleplayPage,
  head: () => ({
    meta: [
      { title: "Nhập vai tình huống — Vệ Binh Số" },
      {
        name: "description",
        content: "Các bài chơi nhập vai tình huống số: xử lý tin giả, bảo mật, ứng xử mạng và văn hoá lịch sử.",
      },
      { property: "og:title", content: "Nhập vai tình huống — Vệ Binh Số" },
      { property: "og:description", content: "Chọn bài chơi nhập vai, hoá thân vào tình huống thật và ra quyết định." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Lesson = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  tag: string;
  gradient: string;

  ready: boolean;
  to?: string;
  poster?: string;
};

const LESSONS: Lesson[] = [
  {
    id: "scam-police",
    emoji: "🚨",
    title: "Bài 1: Alo, cảnh sát đây!",
    desc: "Đây là một đoạn phim tương tác ngắn, mô phỏng sự việc lừa đảo qua điện thoại thông qua việc giả danh thành cơ quan chức năng",
    tag: "An toàn số",
    gradient: "from-rose-500 to-orange-500",
    ready: true,
    to: "/roleplay/scam-police",
    poster: FILM1_POSTER,
  },
  {
    id: "ke-giau-mat",
    emoji: "🕶️",
    title: "Bài 2: Gợi nhớ từ Cá voi xanh",
    desc: "Đây là đoạn phim tương tác ngắn, mô phỏng Nếu một ngày bạn trở thành một thành viên trong nhóm chat bí ẩn?.",
    tag: "An toàn số",
    gradient: "from-sky-500 to-indigo-600",
    ready: true,
    to: "/roleplay/ke-giau-mat",
    poster: FILM2_POSTER,
  },
  {
    id: "cyberbully",
    emoji: "🛡️",
    title: "Bài 3 · Một cú bấm vì bạn",
    desc: "Nick của Hà nhắn nhờ bấm link bình chọn. Bấm giúp bạn hay dừng lại xác minh?",
    tag: "Ứng xử số",
    gradient: "from-emerald-500 to-teal-600",
    ready: true,
    to: "/roleplay/mot-cu-bam",
    poster: FILM3_POSTER,
  },
  {
    id: "shopping",
    emoji: "🛒",
    title: "Bài 4 · Cú lừa mua hàng",
    desc: "Ưu đãi 90% chỉ còn 5 phút... Nhập vai người tiêu dùng thông minh.",
    tag: "Giao dịch số",
    gradient: "from-amber-500 to-yellow-600",
    ready: false,
  },
  {
    id: "history",
    emoji: "🏯",
    title: "Bài 5 · Sứ giả thời gian",
    desc: "Quay về một mốc lịch sử và đưa ra lựa chọn của người trong cuộc.",
    tag: "Lịch sử – Văn hoá",
    gradient: "from-fuchsia-500 to-purple-700",
    ready: false,
  },
  {
    id: "ai",
    emoji: "🤖",
    title: "Bài 6 · Làm việc cùng AI",
    desc: "Dùng AI để làm bài tập — đâu là ranh giới của sự trung thực?",
    tag: "Năng lực số",
    gradient: "from-cyan-500 to-blue-700",
    ready: false,
  },
];

function RoleplayPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [picked, setPicked] = useState<Lesson | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
  }, [navigate]);

  if (!user) return null;

  return (
    <GameLayout showBack>
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="max-w-5xl mx-auto w-full">
          <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8 mb-5 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-primary-foreground shadow-xl">
            <div className="absolute -top-10 -right-6 text-[120px] opacity-20 select-none">🎭</div>
            <div className="relative">
              <span className="inline-block px-3 py-1 rounded-full bg-background/20 text-[11px] font-black tracking-wide mb-2">
                CHẾ ĐỘ MỚI
              </span>
              <h1 className="text-2xl sm:text-4xl font-black mb-2 drop-shadow">NHẬP VAI TÌNH HUỐNG</h1>
              <p className="font-bold text-sm sm:text-base opacity-90 max-w-2xl mb-3">
                Hoá thân vào những tình huống có thật trên không gian số. Mỗi bài chơi là một câu chuyện — lựa chọn của
                bạn quyết định kết cục và số điểm nhận được.
              </p>
              <div className="inline-flex items-start gap-3 rounded-2xl bg-black/30 backdrop-blur px-4 py-3 border border-white/10 max-w-2xl">
                <span className="text-xl shrink-0">🎧</span>
                <p className="text-xs sm:text-sm font-bold leading-relaxed text-white/95">
                  Hãy bật loa hoặc đeo tai nghe để có trải nghiệm tốt nhất.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg sm:text-xl font-black">📚 Danh sách bài chơi</h2>
            <span className="text-xs font-bold text-muted-foreground">{LESSONS.length} bài</span>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LESSONS.map((l, i) => {
              const cardClass =
                "group block text-left rounded-2xl overflow-hidden border-2 border-border bg-card shadow-md hover:shadow-xl hover:-translate-y-1 transition-transform";
              const inner = (
                <>
                  <div
                    className={`relative h-32 sm:h-36 overflow-hidden bg-gradient-to-br ${l.gradient} flex items-center justify-center`}
                  >
                    {l.poster ? (
                      <>
                        <img
                          src={l.poster}
                          alt={l.title}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      </>
                    ) : (
                      <span className="text-4xl sm:text-5xl drop-shadow-lg group-hover:scale-110 transition-transform">
                        {l.emoji}
                      </span>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/85 text-[10px] font-black">
                      #{i + 1}
                    </span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-black text-sm sm:text-base leading-tight mb-1">{l.title}</h3>
                    <p className="text-xs font-bold text-muted-foreground leading-snug mb-3 line-clamp-2">{l.desc}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black px-2 py-1 rounded-full bg-muted">{l.tag}</span>
                      {l.ready ? (
                        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                          ▶ Chơi ngay
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-amber-400/25 text-amber-700 dark:text-amber-300">
                          🔒 Sắp ra mắt
                        </span>
                      )}
                    </div>
                  </div>
                </>
              );

              if (l.ready && l.to) {
                return (
                  <button key={l.id} onClick={() => navigate({ to: l.to as never })} className={cardClass}>
                    {inner}
                  </button>
                );
              }

              return (
                <button key={l.id} onClick={() => setPicked(l)} className={cardClass}>
                  {inner}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border-2 border-dashed border-border p-5 text-center">
            <div className="text-3xl mb-1">✨</div>
            <p className="font-black text-sm">Nhiều bài chơi nhập vai đang được xây dựng</p>
            <p className="text-xs font-bold text-muted-foreground">Các trò chơi mới sẽ được thêm vào đây liên tục.</p>
          </div>

          <div className="mt-4 flex gap-2 justify-center pb-4">
            <Link to="/play" className="toy-button !text-xs sm:!text-sm">
              🎮 Chọn bản đồ
            </Link>
            <Link to="/" className="toy-button !text-xs sm:!text-sm">
              🏠 Trang chủ
            </Link>
          </div>
        </div>
      </div>

      {picked && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPicked(null)}
        >
          <div className="glass-card w-full max-w-sm p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div
              className={`mx-auto w-16 h-16 rounded-2xl mb-3 flex items-center justify-center text-3xl bg-gradient-to-br ${picked.gradient}`}
            >
              {picked.emoji}
            </div>
            <h3 className="font-black text-base mb-1">{picked.title}</h3>
            <p className="text-xs font-bold text-muted-foreground mb-4">{picked.desc}</p>
            <div className="rounded-xl bg-muted p-3 text-xs font-bold mb-4">
              🔒 Bài chơi này sắp ra mắt. Hãy quay lại sau nhé!
            </div>
            <button className="toy-button toy-button-primary w-full !text-sm" onClick={() => setPicked(null)}>
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </GameLayout>
  );
}
