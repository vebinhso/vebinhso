import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/auth";
import { speakLine } from "@/lib/tts.functions";
import { createCaptionEngine, type CaptionEngine } from "@/lib/caption-engine";
import { FinalLessonQuiz } from "@/components/FinalLessonQuiz";
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
          "Bài 4 nhập vai: một email thông báo trúng thưởng điện thoại. L sẽ làm gì trước tin vui bất ngờ từ người lạ?",
      },
      { property: "og:title", content: "Phim tương tác: Món quà đắt nhất" },
      {
        property: "og:description",
        content: "Bạn vào vai L. Mỗi lựa chọn trước một phần thưởng quá đẹp đều có thể là cái bẫy.",
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
            PHIM TƯƠNG TÁC · BÀI 4
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-3 leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            {FILM_TITLE}
          </h1>
          <p className="max-w-xl text-xs sm:text-sm font-bold text-white/75 mb-1">
            Bạn vào vai <b className="text-pink-300">L</b>. Một email báo trúng thưởng điện thoại — cơ hội hay cái bẫy?
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
      {/* Nền mờ — dùng ảnh tĩnh cho nhẹ máy */}
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
              className="absolute inset-0 w-full h-full object-contain animate-[filmFade_0.9s_ease-out_both]"
            />
          ) : (
            <img
              key={node.id + visual.src}
              src={visual.src}
              alt=""
              className={`absolute inset-0 w-full h-full object-contain will-change-transform animate-[filmFade_0.9s_ease-out_both] ${motionClassFor(node.id, node.motion)}`}
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

      {(node.emailOverlay || node.mailOverlay || node.inspectOverlay || node.formOverlay || node.phoneFormOverlay) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {/* Khung phủ khớp đúng khung hình 16:9 để định vị theo điện thoại nhân vật đang cầm */}
          <div className="relative aspect-video w-full max-h-full" style={{ maxWidth: "calc(100dvh * 16 / 9)" }}>
          {/* Khung điện thoại: mọi thông tin (email, link, form) đều nằm TRONG màn hình điện thoại của nhân vật */}
          <div
            className="animate-[filmFade_0.9s_ease-out_both] absolute aspect-[9/19] rounded-[1.4rem] border-[4px] border-slate-800 bg-slate-950 shadow-[0_0_40px_rgba(0,0,0,0.7)] p-[2px]"
            style={{
              height: `${node.phoneAnchor?.h ?? 62}%`,
              left: `${node.phoneAnchor?.x ?? 50}%`,
              top: `${node.phoneAnchor?.y ?? 50}%`,
              transform: `translate(-50%, -50%) rotate(${node.phoneAnchor?.rot ?? -2}deg)`,
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] bg-slate-100 flex flex-col">
              {/* status bar + notch */}
              <div className="relative flex items-center justify-between px-3 pt-1.5 pb-1 text-[7px] font-bold text-slate-700 bg-slate-100">
                <span>21:16</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-1 h-3 w-14 rounded-full bg-slate-900" />
                <span className="tracking-tight">📶 🔋</span>
              </div>

              <div className="flex-1 overflow-hidden">
                {node.emailOverlay && (
                  <div className="h-full flex items-center justify-center px-3">
                    <div className="rounded-xl bg-slate-900 border border-amber-400/60 px-3 py-3 text-center">
                      <p className="text-[10px] font-black tracking-wide text-amber-200">
                        EMAIL TRÚNG THƯỞNG ĐIỆN THOẠI
                      </p>
                    </div>
                  </div>
                )}

                {node.mailOverlay && (
                  <div className="h-full text-slate-800 overflow-hidden">
                    <div className="px-2.5 py-1.5 text-[7px] bg-slate-200 border-b border-slate-300 break-all">
                      <span className="text-slate-500">Từ: </span>
                      <span className="font-bold">SuKienGame_TrungThuong2026@</span>
                      <span className="font-bold text-red-600">gmail-free-service.com</span>
                    </div>
                    <div className="px-2.5 py-2 text-[9px] font-black leading-snug">
                      [XÁC NHẬN] Chúc mừng bạn đã trúng GIẢI NHẤT sự kiện Game!
                    </div>
                    <div className="px-2.5 pb-2 text-[8px] leading-relaxed text-slate-700">
                      Chúc mừng bạn trúng 01 iPhone 17 Pro Max từ sự kiện tri ân game thủ. Truy cập link để hoàn
                      tất thông tin nhận thưởng trong <span className="font-bold text-red-600">24h</span>, nếu
                      không giải thưởng sẽ bị hủy.
                    </div>
                    <div className="px-2.5 pb-3 text-[8px] font-semibold text-blue-600 underline break-all">
                      http://game-thuong-nhanhanggiainhat.net/xacnhan
                    </div>
                  </div>
                )}

                {node.inspectOverlay && (
                  <div className="h-full px-2 py-2 space-y-1.5 overflow-hidden">
                    <div className="rounded-md bg-white border border-slate-300 px-1.5 py-1.5 space-y-1.5">
                      <div className="text-[7px] leading-tight break-all text-slate-800">
                        <span className="font-bold">SuKienGame_TrungThuong2026</span>
                        <span className="inline-block rounded border border-red-600 px-0.5 font-bold text-red-600">
                          @gmail-free-service.com
                        </span>
                      </div>
                      <div className="text-[7px] leading-tight font-semibold text-blue-600 underline break-all">
                        http://game-thuong-nhanhanggiainhat
                        <span className="inline-block rounded border border-red-600 px-0.5 not-italic no-underline text-red-600 bg-red-50">
                          .net
                        </span>
                        /xacnhan
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded bg-red-700 text-white text-[6px] font-black px-1 py-0.5">
                        Địa chỉ email lạ
                      </span>
                      <span className="rounded bg-red-700 text-white text-[6px] font-black px-1 py-0.5">
                        Đường link lạ (.net)
                      </span>
                    </div>
                    <div className="rounded-md bg-red-50 border border-red-300 px-1.5 py-1 text-[6px] font-semibold text-red-800 leading-tight">
                      ⚠ Tên miền không phải của nhà phát hành game chính thức! Đường link có đuôi .net rất đáng ngờ!
                    </div>
                  </div>
                )}

                {node.formOverlay && (
                  <div className="h-full bg-slate-900 px-2.5 py-2 space-y-1.5 overflow-hidden">
                    <div className="text-center text-[9px] font-black text-amber-300 tracking-wide">
                      XÁC NHẬN NHẬN THƯỞNG
                    </div>
                    {["Họ tên", "Số điện thoại", "Địa chỉ nhà", "Tên đăng nhập Game"].map((f) => (
                      <div
                        key={f}
                        className="rounded-md border border-amber-400/60 bg-slate-800/80 px-2 py-1.5 text-[8px] text-amber-100/90"
                      >
                        {f}
                      </div>
                    ))}
                    <div className="rounded-md border-2 border-red-500 bg-red-500/10 px-2 py-1.5 text-[8px] font-bold text-red-300">
                      Mật khẩu
                    </div>
                    <div className="rounded-md bg-amber-400 px-2 py-1.5 text-center text-[8px] font-black text-slate-900">
                      XÁC NHẬN NHẬN THƯỞNG
                    </div>
                  </div>
                )}

                {node.phoneFormOverlay && (
                  <div className="h-full bg-slate-900 px-2.5 py-2 space-y-1 overflow-hidden">
                    <div className="text-center text-[9px] font-black text-amber-300 tracking-wide">
                      XÁC NHẬN THÔNG TIN NHẬN THƯỞNG
                    </div>
                    {[
                      { label: "Họ và tên", value: "Nguyễn Thùy Linh" },
                      { label: "Số điện thoại", value: "09xxxxxxxx" },
                      { label: "Địa chỉ nhà", value: "123 Đường Hoa Mai, P. X, Q. Y" },
                      { label: "Tên đăng nhập Game", value: "LinhCute2009" },
                      { label: "Mật khẩu Game", value: "************", danger: true },
                    ].map((f) => (
                      <div key={f.label} className="space-y-0.5">
                        <div className="text-[6px] text-amber-200/80 font-semibold">{f.label}</div>
                        <div
                          className={`rounded-md px-2 py-1 text-[8px] font-medium ${
                            f.danger
                              ? "border-2 border-red-500 bg-red-500/10 text-red-200"
                              : "border border-amber-400/60 bg-slate-800/80 text-amber-100/90"
                          }`}
                        >
                          {f.value}
                        </div>
                      </div>
                    ))}
                    {node.phoneConfirm && (
                      <div className="rounded-md bg-amber-400 px-2 py-1.5 text-center text-[8px] font-black text-slate-900 shadow-[0_0_24px_rgba(251,191,36,0.7)]">
                        XÁC NHẬN NHẬN THƯỞNG
                      </div>
                    )}
                    {node.phoneConfirm && (
                      <div className="pt-0.5 text-center text-[8px] font-bold text-slate-300">Đang xử lý...</div>
                    )}
                  </div>
                )}
              </div>

              {/* home indicator */}
              <div className="py-1 flex justify-center bg-transparent">
                <div className="h-[3px] w-14 rounded-full bg-slate-500/70" />
              </div>
            </div>
          </div>
          </div>
        </div>

      )}



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

      <div className="pointer-events-none absolute inset-0 film-grain" />
      <div className="pointer-events-none absolute inset-0 bg-white animate-[filmFlicker_2.4s_steps(4,end)_infinite] mix-blend-soft-light opacity-10" />
      <div className="pointer-events-none absolute inset-0 film-vignette" />

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/5 to-black/90" />
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
                <FinalLessonQuiz />
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
                  done && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black tracking-widest text-white/70">L NÊN LÀM GÌ?</p>
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
