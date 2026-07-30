import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/auth";
import { speakLine } from "@/lib/tts.functions";
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
      { property: "og:title", content: "Phim tương tác: Một cuộc gọi" },
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
  kenburns: "animate-[kenBurns_18s_ease-in-out_infinite_alternate]",
  push: "animate-[filmPush_9s_ease-out_forwards]",
  shake: "animate-[filmShake_.16s_linear_infinite]",
  freeze: "",
};

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const node: FilmNode = FILM[nodeId] ?? FILM[FILM_START];
  const meta = SPEAKER_META[node.speaker];

  useEffect(() => {
    if (!getCurrentUser()) navigate({ to: "/login" });
  }, [navigate]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // Phụ đề chạy chữ theo nhịp kể chuyện
  useEffect(() => {
    if (!started) return;
    setTyped("");
    setDone(false);
    let i = 0;
    const text = node.text;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setTyped(text);
        setDone(true);
      }
    }, 38);
    return () => window.clearInterval(id);
  }, [nodeId, started, node.text]);

  // Lồng tiếng AI — tốc độ 1.0x, khớp với hình
  useEffect(() => {
    if (!started || muted) return;
    let cancelled = false;
    stopAudio();

    const play = async () => {
      try {
        let b64 = cacheRef.current.get(node.id);
        if (!b64) {
          const res = await tts({ data: { text: node.text, voice: meta.voice } });
          b64 = (res as { audio: string }).audio;
          cacheRef.current.set(node.id, b64);
        }
        if (cancelled || muted) return;
        const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
        audio.playbackRate = 1;
        audioRef.current = audio;
        await audio.play().catch(() => {});
      } catch {
        if (cancelled || typeof window === "undefined" || !window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance(node.text);
        u.lang = "vi-VN";
        u.rate = 1;
        u.pitch = node.speaker === "K" ? 0.8 : 1.1;
        window.speechSynthesis.speak(u);
      }
    };
    void play();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, started, muted]);

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

  const progress = useMemo(() => Math.min(100, Math.round((history.length / 16) * 100)), [history.length]);

  // Tự động sang cảnh kế tiếp như một bộ phim đang chạy
  useEffect(() => {
    if (!started || !autoPlay || !done) return;
    if (node.choices || node.ending || !node.next) return;
    const nxt = node.next;
    const id = window.setTimeout(() => go(nxt), 1600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, nodeId, autoPlay, started]);

  if (!started) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <img
            src={FILM_POSTER}
            alt="Poster phim tương tác Một cuộc gọi"
            className="w-full rounded-2xl mb-4 border border-white/10"
          />
          <p className="text-[11px] font-black tracking-[0.3em] text-red-500 mb-2">PHIM TƯƠNG TÁC · BÀI 1</p>
          <h1 className="text-2xl sm:text-4xl font-black mb-3 leading-tight">{FILM_TITLE}</h1>
          <p className="text-sm font-bold text-white/60 mb-6">
            Bạn vào vai <b className="text-sky-300">N</b>. Ba nút quyết định, bốn cái kết. Có lồng tiếng AI — hãy bật
            loa hoặc đeo tai nghe.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="w-full rounded-2xl py-4 font-black text-lg bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110"
          >
            ▶ BẮT ĐẦU
          </button>
          <Link to="/roleplay" className="block mt-3 text-xs font-bold text-white/50 hover:text-white">
            ← Quay lại danh sách bài chơi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden select-none">
      <img
        key={node.id + node.image}
        src={node.image}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover opacity-95 ${MOTION_CLASS[node.motion ?? "kenburns"] ?? ""}`}
      />
      {node.mood && node.mood !== "neutral" && (
        <div
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{ backgroundColor: node.mood === "danger" ? "#0b3d5c" : "#f0b429", opacity: 0.35 }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/90" />
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
                      <button onClick={restart} className="rounded-xl px-4 py-2.5 font-black text-sm bg-white text-black">
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
                    onClick={() => (done ? node.next && go(node.next) : (setTyped(node.text), setDone(true)))}
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
