import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/auth";
import { speakLine } from "@/lib/tts.functions";
import { FILM, FILM_START, FILM_TITLE, SPEAKER_META, VIDEO_FOR_IMAGE, type FilmNode } from "@/lib/film-scam-police";


export const Route = createFileRoute("/roleplay/scam-police")({
  component: FilmPage,
  head: () => ({
    meta: [
      { title: "Phim tương tác: Giả danh Công an — Vệ Binh Số" },
      { name: "description", content: "Bài chơi nhập vai dạng interactive film: đối mặt cuộc gọi giả danh công an, tự ra quyết định và nhận cái kết của riêng bạn." },
      { property: "og:title", content: "Phim tương tác: Giả danh Công an" },
      { property: "og:description", content: "Nhập vai nạn nhân của cuộc gọi giả danh công an. Mỗi lựa chọn dẫn tới một cái kết khác nhau." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

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
  const [speaking, setSpeaking] = useState(false);


  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const node: FilmNode = FILM[nodeId] ?? FILM[FILM_START];
  const meta = SPEAKER_META[node.speaker];
  const clip = VIDEO_FOR_IMAGE[node.image];


  useEffect(() => {
    if (!getCurrentUser()) navigate({ to: "/login" });
  }, [navigate]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // Typewriter subtitle — tốc độ kể chuyện tự nhiên như xem phim
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
    }, 42);
    return () => window.clearInterval(id);
  }, [nodeId, started, node.text]);


  // AI voice
  useEffect(() => {
    if (!started || muted) return;
    let cancelled = false;
    stopAudio();

    const play = async () => {
      const key = node.id;
      try {
        let b64 = cacheRef.current.get(key);
        if (!b64) {
          const res = await tts({ data: { text: node.text, voice: meta.voice } });
          b64 = (res as { audio: string }).audio;
          cacheRef.current.set(key, b64);
        }
        if (cancelled || muted) return;
        const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
        audioRef.current = audio;
        // Tắt nhạc nền khi có giọng đọc, bật lại khi đọc xong
        setSpeaking(true);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play().catch(() => setSpeaking(false));
      } catch {
        if (cancelled || typeof window === "undefined" || !window.speechSynthesis) return;
        setSpeaking(true);
        const u = new SpeechSynthesisUtterance(node.text);
        u.onend = () => setSpeaking(false);
        u.lang = "vi-VN";
        u.rate = node.speaker === "K" ? 1.05 : 1;
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
    setNodeId(FILM_START);
  };

  const back = () => {
    if (!history.length) return;
    stopAudio();
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setNodeId(prev);
  };

  const progress = useMemo(() => Math.min(100, Math.round((history.length / 14) * 100)), [history.length]);

  // Tự động sang cảnh kế tiếp như một bộ phim đang chạy
  useEffect(() => {
    if (!started || !autoPlay || !done) return;
    if (node.choices || node.ending || !node.next) return;
    const nxt = node.next;
    const id = window.setTimeout(() => go(nxt), 1800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, nodeId, autoPlay, started]);


  if (!started) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="text-5xl mb-3">🎬</div>
          <p className="text-[11px] font-black tracking-[0.3em] text-red-500 mb-2">PHIM TƯƠNG TÁC · BÀI 1</p>
          <h1 className="text-2xl sm:text-4xl font-black mb-3 leading-tight">{FILM_TITLE}</h1>
          <p className="text-sm font-bold text-white/60 mb-6">
            Bạn vào vai <b className="text-sky-300">N</b> — một người dân bình thường. Mỗi lựa chọn của bạn sẽ dẫn tới
            một cái kết khác nhau. Có tiếng nói AI, hãy bật loa hoặc đeo tai nghe.
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
      {/* Backdrop — video thật nếu có, nếu không thì ảnh với chuyển động máy quay */}
      {clip ? (
        <video
          key={clip}
          src={clip}
          autoPlay
          loop
          muted={muted || speaking}
          playsInline
          ref={(el) => {
            if (el) el.volume = 0.35;
          }}
          className="absolute inset-0 w-full h-full object-cover opacity-95 animate-[filmFade_.7s_ease-out]"
        />
      ) : (
        <img
          key={node.image}
          src={node.image}
          alt=""
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full object-cover opacity-90 animate-[kenBurns_18s_ease-in-out_infinite_alternate]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/90" />
      {/* Thanh đen điện ảnh */}
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
          title={autoPlay ? "Đang tự chạy như phim" : "Đang chạy thủ công"}
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

      {/* Subtitle + interaction */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
        <div className="max-w-3xl mx-auto">
          {node.ending ? (
            <div
              className={`rounded-2xl p-4 sm:p-5 backdrop-blur-md border-2 ${
                node.ending.kind === "safe"
                  ? "bg-emerald-950/80 border-emerald-400"
                  : "bg-red-950/80 border-red-500"
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
                <Link to="/roleplay" className="rounded-xl px-4 py-2.5 font-black text-sm bg-white/15">
                  📚 Bài chơi khác
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div
                className="rounded-2xl bg-black/70 backdrop-blur-md px-4 py-3 border border-white/10 cursor-pointer"
                onClick={() => {
                  if (!done) {
                    setTyped(node.text);
                    setDone(true);
                  }
                }}

              >
                {node.action && (
                  <p className="text-[11px] font-bold italic text-white/50 mb-0.5">({node.action})</p>
                )}
                <p className={`text-[11px] font-black tracking-widest mb-1 ${meta.color}`}>{meta.name}</p>
                <p className="text-base sm:text-lg font-bold leading-snug min-h-[3.2em]">
                  {typed}
                  {!done && <span className="animate-pulse">▍</span>}
                </p>
              </div>

              <div className="mt-2.5 space-y-2">
                {node.choices ? (
                  done &&
                  node.choices.map((c) => (
                    <button
                      key={c.next + c.label}
                      onClick={() => go(c.next)}
                      className={`w-full text-left rounded-xl px-4 py-3 font-black text-sm border-2 backdrop-blur-md transition-transform hover:-translate-y-0.5 ${
                        c.tone === "safe"
                          ? "bg-emerald-600/80 border-emerald-300"
                          : c.tone === "risky"
                            ? "bg-red-700/80 border-red-400"
                            : "bg-slate-700/80 border-slate-300"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))
                ) : (
                  <button
                    onClick={() => (done ? node.next && go(node.next) : (setTyped(node.text), setDone(true)))}
                    className="w-full rounded-xl px-4 py-3 font-black text-sm bg-white/90 text-black"
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
