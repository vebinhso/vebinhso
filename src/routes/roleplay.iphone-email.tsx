import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/auth";
import { speakLine } from "@/lib/tts.functions";
import { createCaptionEngine, type CaptionEngine } from "@/lib/caption-engine";
import {
  FILM,
  FILM_NOTES,
  FILM_POSTER,
  FILM_START,
  FILM_SUMMARY_IMAGE,
  FILM_TITLE,
  SPEAKER_META,
  type FilmNode,
} from "@/lib/film-4";

export const Route = createFileRoute("/roleplay/iphone-email")({
  component: FilmPage,
  head: () => ({
    meta: [
      { title: "Phim tương tác: Món quà đắt nhất — Vệ Binh Số" },
      {
        name: "description",
        content:
          "Bài 4 nhập vai: một email thông báo trúng thưởng iPhone. Linh sẽ làm gì khi nhận được tin vui bất ngờ từ người lạ?",
      },
      { property: "og:title", content: "Phim tương tác: Món quà đắt nhất" },
      {
        property: "og:description",
        content: "Bạn vào vai Linh. Mỗi lựa chọn trước một phần thưởng quá đẹp đều có thể là cái bẫy.",
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
  const [speechDone, setSpeechDone] = useState(false);
  const [prevVisual, setPrevVisual] = useState<{ src: string; type: "image" | "video" } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const capRef = useRef<CaptionEngine | null>(null);

  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingRef = useRef<Map<string, Promise<string>>>(new Map());

  const node: FilmNode = FILM[nodeId] ?? FILM[FILM_START];
  const meta = SPEAKER_META[node.speaker];
  const visual = node.video
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
        })
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
    if (!prevVisual) return;
    const id = window.setTimeout(() => setPrevVisual(null), 1700);
    return () => window.clearTimeout(id);
  }, [prevVisual]);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    stopAudio();

    const text = node.text;
    const cap = createCaptionEngine(
      text,
      (s: string) => setTyped(s),
      () => setDone(true)
    );
    capRef.current = cap;

    if (muted) {
      cap.startTimer(() => setSpeechDone(true));
      return () => {
        cancelled = true;
        cap.stop();
      };
    }

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
    setPrevVisual({ src: node.image, type: "image" });
    setHistory((h) => [...h, nodeId]);
    setNodeId(next);
  };

  const restart = () => {
    stopAudio();
    setPrevVisual({ src: node.image, type: "image" });
    setHistory([]);
    setShowNotes(false);
    setNodeId(FILM_START);
  };

  const back = () => {
    if (!history.length) return;
    stopAudio();
    setPrevVisual({ src: node.image, type: "image" });
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setNodeId(prev);
  };

  const progress = useMemo(() => Math.min(100, Math.round((history.length / 10) * 100)), [history.length]);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    setTimeLeft(null);
  }, [node]);

  useEffect(() => {
    if (!started || !autoPlay || !done || !speechDone) return;
    if (node.choices || node.ending || !node.next) return;
    const nxt = node.next;
    const id = window.setTimeout(() => go(nxt), 1100);
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
            PHIM TƯƠNG TÁC · BÀI 4
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-3 leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            {FILM_TITLE}
          </h1>
          <p className="max-w-xl text-xs sm:text-sm font-bold text-white/75 mb-1">
            Bạn vào vai <b className="text-pink-300">Linh</b>. Một email thông báo trúng thưởng iPhone — cơ hội hay
            cái bẫy?
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
      <img
        key={"bg" + node.id}
        src={node.image}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-35"
      />

      {prevVisual && (
        <img
          key={"prev" + prevVisual.src}
          src={prevVisual.src}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-contain animate-[filmFadeOut_0.9s_ease-in_forwards] scale-105"
        />
      )}

      <div
        key={"cam" + node.id}
        className="absolute inset-0 flex items-center justify-center will-change-transform animate-[filmDrift_18s_ease-in-out_infinite_alternate]"
      >
        <div className="relative w-full max-w-full max-h-full aspect-video overflow-hidden">
          {visual.type === "video" ? (
            <video
              key={node.id + visual.src}
              src={visual.src}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover animate-[filmFade_0.9s_ease-out_both]"
            />
          ) : (
            <img
              key={node.id + visual.src}
              src={visual.src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover will-change-transform animate-[filmFade_0.9s_ease-out_both] ${motionClassFor(node.id, node.motion)}`}
            />
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -inset-y-10 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl animate-[filmSweep_11s_linear_infinite]" />
      </div>

      {node.mood && node.mood !== "neutral" && (
        <div
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{ backgroundColor: node.mood === "danger" ? "#0b3d5c" : "#f0b429", opacity: 0.35 }}
        />
      )}

      {node.emailOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[12vh] px-4">
          <div className="animate-[filmFade_0.9s_ease-out_both] w-full max-w-lg rounded-2xl bg-black/70 backdrop-blur-md border border-amber-500/40 px-5 py-4 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 text-lg">
                🎁
              </div>
              <div>
                <p className="font-black text-sm sm:text-base text-white">Thông báo trúng thưởng</p>
                <p className="text-[11px] sm:text-xs font-bold text-white/60">support-apple-gift@vip-mail.xyz</p>
              </div>
            </div>
            <p className="text-sm sm:text-base font-bold text-amber-200 mb-2">Chúc mừng! Bạn đã trúng iPhone 16 Pro</p>
            <p className="text-[11px] sm:text-xs font-bold text-white/80">
              Nhấn vào link để xác nhận nhận quà trong 24 giờ. Yêu cầu: cung cấp họ tên, số điện thoại và địa chỉ nhận
              hàng.
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex items-start justify-between gap-3 z-20">
        <button
          onClick={back}
          disabled={!history.length}
          className="rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur px-3 py-2 text-xs sm:text-sm font-black disabled:opacity-30"
        >
          ← Quay lại
        </button>
        <div className="flex-1">
          <div className="h-1.5 w-full max-w-md mx-auto rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          className="rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur px-3 py-2 text-xs sm:text-sm font-black"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 z-20">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 p-3 sm:p-5 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs sm:text-sm font-black ${meta.color}`}>{meta.name}</span>
              {node.action && (
                <span className="text-[10px] sm:text-xs font-bold text-white/50">· {node.action}</span>
              )}
            </div>
            <p className="text-sm sm:text-lg font-bold leading-relaxed min-h-[3rem]">{typed}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => setAutoPlay((a) => !a)}
                className={`text-[10px] sm:text-xs font-black px-2 py-1 rounded-lg ${autoPlay ? "bg-amber-500/25 text-amber-300" : "bg-white/10 text-white/70"}`}
              >
                {autoPlay ? "TỰ ĐỘNG CHUYỂN: BẬT" : "TỰ ĐỘNG CHUYỂN: TẮT"}
              </button>
              <button
                onClick={() => setShowNotes((s) => !s)}
                className="text-[10px] sm:text-xs font-black px-2 py-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20"
              >
                {showNotes ? "Ẩn ghi nhớ" : "Ghi nhớ"}
              </button>
            </div>
          </div>

          {showNotes && (
            <div className="mt-3 rounded-2xl bg-amber-950/80 backdrop-blur-md border border-amber-500/30 p-4 animate-[filmFade_0.4s_ease-out_both]">
              <p className="text-xs font-black text-amber-300 mb-2">📝 GHI NHỚ</p>
              <ul className="space-y-1">
                {FILM_NOTES.map((note, i) => (
                  <li key={i} className="text-[11px] sm:text-xs font-bold text-white/90 leading-snug">
                    • {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {done && speechDone && node.choices && (
            <div className="mt-3 grid gap-2 sm:gap-3 animate-[filmFade_0.5s_ease-out_both]">
              {node.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => go(c.next)}
                  className={`w-full text-left rounded-2xl px-4 py-3 sm:py-4 font-black text-sm sm:text-base border-2 transition-transform hover:scale-[1.01] ${
                    c.tone === "safe"
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-100"
                      : c.tone === "risky"
                        ? "bg-rose-500/20 border-rose-500/50 text-rose-100"
                        : "bg-white/10 border-white/30 text-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {done && speechDone && node.ending && (
            <div className="mt-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 p-4 sm:p-6 text-center animate-[filmFade_0.5s_ease-out_both]">
              <p className={`text-xs sm:text-sm font-black mb-1 ${node.ending.kind === "safe" ? "text-emerald-400" : "text-rose-400"}`}>
                {node.ending.code}
              </p>
              <h2 className="text-lg sm:text-2xl font-black mb-3">{node.ending.title}</h2>
              <p className="text-xs sm:text-sm font-bold text-white/90 whitespace-pre-line leading-relaxed mb-4">
                {node.ending.lesson}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={restart}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 text-xs sm:text-sm font-black"
                >
                  🔄 Chơi lại
                </button>
                <Link
                  to="/roleplay"
                  className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-xs sm:text-sm font-black"
                >
                  📚 Danh sách bài
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
