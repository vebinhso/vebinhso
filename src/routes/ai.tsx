import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import {
  analyzeImage,
  analyzeLink,
  analyzeText,
  analyzeEmail,
  analyzeNews,
  analyzeVideo,
} from "@/lib/ai-detect.functions";


export const Route = createFileRoute("/ai")({
  component: AiPage,
  head: () => ({
    meta: [
      { title: "Kiểm tra AI & Link an toàn — Vệ Binh Số" },
      {
        name: "description",
        content:
          "Công cụ AI của Vệ Binh Số: kiểm tra ảnh có phải do AI tạo, quét đường link độc hại và nhận diện văn bản do AI viết.",
      },
      { property: "og:title", content: "Kiểm tra AI & Link an toàn — Vệ Binh Số" },
      {
        property: "og:description",
        content: "Dán ảnh, link hoặc đoạn văn để AI phân tích mức độ giả mạo và rủi ro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Tab = "image" | "video" | "link" | "text" | "email" | "news";

const MAX_IMG = 5 * 1024 * 1024;
const MAX_VID = 60 * 1024 * 1024;

/** Trích khung hình từ video ngay trên trình duyệt */
async function extractFrames(
  file: File,
  count = 4,
  onStep?: (done: number, total: number) => void,
): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Không đọc được video này"));
    });
    const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const w = 512;
    const h = Math.max(1, Math.round((video.videoHeight / (video.videoWidth || 1)) * w)) || 288;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ trích khung hình");
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      const t = (dur * (i + 0.5)) / count;
      await new Promise<void>((resolve) => {
        const onSeek = () => {
          video.removeEventListener("seeked", onSeek);
          resolve();
        };
        video.addEventListener("seeked", onSeek);
        video.currentTime = Math.min(Math.max(t, 0), Math.max(dur - 0.05, 0));
      });
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(canvas.toDataURL("image/jpeg", 0.7));
      onStep?.(i + 1, count);
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}


function scoreColor(v: number) {
  if (v >= 70) return "bg-red-500";
  if (v >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}
function scoreText(v: number) {
  if (v >= 70) return "text-red-600";
  if (v >= 40) return "text-amber-600";
  return "text-emerald-600";
}

function Gauge({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-black text-muted-foreground">{label}</span>
        <span className={`text-2xl font-black ${scoreText(value)}`}>{value}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** Thanh tiến trình khi đang phân tích */
function AnalyzingBar({ percent, phase }: { percent: number; phase: string }) {
  return (
    <div className="rounded-2xl border-2 border-cyan-300 bg-cyan-50/60 p-3 space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs sm:text-sm font-black text-cyan-800">⏳ {phase}</span>
        <span className="text-xl font-black text-cyan-700">{Math.round(percent)}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-cyan-900/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
        />
      </div>
    </div>
  );
}

function SignList({ title, items, tone }: { title: string; items: string[]; tone: "bad" | "good" | "info" }) {

  if (!items.length) return null;
  const icon = tone === "bad" ? "⚠️" : tone === "good" ? "✅" : "💡";
  return (
    <div className="rounded-xl border-2 border-border/60 p-3">
      <p className="text-xs font-black mb-1">
        {icon} {title}
      </p>
      <ul className="text-xs sm:text-sm font-bold text-muted-foreground space-y-1 list-disc pl-5">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

const VERDICT_VI: Record<string, string> = {
  real: "Ảnh/nội dung THẬT",
  likely_real: "Nhiều khả năng THẬT",
  human: "Do NGƯỜI viết",
  likely_human: "Nhiều khả năng do NGƯỜI viết",
  uncertain: "Chưa chắc chắn",
  likely_ai: "Nhiều khả năng do AI",
  ai: "Do AI tạo",
};
const LEVEL_VI: Record<string, string> = {
  safe: "An toàn",
  low: "Rủi ro thấp",
  medium: "Rủi ro trung bình",
  high: "Rủi ro cao",
  dangerous: "NGUY HIỂM",
  unknown: "Chưa xác định",
};
const NEWS_VERDICT_VI: Record<string, string> = {
  likely_true: "Nhiều khả năng ĐÁNG TIN",
  unverified: "CHƯA KIỂM CHỨNG được",
  misleading: "Tin SAI LỆCH / gây hiểu lầm",
  likely_fake: "Nhiều khả năng TIN GIẢ",
  fake: "TIN GIẢ",
};
const EMAIL_TYPE_VI: Record<string, string> = {
  phishing: "Lừa lấy thông tin (phishing)",
  spoofing: "Giả mạo người gửi",
  scam: "Lừa đảo",
  spam: "Thư rác",
  marketing: "Quảng cáo",
  legit: "Có vẻ hợp lệ",
  unknown: "Chưa rõ",
};

function AiPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [tab, setTab] = useState<Tab>("image");

  const runImage = useServerFn(analyzeImage);
  const runLink = useServerFn(analyzeLink);
  const runText = useServerFn(analyzeText);
  const runEmail = useServerFn(analyzeEmail);
  const runNews = useServerFn(analyzeNews);
  const runVideo = useServerFn(analyzeVideo);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Đang phân tích...");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Chạy một tác vụ phân tích kèm hiển thị % tiến trình */
  async function withProgress<T>(
    phases: string[],
    fn: (report: (p: number, label?: string) => void) => Promise<T>,
  ): Promise<T | null> {
    setLoading(true);
    setError(null);
    setProgress(3);
    setPhase(phases[0] ?? "Đang phân tích...");
    let pct = 3;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      pct = Math.min(95, pct + Math.max(0.4, (95 - pct) * 0.06));
      setProgress(pct);
      const idx = Math.min(phases.length - 1, Math.floor((pct / 100) * phases.length));
      setPhase(phases[idx] ?? phases[0]!);
    }, 220);
    try {
      const res = await fn((p, label) => {
        pct = Math.max(pct, p);
        setProgress(pct);
        if (label) setPhase(label);
      });
      setProgress(100);
      setPhase("Hoàn tất!");
      return res;
    } catch (e: any) {
      setError(e?.message || "Phân tích thất bại");
      return null;
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setTimeout(() => setLoading(false), 200);
    }
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");
  const [imgResult, setImgResult] = useState<Awaited<ReturnType<typeof analyzeImage>> | null>(null);

  const videoRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoResult, setVideoResult] = useState<Awaited<ReturnType<typeof analyzeVideo>> | null>(null);


  const [url, setUrl] = useState("");
  const [linkResult, setLinkResult] = useState<Awaited<ReturnType<typeof analyzeLink>> | null>(null);

  const [text, setText] = useState("");
  const [textResult, setTextResult] = useState<Awaited<ReturnType<typeof analyzeText>> | null>(null);

  const [email, setEmail] = useState("");
  const [emailResult, setEmailResult] = useState<Awaited<ReturnType<typeof analyzeEmail>> | null>(null);

  const [news, setNews] = useState("");
  const [newsResult, setNewsResult] = useState<Awaited<ReturnType<typeof analyzeNews>> | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
  }, [navigate]);

  function pickVideo(f: File) {
    if (!f.type.startsWith("video/")) {
      setError("Chỉ nhận tệp video.");
      return;
    }
    if (f.size > MAX_VID) {
      setError("Video quá lớn (tối đa 60MB).");
      return;
    }
    setError(null);
    setVideoResult(null);
    setVideoFile(f);
    setVideoUrl(URL.createObjectURL(f));
  }

  function readFile(f: File) {

    if (!f.type.startsWith("image/")) {
      setError("Chỉ nhận tệp ảnh.");
      return;
    }
    if (f.size > MAX_IMG) {
      setError("Ảnh quá lớn (tối đa 5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setImgResult(null);
      setPreview(String(reader.result || ""));
    };
    reader.readAsDataURL(f);
  }

  function onPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) {
          e.preventDefault();
          readFile(f);
          return;
        }
      }
    }
    const t = e.clipboardData.getData("text");
    if (t && /^https?:\/\//.test(t.trim())) {
      e.preventDefault();
      setPreview(t.trim());
      setImgResult(null);
    }
  }

  async function doImage() {
    if (!preview) {
      setError("Hãy dán hoặc tải một ảnh lên trước.");
      return;
    }
    setImgResult(null);
    const r = await withProgress(
      ["Đang tải ảnh lên...", "Đang soi chi tiết ảnh...", "Đang đối chiếu dấu hiệu AI...", "Đang chấm điểm..."],
      () => runImage({ data: { imageUrl: preview } }),
    );
    if (r) setImgResult(r);
  }
  async function doVideo() {
    if (!videoFile) {
      setError("Hãy chọn một video trước.");
      return;
    }
    setVideoResult(null);
    const r = await withProgress(
      ["Đang đọc video...", "Đang trích khung hình...", "Đang soi từng khung hình...", "Đang chấm điểm..."],
      async (report) => {
        const frames = await extractFrames(videoFile, 4, (done, total) => {
          report(5 + (done / total) * 35, `Đang trích khung hình ${done}/${total}...`);
        });
        report(45, "Đang gửi khung hình cho AI phân tích...");
        return runVideo({ data: { frames } });
      },
    );
    if (r) setVideoResult(r);
  }
  async function doLink() {
    setLinkResult(null);
    const r = await withProgress(
      ["Đang đọc đường link...", "Đang kiểm tra tên miền...", "Đang dò dấu hiệu lừa đảo...", "Đang chấm điểm rủi ro..."],
      () => runLink({ data: { url } }),
    );
    if (r) setLinkResult(r);
  }
  async function doText() {
    setTextResult(null);
    const r = await withProgress(
      ["Đang đọc văn bản...", "Đang phân tích văn phong...", "Đang so sánh mẫu văn AI...", "Đang chấm điểm..."],
      () => runText({ data: { text } }),
    );
    if (r) setTextResult(r);
  }
  async function doEmail() {
    setEmailResult(null);
    const r = await withProgress(
      ["Đang đọc email...", "Đang kiểm tra người gửi...", "Đang dò dấu hiệu phishing...", "Đang chấm điểm..."],
      () => runEmail({ data: { content: email } }),
    );
    if (r) setEmailResult(r);
  }
  async function doNews() {
    setNewsResult(null);
    const r = await withProgress(
      ["Đang đọc bản tin...", "Đang kiểm tra nguồn tin...", "Đang đối chiếu dấu hiệu tin giả...", "Đang chấm điểm..."],
      () => runNews({ data: { content: news } }),
    );
    if (r) setNewsResult(r);
  }


  if (!user) return null;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "image", icon: "🖼️", label: "Ảnh có phải AI?" },
    { id: "video", icon: "🎬", label: "Video có phải AI?" },
    { id: "link", icon: "🔗", label: "Link có độc hại?" },
    { id: "text", icon: "📝", label: "Văn bản có phải AI?" },
    { id: "email", icon: "✉️", label: "Email có giả mạo?" },
    { id: "news", icon: "📰", label: "Tin tức có phải giả?" },
  ];

  return (
    <GameLayout showBack>
      <div className="flex-1 flex justify-center p-3 sm:p-4 pt-16 sm:pt-20">
        <div className="glass-card w-full max-w-3xl p-4 sm:p-6">
          <div className="text-center mb-4">
            <div className="text-4xl sm:text-5xl mb-1">🤖</div>
            <h1 className="text-lg sm:text-2xl font-black">TRUNG TÂM KIỂM TRA AI</h1>
            <p className="text-xs sm:text-sm font-bold text-muted-foreground">
              Dán ảnh, video, link, văn bản, email hoặc tin tức — AI sẽ chấm mức độ giả mạo và rủi ro.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 mb-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setError(null);
                }}
                className={`rounded-xl px-2 py-2 font-black text-[10px] sm:text-xs border-2 transition ${
                  tab === t.id
                    ? "bg-gradient-to-br from-cyan-500 to-blue-700 text-white border-blue-800"
                    : "bg-background/70 border-border text-muted-foreground"
                }`}
              >
                <span className="text-base sm:text-lg block">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-3 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="mb-3">
              <AnalyzingBar percent={progress} phase={phase} />
            </div>
          )}

          {tab === "video" && (
            <div className="space-y-3">
              <div
                onClick={() => videoRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer?.files?.[0];
                  if (f) pickVideo(f);
                }}
                onDragOver={(e) => e.preventDefault()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-border p-4 text-center"
              >
                {videoUrl ? (
                  <video src={videoUrl} controls className="mx-auto max-h-64 rounded-xl" />
                ) : (
                  <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                    🎬 Bấm để chọn video · hoặc kéo thả tệp (tối đa 60MB)
                  </p>
                )}
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickVideo(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={doVideo}
                  disabled={loading || !videoFile}
                  className="toy-button toy-button-primary flex-1 !text-xs sm:!text-sm disabled:opacity-50"
                >
                  {loading ? `⏳ Đang phân tích ${Math.round(progress)}%` : "🎬 Kiểm tra video"}
                </button>
                {videoFile && (
                  <button
                    onClick={() => {
                      setVideoFile(null);
                      setVideoUrl("");
                      setVideoResult(null);
                    }}
                    className="toy-button !text-xs sm:!text-sm"
                  >
                    Xoá
                  </button>
                )}
              </div>

              {videoResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(videoResult.aiScore)}`}>
                    {VERDICT_VI[videoResult.verdict] ?? "Chưa chắc chắn"}
                  </p>
                  <Gauge value={videoResult.aiScore} label="Mức độ do AI tạo / dựng" />
                  <Gauge value={videoResult.deepfakeScore} label="Nguy cơ deepfake (hoán đổi gương mặt)" />
                  <Gauge value={videoResult.editedScore} label="Mức độ đã cắt ghép / chỉnh sửa" />
                  <Gauge value={videoResult.confidence} label="Độ tin cậy của kết luận" />
                  <p className="text-xs sm:text-sm font-bold">{videoResult.summary}</p>
                  <SignList title="Dấu hiệu của AI" items={videoResult.aiSigns} tone="bad" />
                  <SignList title="Dấu hiệu video thật" items={videoResult.realSigns} tone="good" />
                  <SignList title="Cách kiểm chứng" items={videoResult.tips} tone="info" />
                  <p className="text-[10px] font-bold text-muted-foreground">
                    * Hệ thống soi 4 khung hình đại diện — kết quả mang tính tham khảo.
                  </p>
                </div>
              )}
            </div>
          )}



          {tab === "image" && (
            <div className="space-y-3">
              <div
                tabIndex={0}
                onPaste={onPaste}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer?.files?.[0];
                  if (f) readFile(f);
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-border p-4 text-center outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Ảnh cần kiểm tra"
                    className="mx-auto max-h-64 rounded-xl object-contain"
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                    📁 Bấm để chọn ảnh · hoặc Ctrl+V dán ảnh/link ảnh · hoặc kéo thả tệp
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
              <div className="flex gap-2">
                <button
                  onClick={doImage}
                  disabled={loading}
                  className="toy-button toy-button-primary flex-1 !text-xs sm:!text-sm disabled:opacity-50"
                >
                  {loading ? `⏳ Đang phân tích ${Math.round(progress)}%` : "🔍 Kiểm tra ảnh"}
                </button>
                {preview && (
                  <button
                    onClick={() => {
                      setPreview("");
                      setImgResult(null);
                    }}
                    className="toy-button !text-xs sm:!text-sm"
                  >
                    Xoá
                  </button>
                )}
              </div>

              {imgResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(imgResult.aiScore)}`}>
                    {VERDICT_VI[imgResult.verdict] ?? "Chưa chắc chắn"}
                  </p>
                  <Gauge value={imgResult.aiScore} label="Mức độ do AI tạo" />
                  <Gauge value={imgResult.editedScore} label="Mức độ đã chỉnh sửa / ghép" />
                  <Gauge value={imgResult.confidence} label="Độ tin cậy của kết luận" />
                  <p className="text-xs sm:text-sm font-bold">{imgResult.summary}</p>
                  <SignList title="Dấu hiệu của AI" items={imgResult.aiSigns} tone="bad" />
                  <SignList title="Dấu hiệu ảnh thật" items={imgResult.realSigns} tone="good" />
                  <SignList title="Nên làm gì tiếp" items={imgResult.tips} tone="info" />
                </div>
              )}
            </div>
          )}

          {tab === "link" && (
            <div className="space-y-3">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url.trim() && !loading) doLink();
                }}
                placeholder="Dán đường link cần kiểm tra, ví dụ: https://shopee-trung-thuong.xyz/nhan-qua"
                className="w-full rounded-xl border-2 border-border px-3 py-2 text-xs sm:text-sm font-bold"
              />
              <button
                onClick={doLink}
                disabled={loading || url.trim().length < 3}
                className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
              >
                {loading ? `⏳ Đang quét ${Math.round(progress)}%` : "🛡️ Quét đường link"}
              </button>

              {linkResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(linkResult.riskScore)}`}>
                    {LEVEL_VI[linkResult.level] ?? "Chưa xác định"} · {linkResult.category}
                  </p>
                  <Gauge value={linkResult.riskScore} label="Mức độ rủi ro" />
                  <p className="text-xs sm:text-sm font-bold">{linkResult.summary}</p>
                  <SignList title="Dấu hiệu nguy hiểm" items={linkResult.redFlags} tone="bad" />
                  <SignList title="Dấu hiệu an toàn" items={linkResult.goodSigns} tone="good" />
                  <SignList title="Lời khuyên" items={linkResult.advice} tone="info" />
                  <p className="text-[10px] font-bold text-muted-foreground">
                    * Kết quả mang tính tham khảo — tuyệt đối không nhập mật khẩu/OTP vào link lạ.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "text" && (
            <div className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Dán đoạn văn / bài đăng / tin nhắn cần kiểm tra (ít nhất 20 ký tự)..."
                className="w-full rounded-xl border-2 border-border px-3 py-2 text-xs sm:text-sm font-bold"
              />
              <button
                onClick={doText}
                disabled={loading || text.trim().length < 20}
                className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
              >
                {loading ? `⏳ Đang phân tích ${Math.round(progress)}%` : "🔍 Kiểm tra văn bản"}
              </button>

              {textResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(textResult.aiScore)}`}>
                    {VERDICT_VI[textResult.verdict] ?? "Chưa chắc chắn"}
                  </p>
                  <Gauge value={textResult.aiScore} label="Mức độ do AI viết" />
                  <Gauge value={textResult.misinfoRisk} label="Nguy cơ thông tin sai lệch" />
                  <Gauge value={textResult.confidence} label="Độ tin cậy của kết luận" />
                  <p className="text-xs sm:text-sm font-bold">{textResult.summary}</p>
                  <SignList title="Dấu hiệu của AI" items={textResult.aiSigns} tone="bad" />
                  <SignList title="Dấu hiệu do người viết" items={textResult.humanSigns} tone="good" />
                  <SignList title="Cách kiểm chứng" items={textResult.tips} tone="info" />
                </div>
              )}
            </div>
          )}

          {tab === "email" && (
            <div className="space-y-3">
              <textarea
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                rows={6}
                placeholder={
                  "Dán địa chỉ email người gửi và/hoặc nội dung email...\nVí dụ: support@shopee-vn-khuyenmai.xyz — 'Tài khoản của bạn sẽ bị khoá trong 24h, bấm vào đây để xác minh'"
                }
                className="w-full rounded-xl border-2 border-border px-3 py-2 text-xs sm:text-sm font-bold"
              />
              <button
                onClick={doEmail}
                disabled={loading || email.trim().length < 5}
                className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
              >
                {loading ? `⏳ Đang kiểm tra ${Math.round(progress)}%` : "✉️ Kiểm tra email giả mạo"}
              </button>

              {emailResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(emailResult.riskScore)}`}>
                    {LEVEL_VI[emailResult.level] ?? "Chưa xác định"} ·{" "}
                    {EMAIL_TYPE_VI[emailResult.type] ?? emailResult.type}
                  </p>
                  {emailResult.impersonating && (
                    <p className="text-center text-xs sm:text-sm font-black text-red-600">
                      ⚠️ Có dấu hiệu giả mạo: {emailResult.impersonating}
                    </p>
                  )}
                  <Gauge value={emailResult.riskScore} label="Mức độ giả mạo / lừa đảo" />
                  <p className="text-xs sm:text-sm font-bold">{emailResult.summary}</p>
                  <SignList title="Dấu hiệu giả mạo" items={emailResult.redFlags} tone="bad" />
                  <SignList title="Dấu hiệu đáng tin" items={emailResult.goodSigns} tone="good" />
                  <SignList title="Nên làm gì" items={emailResult.advice} tone="info" />
                  <p className="text-[10px] font-bold text-muted-foreground">
                    * Không bao giờ trả lời email lạ bằng mật khẩu, mã OTP hay số thẻ ngân hàng.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "news" && (
            <div className="space-y-3">
              <textarea
                value={news}
                onChange={(e) => setNews(e.target.value)}
                rows={6}
                placeholder="Dán tiêu đề, nội dung bản tin hoặc link bài báo cần kiểm chứng..."
                className="w-full rounded-xl border-2 border-border px-3 py-2 text-xs sm:text-sm font-bold"
              />
              <button
                onClick={doNews}
                disabled={loading || news.trim().length < 15}
                className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
              >
                {loading ? `⏳ Đang kiểm chứng ${Math.round(progress)}%` : "📰 Kiểm tra tin giả"}
              </button>

              {newsResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(newsResult.fakeScore)}`}>
                    {NEWS_VERDICT_VI[newsResult.verdict] ?? "Chưa kiểm chứng được"} · {newsResult.category}
                  </p>
                  <Gauge value={newsResult.fakeScore} label="Mức độ là tin giả / sai lệch" />
                  <p className="text-xs sm:text-sm font-bold">{newsResult.summary}</p>
                  <SignList title="Dấu hiệu tin giả" items={newsResult.redFlags} tone="bad" />
                  <SignList title="Dấu hiệu đáng tin" items={newsResult.goodSigns} tone="good" />
                  <SignList title="Cách tự kiểm chứng" items={newsResult.checkSteps} tone="info" />
                  <p className="text-[10px] font-bold text-muted-foreground">
                    * Luôn đối chiếu với báo chính thống trước khi chia sẻ.
                  </p>
                </div>
              )}
            </div>
          )}



          <div className="mt-5 flex gap-2 justify-center flex-wrap">
            <Link to="/experience" className="toy-button !text-xs sm:!text-sm">
              ↩ Quay lại trải nghiệm
            </Link>
            <Link to="/play" className="toy-button toy-button-primary !text-xs sm:!text-sm">
              🎮 Vào trò chơi
            </Link>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
