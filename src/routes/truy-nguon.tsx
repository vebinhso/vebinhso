import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { findSources } from "@/lib/source-finder.functions";

export const Route = createFileRoute("/truy-nguon")({
  component: TraceSourcePage,
  head: () => ({
    meta: [
      { title: "Truy nguồn ảnh & thông tin — Vệ Binh Số" },
      {
        name: "description",
        content:
          "Dán một tấm ảnh hoặc một mẩu thông tin, Vệ Binh Số sẽ tìm các bài báo, trang tin và video đã đăng nội dung đó kèm đường link truy cập.",
      },
      { property: "og:title", content: "Truy nguồn ảnh & thông tin — Vệ Binh Số" },
      {
        property: "og:description",
        content: "Tìm bài báo, trang tin, video gốc của một tấm ảnh hoặc một mẩu tin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const MAX_IMG = 5 * 1024 * 1024;

type Result = Awaited<ReturnType<typeof findSources>>;

type HistoryEntry = {
  id: string;
  at: number;
  text: string;
  thumb: string;
  result: Result;
};

const HISTORY_MAX = 20;
const historyKey = (uid: string) => `truynguon-history-${uid}`;

function loadHistory(uid: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(uid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(uid: string, list: HistoryEntry[]) {
  try {
    localStorage.setItem(historyKey(uid), JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {
    /* quota */
  }
}

/** Thu nhỏ ảnh thành thumbnail để lưu lịch sử không tốn dung lượng */
async function makeThumb(dataUrl: string): Promise<string> {
  if (!dataUrl) return "";
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("img"));
      img.src = dataUrl;
    });
    const max = 160;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  } catch {
    return "";
  }
}

function timeAgo(ts: number) {
  return new Date(ts).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}


function ResultList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: Result["news"];
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs sm:text-sm font-black">
        {icon} {title} ({items.length})
      </p>
      {items.map((it, i) => (
        <a
          key={i}
          href={it.link}
          target="_blank"
          rel="noreferrer noopener"
          className="block rounded-xl border-2 border-border/60 p-2.5 hover:border-cyan-500 transition"
        >
          <p className="text-xs sm:text-sm font-black text-primary break-words">{it.title}</p>
          <p className="text-[10px] font-black text-foreground">
            {it.source}
            {it.date ? ` · ${it.date}` : ""}
          </p>
          {it.snippet && (
            <p className="mt-0.5 text-[11px] font-bold text-foreground line-clamp-2">{it.snippet}</p>
          )}
          {(() => {
            const ev = it as { why?: string; quote?: string; moment?: string; score?: number };
            const isVideo = /youtube\.com|youtu\.be|tiktok\.com/.test(it.link);
            if (!ev.why && !ev.quote && !ev.moment) return null;
            return (
              <div className="mt-1.5 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/10 p-2">
                <p className="text-[10px] font-black text-emerald-700">
                  🔍 BẰNG CHỨNG KHỚP{typeof ev.score === "number" && ev.score > 0 ? ` · ${ev.score}%` : ""}
                </p>
                {ev.moment && (
                  <p className="mt-0.5 text-[10px] font-black text-foreground">
                    ⏱️ {isVideo ? "Mốc thời gian trong video" : "Mốc thời gian"}: {ev.moment}
                  </p>
                )}
                {ev.quote && (
                  <p className="mt-0.5 text-[11px] font-bold italic text-foreground break-words">“{ev.quote}”</p>
                )}
                {ev.why && <p className="mt-0.5 text-[10px] font-black text-emerald-700">✔ {ev.why}</p>}
              </div>
            );
          })()}


        </a>
      ))}
    </div>
  );
}

function TraceSourcePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const run = useServerFn(findSources);

  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
    setHistory(loadHistory(u.id));
  }, [navigate]);


  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function readFile(f: File) {
    if (!f.type.startsWith("image/")) return setError("Chỉ nhận tệp ảnh.");
    if (f.size > MAX_IMG) return setError("Ảnh quá lớn (tối đa 5MB).");
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setResult(null);
      setImage(String(reader.result || ""));
    };
    reader.readAsDataURL(f);
  }

  function onPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it && it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) {
          e.preventDefault();
          readFile(f);
          return;
        }
      }
    }
  }

  async function doSearch() {
    if (!image && text.trim().length < 8) {
      setError("Hãy dán một tấm ảnh hoặc nhập ít nhất 8 ký tự thông tin.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    setProgress(3);
    const phases = [
      "Đang đọc nội dung bạn gửi...",
      "Đang tạo từ khoá truy tìm...",
      "Đang quét báo lớn nhỏ & trang tin...",
      "Đang tìm video liên quan...",
      "Đang sắp xếp kết quả...",
    ];
    setPhase(phases[0]!);
    let pct = 3;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      pct = Math.min(95, pct + Math.max(0.5, (95 - pct) * 0.05));
      setProgress(pct);
      setPhase(phases[Math.min(phases.length - 1, Math.floor((pct / 100) * phases.length))]!);
    }, 220);
    try {
      const r = await run({ data: { text: text.trim(), imageUrl: image } });
      setProgress(100);
      setPhase("Hoàn tất!");
      setResult(r);
      const u = user ?? getCurrentUser();
      if (u) {
        const thumb = await makeThumb(image);
        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: Date.now(),
          text: text.trim(),
          thumb,
          result: r,
        };
        const next = [entry, ...history].slice(0, HISTORY_MAX);
        setHistory(next);
        saveHistory(u.id, next);
      }
    } catch (e: any) {
      setError(e?.message || "Không tìm được nguồn, thử lại nhé.");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setTimeout(() => setLoading(false), 200);
    }
  }

  function openEntry(h: HistoryEntry) {
    setResult(h.result);
    setText(h.text);
    setImage(h.thumb);
    setError(null);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeEntry(id: string) {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    if (user) saveHistory(user.id, next);
  }

  function clearHistory() {
    if (!confirm("Xoá toàn bộ lịch sử truy nguồn?")) return;
    setHistory([]);
    if (user) saveHistory(user.id, []);
  }


  if (!user) return null;

  const q = result?.queries?.[0] ?? text.trim().slice(0, 80);
  const suggestLinks = [
    { label: "🔍 Google Tin tức", url: `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=vi&gl=VN` },
    { label: "🌐 Google", url: `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    { label: "🎥 YouTube", url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
    { label: "🖼️ Google Lens (tìm ảnh ngược)", url: "https://lens.google.com/" },
    { label: "🖼️ TinEye (tìm ảnh ngược)", url: "https://tineye.com/" },
    { label: "🖼️ Yandex Ảnh", url: "https://yandex.com/images/" },
  ];

  return (
    <GameLayout showBack>
      <div className="flex-1 flex justify-center p-3 sm:p-4 pt-16 sm:pt-20">
        <div className="glass-card w-full max-w-3xl p-4 sm:p-6">
          <div className="text-center mb-4">
            <div className="text-4xl sm:text-5xl mb-1">🕵️</div>
            <h1 className="text-lg sm:text-2xl font-black">TRUY NGUỒN ẢNH & THÔNG TIN</h1>
            <p className="text-xs sm:text-sm font-bold text-foreground">
              Dán một tấm ảnh hoặc một mẩu tin — hệ thống tìm các bài báo, trang tin (kể cả báo nhỏ như Mực Tím) và
              video đã đăng nội dung đó, kèm đường link truy cập.
            </p>
          </div>

          <div className="space-y-3">
            <div
              tabIndex={0}
              onPaste={onPaste}
              onClick={() => fileRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0];
                if (f) readFile(f);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-border p-4 text-center outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {image ? (
                <img src={image} alt="Ảnh cần truy nguồn" className="mx-auto max-h-56 rounded-xl object-contain" />
              ) : (
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  📁 Bấm để chọn ảnh · hoặc Ctrl+V dán ảnh · hoặc kéo thả
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) readFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            {image && (
              <button
                onClick={() => {
                  setImage("");
                  setResult(null);
                }}
                className="toy-button !text-xs sm:!text-sm"
              >
                Xoá ảnh
              </button>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Hoặc dán thông tin / tiêu đề / đoạn tin nhắn cần truy nguồn..."
              className="w-full rounded-xl border-2 border-border px-3 py-2 text-xs sm:text-sm font-bold"
            />

            <button
              onClick={doSearch}
              disabled={loading}
              className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
            >
              {loading ? `⏳ Đang truy nguồn ${Math.round(progress)}%` : "🕵️ Truy nguồn ngay"}
            </button>

            {error && (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {error}
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border-2 border-cyan-300 bg-cyan-50/60 p-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs sm:text-sm font-black text-cyan-800">⏳ {phase}</span>
                  <span className="text-xl font-black text-cyan-700">{Math.round(progress)}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-cyan-900/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
                  />
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4 rounded-2xl border-2 border-border p-3">
                <div>
                  <p className="text-xs sm:text-sm font-black">🔎 Nội dung nhận diện</p>
                  <p className="text-xs sm:text-sm font-bold text-foreground">{result.describe}</p>
                </div>

                {result.queries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.queries.map((qq, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-cyan-500/15 border-2 border-cyan-500/40 px-2 py-0.5 text-[10px] font-black text-cyan-800"
                      >
                        #{qq}
                      </span>
                    ))}
                  </div>
                )}

                {result.total === 0 ? (
                  <div className="rounded-xl border-2 border-amber-400 bg-amber-50/70 p-3">
                    <p className="text-xs sm:text-sm font-black text-amber-800">
                      ⚠️ Ảnh / thông tin này CHƯA từng xuất hiện ở bài báo, trang tin hay video nào.
                    </p>
                    <p className="text-[11px] font-bold text-amber-700">
                      Đã quét {result.scanned} kết quả và mở từng trang để đối chiếu, nhưng không trang nào đăng ĐÚNG
                      tấm ảnh / đúng sự việc này (những trang chỉ "na ná" đã bị loại). Rất có thể là tin đồn, ảnh chế
                      hoặc ảnh riêng tư. Bạn có thể tự kiểm tra thêm bằng các đường link bên dưới.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-black text-emerald-700">
                    ✅ Đã đối chiếu nội dung từng trang — {result.total} nguồn đăng ĐÚNG ảnh/sự việc này (
                    {result.checkedAt})
                  </p>
                )}



                <ResultList title="Bài báo & trang tin" icon="📰" items={result.news} />
                <ResultList title="Trang web có nội dung này" icon="🌐" items={result.web} />
                <ResultList title="Video liên quan" icon="🎥" items={result.video} />

                {result.tips.length > 0 && (
                  <div className="rounded-xl border-2 border-border/60 p-3">
                    <p className="text-xs font-black mb-1">💡 Mẹo tự truy nguồn</p>
                    <ul className="text-[11px] sm:text-xs font-bold text-foreground list-disc pl-5 space-y-1">
                      {result.tips.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-xs font-black mb-1.5">🔗 Đường link nên thử</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestLinks.map((l) => (
                      <a
                        key={l.label}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-xl border-2 border-border bg-background/70 px-2.5 py-1 text-[11px] font-black hover:border-cyan-500 transition"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-foreground">
                    * Với tìm ảnh ngược, hãy tải lại tấm ảnh của bạn lên Google Lens / TinEye / Yandex.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Lịch sử truy nguồn */}
          <div className="mt-5 rounded-2xl border-2 border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="text-xs sm:text-sm font-black flex items-center gap-1"
              >
                🗂️ Lịch sử truy nguồn ({history.length}) {showHistory ? "▾" : "▸"}
              </button>
              {history.length > 0 && showHistory && (
                <button onClick={clearHistory} className="text-[11px] font-black text-red-600">
                  Xoá tất cả
                </button>
              )}
            </div>

            {showHistory && (
              <div className="mt-2 space-y-2">
                {history.length === 0 ? (
                  <p className="text-[11px] font-bold text-foreground">
                    Chưa có lần truy nguồn nào. Mỗi lần bạn bấm “Truy nguồn ngay”, kết quả sẽ được lưu lại đây để xem
                    lại sau.
                  </p>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-2 rounded-xl border-2 border-border/60 p-2 hover:border-cyan-500 transition"
                    >
                      {h.thumb ? (
                        <img src={h.thumb} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 grid place-items-center text-lg shrink-0">
                          📝
                        </div>
                      )}
                      <button onClick={() => openEntry(h)} className="flex-1 text-left min-w-0">
                        <p className="text-[11px] sm:text-xs font-black truncate">
                          {h.text || h.result.describe || "(ảnh)"}
                        </p>
                        <p className="text-[10px] font-black text-foreground">
                          {timeAgo(h.at)} ·{" "}
                          {h.result.total > 0 ? (
                            <span className="text-emerald-700">✅ {h.result.total} nguồn</span>
                          ) : (
                            <span className="text-amber-700">⚠️ Không có nguồn</span>
                          )}
                        </p>
                      </button>
                      <button
                        onClick={() => removeEntry(h.id)}
                        className="text-[11px] font-black text-red-600 px-1 shrink-0"
                        aria-label="Xoá mục này"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>


          <div className="mt-5 flex gap-2 justify-center flex-wrap">
            <Link to="/ai" className="toy-button !text-xs sm:!text-sm">
              ↩ Trung tâm kiểm tra AI
            </Link>
            <Link to="/experience" className="toy-button toy-button-primary !text-xs sm:!text-sm">
              🎮 Trải nghiệm
            </Link>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
