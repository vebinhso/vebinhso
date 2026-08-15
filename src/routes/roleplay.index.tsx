import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExpandableText } from "@/components/ExpandableText";
import LoadingPercent from "@/components/LoadingPercent";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import lesson1Poster from "@/assets/lesson1-poster.png.asset.json";
import { FILM_POSTER as FILM2_POSTER } from "@/lib/film-scam-police-2";
import { FILM_POSTER as FILM3_POSTER } from "@/lib/film-3";
import { FILM_POSTER as FILM4_POSTER } from "@/lib/film-4";
import { FILM_POSTER as FILM5_POSTER } from "@/lib/film-5";
import { claimReward, hasClaimed } from "@/lib/roleplay-rewards";
import { toast } from "sonner";


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
    poster: lesson1Poster.url,
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
    tag: "An toàn số",
    gradient: "from-emerald-500 to-teal-600",
    ready: true,
    to: "/roleplay/mot-cu-bam",
    poster: FILM3_POSTER,
  },
  {
    id: "iphone-email",
    emoji: "🎁",
    title: "Bài 4 · Món quà đắt nhất",
    desc: "Một email thông báo trúng thưởng iPhone. L sẽ làm gì khi nhận được tin vui bất ngờ từ người lạ?",
    tag: "An toàn số",
    gradient: "from-amber-500 to-orange-600",
    ready: true,
    to: "/roleplay/iphone-email",
    poster: FILM4_POSTER,
  },
  {
    id: "ba-ve-lien-ke",
    emoji: "🎫",
    title: "Bài 5 · Ba vé liền kề",
    desc: "Concert hết vé trong 40 giây. Một tài khoản giấu mặt rao bán ba vé liền kề giá rẻ. Tin hay soi kỹ?",
    tag: "An toàn số",
    gradient: "from-violet-500 to-fuchsia-600",
    ready: true,
    to: "/roleplay/ba-ve-lien-ke",
    poster: FILM5_POSTER,
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
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [loadPct, setLoadPct] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
    const map: Record<string, boolean> = {};
    for (const l of LESSONS) if (l.ready) map[l.id] = hasClaimed("start", l.id);
    setClaimed(map);
  }, [navigate]);

  // Tải sẵn toàn bộ poster trước khi cho vào danh sách bài chơi,
  // để khi vào là ảnh hiện đủ, không bị giật/lấp ló từng tấm.
  useEffect(() => {
    if (!user) return;
    const urls = LESSONS.map((l) => l.poster).filter(Boolean) as string[];
    if (urls.length === 0) {
      setLoadPct(100);
      setReady(true);
      return;
    }
    let done = 0;
    let cancelled = false;
    const bump = () => {
      done += 1;
      if (cancelled) return;
      setLoadPct(Math.round((done / urls.length) * 100));
      if (done >= urls.length) setReady(true);
    };
    for (const url of urls) {
      const img = new Image();
      img.decoding = "async";
      img.onload = bump;
      img.onerror = bump;
      img.src = url;
      if (img.complete) bump();
    }
    // Không để người chơi chờ vô hạn nếu mạng chậm
    const t = window.setTimeout(() => {
      if (!cancelled) {
        setLoadPct(100);
        setReady(true);
      }
    }, 8000);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [user]);

  if (!user) return null;

  if (!ready) {
    return (
      <GameLayout showBack>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600">
          <div className="text-5xl animate-bounce">🎭</div>
          <p className="font-black text-white text-sm sm:text-base">Đang tải các bài chơi nhập vai…</p>
          <LoadingPercent percent={loadPct} done={loadPct >= 100} />
        </div>
      </GameLayout>
    );
  }


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
                    className={`relative w-full aspect-video overflow-hidden bg-gradient-to-br ${l.gradient} flex items-center justify-center`}
                  >
                    {l.poster ? (
                      <>
                        <img
                          src={l.poster}
                          alt={l.title}
                          loading="eager"
                          decoding="async"

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
                    <div className="mb-3">
                      <ExpandableText
                        clamp={2}
                        className="text-xs font-bold text-muted-foreground leading-snug"
                        toggleClassName="text-[11px] text-primary"
                      >
                        {l.desc}
                      </ExpandableText>
                    </div>
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
                    {l.ready && (
                      <div className="mt-2 flex justify-end">
                        <span
                          className={`text-[11px] font-black px-2.5 py-1 rounded-full border-2 ${
                            claimed[l.id]
                              ? "border-border bg-muted text-muted-foreground"
                              : "border-amber-400/70 bg-amber-400/20 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {claimed[l.id] ? "✔ Đã nhận +50đ" : "🪙 +50đ khi vào chơi"}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              );

              if (l.ready && l.to) {
                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      const got = claimReward("start", l.id);
                      if (got > 0) {
                        setClaimed((c) => ({ ...c, [l.id]: true }));
                        toast.success(`🪙 +${got} đồng cho bài chơi mới!`);
                      }
                      navigate({ to: l.to as never });
                    }}
                    className={cardClass}
                  >
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
