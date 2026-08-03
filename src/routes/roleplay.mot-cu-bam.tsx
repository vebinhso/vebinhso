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
} from "@/lib/film-3";

export const Route = createFileRoute("/roleplay/mot-cu-bam")({
  component: FilmPage,
  head: () => ({
    meta: [
      { title: "Phim tương tác: Cuộc thi Hoa Khôi — Vệ Binh Số" },
      {
        name: "description",
        content:
          "Bài 3 nhập vai: một đường link bình chọn gửi từ tài khoản của bạn thân. Bạn sẽ bấm giúp bạn hay dừng lại xác minh?",
      },
      { property: "og:title", content: "Phim tương tác: Cuộc thi Hoa Khôi" },
      {
        property: "og:description",
        content: "Bạn vào vai Bảo. Mỗi lựa chọn trước một đường link lạ sẽ dẫn đến một kết cục khác nhau.",
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
          alt="Poster phim tương tác Gợi nhớ từ cá voi xanh"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className="relative h-full w-full flex flex-col items-center justify-end text-center px-5 pb-8 sm:pb-12 overflow-y-auto">
          <p className="text-[11px] sm:text-xs font-black tracking-[0.35em] text-sky-300 mb-2 drop-shadow-lg">
            PHIM TƯƠNG TÁC · BÀI 3
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-3 leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            {FILM_TITLE}
          </h1>
          <p className="max-w-xl text-xs sm:text-sm font-bold text-white/75 mb-1">
            Bạn vào vai <b className="text-sky-300">Bảo</b>. Mỗi lựa chọn đều để lại dấu vết lên bản thân, bạn bè và
            quyền riêng tư của người khác.
          </p>
          <p className="max-w-xl text-xs sm:text-sm font-bold text-white/75 mb-5">
            Hãy bật loa hoặc đeo tai nghe để có trải nghiệm tốt nhất♡!
          </p>

          <button
            onClick={beginFilm}
            disabled={preparing}
            className="w-full max-w-md rounded-2xl py-4 font-black text-lg bg-gradient-to-r from-sky-600 to-indigo-500 hover:brightness-110 disabled:opacity-70"
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
        className={`absolute inset-0 flex items-center justify-center will-change-transform ${
          visual.type === "video" ? "" : "animate-[filmDrift_18s_ease-in-out_infinite_alternate]"
        }`}
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
              className="absolute inset-0 w-full h-full object-contain animate-[filmFade_0.9s_ease-out_both]"
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

      {node.groupChatOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <div className="animate-[filmFade_0.9s_ease-out_both] relative w-[38vh] max-w-[250px] min-w-[170px] rounded-[2rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.75)] rotate-[-3deg]">
            <div className="absolute left-1/2 top-1.5 z-10 h-1.5 w-14 -translate-x-1/2 rounded-full bg-neutral-700" />
            <div className="overflow-hidden rounded-[1.6rem] bg-neutral-100 text-neutral-900">
              <div className="flex items-center gap-1.5 bg-sky-600 px-2 pb-1.5 pt-4">
                <div className="h-4 w-4 rounded-full bg-white/80" />
                <p className="text-[9px] font-black text-white">Nhóm lớp 10A1 ❤️</p>
              </div>
              <div className="space-y-1.5 px-2 py-2">
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-amber-50 border border-amber-300 px-2 py-1.5">
                  <p className="text-[8px] font-black text-red-600">⚠️ CẢNH BÁO MỌI NGƯỜI!</p>
                  <p className="mt-0.5 text-[7.5px] font-semibold leading-snug">
                    Nick Facebook của mình vừa bị hack. Kẻ gian đang dùng nick mình để nhắn mượn tiền
                    và gửi link lừa đảo. Mọi người tuyệt đối KHÔNG bấm link, KHÔNG chuyển tiền cho bất
                    kỳ ai nhé!
                  </p>
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-white px-2 py-1 shadow-sm">
                  <p className="text-[7.5px] font-semibold">Tuấn: Ok Bảo, cảm ơn mày đã báo nhé!</p>
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-white px-2 py-1 shadow-sm">
                  <p className="text-[7.5px] font-semibold">Lan: Cảm ơn Bảo! May mà mày báo sớm!</p>
                </div>
              </div>
              <div className="flex items-center gap-1 border-t border-neutral-300 bg-white px-2 py-1.5">
                <div className="h-3 flex-1 rounded-full bg-neutral-200" />
                <div className="h-3 w-3 rounded-full bg-sky-600" />
              </div>
            </div>
          </div>
        </div>
      )}


      {node.linkOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <div className="animate-[filmFade_0.9s_ease-out_both] max-w-[92%] rounded-2xl bg-black/70 backdrop-blur-md border border-red-500/40 px-4 py-3 sm:px-6 sm:py-4 text-center shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <p className="font-mono font-black tracking-tight text-base sm:text-2xl break-all leading-tight">
              <span className="text-red-400">http://</span>
              <span className="text-white">binhchonmauanh-hocsinh2026</span>
              <span className="text-red-400">.top</span>
              <span className="text-white/70">/vote-ha</span>
            </p>
            <p className="mt-2 text-[11px] sm:text-sm font-bold text-red-300">
              🔓 Không có ổ khoá — kết nối không được mã hoá
            </p>
          </div>
        </div>
      )}

      {node.voteOverlay && (
        <div className="pointer-events-none absolute inset-0">
          {/* Nội dung nằm ngay trên màn hình chiếc điện thoại nhân vật cầm trong ảnh */}
          <div
            className="animate-[filmFade_0.9s_ease-out_both] absolute overflow-hidden bg-gradient-to-b from-pink-500 to-fuchsia-700 px-[4%] py-[6%] text-center rounded-[6px]"
            style={{
              left: `${node.screenAnchor?.x ?? 56}%`,
              top: `${node.screenAnchor?.y ?? 50}%`,
              width: `${node.screenAnchor?.w ?? 27}%`,
              height: `${node.screenAnchor?.h ?? 86}%`,
              transform: `translate(-50%, -50%) rotate(${node.screenAnchor?.rot ?? 0}deg)`,
            }}
          >
            <p className="text-[clamp(9px,1.4vw,15px)] font-black leading-tight tracking-wide text-white drop-shadow">
              MẪU ẢNH HỌC SINH TÀI NĂNG 2026
            </p>
            <p className="mt-[3%] text-[clamp(8px,1.1vw,12px)] font-bold text-pink-100">
              Hạng 5 — 4.812 lượt bình chọn
            </p>
            <p className="mt-[2%] text-[clamp(8px,1.1vw,12px)] font-bold text-yellow-200">
              ⏳ Cổng bình chọn đóng sau: 00:47:12
            </p>
            <div className="mt-[6%] rounded-full bg-white/95 px-2 py-[3%] text-[clamp(8px,1.2vw,13px)] font-black text-pink-600 shadow-[0_0_25px_rgba(255,255,255,0.6)] animate-pulse">
              BẤM VÀO ĐÂY ĐỂ BÌNH CHỌN
            </div>
          </div>
        </div>
      )}

      {node.loginOverlay && (
        <div className="pointer-events-none absolute inset-0">
          <div
            className="animate-[filmFade_0.9s_ease-out_both] absolute overflow-hidden bg-gradient-to-b from-pink-400 to-fuchsia-600 p-[5%] flex items-center rounded-[6px]"
            style={{
              left: `${node.screenAnchor?.x ?? 50}%`,
              top: `${node.screenAnchor?.y ?? 48}%`,
              width: `${node.screenAnchor?.w ?? 34}%`,
              height: `${node.screenAnchor?.h ?? 76}%`,
              transform: `translate(-50%, -50%) rotate(${node.screenAnchor?.rot ?? 0}deg)`,
            }}
          >
            <div className="w-full rounded-xl bg-white p-[6%] shadow-lg">
              <p className="text-center text-[clamp(10px,1.4vw,16px)] font-black text-neutral-800">Đăng nhập</p>
              <div className="mt-[6%] h-[clamp(16px,2.4vw,26px)] rounded-md border border-neutral-300 bg-neutral-50" />
              <div className="mt-[5%] h-[clamp(16px,2.4vw,26px)] rounded-md border border-neutral-300 bg-neutral-50" />
              <div className="mt-[7%] rounded-md bg-blue-600 py-[4%] text-center text-[clamp(9px,1.2vw,14px)] font-black text-white">
                Tiếp tục
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
          <div className="h-full bg-sky-400 transition-all" style={{ width: `${progress}%` }} />
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
                  done && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black tracking-widest text-white/70">BẢO NÊN LÀM GÌ?</p>
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
