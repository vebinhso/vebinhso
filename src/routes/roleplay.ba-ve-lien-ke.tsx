import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/auth";
import { speakLine } from "@/lib/tts.functions";
import { createCaptionEngine, type CaptionEngine } from "@/lib/caption-engine";
import { FinalLessonQuiz } from "@/components/FinalLessonQuiz";
import { FilmSummaryBoard } from "@/components/FilmSummaryBoard";
import {
  FILM,
  FILM_NOTES,
  FILM_POSTER,
  FILM_START,
  FILM_SUMMARY_IMAGE,
  FILM_TITLE,
  SPEAKER_META,
  type FilmNode,
} from "@/lib/film-5";

export const Route = createFileRoute("/roleplay/ba-ve-lien-ke")({
  component: FilmPage,
  head: () => ({
    meta: [
      { title: "Phim tương tác: Ba vé liền kề — Vệ Binh Số" },
      {
        name: "description",
        content:
          "Bài 5 nhập vai: ba người bạn săn vé concert gặp một tài khoản lạ bán vé liền kề giá rẻ. Tin hay soi kỹ?",
      },
      { property: "og:title", content: "Phim tương tác: Ba vé liền kề" },
      {
        property: "og:description",
        content: "Bạn quyết định cùng An, Ngân và Bình. Một tài khoản giấu mặt, ba tấm vé và mười phút đếm ngược.",
      },

      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const MOTION_CLASS: Record<string, string> = {
  kenburns: "animate-[kenBurns_26s_ease-in-out_infinite_alternate]",
  push: "animate-[filmPush_20s_ease-out_forwards]",
  pull: "animate-[filmPull_20s_ease-out_forwards]",
  panL: "animate-[filmPanL_24s_linear_forwards]",
  panR: "animate-[filmPanR_24s_linear_forwards]",
  shake: "animate-[filmShake_.18s_linear_infinite]",
  freeze: "animate-[filmBreathe_9s_ease-in-out_infinite]",
};

function motionClassFor(id: string, motion?: string) {
  if (motion === "shake") return MOTION_CLASS.shake;
  if (motion === "freeze") return MOTION_CLASS.freeze;
  if (motion === "push") return MOTION_CLASS.push;
  const pool = [MOTION_CLASS.kenburns, MOTION_CLASS.panL, MOTION_CLASS.panR, MOTION_CLASS.pull];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return pool[h % pool.length];
}

function FilmPage() {
  const navigate = useNavigate();
  const tts = useServerFn(speakLine);

  const [nodeId, setNodeId] = useState<string>(FILM_START);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [speechDone, setSpeechDone] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const capRef = useRef<CaptionEngine | null>(null);

  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingRef = useRef<Map<string, Promise<string>>>(new Map());

  const node: FilmNode = FILM[nodeId] ?? FILM[FILM_START];
  const meta = SPEAKER_META[node.speaker];
  const visual =
    node.choices && node.choiceImage && done
      ? { src: node.choiceImage, type: "image" as const }
      : node.video
        ? { src: node.video, type: "video" as const }
        : { src: node.image, type: "image" as const };

  useEffect(() => {
    if (!getCurrentUser()) navigate({ to: "/login" });
  }, [navigate]);

  useEffect(() => {
    const n = FILM[FILM_START];
    if (!n || pendingRef.current.get(n.id)) return;
    const p = tts({
      data: {
        text: n.text,
        voice: SPEAKER_META[n.speaker].voice,
        instructions: SPEAKER_META[n.speaker].instructions,
        speed: SPEAKER_META[n.speaker].speed,
      },
    })
      .then((r) => {
        const a = (r as { audio: string }).audio;
        cacheRef.current.set(n.id, a);
        return a;
      })
      .catch(() => {
        pendingRef.current.delete(n.id);
        return "";
      });
    pendingRef.current.set(n.id, p);
  }, [tts]);

  // Bấm BẮT ĐẦU: chờ giọng đọc + hình cảnh đầu sẵn sàng (tối đa 4s) rồi mới vào phim
  const beginFilm = useCallback(async () => {
    setPreparing(true);
    const n = FILM[FILM_START];
    const waits: Promise<unknown>[] = [];
    const pending = pendingRef.current.get(n.id);
    if (pending) waits.push(pending);
    if (n.image) {
      waits.push(
        new Promise<void>((res) => {
          const im = new Image();
          im.onload = () => res();
          im.onerror = () => res();
          im.src = n.image;
        }),
      );
    }
    await Promise.race([Promise.all(waits), new Promise((res) => window.setTimeout(res, 4000))]);
    setPreparing(false);
    setStarted(true);
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    setTyped("");
    setDone(false);
    setSpeechDone(false);
  }, [nodeId]);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    stopAudio();

    const text = node.text;
    const cap = createCaptionEngine(
      text,
      (s: string) => setTyped(s),
      () => setDone(true),
    );
    capRef.current = cap;

    if (muted) {
      cap.startTimer(() => setSpeechDone(true));
      return () => {
        cancelled = true;
        cap.stop();
      };
    }

    // Nếu giọng đọc tải lâu (>2.2s) mới cho chữ chạy trước, còn lại chữ khớp giọng
    const lateStart = window.setTimeout(() => {
      if (!cancelled && !cap.isRunning()) cap.startTimer();
    }, 2200);

    const speakBrowser = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        cap.startTimer(() => setSpeechDone(true));
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "vi-VN";
      u.rate = meta.rate;
      u.pitch = meta.pitch;
      u.onend = () => {
        if (cancelled) return;
        cap.complete();
        setSpeechDone(true);
      };
      u.onboundary = (e) => {
        if (cancelled) return;
        cap.boundary(e.charIndex + (e.charLength ?? 0));
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      cap.startTimer();
    };

    const play = async () => {
      try {
        let b64 = cacheRef.current.get(node.id) ?? "";
        if (!b64) {
          const pending = pendingRef.current.get(node.id);
          b64 = pending
            ? await pending
            : (
                (await tts({
                  data: { text, voice: meta.voice, instructions: meta.instructions, speed: meta.speed },
                })) as { audio: string }
              ).audio;
          if (b64) cacheRef.current.set(node.id, b64);
        }

        if (cancelled || muted) return;
        window.clearTimeout(lateStart);
        if (!b64) {
          // Không có giọng AI (hết tín dụng / lỗi) → giọng đọc trình duyệt
          speakBrowser();
          return;
        }

        const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
        audio.playbackRate = 1;
        audio.onended = () => {
          if (cancelled) return;
          cap.complete();
          setSpeechDone(true);
        };
        audioRef.current = audio;

        cap.followAudio(audio);

        await audio.play().catch(() => {
          cap.startTimer(() => setSpeechDone(true));
        });
      } catch {
        if (cancelled) return;
        window.clearTimeout(lateStart);
        speakBrowser();
      }
    };

    void play();

    const upcoming: FilmNode[] = [];
    const push = (id?: string) => {
      const n = id ? FILM[id] : undefined;
      if (n && !upcoming.some((u) => u.id === n.id)) upcoming.push(n);
    };
    push(node.next);
    node.choices?.forEach((c) => push(c.next));
    upcoming.slice(0, 3).forEach((n) => push(n.next));

    upcoming.forEach((n) => {
      if (!cacheRef.current.get(n.id) && !pendingRef.current.get(n.id)) {
        const p = tts({
          data: {
            text: n.text,
            voice: SPEAKER_META[n.speaker].voice,
            instructions: SPEAKER_META[n.speaker].instructions,
            speed: SPEAKER_META[n.speaker].speed,
          },
        })
          .then((r) => {
            const a = (r as { audio: string }).audio;
            cacheRef.current.set(n.id, a);
            return a;
          })
          .catch(() => {
            pendingRef.current.delete(n.id);
            return "";
          });
        pendingRef.current.set(n.id, p);
      }

      if (n.video) {
        const v = document.createElement("video");
        v.preload = "auto";
        v.src = n.video;
        v.muted = true;
        void v.load();
      } else if (n.image) {
        const im = new Image();
        im.src = n.image;
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(lateStart);
      cap.stop();
    };
  }, [meta, muted, node, started, stopAudio, tts]);

  useEffect(() => {
    if (!done || speechDone) return;
    const id = window.setTimeout(() => setSpeechDone(true), 5000);
    return () => window.clearTimeout(id);
  }, [done, speechDone]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  const go = (next: string) => {
    stopAudio();
    setHistory((h) => [...h, nodeId]);
    setNodeId(next);
  };

  const restart = () => {
    stopAudio();
    setHistory([]);
    setShowNotes(false);
    setNodeId(FILM_START);
  };

  const back = () => {
    if (!history.length) return;
    stopAudio();
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setNodeId(prev);
  };

  const progress = useMemo(() => Math.min(100, Math.round((history.length / 10) * 100)), [history.length]);

  // Không giới hạn thời gian: người chơi tự do suy nghĩ trước mỗi lựa chọn.
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    setTimeLeft(null);
  }, [node]);

  useEffect(() => {
    if (!started || !autoPlay || !done || !speechDone) return;
    if (node.choices || node.ending || !node.next) return;
    const nxt = node.next;
    const id = window.setTimeout(() => go(nxt), 380);
    return () => window.clearTimeout(id);
  }, [autoPlay, done, node, speechDone, started]);

  if (!started) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden">
        <img
          src={FILM_POSTER}
          alt="Poster phim tương tác Món quà đắt nhất"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className="relative h-full w-full flex flex-col items-center justify-end text-center px-5 pb-8 sm:pb-12 overflow-y-auto">
          <p className="text-[11px] sm:text-xs font-black tracking-[0.35em] text-amber-300 mb-2 drop-shadow-lg">
            PHIM TƯƠNG TÁC · BÀI 5
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-3 leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            {FILM_TITLE}
          </h1>
          <p className="max-w-xl text-xs sm:text-sm font-bold text-white/75 mb-1">
            Bạn vào vai <b className="text-pink-300">An</b>, <b className="text-sky-300">Ngân</b> và <b className="text-emerald-300">Bình</b>. Ba vé concert liền kề giá rẻ — may mắn hay cái bẫy của kẻ giấu mặt?
          </p>
          <p className="max-w-xl text-xs sm:text-sm font-bold text-white/75 mb-5">
            Hãy bật loa hoặc đeo tai nghe để có trải nghiệm tốt nhất♡!
          </p>

          <button
            onClick={beginFilm}
            disabled={preparing}
            className="w-full max-w-md rounded-2xl py-4 font-black text-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 disabled:opacity-70"
          >
            {preparing ? "⏳ Đang chuẩn bị phim..." : "▶ BẮT ĐẦU"}
          </button>
          <Link to="/roleplay" className="block mt-3 text-xs font-bold text-white/60 hover:text-white">
            ← Quay lại danh sách bài chơi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden select-none">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Khung 16:9 khoá cứng — mọi cảnh dùng chung tỉ lệ, không cắt/lệch */}
        <div
          className="relative aspect-video w-full max-h-full overflow-hidden bg-black"
          style={{ maxWidth: "calc(100dvh * 16 / 9)" }}
        >
          {visual.type === "video" ? (
            <video
              key={node.id + visual.src}
              src={visual.src}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <img
              key={node.id + visual.src}
              src={visual.src}
              alt=""
              decoding="async"
              className={`absolute inset-0 w-full h-full object-contain will-change-transform ${motionClassFor(node.id, node.motion)}`}
            />
          )}

          {/* Lớp phủ tin nhắn trên màn hình điện thoại */}
          {node.chatOverlay && (
            <div className="absolute inset-0 pointer-events-none">
              {node.chatOverlay.coverRects?.map((r, i) => (
                <div
                  key={`cover-${i}`}
                  className="absolute rounded-xl bg-gray-200"
                  style={{
                    left: `${r.x}%`,
                    top: `${r.y}%`,
                    width: `${r.w}%`,
                    height: `${r.h}%`,
                  }}
                />
              ))}
              {node.chatOverlay.messages.map((m, i) => (
                <div
                  key={`msg-${i}`}
                  className={`absolute flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-xs font-bold leading-tight shadow-lg text-center ${
                    m.type === "incoming" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
                  }`}
                  style={{
                    left: `${m.x}%`,
                    top: `${m.y}%`,
                    width: `${m.w}%`,
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 film-vignette" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[16vh] bg-gradient-to-b from-black/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-black/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[5vh] bg-black" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[5vh] bg-black" />


      <div className="absolute top-[5vh] inset-x-0 p-3 flex items-center gap-2">
        <Link to="/roleplay" className="rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-black">
          ← Thoát
        </Link>
        <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <button
          onClick={back}
          disabled={!history.length}
          className="rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-black disabled:opacity-30"
        >
          ↩
        </button>
        <button
          onClick={() => setAutoPlay((a) => !a)}
          className="rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-black"
        >
          {autoPlay ? "▶ Tự chạy" : "⏸ Thủ công"}
        </button>
        <button
          onClick={() => {
            setMuted((m) => !m);
            stopAudio();
          }}
          className="rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-black"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {showSummary && (
        <FilmSummaryBoard
          onRestart={() => {
            setShowSummary(false);
            restart();
          }}
          onBack={() => {
            setShowSummary(false);
            back();
          }}
        />
      )}

      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
        <div className="max-w-3xl mx-auto">
          {node.ending ? (
            showNotes ? (
              <div className="rounded-2xl p-4 bg-black/85 backdrop-blur-md border border-amber-300/50">
                <div className="flex gap-3 items-start">
                  <img src={FILM_SUMMARY_IMAGE} alt="" className="hidden sm:block w-28 rounded-xl" />
                  <div className="flex-1">
                    <h3 className="text-base font-black text-amber-300 mb-2">📌 GHI NHỚ</h3>
                    <ul className="space-y-1 text-xs sm:text-sm font-bold">
                      {FILM_NOTES.map((n) => (
                        <li key={n}>☑ {n}</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={restart}
                        className="rounded-xl px-4 py-2.5 font-black text-sm bg-white text-black"
                      >
                        🔄 Chơi lại
                      </button>
                      <Link to="/roleplay" className="rounded-xl px-4 py-2.5 font-black text-sm bg-white/15">
                        📚 Bài chơi khác
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-2xl p-4 sm:p-5 backdrop-blur-md border-2 ${
                  node.ending.kind === "safe" ? "bg-emerald-950/85 border-emerald-400" : "bg-red-950/85 border-red-500"
                }`}
              >
                <p className="text-[11px] font-black tracking-widest opacity-70 mb-1">CÁI KẾT CỦA BẠN</p>
                <h2 className="text-lg sm:text-2xl font-black mb-2">
                  {node.ending.kind === "safe" ? "✅ " : "💀 "}
                  {node.ending.title}
                </h2>
                <p className="text-sm font-bold opacity-90 mb-2">{node.text}</p>
                <p className="text-xs sm:text-sm font-bold bg-black/40 rounded-xl p-3 mb-3 whitespace-pre-line max-h-[40vh] overflow-y-auto">
                  🎓 <b>Bài học:</b> {node.ending.lesson}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowSummary(true)}
                    className="rounded-xl px-4 py-2.5 font-black text-sm bg-primary text-primary-foreground"
                  >
                    📋 Tổng kết
                  </button>
                  <button
                    onClick={() => setShowNotes(true)}
                    className="rounded-xl px-4 py-2.5 font-black text-sm bg-amber-400 text-black"
                  >
                    📌 Xem ghi nhớ
                  </button>
                  <button onClick={restart} className="rounded-xl px-4 py-2.5 font-black text-sm bg-white text-black">
                    🔄 Chơi lại từ đầu
                  </button>
                  <button
                    onClick={back}
                    disabled={!history.length}
                    className="rounded-xl px-4 py-2.5 font-black text-sm bg-white/15 disabled:opacity-40"
                  >
                    ↩ Thử lựa chọn khác
                  </button>
                </div>
              </div>
            )
          ) : (
            <>
              <div
                className="rounded-xl bg-black/70 backdrop-blur-md px-3 py-2 border border-white/10 cursor-pointer"
                onClick={() => {
                  if (!done) {
                    capRef.current?.finishNow();
                    setTyped(node.text);
                    setDone(true);
                  }
                }}
              >
                {node.action && <p className="text-[10px] font-bold italic text-white/45">({node.action})</p>}
                <p className={`text-[10px] font-black tracking-widest ${meta.color}`}>{meta.name}</p>
                <p className="text-sm sm:text-base font-bold leading-snug min-h-[2.6em]">
                  {typed}
                  {!done && <span className="animate-pulse">▍</span>}
                </p>
              </div>

              <div className="mt-2 space-y-2">
                {node.choices ? (
                  done && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black tracking-widest text-white/70">3 BẠN NÊN LÀM GÌ?</p>
                        {timeLeft !== null && (
                          <p
                            className={`text-[11px] font-black tabular-nums ${timeLeft <= 3 ? "text-red-400" : "text-amber-300"}`}
                          >
                            ⏱ {timeLeft} giây
                          </p>
                        )}
                      </div>
                      {node.choices.map((c) => (
                        <button
                          key={c.next + c.label}
                          onClick={() => go(c.next)}
                          className={`w-full text-left rounded-xl px-4 py-3 font-black text-sm border-2 backdrop-blur-md transition-transform hover:-translate-y-0.5 ${
                            c.tone === "safe"
                              ? "bg-emerald-600/85 border-emerald-300"
                              : c.tone === "risky"
                                ? "bg-red-700/85 border-red-400"
                                : "bg-slate-700/85 border-slate-300"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </>
                  )
                ) : (
                  <button
                    onClick={() =>
                      done
                        ? node.next && go(node.next)
                        : (capRef.current?.finishNow(), setTyped(node.text), setDone(true))
                    }
                    className="w-full rounded-xl px-4 py-2.5 font-black text-sm bg-white/90 text-black"
                  >
                    {done ? "▶ Tiếp tục" : "⏩ Bỏ qua hiệu ứng chữ"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
