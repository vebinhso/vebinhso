import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzePrivacyMedia, analyzePrivacyText } from "@/lib/ai-detect.functions";

type MediaResult = Awaited<ReturnType<typeof analyzePrivacyMedia>>;
type TextResult = Awaited<ReturnType<typeof analyzePrivacyText>>;

type Post = {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
  image?: string;
  likes: number;
  comments: number;
  liked?: boolean;
  riskScore?: number;
};

const MAX_IMG = 5 * 1024 * 1024;

const SEED: Post[] = [
  {
    id: "s1",
    author: "Minh Anh",
    avatar: "🦊",
    time: "2 giờ trước",
    text: "Hôm nay lớp mình trồng cây ở sân trường, vui ghê! 🌱",
    likes: 42,
    comments: 8,
  },
  {
    id: "s2",
    author: "Bảo Nam",
    avatar: "🐼",
    time: "5 giờ trước",
    text: "Ai có mẹo học từ vựng nhanh không, chỉ mình với 😅",
    likes: 17,
    comments: 23,
  },
  {
    id: "s3",
    author: "Vệ Binh Số",
    avatar: "🛡️",
    time: "Hôm qua",
    text: "Mẹo an toàn: trước khi đăng ảnh, hãy soi kỹ xem có lộ địa chỉ nhà, tên trường, thời khoá biểu hay giấy tờ nào không nhé!",
    likes: 128,
    comments: 15,
  },
];

const sevColor = (s: string) =>
  s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#22c55e";

const levelText = (score: number) =>
  score >= 75 ? "RẤT NGUY HIỂM" : score >= 50 ? "NGUY HIỂM" : score >= 25 ? "CẦN CÂN NHẮC" : "KHÁ AN TOÀN";

const levelColor = (score: number) =>
  score >= 75
    ? "from-red-500 to-red-700"
    : score >= 50
      ? "from-orange-500 to-red-600"
      : score >= 25
        ? "from-amber-400 to-orange-500"
        : "from-green-500 to-emerald-600";

export function SocialSimulator() {
  const runMedia = useServerFn(analyzePrivacyMedia);
  const runText = useServerFn(analyzePrivacyText);

  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [posts, setPosts] = useState<Post[]>(SEED);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaResult | null>(null);
  const [textResult, setTextResult] = useState<TextResult | null>(null);
  const [reviewing, setReviewing] = useState(false);

  function pickFile(f: File) {
    if (!f.type.startsWith("image/")) return setError("Chỉ nhận tệp ảnh.");
    if (f.size > MAX_IMG) return setError("Ảnh quá lớn (tối đa 5MB).");
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ""));
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
          pickFile(f);
          return;
        }
      }
    }
  }

  async function scanAndPost() {
    if (!text.trim() && !image) {
      setError("Hãy viết gì đó hoặc chọn một tấm ảnh trước khi đăng.");
      return;
    }
    setError(null);
    setScanning(true);
    setMediaResult(null);
    setTextResult(null);
    try {
      const [m, t] = await Promise.all([
        image ? runMedia({ data: { images: [image] } }) : Promise.resolve(null),
        text.trim().length >= 10 ? runText({ data: { text: text.trim() } }) : Promise.resolve(null),
      ]);
      setMediaResult(m);
      setTextResult(t);
      const worst = Math.max(m?.riskScore ?? 0, t?.riskScore ?? 0);
      if (worst >= 25 || (m?.findings?.length ?? 0) > 0 || (t?.findings?.length ?? 0) > 0) {
        setReviewing(true);
      } else {
        publish(worst);
      }
    } catch (e: any) {
      setError(e?.message || "Không quét được bài đăng, thử lại nhé.");
    } finally {
      setScanning(false);
    }
  }

  function publish(riskScore = 0, overrideText?: string) {
    setPosts((p) => [
      {
        id: Math.random().toString(36).slice(2),
        author: "Bạn",
        avatar: "😊",
        time: "Vừa xong",
        text: overrideText ?? text,
        ...(image ? { image } : {}),
        likes: 0,
        comments: 0,
        riskScore,
      },
      ...p,
    ]);
    setText("");
    setImage("");
    setReviewing(false);
    setMediaResult(null);
    setTextResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const worstScore = Math.max(mediaResult?.riskScore ?? 0, textResult?.riskScore ?? 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border-2 border-blue-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 flex items-center justify-between">
          <span className="text-white font-black text-lg">facebook</span>
          <span className="text-white/90 text-xs font-bold">Mô phỏng — không đăng thật</span>
        </div>

        {/* Composer */}
        <div className="p-3 border-b-8 border-blue-50" onPaste={onPaste}>
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 grid place-items-center text-xl shrink-0">😊</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Bạn đang nghĩ gì? (thử viết địa chỉ nhà, lớp, lịch học... xem AI phát hiện không)"
              className="flex-1 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none resize-none"
            />
          </div>

          {image && (
            <div className="mt-2 relative">
              <img src={image} alt="Ảnh sắp đăng" className="w-full rounded-xl border border-slate-200" />
              <button
                onClick={() => setImage("")}
                className="absolute top-2 right-2 rounded-full bg-black/70 text-white text-xs font-black px-2 py-1"
              >
                ✕ Bỏ ảnh
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800"
            >
              🖼️ Ảnh/Video
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
            <span className="text-[11px] font-bold text-slate-500">Có thể dán ảnh bằng Ctrl+V</span>
            <button
              onClick={scanAndPost}
              disabled={scanning}
              className="ml-auto rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
            >
              {scanning ? "🔎 AI đang quét ảnh..." : "Đăng bài"}
            </button>
          </div>

          {error && (
            <div className="mt-2 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Feed */}
        <div className="divide-y-8 divide-blue-50">
          {posts.map((p) => (
            <article key={p.id} className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 grid place-items-center text-xl">{p.avatar}</div>
                <div>
                  <div className="font-black text-sm text-slate-900">{p.author}</div>
                  <div className="text-[11px] font-bold text-slate-500">{p.time} · 🌐</div>
                </div>
                {typeof p.riskScore === "number" && p.riskScore >= 25 && (
                  <span className="ml-auto rounded-full bg-red-100 text-red-700 text-[10px] font-black px-2 py-1">
                    ⚠️ Rủi ro {p.riskScore}%
                  </span>
                )}
              </div>
              {p.text && <p className="mt-2 text-sm font-semibold text-slate-900 whitespace-pre-wrap">{p.text}</p>}
              {p.image && <img src={p.image} alt="" className="mt-2 w-full rounded-xl border border-slate-200" />}
              <div className="mt-2 flex items-center gap-4 border-t border-slate-100 pt-2 text-xs font-black text-slate-600">
                <button
                  onClick={() =>
                    setPosts((all) =>
                      all.map((x) =>
                        x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x,
                      ),
                    )
                  }
                  className={p.liked ? "text-blue-600" : ""}
                >
                  👍 Thích {p.likes > 0 ? p.likes : ""}
                </button>
                <button>💬 Bình luận {p.comments > 0 ? p.comments : ""}</button>
                <button>↗️ Chia sẻ</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Cảnh báo trước khi đăng */}
      {reviewing && (
        <div className="fixed inset-0 z-50 bg-black/60 p-3 overflow-y-auto grid place-items-start sm:place-items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 my-6 space-y-3">
            <div
              className={`rounded-xl bg-gradient-to-r ${levelColor(worstScore)} px-3 py-3 text-white text-center`}
            >
              <div className="text-xs font-black opacity-90">AI QUÉT BÀI ĐĂNG</div>
              <div className="text-3xl font-black">{worstScore}%</div>
              <div className="text-sm font-black">{levelText(worstScore)} — nguy cơ lộ thông tin cá nhân</div>
            </div>

            {mediaResult && (
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-900">🖼️ Ảnh của bạn</div>
                <div className="relative">
                  <img src={image} alt="" className="w-full rounded-xl" />
                  {mediaResult.findings.map((f, i) => (
                    <div
                      key={i}
                      className="absolute rounded-md"
                      style={{
                        left: `${f.x}%`,
                        top: `${f.y}%`,
                        width: `${f.w}%`,
                        height: `${f.h}%`,
                        border: `3px solid ${sevColor(f.severity)}`,
                        boxShadow: `0 0 0 2px rgba(0,0,0,.25)`,
                      }}
                    >
                      <span
                        className="absolute -top-1 left-0 -translate-y-full whitespace-nowrap rounded px-1 text-[10px] font-black text-white"
                        style={{ background: sevColor(f.severity) }}
                      >
                        {i + 1}. {f.label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-800">{mediaResult.summary}</p>
                <ul className="space-y-1">
                  {mediaResult.findings.map((f, i) => (
                    <li key={i} className="text-xs font-bold text-slate-800">
                      <span style={{ color: sevColor(f.severity) }}>●</span> {i + 1}. {f.label} — {f.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {textResult && (
              <div className="space-y-1">
                <div className="text-xs font-black text-slate-900">📝 Nội dung bài viết</div>
                <p className="text-xs font-bold text-slate-800">{textResult.summary}</p>
                <ul className="space-y-1">
                  {textResult.findings.map((f, i) => (
                    <li key={i} className="text-xs font-bold text-slate-800">
                      <span style={{ color: sevColor(f.severity) }}>●</span> {f.label}: “{f.quote}” — {f.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(mediaResult?.advice?.length || textResult?.advice?.length) && (
              <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-2">
                <div className="text-xs font-black text-amber-800">💡 Nên làm gì trước khi đăng</div>
                <ul className="mt-1 space-y-1">
                  {[...(mediaResult?.advice ?? []), ...(textResult?.advice ?? [])].map((a, i) => (
                    <li key={i} className="text-xs font-bold text-amber-900">
                      • {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setReviewing(false)}
                className="flex-1 rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white"
              >
                ✏️ Sửa lại bài đăng
              </button>
              {textResult?.safeVersion && (
                <button
                  onClick={() => {
                    setImage("");
                    publish(0, textResult.safeVersion);
                  }}
                  className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                >
                  🛡️ Đăng bản an toàn (bỏ ảnh)
                </button>
              )}
              <button
                onClick={() => publish(worstScore)}
                className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-xs font-black text-slate-800"
              >
                Vẫn đăng như vậy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
