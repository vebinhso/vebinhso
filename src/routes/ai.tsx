import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { SocialSimulator } from "@/components/SocialSimulator";
import RouteLoading from "@/components/RouteLoading";
import { useLocale } from "@/lib/locale";

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
  analyzePrivacyMedia,
  analyzePrivacyText,
  analyzePhone,
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

type Tab = "news" | "media" | "link" | "email" | "text" | "risk" | "phone";

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
        <span className="text-xs font-black text-foreground">{label}</span>
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

/** Ghi chú sai số: kết quả đã được đối chiếu chéo giữa 2 mô hình AI */
function AccuracyNote({
  accuracy,
}: {
  accuracy?: { margin: number; within: boolean; crossChecked: boolean; models: string[]; note: string } | null;
}) {
  if (!accuracy) return null;
  const ok = accuracy.within;
  return (
    <div
      className={`rounded-2xl border-2 p-3 ${
        ok ? "border-emerald-400 bg-emerald-50/70" : "border-amber-400 bg-amber-50/70"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-xs sm:text-sm font-black ${ok ? "text-emerald-800" : "text-amber-800"}`}>
          {ok ? "✅ ĐỘ TIN CẬY ĐẠT CHUẨN" : "⚠️ SAI SỐ VƯỢT NGƯỠNG"}
        </span>
        <span className={`text-xl font-black ${ok ? "text-emerald-700" : "text-amber-700"}`}>
          ±{accuracy.margin}%
        </span>
      </div>
      <p className="mt-1 text-xs sm:text-sm font-bold text-foreground">{accuracy.note}</p>
      <p className="mt-1 text-[11px] font-bold text-foreground/80">
        Nguồn đối chiếu: {accuracy.models.join(" + ")} · Ngưỡng cho phép: ±5% · Nên kiểm chứng lại bằng Google và báo
        chính thống.
      </p>
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
      <ul className="text-xs sm:text-sm font-bold text-foreground space-y-1 list-disc pl-5">
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
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-2 border-border bg-background/60 px-3 py-2">
      <p className="text-[10px] font-black text-muted-foreground">{label}</p>
      <p className="text-xs sm:text-sm font-black break-words">{value}</p>
    </div>
  );
}

const PHONE_TYPE_VI: Record<string, string> = {
  scam: "Có dấu hiệu lừa đảo",
  spam: "Làm phiền / spam",
  telesales: "Bán hàng qua điện thoại",
  service: "Tổng đài dịch vụ",
  personal: "Số cá nhân",
  legit: "Số hợp lệ, bình thường",
  unknown: "Chưa rõ",
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

const SEV_BORDER: Record<string, string> = {
  low: "border-amber-400",
  medium: "border-orange-500",
  high: "border-red-600",
};
const SEV_BG: Record<string, string> = {
  low: "bg-amber-500",
  medium: "bg-orange-600",
  high: "bg-red-600",
};
const SEV_TEXT: Record<string, string> = {
  low: "text-amber-600",
  medium: "text-orange-600",
  high: "text-red-600",
};

/** Tô sáng các đoạn chữ nhạy cảm trong văn bản gốc */
function highlightText(
  source: string,
  findings: { quote: string; severity: string }[],
): React.ReactNode[] {
  const marks: { start: number; end: number; sev: string; idx: number }[] = [];
  findings.forEach((f, idx) => {
    const at = source.indexOf(f.quote);
    if (at >= 0 && f.quote) marks.push({ start: at, end: at + f.quote.length, sev: f.severity, idx });
  });
  marks.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let cur = 0;
  for (const m of marks) {
    if (m.start < cur) continue;
    if (m.start > cur) out.push(source.slice(cur, m.start));
    out.push(
      <mark
        key={`${m.idx}-${m.start}`}
        className={`rounded px-1 text-white ${SEV_BG[m.sev] ?? "bg-orange-600"}`}
      >
        {source.slice(m.start, m.end)}
        <sup className="ml-0.5 text-[9px]">{m.idx + 1}</sup>
      </mark>,
    );
    cur = m.end;
  }
  if (cur < source.length) out.push(source.slice(cur));
  return out;
}

function AiPage() {
  const en = useLocale() === "en";
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [section, setSection] = useState<"check" | "social">("check");
  const [tab, setTab] = useState<Tab>("news");

  const [mediaMode, setMediaMode] = useState<"image" | "video">("image");
  const [riskMode, setRiskMode] = useState<"image" | "video" | "text">("image");
  const [phishMode, setPhishMode] = useState<"link" | "email">("link");
  const [riskSection, setRiskSection] = useState<"classic" | "social">("classic");

  const runImage = useServerFn(analyzeImage);
  const runLink = useServerFn(analyzeLink);
  const runText = useServerFn(analyzeText);
  const runEmail = useServerFn(analyzeEmail);
  const runNews = useServerFn(analyzeNews);
  const runVideo = useServerFn(analyzeVideo);
  const runPrivacyMedia = useServerFn(analyzePrivacyMedia);
  const runPrivacyText = useServerFn(analyzePrivacyText);
  const runPhone = useServerFn(analyzePhone);

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
      setLoading(false);
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

  const riskFileRef = useRef<HTMLInputElement>(null);
  const [riskImages, setRiskImages] = useState<string[]>([]);
  const [riskVideoFile, setRiskVideoFile] = useState<File | null>(null);
  const [riskVideoUrl, setRiskVideoUrl] = useState("");
  const [riskText, setRiskText] = useState("");
  const [riskMediaResult, setRiskMediaResult] = useState<Awaited<ReturnType<typeof analyzePrivacyMedia>> | null>(null);
  const [riskTextResult, setRiskTextResult] = useState<Awaited<ReturnType<typeof analyzePrivacyText>> | null>(null);

  const [phone, setPhone] = useState("");
  const [phoneCtx, setPhoneCtx] = useState("");
  const [phoneResult, setPhoneResult] = useState<Awaited<ReturnType<typeof analyzePhone>> | null>(null);

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
  async function doPhone() {
    setPhoneResult(null);
    const r = await withProgress(
      ["Đang chuẩn hoá số...", "Đang tra cứu nhà mạng...", "Đang xác định vùng gọi...", "Đang chấm điểm rủi ro..."],
      () => runPhone({ data: { phone, context: phoneCtx } }),
    );
    if (r) setPhoneResult(r);
  }
  async function doNews() {
    setNewsResult(null);
    const r = await withProgress(
      ["Đang đọc bản tin...", "Đang kiểm tra nguồn tin...", "Đang đối chiếu dấu hiệu tin giả...", "Đang chấm điểm..."],
      () => runNews({ data: { content: news } }),
    );
    if (r) setNewsResult(r);
  }

  async function doRiskMedia() {
    setRiskMediaResult(null);
    if (riskMode === "image") {
      if (!riskImages.length) {
        setError("Hãy chọn hoặc dán một ảnh trước.");
        return;
      }
      const r = await withProgress(
        ["Đang tải ảnh lên...", "Đang soi chi tiết ảnh...", "Đang tìm thông tin nhạy cảm...", "Đang chấm rủi ro..."],
        () => runPrivacyMedia({ data: { images: riskImages } }),
      );
      if (r) setRiskMediaResult(r);
      return;
    }
    if (!riskVideoFile) {
      setError("Hãy chọn một video trước.");
      return;
    }
    const r = await withProgress(
      ["Đang đọc video...", "Đang trích khung hình...", "Đang tìm thông tin nhạy cảm...", "Đang chấm rủi ro..."],
      async (report) => {
        const frames = await extractFrames(riskVideoFile, 4, (done, total) => {
          report(5 + (done / total) * 35, `Đang trích khung hình ${done}/${total}...`);
        });
        setRiskImages(frames);
        report(45, "Đang gửi khung hình cho AI phân tích...");
        return runPrivacyMedia({ data: { images: frames } });
      },
    );
    if (r) setRiskMediaResult(r);
  }

  async function doRiskText() {
    setRiskTextResult(null);
    const r = await withProgress(
      ["Đang đọc văn bản...", "Đang tìm thông tin cá nhân...", "Đang đánh giá nguy cơ...", "Đang chấm rủi ro..."],
      () => runPrivacyText({ data: { text: riskText } }),
    );
    if (r) setRiskTextResult(r);
  }

  function pickRiskFile(f: File) {
    setError(null);
    setRiskMediaResult(null);
    if (riskMode === "image") {
      if (!f.type.startsWith("image/")) return setError("Chỉ nhận tệp ảnh.");
      if (f.size > MAX_IMG) return setError("Ảnh quá lớn (tối đa 5MB).");
      const reader = new FileReader();
      reader.onload = () => setRiskImages([String(reader.result || "")]);
      reader.readAsDataURL(f);
      return;
    }
    if (!f.type.startsWith("video/")) return setError("Chỉ nhận tệp video.");
    if (f.size > MAX_VID) return setError("Video quá lớn (tối đa 60MB).");
    setRiskImages([]);
    setRiskVideoFile(f);
    setRiskVideoUrl(URL.createObjectURL(f));
  }

  function onRiskPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it && it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) {
          e.preventDefault();
          pickRiskFile(f);
          return;
        }
      }
    }
  }


  if (!user) return <RouteLoading />;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "news", icon: "📰", label: en ? "Is this news fake?" : "Tin tức có phải giả?" },
    { id: "media", icon: "🖼️", label: en ? "Is this image/video AI?" : "Ảnh/Video có phải AI?" },
    { id: "link", icon: "🔗", label: en ? "Is this link/email fake?" : "Link / Email có giả mạo?" },
    { id: "text", icon: "📝", label: en ? "Was this text written by AI?" : "Văn bản có phải AI?" },
    { id: "phone", icon: "📞", label: en ? "Phone number" : "Số điện thoại" },
  ];

  return (
    <GameLayout showBack>
      <div className="flex-1 flex justify-center p-3 sm:p-4 pt-16 sm:pt-20">
        <div className="glass-card w-full max-w-3xl p-4 sm:p-6">
          <div className="text-center mb-4">
            <div className="text-4xl sm:text-5xl mb-1">🤖</div>
            <h1 className="text-lg sm:text-2xl font-black">{en ? "AI CENTER" : "TRUNG TÂM AI"}</h1>
            <p className="text-xs sm:text-sm font-bold text-foreground">
              {en ? "Check authenticity and detect privacy risks before posting online." : "Kiểm tra thật – giả, và soi rủi ro lộ thông tin trước khi đăng lên mạng."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {(
              [
                { id: "check", icon: "🔍", label: en ? "Real vs fake" : "Thật vs giả" },
                { id: "social", icon: "🛡️", label: en ? "Privacy risks" : "Rủi ro lộ thông tin" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSection(s.id);
                  setError(null);
                }}
                className={`rounded-2xl px-3 py-2 font-black text-xs sm:text-sm border-2 transition ${
                  section === s.id
                    ? "bg-gradient-to-br from-fuchsia-500 to-indigo-700 text-white border-indigo-800"
                    : "bg-background/70 border-border text-foreground"
                }`}
              >
                <span className="text-lg sm:text-xl block">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {section === "social" && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(
                [
                  { id: "classic", icon: "🧰", label: en ? "Classic tools" : "Truyền thống" },
                  { id: "social", icon: "📱", label: en ? "Social media simulator" : "Mô phỏng Mạng xã hội" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setRiskSection(s.id);
                    setError(null);
                  }}
                  className={`rounded-xl px-2 py-2 font-black text-[11px] sm:text-sm border-2 transition ${
                    riskSection === s.id
                      ? "bg-amber-500/20 border-amber-500 text-amber-800"
                      : "bg-background/60 border-border text-foreground"
                  }`}
                >
                  <span className="text-base sm:text-lg block">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {section === "social" && riskSection === "social" && (
            <div className="space-y-3">
              <p className="text-xs sm:text-sm font-bold text-foreground">
                {en ? "This is a simulated Facebook page. Compose a post and choose an image; before publishing, AI scans for exposed addresses, schools, birthdays, health details, or daily routines." : "Đây là trang Facebook giả lập. Hãy thử soạn bài và chọn ảnh — trước khi bài được đăng, AI sẽ quét xem ảnh và nội dung có lộ địa chỉ nhà, trường lớp, ngày sinh, nhóm máu, chỉ số sức khoẻ hay lịch trình hằng ngày của bạn không."}
              </p>
              <SocialSimulator />
            </div>
          )}

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

          {section === "check" && (
          <>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-4">
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
                    : "bg-background/70 border-border text-foreground"
                }`}
              >
                <span className="text-base sm:text-lg block">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {!loading && (() => {
            const acc =
              tab === "news"
                ? newsResult?.accuracy
                : tab === "media"
                  ? mediaMode === "image"
                    ? imgResult?.accuracy
                    : videoResult?.accuracy
                  : tab === "link"
                    ? phishMode === "link"
                      ? linkResult?.accuracy
                      : emailResult?.accuracy
                    : tab === "phone"
                      ? phoneResult?.accuracy
                      : textResult?.accuracy;
            return acc ? (
              <div className="mb-3">
                <AccuracyNote accuracy={acc} />
              </div>
            ) : null;
          })()}


          {tab === "media" && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {([
                { id: "image", label: "🖼️ Kiểm tra ảnh" },
                { id: "video", label: "🎬 Kiểm tra video" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMediaMode(m.id);
                    setError(null);
                  }}
                  className={`rounded-xl px-2 py-1.5 text-[11px] sm:text-sm font-black border-2 transition ${
                    mediaMode === m.id
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-800"
                      : "bg-background/60 border-border text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {tab === "media" && mediaMode === "video" && (
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
                  <p className="text-xs sm:text-sm font-bold text-foreground">
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
                  <p className="text-[10px] font-bold text-foreground">
                    * Hệ thống soi 4 khung hình đại diện — kết quả mang tính tham khảo.
                  </p>
                </div>
              )}
            </div>
          )}



          {tab === "media" && mediaMode === "image" && (
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
                  <p className="text-xs sm:text-sm font-bold text-foreground">
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
                  <Gauge value={imgResult.editedScore} label="Mức độ đã chỉnh sửa / ghép (Photoshop)" />
                  <Gauge value={imgResult.confidence} label="Độ tin cậy của kết luận" />
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-black">
                      🧩 Độ khó nhận biết: {imgResult.difficulty}
                    </span>
                    {imgResult.aiCategoryLabel && (
                      <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-1 text-[11px] font-black">
                        🤖 Nhóm ảnh AI: {imgResult.aiCategoryLabel}
                      </span>
                    )}
                    {imgResult.editCategoryLabel && (
                      <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-1 text-[11px] font-black">
                        ✂️ Nhóm chỉnh sửa: {imgResult.editCategoryLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-bold">{imgResult.summary}</p>
                  <SignList title="Dấu hiệu của AI" items={imgResult.aiSigns} tone="bad" />
                  <SignList title="Dấu hiệu chỉnh sửa Photoshop" items={imgResult.editSigns} tone="bad" />
                  <SignList title="Dấu hiệu ảnh thật" items={imgResult.realSigns} tone="good" />
                  <SignList title="Nên làm gì tiếp" items={imgResult.tips} tone="info" />
                </div>
              )}
            </div>
          )}

          {tab === "link" && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {([
                { id: "link", label: "🔗 Kiểm tra link" },
                { id: "email", label: "✉️ Kiểm tra email" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setPhishMode(m.id);
                    setError(null);
                  }}
                  className={`rounded-xl px-2 py-1.5 text-[11px] sm:text-sm font-black border-2 transition ${
                    phishMode === m.id
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-800"
                      : "bg-background/60 border-border text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {tab === "link" && phishMode === "link" && (
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
                  <p className="text-[10px] font-bold text-foreground">
                    * Kết quả mang tính tham khảo — tuyệt đối không nhập mật khẩu/OTP vào link lạ.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "phone" && (
            <div className="space-y-3">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại, ví dụ 0912345678 hoặc +84 24 3825 xxxx"
                className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm font-bold"
              />
              <textarea
                value={phoneCtx}
                onChange={(e) => setPhoneCtx(e.target.value)}
                rows={3}
                placeholder="(Không bắt buộc) Họ nói gì với bạn? Ví dụ: tự xưng công an, báo bạn liên quan vụ án..."
                className="w-full rounded-xl border-2 border-border px-3 py-2 text-xs sm:text-sm font-bold"
              />
              <button
                onClick={doPhone}
                disabled={loading || phone.replace(/\D/g, "").length < 6}
                className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
              >
                {loading ? `⏳ Đang kiểm tra ${Math.round(progress)}%` : "📞 Kiểm tra số điện thoại"}
              </button>

              {phoneResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(phoneResult.riskScore)}`}>
                    {LEVEL_VI[phoneResult.level] ?? "Chưa xác định"} · {PHONE_TYPE_VI[phoneResult.type] ?? phoneResult.type}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoCell label="📱 Nhà mạng / loại số" value={phoneResult.lookup.carrier} />
                    <InfoCell label="🌐 Nguồn gốc số" value={phoneResult.origin || phoneResult.lookup.note} />
                    <InfoCell label="📍 Gọi đến từ" value={phoneResult.locationGuess || phoneResult.lookup.province} />
                    <InfoCell label="🔢 Dạng quốc tế" value={phoneResult.lookup.e164} />
                    <InfoCell
                      label="✅ Định dạng số"
                      value={phoneResult.lookup.valid ? "Hợp lệ tại Việt Nam" : "Không khớp đầu số hợp lệ"}
                    />
                    {phoneResult.strangerNote && (
                      <InfoCell label="❓ Số lạ?" value={phoneResult.strangerNote} />
                    )}
                  </div>
                  {phoneResult.scamCategoryLabel && (
                    <p className="text-[11px] sm:text-xs font-black text-destructive">
                      🎣 Kịch bản thường gặp: {phoneResult.scamCategoryLabel}
                    </p>
                  )}
                  <Gauge value={phoneResult.riskScore} label="Nguy cơ lừa đảo" />
                  <Gauge value={phoneResult.fakeScore} label="Khả năng là số giả / số ảo" />
                  <p className="text-xs sm:text-sm font-bold">{phoneResult.summary}</p>
                  <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">{phoneResult.lookup.note}</p>
                  <p className="text-[11px] sm:text-xs font-bold text-muted-foreground">
                    🚨 Đã có ai bị lừa từ số này chưa? {phoneResult.reportNote}
                  </p>
                  <SignList title="Dấu hiệu đáng ngờ" items={phoneResult.redFlags} tone="bad" />
                  <SignList title="Dấu hiệu bình thường" items={phoneResult.goodSigns} tone="good" />
                  <SignList title="Nên làm gì" items={phoneResult.advice} tone="info" />
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
                  <Gauge value={textResult.misinfoRisk} label="Nguy cơ lừa đảo / thông tin sai lệch" />
                  <Gauge value={textResult.confidence} label="Độ tin cậy của kết luận" />
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-black">
                      🧩 Độ khó nhận biết: {textResult.difficulty}
                    </span>
                    {textResult.scamCategoryLabel && (
                      <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-1 text-[11px] font-black">
                        🎣 Kịch bản lừa đảo: {textResult.scamCategoryLabel}
                      </span>
                    )}
                    {textResult.platform && (
                      <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-1 text-[11px] font-black">
                        📱 Thường gặp trên: {textResult.platform}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-bold">{textResult.summary}</p>
                  <SignList title="Dấu hiệu lừa đảo" items={textResult.scamSigns} tone="bad" />
                  <SignList title="Dấu hiệu của AI" items={textResult.aiSigns} tone="bad" />
                  <SignList title="Dấu hiệu do người viết" items={textResult.humanSigns} tone="good" />
                  <SignList title="Cách kiểm chứng" items={textResult.tips} tone="info" />
                </div>
              )}
            </div>
          )}

          {tab === "link" && phishMode === "email" && (
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
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-black">
                      🧩 Độ khó nhận biết: {emailResult.difficulty}
                    </span>
                    {emailResult.scamCategoryLabel && (
                      <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-1 text-[11px] font-black">
                        🎣 Kịch bản: {emailResult.scamCategoryLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-bold">{emailResult.summary}</p>
                  <SignList title="Dấu hiệu giả mạo" items={emailResult.redFlags} tone="bad" />
                  <SignList title="Dấu hiệu đáng tin" items={emailResult.goodSigns} tone="good" />
                  <SignList title="Nên làm gì" items={emailResult.advice} tone="info" />
                  <p className="text-[10px] font-bold text-foreground">
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
                placeholder='Hỏi thử: "Có thật là ... không?" hoặc dán tiêu đề, nội dung tin, link bài báo...'
                className="w-full rounded-xl border-2 border-border px-3 py-2 text-xs sm:text-sm font-bold"
              />
              <p className="text-[10px] font-bold text-foreground">
                🔄 Hệ thống tự đối chiếu tin mới nhất mỗi ngày từ Google Tin tức, VnExpress, Tuổi Trẻ, Thanh Niên để xem
                tin đã được kiểm chứng ở đâu chưa.
              </p>
              <button
                onClick={doNews}
                disabled={loading || news.trim().length < 15}
                className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
              >
                {loading ? `⏳ Đang kiểm chứng ${Math.round(progress)}%` : "📰 Hỏi & kiểm chứng tin"}
              </button>

              {newsResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <div
                    className={`rounded-xl border-2 p-3 ${
                      newsResult.verified
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-red-500 bg-red-500/10"
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-black">
                      {newsResult.verified
                        ? `✅ ĐÃ ĐƯỢC KIỂM CHỨNG bởi: ${newsResult.verifiedBy.join(", ")}`
                        : "⚠️ THÔNG TIN CHƯA ĐƯỢC KIỂM CHỨNG — chưa có báo chính thống nào xác nhận. Đừng vội tin hay chia sẻ!"}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm font-bold">{newsResult.answer}</p>
                  </div>
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(newsResult.fakeScore)}`}>
                    {NEWS_VERDICT_VI[newsResult.verdict] ?? "Chưa kiểm chứng được"} · {newsResult.category}
                  </p>
                  <Gauge value={newsResult.fakeScore} label="Mức độ là tin giả / sai lệch" />
                  <Gauge value={newsResult.tabloidScore} label="Mức độ lá cải / tin đồn truyền miệng" />
                  <p className="text-xs sm:text-sm font-bold">{newsResult.summary}</p>

                  {newsResult.matchedNews.length > 0 && (
                    <SignList title="Báo chính thống có đưa tin tương tự" items={newsResult.matchedNews} tone="good" />
                  )}
                  <SignList title="Dấu hiệu tin giả / lá cải" items={newsResult.redFlags} tone="bad" />
                  <SignList title="Dấu hiệu đáng tin" items={newsResult.goodSigns} tone="good" />
                  <SignList title="Cách tự kiểm chứng" items={newsResult.checkSteps} tone="info" />
                  {newsResult.sources.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-black">
                        📚 Tin mới nhất đã đối chiếu ({newsResult.checkedAt})
                      </p>
                      {newsResult.sources.map((s, i) => (
                        <a
                          key={i}
                          href={s.link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block text-[10px] font-bold text-primary underline break-words"
                        >
                          [{s.source}] {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-foreground">
                    * Luôn đối chiếu với báo chính thống trước khi chia sẻ.
                  </p>
                </div>
              )}

            </div>
          )}
          </>
          )}

          {section === "social" && riskSection === "classic" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "image", label: "🖼️ Ảnh" },
                  { id: "video", label: "🎬 Video" },
                  { id: "text", label: "📝 Văn bản" },
                ] as const).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setRiskMode(m.id);
                      setError(null);
                    }}
                    className={`rounded-xl px-2 py-1.5 text-[11px] sm:text-sm font-black border-2 transition ${
                      riskMode === m.id
                        ? "bg-amber-500/20 border-amber-500 text-amber-800"
                        : "bg-background/60 border-border text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-foreground">
                🛡️ Dán ảnh, video hoặc văn bản — hệ thống chấm % rủi ro bị lộ thông tin cá nhân nếu đăng công khai, và
                chỉ mũi tên đúng vào chỗ nguy hiểm.
              </p>

              {riskMode !== "text" ? (
                <>
                  <div
                    onClick={() => riskFileRef.current?.click()}
                    onPaste={onRiskPaste}
                    tabIndex={0}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer?.files?.[0];
                      if (f) pickRiskFile(f);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-border p-4 text-center outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {riskMode === "image" && riskImages[0] ? (
                      <img src={riskImages[0]} alt="Ảnh cần kiểm tra rủi ro" className="mx-auto max-h-56 rounded-xl object-contain" />
                    ) : riskMode === "video" && riskVideoUrl ? (
                      <video src={riskVideoUrl} controls className="mx-auto max-h-56 rounded-xl" />
                    ) : (
                      <p className="text-xs sm:text-sm font-bold text-foreground">
                        {riskMode === "image"
                          ? "📁 Bấm để chọn ảnh · hoặc Ctrl+V dán ảnh · hoặc kéo thả"
                          : "🎬 Bấm để chọn video · hoặc kéo thả (tối đa 60MB)"}
                      </p>
                    )}
                    <input
                      ref={riskFileRef}
                      type="file"
                      accept={riskMode === "image" ? "image/*" : "video/*"}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) pickRiskFile(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <button
                    onClick={doRiskMedia}
                    disabled={loading || (riskMode === "image" ? !riskImages.length : !riskVideoFile)}
                    className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
                  >
                    {loading ? `⏳ Đang soi ${Math.round(progress)}%` : "🛡️ Chấm rủi ro lộ thông tin"}
                  </button>
                </>
              ) : (
                <>
                  <textarea
                    value={riskText}
                    onChange={(e) => setRiskText(e.target.value)}
                    rows={6}
                    placeholder="Dán bài đăng / chú thích ảnh / tin nhắn bạn định đăng công khai..."
                    className="w-full rounded-xl border-2 border-border px-3 py-2 text-xs sm:text-sm font-bold"
                  />
                  <button
                    onClick={doRiskText}
                    disabled={loading || riskText.trim().length < 10}
                    className="toy-button toy-button-primary w-full !text-xs sm:!text-sm disabled:opacity-50"
                  >
                    {loading ? `⏳ Đang soi ${Math.round(progress)}%` : "🛡️ Chấm rủi ro lộ thông tin"}
                  </button>
                </>
              )}

              {riskMode !== "text" && riskMediaResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(riskMediaResult.riskScore)}`}>
                    {LEVEL_VI[riskMediaResult.level] ?? "Chưa xác định"}
                  </p>
                  <Gauge value={riskMediaResult.riskScore} label="Rủi ro bị lộ thông tin nếu đăng công khai" />
                  <p className="text-xs sm:text-sm font-bold">{riskMediaResult.summary}</p>

                  <div className="space-y-3">
                    {riskImages.map((src, fi) => {
                      const boxes = riskMediaResult.findings
                        .map((f, gi) => ({ ...f, gi }))
                        .filter((f) => f.frame === fi);
                      if (riskImages.length > 1 && !boxes.length) return null;
                      return (
                        <div key={fi} className="relative inline-block w-full">
                          <img src={src} alt={`Khung hình ${fi + 1}`} className="w-full rounded-xl" />
                          {boxes.map((b) => (
                            <div
                              key={b.gi}
                              className="absolute"
                              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                            >
                              <div className={`h-full w-full rounded-md border-2 ${SEV_BORDER[b.severity]}`} />
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
                                <span
                                  className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] sm:text-[11px] font-black text-white shadow ${SEV_BG[b.severity]}`}
                                >
                                  {b.gi + 1}. {b.label}
                                </span>
                                <span className={`text-[10px] leading-none ${SEV_TEXT[b.severity]}`}>▼</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {riskMediaResult.findings.length > 0 && (
                    <div className="space-y-1.5">
                      {riskMediaResult.findings.map((f, i) => (
                        <div key={i} className="rounded-xl border-2 border-border/60 p-2">
                          <p className="text-xs font-black">
                            <span className={SEV_TEXT[f.severity]}>➡ {i + 1}. {f.label}</span>
                          </p>
                          {f.detail && (
                            <p className="text-[11px] sm:text-xs font-bold text-foreground">{f.detail}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <SignList title="Điều bạn đã làm tốt" items={riskMediaResult.safeSigns} tone="good" />
                  <SignList title="Nên che / xoá trước khi đăng" items={riskMediaResult.advice} tone="info" />
                  <p className="text-[10px] font-bold text-foreground">
                    * Vị trí khoanh vùng do AI ước lượng — có thể lệch đôi chút.
                  </p>
                </div>
              )}

              {riskMode === "text" && riskTextResult && (
                <div className="space-y-3 rounded-2xl border-2 border-border p-3">
                  <p className={`text-center font-black text-sm sm:text-lg ${scoreText(riskTextResult.riskScore)}`}>
                    {LEVEL_VI[riskTextResult.level] ?? "Chưa xác định"}
                  </p>
                  <Gauge value={riskTextResult.riskScore} label="Rủi ro bị lộ thông tin nếu đăng công khai" />
                  <p className="text-xs sm:text-sm font-bold">{riskTextResult.summary}</p>

                  <div className="rounded-xl border-2 border-border/60 p-3 text-xs sm:text-sm font-bold leading-relaxed whitespace-pre-wrap">
                    {highlightText(riskText, riskTextResult.findings)}
                  </div>

                  {riskTextResult.findings.length > 0 && (
                    <div className="space-y-1.5">
                      {riskTextResult.findings.map((f, i) => (
                        <div key={i} className="rounded-xl border-2 border-border/60 p-2">
                          <p className="text-xs font-black">
                            <span className={SEV_TEXT[f.severity]}>➡ {i + 1}. {f.label}</span>{" "}
                            <span className="text-foreground">“{f.quote}”</span>
                          </p>
                          {f.detail && (
                            <p className="text-[11px] sm:text-xs font-bold text-foreground">{f.detail}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {riskTextResult.safeVersion && (
                    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/60 p-3">
                      <p className="text-xs font-black mb-1">✅ Bản viết lại an toàn hơn</p>
                      <p className="text-xs sm:text-sm font-bold whitespace-pre-wrap">{riskTextResult.safeVersion}</p>
                    </div>
                  )}
                  <SignList title="Điều bạn đã làm tốt" items={riskTextResult.safeSigns} tone="good" />
                  <SignList title="Nên sửa trước khi đăng" items={riskTextResult.advice} tone="info" />
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
