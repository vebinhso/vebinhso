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
} from "@/lib/film-scam-police";

export const Route = createFileRoute("/roleplay/scam-police")({
  component: FilmPage,
  head: () => ({
    meta: [
      { title: "Phim tương tác: Một cuộc gọi — Vệ Binh Số" },
      {
        name: "description",
        content:
          "Phim tương tác chống lừa đảo giả danh công an: mỗi lựa chọn của bạn dẫn tới một cái kết khác nhau, có lồng tiếng và phụ đề.",
      },
      { property: "og:title", content: "Phim tương tác: Alo, Cảnh sát đây!" },
      {
        property: "og:description",
        content: "Nhập vai nạn nhân của cuộc gọi giả danh công an. Bạn chọn, bạn chịu hậu quả.",
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

/** Đổi hướng chuyển động theo cảnh để không cảnh nào giống cảnh nào */
function motionClassFor(id: string, motion?: string) {
  if (motion === "shake") return MOTION_CLASS.shake;
  if (motion === "freeze") return MOTION_CLASS.freeze;
  if (motion === "push") return MOTION_CLASS.push;
  const pool = [MOTION_CLASS.kenburns, MOTION_CLASS.panL, MOTION_CLASS.panR, MOTION_CLASS.pull];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return pool[h % pool.length];
}

const DUSTS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7.3 + 4) % 96}%`,
  delay: `${(i * 1.37) % 9}s`,
  dur: `${9 + ((i * 3) % 7)}s`,
}));

function FilmPage() {
  const navigate = useNavigate();
  const tts = useServerFn(speakLine);

  const [nodeId, setNodeId] = useState<string>(FILM_START);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
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
  const visual = node.video ? { src: node.video, type: "video" as const } : { src: node.image, type: "image" as const };

  useEffect(() => {
    if (!getCurrentUser()) navigate({ to: "/login" });
  }, [navigate]);

  // Tải sẵn giọng đọc cảnh mở màn ngay từ màn hình poster → bấm vào là chạy liền
  useEffect(() => {
    const n = FILM[FILM_START];
    if (!n || pendingRef.current.get(n.id)) return;
    const p = tts({ data: { text: n.text, voice: SPEAKER_META[n.speaker].voice, instructions: SPEAKER_META[n.speaker].instructions, speed: SPEAKER_META[n.speaker].speed } })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // Reset nhịp cảnh mới + hiệu ứng hoà hình (crossfade)
  useEffect(() => {
    setTyped("");
    setDone(false);
    setSpeechDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  useEffect(() => {
    if (!prevVisual) return;
    const id = window.setTimeout(() => setPrevVisual(null), 1700);
    return () => window.clearTimeout(id);
  }, [prevVisual]);

  // Lồng tiếng AI (1.06x) — phụ đề bám theo đúng vị trí đang đọc của audio
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
    const stopCap = () => cap.stop();


    if (muted) {
      cap.startTimer(() => setSpeechDone(true));
      return () => {
        cancelled = true;
        stopCap();
      };
    }

    // Chữ chạy ngay lập tức, không chờ tải giọng đọc
    cap.startTimer();

    const speakBrowser = (markDone = true) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        cap.startTimer(markDone ? () => setSpeechDone(true) : undefined);
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
            : ((await tts({ data: { text, voice: meta.voice, instructions: meta.instructions, speed: meta.speed } })) as { audio: string }).audio;
          if (b64) cacheRef.current.set(node.id, b64);
        }

        if (cancelled || muted) return;
        if (!b64) {
          // Không có giọng AI (hết tín dụng / lỗi) → dùng giọng đọc của trình duyệt
          speakBrowser();
          return;
        }

        const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
        audio.playbackRate = 1.06;

        audio.onended = () => {
          if (cancelled) return;
          cap.complete();
          setSpeechDone(true);
        };
        audioRef.current = audio;

        // Bám theo con trỏ phát của giọng đọc → chữ chạy tới đâu, đọc tới đó
        cap.followAudio(audio);

        await audio.play().catch(() => {
          cap.startTimer(() => setSpeechDone(true));
        });
      } catch {
        if (cancelled) return;
        speakBrowser();
      }
    };


    void play();

    // Tải sẵn giọng đọc + hình/video của các cảnh kế tiếp (kể cả nhánh lựa chọn)
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
        const p = tts({ data: { text: n.text, voice: SPEAKER_META[n.speaker].voice, instructions: SPEAKER_META[n.speaker].instructions, speed: SPEAKER_META[n.speaker].speed } })
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
      // nạp trước khung hình để chuyển cảnh không bị khựng

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
      stopCap();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, started, muted]);

  // Chốt an toàn: nếu giọng đọc lỗi/không kết thúc, vẫn cho phim chạy tiếp
  useEffect(() => {
    if (!done || speechDone) return;
    const id = window.setTimeout(() => setSpeechDone(true), 5000);
    return () => window.clearTimeout(id);
  }, [done, speechDone]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  const go = (next: string) => {
    stopAudio();
    setPrevVisual(visual);
    setHistory((h) => [...h, nodeId]);
    setNodeId(next);
  };

  const restart = () => {
    stopAudio();
    setPrevVisual(visual);
    setHistory([]);
    setShowNotes(false);
    setNodeId(FILM_START);
  };

  const back = () => {
    if (!history.length) return;
    stopAudio();
    setPrevVisual(visual);
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setNodeId(prev);
  };

  const progress = useMemo(() => Math.min(100, Math.round((history.length / 16) * 100)), [history.length]);

  // Tự động sang cảnh kế tiếp: chỉ chuyển khi giọng đọc đã dứt hẳn
  useEffect(() => {
    if (!started || !autoPlay || !done || !speechDone) return;
    if (node.choices || node.ending || !node.next) return;
    const nxt = node.next;
    const id = window.setTimeout(() => go(nxt), 380);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, speechDone, nodeId, autoPlay, started]);

  if (!started) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden">
        <img
          src={FILM_POSTER}
          alt="Poster phim tương tác Một cuộc gọi"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-110 contrast-105 saturate-110 max-sm:object-contain max-sm:bg-[#0a1024]"
        />
        {/* chỉ tối phần đáy để chữ đọc rõ, giữ ảnh sáng ở trên */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-transparent" />
        <div className="relative h-full w-full flex flex-col items-center justify-end text-center px-5 pb-8 sm:pb-12 overflow-y-auto">
          <p className="text-[11px] sm:text-xs font-black tracking-[0.35em] text-red-400 mb-2 drop-shadow-lg">
            PHIM TƯƠNG TÁC · BÀI 1
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-3 leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            {FILM_TITLE}
          </h1>
          <div className="max-w-xl w-full mb-5">
            <p className="text-xs sm:text-sm font-bold text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Bạn vào vai <b className="text-sky-300">N</b>, Alo, cảnh sát đây! Thật giả muôn vàn. Liệu bạn sẽ chọn tin tưởng ai?.
            </p>
            <p className="mt-1 text-xs sm:text-sm font-bold text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Hãy bật loa hoặc đeo tai nghe để có trải nghiệm tốt nhất♡!
            </p>
          </div>


          <button
            onClick={() => setStarted(true)}
            className="w-full max-w-md rounded-2xl py-4 font-black text-lg bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110"
          >
            ▶ BẮT ĐẦU
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
      {/* Nền mờ lấp đầy khung hình */}
      {visual.type === "video" ? (
        <video
          key={"bg" + node.id}
          src={visual.src}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-35"
        />
      ) : (
        <img
          key={"bg" + node.id}
          src={visual.src}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-35"
        />
      )}

      {/* Cảnh cũ mờ dần — hiệu ứng hoà hình như phim */}
      {prevVisual &&
        (prevVisual.type === "video" ? (
          <video
            key={"prev" + prevVisual.src}
            src={prevVisual.src}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
            className="absolute inset-0 w-full h-full object-contain animate-[filmFadeOut_0.9s_ease-in_forwards] scale-105"
          />
        ) : (
          <img
            key={"prev" + prevVisual.src}
            src={prevVisual.src}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-contain animate-[filmFadeOut_0.9s_ease-in_forwards] scale-105"
          />
        ))}

      {/* Cảnh hiện tại — khung phim cố định 16:9 */}
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

      {/* Vệt sáng máy chiếu quét ngang cho cảm giác phim chạy */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -inset-y-10 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl animate-[filmSweep_11s_linear_infinite]" />
      </div>

      {node.mood && node.mood !== "neutral" && (
        <div
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{ backgroundColor: node.mood === "danger" ? "#0b3d5c" : "#f0b429", opacity: 0.35 }}
        />
      )}

      {/* Bụi bay trong luồng sáng */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {DUSTS.map((d, i) => (
          <span
            key={i}
            className="film-dust"
            style={{
              left: d.left,
              bottom: 0,
              animation: `filmDust ${d.dur} linear ${d.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Hạt phim, nhấp nháy đèn chiếu, vignette */}
      <div className="pointer-events-none absolute inset-0 film-grain" />
      <div className="pointer-events-none absolute inset-0 bg-white animate-[filmFlicker_2.4s_steps(4,end)_infinite] mix-blend-soft-light opacity-10" />
      <div className="pointer-events-none absolute inset-0 film-vignette" />

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/5 to-black/90" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[5vh] bg-black" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[5vh] bg-black" />

      {/* Top bar */}
      <div className="absolute top-[5vh] inset-x-0 p-3 flex items-center gap-2">
        <Link to="/roleplay" className="rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-black">
          ← Thoát
        </Link>
        <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-red-500 transition-all" style={{ width: `${progress}%` }} />
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

      {/* Phụ đề nhỏ ở góc dưới + tương tác */}
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
                <p className="text-xs sm:text-sm font-bold bg-black/40 rounded-xl p-3 mb-3">
                  🎓 <b>Bài học:</b> {node.ending.lesson}
                </p>
                <div className="flex flex-wrap gap-2">
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
                  done &&
                  node.choices.map((c) => (
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
                  ))
                ) : (
                  <button
                    onClick={() => (done ? node.next && go(node.next) : (capRef.current?.finishNow(), setTyped(node.text), setDone(true)))}
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
