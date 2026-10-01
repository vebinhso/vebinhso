import { createServerFn } from "@tanstack/react-start";
import { withSkill } from "@/lib/ai-skills";
import { AI_CATEGORY_LABELS, FORENSIC_PROMPT_BLOCK } from "@/lib/image-forensics";
import { PHISHING_CATEGORY_LABELS, PHISHING_PROMPT_BLOCK } from "@/lib/phishing-dataset";
import { SCAM_CATEGORY_LABELS, SCAM_MESSAGE_PROMPT_BLOCK } from "@/lib/scam-messages";
import { SCAM_PHONE_CATEGORY_LABELS, SCAM_PHONE_PROMPT_BLOCK } from "@/lib/scam-phones";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
type ResultLocale = "vi" | "en";
const resultLocale = (value: unknown): ResultLocale => value === "en" ? "en" : "vi";
const resultLanguage = (locale: ResultLocale) => locale === "en"
  ? "IMPORTANT: Write every user-facing value in English, including answer, summary, category labels, signs, findings, explanations, advice, and verification steps. Keep only quoted source text and proper names in their original language."
  : "QUAN TRỌNG: Viết mọi nội dung hiển thị cho người dùng bằng tiếng Việt dễ hiểu.";
const fallback = (locale: ResultLocale, vi: string, en: string) => locale === "en" ? en : vi;

async function callGateway(body: unknown) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI chưa được cấu hình");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Hệ thống AI đang quá tải, thử lại sau ít phút nhé.");
    if (res.status === 402) throw new Error("Hết lượt dùng AI. Vui lòng nạp thêm credit.");
    throw new Error(`Lỗi AI ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

const clampScore = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
};
const strArr = (v: unknown, max = 6) =>
  Array.isArray(v)
    ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, max).map((x) => String(x).slice(0, 200))
    : [];
const str = (v: unknown, fb = "") => (typeof v === "string" && v.trim() ? v.slice(0, 600) : fb);

/* ============ ĐỐI CHIẾU CHÉO 2 MÔ HÌNH — SAI SỐ TỐI ĐA 5% ============ */

const PRIMARY_MODEL = "google/gemini-3.5-flash";
const CROSS_MODEL = "openai/gpt-5.6-terra";

export type Accuracy = {
  margin: number;
  within: boolean;
  crossChecked: boolean;
  models: string[];
  note: string;
};

/**
 * Gọi 2 mô hình AI khác nhau cho cùng một câu hỏi, lấy trung bình các điểm số
 * và tính SAI SỐ (nửa khoảng chênh lệch). Nếu sai số > 5% thì cảnh báo người dùng.
 */
async function callGatewayVerified(body: Record<string, unknown>, scoreKeys: string[], locale: ResultLocale) {
  const [a, b] = await Promise.all([
    callGateway({ ...body, model: PRIMARY_MODEL }),
    callGateway({ ...body, model: CROSS_MODEL, reasoning_effort: "none" }).catch(() => null),
  ]);
  const primary = (a ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...primary };
  let maxDiff = 0;
  let compared = 0;
  if (b) {
    for (const k of scoreKeys) {
      const x = Number((primary as any)[k]);
      const y = Number((b as any)[k]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        compared++;
        maxDiff = Math.max(maxDiff, Math.abs(x - y));
        merged[k] = Math.round((x + y) / 2);
      }
    }
  }
  const crossChecked = Boolean(b) && compared > 0;
  const margin = crossChecked ? Math.min(50, Math.round(maxDiff / 2)) : 15;
  const within = crossChecked && margin <= 5;
  const accuracy: Accuracy = {
    margin,
    within,
    crossChecked,
    models: crossChecked ? ["Google Gemini", "OpenAI GPT"] : ["Google Gemini"],
    note: locale === "en"
      ? crossChecked
        ? within
          ? `Cross-checked by two AI models (Google Gemini and OpenAI GPT). Results agree, with an estimated margin of ±${margin}% (within the 5% threshold).`
          : `The two AI models disagree. The estimated margin is ±${margin}%, above the 5% threshold. Verify with Google or established sources before trusting this result.`
        : `Only one AI model responded, so cross-checking was unavailable. The margin may be as high as ±${margin}%. Verify with Google or established sources.`
      : crossChecked
        ? within
          ? `Đã đối chiếu chéo 2 mô hình AI (Google Gemini & OpenAI GPT) — kết quả khớp nhau, sai số ước tính ±${margin}% (trong ngưỡng cho phép 5%).`
          : `Hai mô hình AI (Google Gemini & OpenAI GPT) chưa thống nhất — sai số ước tính ±${margin}%, VƯỢT ngưỡng 5%. Hãy tự kiểm chứng thêm bằng Google hoặc nguồn chính thống trước khi tin.`
        : `Chỉ một mô hình AI trả lời được nên chưa đối chiếu chéo — sai số có thể tới ±${margin}%. Hãy kiểm chứng thêm bằng Google hoặc nguồn chính thống.`,
  };
  merged["accuracy"] = accuracy;
  return merged as any;
}


/** Phân tích ảnh: có phải do AI tạo không, mức độ bao nhiêu */
export const analyzeImage = createServerFn({ method: "POST" })
  .inputValidator((data: { imageUrl: string; locale?: ResultLocale }) => {
    const url = data?.imageUrl;
    if (!url || typeof url !== "string") throw new Error("Thiếu ảnh");
    if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(url) && !/^https?:\/\//.test(url)) {
      throw new Error("Ảnh không hợp lệ");
    }
    if (url.length > 8_000_000) throw new Error("Ảnh quá lớn (tối đa ~5MB)");
    return { imageUrl: url, locale: resultLocale(data.locale) };
  })
  .handler(async ({ data }) => {
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("image");
    const sys = `Bạn là chuyên gia pháp y ảnh số. Bạn phải trả lời HAI câu hỏi tách biệt:
(1) Ảnh có phải do AI sinh ra không? (2) Ảnh thật có bị chỉnh sửa thủ công kiểu Photoshop (ghép/xoá/thêm vật thể, sửa chữ số) không?
Phân tích kỹ: bàn tay/ngón tay, răng, mắt, chữ viết trong ảnh, hoa văn lặp, ánh sáng & bóng đổ, kết cấu da, nền méo, viền cắt ghép, khác biệt độ nét/tông màu giữa các vùng, artefact nén, watermark.

${FORENSIC_PROMPT_BLOCK}

Trả về CHÍNH XÁC một JSON (không markdown):
{"aiScore":0-100,"editedScore":0-100,"verdict":"real|likely_real|uncertain|likely_ai|ai","confidence":0-100,"difficulty":"Dễ|Trung bình|Khó","aiCategory":"id nhóm A hoặc khong_ro","editCategory":"id nhóm B hoặc khong_ro","summary":"1-2 câu tiếng Việt","aiSigns":["dấu hiệu ảnh do AI tạo"],"editSigns":["dấu hiệu bị chỉnh sửa thủ công"],"realSigns":["dấu hiệu ảnh thật"],"tips":["cách tự kiểm chứng, bám theo phần Kiểm chứng của nhóm đã chọn"]}
aiScore = mức độ do AI tạo. editedScore = mức độ chỉnh sửa thủ công. ${resultLanguage(data.locale)}`;
    const parsed = await callGatewayVerified({
      messages: [
        { role: "system", content: withSkill(sys, skill) },
        {
          role: "user",
          content: [
            { type: "text", text: "Ảnh này do AI tạo hay ảnh thật đã qua chỉnh sửa Photoshop? Xếp vào nhóm nào trong bộ tiêu chí?" },
            { type: "image_url", image_url: { url: data.imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }, ["aiScore", "confidence", "editedScore"], data.locale);
    const catId = (v: unknown) => {
      const s = str(v, "khong_ro").trim();
      return AI_CATEGORY_LABELS[s] ? s : "khong_ro";
    };
    const aiCategory = catId(parsed.aiCategory);
    const editCategory = catId(parsed.editCategory);
    return {
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
      accuracy: parsed.accuracy,
      aiScore: clampScore(parsed.aiScore),
      verdict: str(parsed.verdict, "uncertain"),
      confidence: clampScore(parsed.confidence),
      summary: str(parsed.summary, fallback(data.locale, "Không đủ dữ liệu để kết luận chắc chắn.", "There is not enough evidence for a reliable conclusion.")),
      aiSigns: strArr(parsed.aiSigns),
      editSigns: strArr(parsed.editSigns),
      realSigns: strArr(parsed.realSigns),
      editedScore: clampScore(parsed.editedScore),
      difficulty: ["Dễ", "Trung bình", "Khó"].includes(str(parsed.difficulty, ""))
        ? str(parsed.difficulty, "")
        : "Trung bình",
      aiCategory,
      aiCategoryLabel: aiCategory === "khong_ro" ? "" : (AI_CATEGORY_LABELS[aiCategory] ?? ""),
      editCategory,
      editCategoryLabel: editCategory === "khong_ro" ? "" : (AI_CATEGORY_LABELS[editCategory] ?? ""),
      tips: strArr(parsed.tips),
    };
  });

/** Kiểm tra đường link có độc hại / lừa đảo không */
export const analyzeLink = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string; locale?: ResultLocale }) => {
    const u = data?.url;
    if (!u || typeof u !== "string" || u.trim().length < 3) throw new Error("Thiếu đường link");
    return { url: u.trim().slice(0, 500), locale: resultLocale(data.locale) };
  })
  .handler(async ({ data }) => {
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("link");
    const sys = `Bạn là hệ thống kiểm tra an toàn đường link (giống Kaspersky / VirusTotal) cho học sinh Việt Nam. Phân tích URL dựa trên: tên miền lạ, đuôi miền rủi ro (.tk .xyz .top .cc), giả mạo thương hiệu (typosquatting: faceb00k, shopee-vn-khuyenmai), dùng link rút gọn, IP thay cho tên miền, quá nhiều subdomain, tham số đáng ngờ, từ khoá lừa đảo (trung thưởng, nap the, kiem tien, otp, xac minh tai khoan), không dùng HTTPS.
Trả về CHÍNH XÁC một JSON (không markdown):
{"riskScore":0-100,"level":"safe|low|medium|high|dangerous","category":"phishing|malware|scam|adult|gambling|shortener|unknown|clean","summary":"1-2 câu tiếng Việt","redFlags":["dấu hiệu nguy hiểm"],"goodSigns":["dấu hiệu an toàn"],"advice":["nên làm gì"]}
${resultLanguage(data.locale)} Nếu không chắc, nói rõ là không chắc và khuyên thận trọng.`;
    const parsed = await callGatewayVerified({
      messages: [
        { role: "system", content: withSkill(sys, skill) },
        { role: "user", content: `Kiểm tra link này: ${data.url}` },
      ],
      response_format: { type: "json_object" },
    }, ["riskScore"], data.locale);
    return {
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
      accuracy: parsed.accuracy,
      riskScore: clampScore(parsed.riskScore),
      level: str(parsed.level, "unknown"),
      category: str(parsed.category, "unknown"),
      summary: str(parsed.summary, fallback(data.locale, "Chưa đủ dữ liệu để kết luận.", "There is not enough information to reach a conclusion.")),
      redFlags: strArr(parsed.redFlags),
      goodSigns: strArr(parsed.goodSigns),
      advice: strArr(parsed.advice),
    };
  });

/** Kiểm tra đoạn văn bản có phải do AI viết không */
export const analyzeText = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; locale?: ResultLocale }) => {
    const t = data?.text;
    if (!t || typeof t !== "string" || t.trim().length < 20) {
      throw new Error("Cần ít nhất 20 ký tự để phân tích");
    }
    return { text: t.trim().slice(0, 6000), locale: resultLocale(data.locale) };
  })
  .handler(async ({ data }) => {
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("text");
    const sys = `Bạn là chuyên gia phát hiện văn bản do AI viết VÀ phát hiện tin nhắn lừa đảo trên mạng xã hội Việt Nam (Threads, Facebook/Messenger, Zalo, Instagram, TikTok, Telegram, SMS).
Chấm ĐỘC LẬP hai việc:
1) Văn bản do AI viết hay người viết: độ đều của câu, cụm từ sáo rỗng, liệt kê máy móc, thiếu chi tiết cá nhân, giọng trung tính quá mức.
2) Nguy cơ lừa đảo: dựa trên ý đồ của tin nhắn, dù văn phong rất giống người thật.

${SCAM_MESSAGE_PROMPT_BLOCK}

Trả về CHÍNH XÁC một JSON (không markdown):
{"aiScore":0-100,"verdict":"human|likely_human|uncertain|likely_ai|ai","confidence":0-100,"summary":"1-2 câu tiếng Việt","aiSigns":["dấu hiệu AI"],"humanSigns":["dấu hiệu người viết"],"misinfoRisk":0-100,"scamCategory":"id nhóm lừa đảo hoặc khong_ro","platform":"nền tảng có khả năng nhất hoặc rỗng","difficulty":"Dễ|Trung bình|Khó","scamSigns":["dấu hiệu lừa đảo"],"tips":["cách kiểm chứng và nên làm gì"]}
misinfoRisk = nguy cơ nội dung sai lệch/lừa đảo (0-100). difficulty = mức độ khó nhận ra với học sinh. ${resultLanguage(data.locale)}`;
    const parsed = await callGatewayVerified({
      messages: [
        { role: "system", content: withSkill(sys, skill) },
        { role: "user", content: data.text },
      ],
      response_format: { type: "json_object" },
    }, ["aiScore", "confidence", "misinfoRisk"], data.locale);
    const rawCat = str(parsed.scamCategory, "khong_ro").trim();
    const scamCategory = SCAM_CATEGORY_LABELS[rawCat] ? rawCat : "khong_ro";
    return {
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
      accuracy: parsed.accuracy,
      aiScore: clampScore(parsed.aiScore),
      verdict: str(parsed.verdict, "uncertain"),
      confidence: clampScore(parsed.confidence),
      summary: str(parsed.summary, fallback(data.locale, "Chưa đủ dữ liệu để kết luận.", "There is not enough information to reach a conclusion.")),
      aiSigns: strArr(parsed.aiSigns),
      humanSigns: strArr(parsed.humanSigns),
      misinfoRisk: clampScore(parsed.misinfoRisk),
      scamCategory,
      scamCategoryLabel: scamCategory === "khong_ro" ? "" : (SCAM_CATEGORY_LABELS[scamCategory] ?? ""),
      platform: str(parsed.platform, ""),
      difficulty: ["Dễ", "Trung bình", "Khó"].includes(str(parsed.difficulty, ""))
        ? str(parsed.difficulty, "")
        : "Trung bình",
      scamSigns: strArr(parsed.scamSigns, 8),
      tips: strArr(parsed.tips),
    };
  });

/** Kiểm tra email có phải giả mạo / lừa đảo không */
export const analyzeEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string; locale?: ResultLocale }) => {
    const t = data?.content;
    if (!t || typeof t !== "string" || t.trim().length < 5) {
      throw new Error("Hãy dán địa chỉ email hoặc nội dung email cần kiểm tra");
    }
    return { content: t.trim().slice(0, 6000), locale: resultLocale(data.locale) };
  })
  .handler(async ({ data }) => {
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("email");
    const sys = `Bạn là hệ thống phát hiện email giả mạo (phishing / spoofing / BEC) cho học sinh Việt Nam. Người dùng có thể chỉ dán ĐỊA CHỈ EMAIL, hoặc dán cả NỘI DUNG email (tiêu đề, người gửi, thân thư, link đính kèm).
Hãy phân tích: tên miền người gửi có giống thương hiệu thật không (typosquatting: g00gle, faceb0ok-support, shopee-vn.info), dùng gmail/outlook miễn phí nhưng tự xưng là ngân hàng/công ty, tên hiển thị khác địa chỉ thật, tên miền mới lạ, ký tự lạ/Unicode giả, giọng văn hối thúc – doạ khoá tài khoản, yêu cầu OTP/mật khẩu/số thẻ, link không khớp thương hiệu, tệp đính kèm nguy hiểm (.exe .zip .html), lỗi chính tả, lời chào chung chung ("Kính gửi quý khách").

${PHISHING_PROMPT_BLOCK}

Trả về CHÍNH XÁC một JSON (không markdown):
{"riskScore":0-100,"level":"safe|low|medium|high|dangerous","type":"phishing|spoofing|scam|spam|marketing|legit|unknown","scamCategory":"id nhóm kịch bản hoặc khong_ro","difficulty":"Dễ|Trung bình|Khó","impersonating":"tên thương hiệu bị giả mạo hoặc rỗng","summary":"1-2 câu tiếng Việt","redFlags":["dấu hiệu giả mạo"],"goodSigns":["dấu hiệu đáng tin"],"advice":["nên làm gì"]}
riskScore = mức độ email là giả mạo/lừa đảo. difficulty = mức độ khó nhận ra với học sinh. ${resultLanguage(data.locale)}`;
    const parsed = await callGatewayVerified({
      messages: [
        { role: "system", content: withSkill(sys, skill) },
        { role: "user", content: `Kiểm tra email này:\n${data.content}` },
      ],
      response_format: { type: "json_object" },
    }, ["riskScore"], data.locale);
    const rawCat = str(parsed.scamCategory, "khong_ro").trim();
    const scamCategory = PHISHING_CATEGORY_LABELS[rawCat] ? rawCat : "khong_ro";
    return {
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
      accuracy: parsed.accuracy,
      riskScore: clampScore(parsed.riskScore),
      level: str(parsed.level, "unknown"),
      type: str(parsed.type, "unknown"),
      scamCategory,
      scamCategoryLabel: scamCategory === "khong_ro" ? "" : (PHISHING_CATEGORY_LABELS[scamCategory] ?? ""),
      difficulty: ["Dễ", "Trung bình", "Khó"].includes(str(parsed.difficulty, ""))
        ? str(parsed.difficulty, "")
        : "Trung bình",
      impersonating: str(parsed.impersonating, ""),
      summary: str(parsed.summary, fallback(data.locale, "Chưa đủ dữ liệu để kết luận.", "There is not enough information to reach a conclusion.")),
      redFlags: strArr(parsed.redFlags, 8),
      goodSigns: strArr(parsed.goodSigns),
      advice: strArr(parsed.advice),
    };
  });

const TRUSTED_FEEDS = [
  { name: "VnExpress", url: "https://vnexpress.net/rss/tin-moi-nhat.rss" },
  { name: "Tuổi Trẻ", url: "https://tuoitre.vn/rss/tin-moi-nhat.rss" },
  { name: "Thanh Niên", url: "https://thanhnien.vn/rss/home.rss" },
];

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

type Headline = { title: string; source: string; date: string; link: string };

function parseRss(xml: string, fallbackSource: string, limit: number): Headline[] {
  const out: Headline[] = [];
  const items = xml.split(/<item[\s>]/).slice(1);
  for (const raw of items.slice(0, limit)) {
    const title = decodeXml(raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    if (!title) continue;
    const link = decodeXml(raw.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").slice(0, 300);
    const date = decodeXml(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
    const src = decodeXml(raw.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "") || fallbackSource;
    out.push({ title: title.slice(0, 200), source: src.slice(0, 60), date, link });
  }
  return out;
}

const VI_STOP = new Set(
  "và là của có trong cho với những các một được người khi này đã đang sẽ từ về không tại theo ra vào bị nhưng thì mà nếu như để trên dưới sau trước rất đến hơn nữa cũng chỉ vì nên hay đó nó tin tức bài báo".split(
    " ",
  ),
);

function buildQuery(content: string) {
  const cleaned = content.replace(/https?:\/\/\S+/g, " ");
  const words = cleaned
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !VI_STOP.has(w.toLowerCase()));
  const freq = new Map<string, number>();
  for (const w of words) {
    const k = w.toLowerCase();
    freq.set(k, (freq.get(k) ?? 0) + 1 + (/^\p{Lu}/u.test(w) ? 1 : 0));
  }
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
  return (top.length ? top.join(" ") : cleaned.slice(0, 80)).slice(0, 120);
}

async function fetchLatestNews(content: string): Promise<Headline[]> {
  const q = buildQuery(content);
  const urls = [
    {
      name: "Google Tin tức",
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=vi&gl=VN&ceid=VN:vi`,
      limit: 12,
    },
    ...TRUSTED_FEEDS.map((f) => ({ name: f.name, url: f.url, limit: 12 })),
  ];
  const results = await Promise.all(
    urls.map(async (u) => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(u.url, {
          signal: ctrl.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; VeBinhSoBot/1.0)" },
        });
        clearTimeout(timer);
        if (!res.ok) return [];
        return parseRss(await res.text(), u.name, u.limit);
      } catch {
        return [];
      }
    }),
  );
  const google = results[0] ?? [];
  const keys = new Set(
    buildQuery(content)
      .split(" ")
      .filter((w) => w.length > 2),
  );
  const others = results
    .slice(1)
    .flat()
    .filter((h) => {
      const t = h.title.toLowerCase();
      return [...keys].some((k) => t.includes(k));
    });
  const seen = new Set<string>();
  return [...google, ...others]
    .filter((h) => {
      const k = h.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 18);
}

/** Kiểm tra tin tức: tin giả / tin lá cải / tin truyền miệng — đối chiếu tin mới nhất mỗi ngày */
export const analyzeNews = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string; locale?: ResultLocale }) => {
    const t = data?.content;
    if (!t || typeof t !== "string" || t.trim().length < 15) {
      throw new Error("Cần ít nhất 15 ký tự (tiêu đề, nội dung tin hoặc link bài báo)");
    }
    return { content: t.trim().slice(0, 6000), locale: resultLocale(data.locale) };
  })
  .handler(async ({ data }) => {
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("news");
    const headlines = await fetchLatestNews(data.content);
    const today = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const feedBlock = headlines.length
      ? headlines.map((h, i) => `${i + 1}. [${h.source}] ${h.title}${h.date ? ` (${h.date})` : ""}`).join("\n")
      : "(Không tìm được tin liên quan trên Google Tin tức và các báo lớn trong hôm nay)";

    const sys = `Bạn là chuyên gia kiểm chứng tin tức (fact-check) cho học sinh Việt Nam. Hôm nay là ${today}.
Người dùng có thể DÁN một tin, hoặc ĐẶT CÂU HỎI kiểu "có thật là ... không?", "nghe nói ... đúng không?". Bạn được cung cấp DANH SÁCH TIN MỚI NHẤT hôm nay lấy trực tiếp từ Google Tin tức và các báo lớn (VnExpress, Tuổi Trẻ, Thanh Niên) để đối chiếu.
Nhiệm vụ:
1) TRẢ LỜI TRỰC TIẾP câu hỏi/nội dung của người dùng bằng 1-3 câu ("answer").
2) KIỂM CHỨNG: thông tin này đã được kiểm chứng ở đâu chưa? Nếu trong danh sách tin có báo chính thống đưa tin trùng khớp → verified = true, liệt kê tên báo trong "verifiedBy" và tiêu đề trùng khớp trong "matchedNews".
   Nếu KHÔNG có nguồn nào xác nhận → verified = false, verdict = "unverified", và answer PHẢI nói rõ: "Đây là thông tin CHƯA được kiểm chứng, chưa có báo chính thống nào xác nhận — không nên tin hay chia sẻ."
3) TIN GIẢ: tiêu đề giật gân, nguồn mơ hồ, không tác giả/thời gian, số liệu không kiểm chứng, kêu gọi chia sẻ gấp, thuyết âm mưu, mạo danh báo chính thống, lừa đảo tài chính/sức khoẻ.
4) TIN LÁ CẢI / TRUYỀN MIỆNG: tin vỉa hè, đồn thổi, "nghe nói", "bạn của bạn tôi kể", drama showbiz câu view, giật tít câu click, chỉ lan trên mạng xã hội/nhóm chat.
Tuyệt đối KHÔNG bịa tên báo hay bài viết không có trong danh sách.
Trả về CHÍNH XÁC một JSON (không markdown):
{"answer":"câu trả lời trực tiếp 1-3 câu","verified":true|false,"verifiedBy":["tên báo đã kiểm chứng"],"fakeScore":0-100,"tabloidScore":0-100,"level":"safe|low|medium|high|dangerous","verdict":"likely_true|unverified|misleading|likely_fake|fake","category":"tin giả|tin sai lệch|tin lá cải|tin đồn truyền miệng|giật tít|quảng cáo trá hình|lừa đảo|tin đáng tin|chưa rõ","summary":"1-2 câu tiếng Việt","matchedNews":["tiêu đề trong danh sách có liên quan (tối đa 4), ghi rõ tên báo"],"redFlags":["dấu hiệu tin giả / lá cải"],"goodSigns":["dấu hiệu đáng tin"],"checkSteps":["cách tự kiểm chứng"]}
fakeScore = mức độ là tin giả/sai lệch. tabloidScore = mức độ lá cải, tin đồn truyền miệng, câu view. ${resultLanguage(data.locale)}`;

    const parsed = await callGatewayVerified({
      messages: [
        { role: "system", content: withSkill(sys, skill) },
        {
          role: "user",
          content: `NGƯỜI DÙNG HỎI / TIN CẦN KIỂM TRA:\n${data.content}\n\nTIN MỚI NHẤT HÔM NAY (${today}) TỪ GOOGLE TIN TỨC & BÁO LỚN:\n${feedBlock}`,
        },
      ],
      response_format: { type: "json_object" },
    }, ["fakeScore", "tabloidScore"], data.locale);
    const verifiedBy = strArr(parsed.verifiedBy, 5);
    const verified = parsed.verified === true && verifiedBy.length > 0;
    return {
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
      accuracy: parsed.accuracy,
      answer: str(
        parsed.answer,
        verified
          ? fallback(data.locale, "Thông tin này có nguồn báo chính thống đưa tin.", "This information has been reported by an established news source.")
          : fallback(data.locale, "Đây là thông tin CHƯA được kiểm chứng — chưa có báo chính thống nào xác nhận, bạn không nên tin hay chia sẻ.", "This information is UNVERIFIED. No established news source has confirmed it, so do not trust or share it yet."),
      ),
      verified,
      verifiedBy,
      fakeScore: clampScore(parsed.fakeScore),
      tabloidScore: clampScore(parsed.tabloidScore),
      level: str(parsed.level, "unknown"),
      verdict: verified ? str(parsed.verdict, "likely_true") : "unverified",
      category: str(parsed.category, fallback(data.locale, "chưa rõ", "unclear")),
      summary: str(parsed.summary, fallback(data.locale, "Chưa đủ dữ liệu để kết luận.", "There is not enough information to reach a conclusion.")),
      matchedNews: strArr(parsed.matchedNews, 4),
      redFlags: strArr(parsed.redFlags),
      goodSigns: strArr(parsed.goodSigns),
      checkSteps: strArr(parsed.checkSteps),
      checkedAt: today,
      sources: headlines.slice(0, 6).map((h) => ({ title: h.title, source: h.source, link: h.link })),
    };
  });



/** Kiểm tra video: có phải do AI tạo (deepfake / AI video) hoặc chứa nội dung AI không */
export const analyzeVideo = createServerFn({ method: "POST" })
  .inputValidator((data: { frames: string[]; note?: string; locale?: ResultLocale }) => {
    const frames = Array.isArray(data?.frames)
      ? data.frames.filter(
          (f) => typeof f === "string" && /^data:image\/(png|jpeg|jpg|webp);base64,/.test(f),
        )
      : [];
    if (!frames.length) throw new Error("Không đọc được khung hình từ video");
    const picked = frames.slice(0, 5);
    const total = picked.reduce((s, f) => s + f.length, 0);
    if (total > 12_000_000) throw new Error("Video quá lớn để phân tích");
    return { frames: picked, note: typeof data?.note === "string" ? data.note.slice(0, 500) : "", locale: resultLocale(data.locale) };
  })
  .handler(async ({ data }) => {
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("video");
    const sys = `Bạn là chuyên gia pháp y video số, phát hiện video do AI tạo (Sora, Veo, Kling, Runway), deepfake hoán đổi gương mặt, lồng tiếng AI, hoặc video thật nhưng CHỨA nội dung do AI dựng.
Người dùng gửi nhiều KHUNG HÌNH liên tiếp trích từ một video. Hãy so sánh các khung hình: khuôn mặt có biến dạng/nhấp nháy giữa các khung không, viền mặt – tóc – tai có nhoè hay không khớp, mắt/răng bất thường, tay và ngón tay, chữ trong khung bị loạn, hậu cảnh trôi/biến hình, ánh sáng và bóng đổ không nhất quán, kết cấu da quá mượt, chuyển động vật lý phi thực tế, watermark của công cụ AI.
Trả về CHÍNH XÁC một JSON (không markdown):
{"aiScore":0-100,"verdict":"real|likely_real|uncertain|likely_ai|ai","confidence":0-100,"deepfakeScore":0-100,"editedScore":0-100,"summary":"1-2 câu tiếng Việt","aiSigns":["dấu hiệu AI"],"realSigns":["dấu hiệu video thật"],"tips":["cách kiểm chứng"]}
aiScore = mức độ video do AI tạo/dựng. deepfakeScore = mức độ nghi hoán đổi gương mặt. editedScore = mức độ đã cắt ghép/chỉnh sửa. ${resultLanguage(data.locale)}`;
    const parsed = await callGatewayVerified({
      messages: [
        { role: "system", content: withSkill(sys, skill) },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Đây là ${data.frames.length} khung hình trích từ một video theo thứ tự thời gian. Video này có phải do AI tạo hoặc chứa nội dung AI không?${data.note ? ` Ghi chú: ${data.note}` : ""}`,
            },
            ...data.frames.map((f) => ({ type: "image_url", image_url: { url: f } })),
          ],
        },
      ],
      response_format: { type: "json_object" },
    }, ["aiScore", "confidence", "deepfakeScore", "editedScore"], data.locale);
    return {
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
      accuracy: parsed.accuracy,
      aiScore: clampScore(parsed.aiScore),
      verdict: str(parsed.verdict, "uncertain"),
      confidence: clampScore(parsed.confidence),
      deepfakeScore: clampScore(parsed.deepfakeScore),
      editedScore: clampScore(parsed.editedScore),
      summary: str(parsed.summary, fallback(data.locale, "Chưa đủ dữ liệu để kết luận.", "There is not enough information to reach a conclusion.")),
      aiSigns: strArr(parsed.aiSigns),
      realSigns: strArr(parsed.realSigns),
      tips: strArr(parsed.tips),
    };
  });

/* ===================== RỦI RO LỘ THÔNG TIN ===================== */

const num = (v: unknown, fb = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fb;
};
const clamp01 = (v: unknown, fb = 0) => Math.max(0, Math.min(100, num(v, fb)));

type PrivacyBox = {
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  detail: string;
  severity: "low" | "medium" | "high";
};

const sev = (v: unknown): "low" | "medium" | "high" =>
  v === "high" || v === "medium" || v === "low" ? v : "medium";

/** Phân tích rủi ro lộ thông tin cá nhân từ ảnh / khung hình video */
export const analyzePrivacyMedia = createServerFn({ method: "POST" })
  .inputValidator((data: { images: string[]; locale?: ResultLocale }) => {
    const imgs = Array.isArray(data?.images)
      ? data.images.filter(
          (f) =>
            typeof f === "string" &&
            (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(f) || /^https?:\/\//.test(f)),
        )
      : [];
    if (!imgs.length) throw new Error("Thiếu ảnh hoặc khung hình video");
    const picked = imgs.slice(0, 4);
    const total = picked.reduce((s, f) => s + f.length, 0);
    if (total > 12_000_000) throw new Error("Tệp quá lớn để phân tích");
    return { images: picked, locale: resultLocale(data.locale) };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là chuyên gia bảo vệ dữ liệu cá nhân, giúp học sinh Việt Nam biết một tấm ảnh/video khi đăng lên mạng có thể làm LỘ THÔNG TIN gì.
Hãy soi kỹ và CHỈ RA VỊ TRÍ trong ảnh của từng thứ có thể lộ: khuôn mặt, tên trên thẻ học sinh/căn cước/giấy tờ, số điện thoại, địa chỉ nhà, biển số xe, tên trường trên đồng phục/bảng hiệu, số tài khoản ngân hàng, mã QR, vé máy bay/mã đặt chỗ, màn hình điện thoại/máy tính đang mở tin nhắn, chìa khoá, tài sản đắt tiền, mốc địa lý nhận ra vị trí, đơn hàng/hoá đơn, email, biển tên lớp.
Với MỖI phát hiện, trả về hộp bao quanh theo TỌA ĐỘ PHẦN TRĂM của ảnh (x,y là góc trên trái, w,h là chiều rộng/cao, tất cả 0-100) và số thứ tự khung hình "frame" (bắt đầu từ 0; nếu chỉ có 1 ảnh thì luôn là 0).
Trả về CHÍNH XÁC một JSON (không markdown):
{"riskScore":0-100,"level":"safe|low|medium|high|dangerous","summary":"1-2 câu tiếng Việt","findings":[{"frame":0,"x":0,"y":0,"w":0,"h":0,"label":"tên ngắn ví dụ: Biển số xe","detail":"vì sao nguy hiểm, 1 câu","severity":"low|medium|high"}],"safeSigns":["điều đã làm tốt"],"advice":["nên che/xoá gì trước khi đăng"]}
riskScore = mức độ rủi ro bị lộ thông tin khi đăng công khai. Tối đa 8 findings. ${resultLanguage(data.locale)}`;
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("privacy_media");
    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: withSkill(sys, skill) },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Đây là ${data.images.length} ảnh/khung hình. Nếu đăng công khai lên mạng thì rủi ro lộ thông tin bao nhiêu phần trăm? Chỉ rõ vị trí từng chỗ nguy hiểm.`,
            },
            ...data.images.map((f) => ({ type: "image_url", image_url: { url: f } })),
          ],
        },
      ],
      response_format: { type: "json_object" },
    });
    const findings: PrivacyBox[] = Array.isArray(parsed.findings)
      ? parsed.findings.slice(0, 8).map((f: any) => ({
          frame: Math.max(0, Math.min(data.images.length - 1, Math.round(num(f?.frame, 0)))),
          x: clamp01(f?.x),
          y: clamp01(f?.y),
          w: Math.max(3, clamp01(f?.w, 10)),
          h: Math.max(3, clamp01(f?.h, 10)),
          label: str(f?.label, "Thông tin nhạy cảm").slice(0, 60),
          detail: str(f?.detail, "").slice(0, 200),
          severity: sev(f?.severity),
        }))
      : [];
    return {
      riskScore: clampScore(parsed.riskScore),
      level: str(parsed.level, "unknown"),
      summary: str(parsed.summary, fallback(data.locale, "Chưa đủ dữ liệu để kết luận.", "There is not enough information to reach a conclusion.")),
      findings,
      safeSigns: strArr(parsed.safeSigns),
      advice: strArr(parsed.advice),
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
    };
  });

/** Phân tích rủi ro lộ thông tin cá nhân trong văn bản */
export const analyzePrivacyText = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; locale?: ResultLocale }) => {
    const t = data?.text;
    if (!t || typeof t !== "string" || t.trim().length < 10) {
      throw new Error("Cần ít nhất 10 ký tự để phân tích");
    }
    return { text: t.trim().slice(0, 6000), locale: resultLocale(data.locale) };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là chuyên gia bảo vệ dữ liệu cá nhân cho học sinh Việt Nam. Người dùng dán một đoạn văn bản (bài đăng, tin nhắn, chú thích ảnh) và muốn biết nếu đăng công khai thì rủi ro lộ thông tin bao nhiêu.
Hãy CHỈ RÕ từng đoạn chữ nguy hiểm bằng cách TRÍCH NGUYÊN VĂN đoạn đó ("quote" phải xuất hiện y hệt trong văn bản gốc): họ tên đầy đủ, số điện thoại, email, địa chỉ nhà, tên trường/lớp, số căn cước, số tài khoản ngân hàng, mã OTP, mật khẩu, biển số xe, lịch trình đi lại ("nhà không có ai đến chủ nhật"), link cá nhân, tên bố mẹ, ngày sinh đầy đủ.
Trả về CHÍNH XÁC một JSON (không markdown):
{"riskScore":0-100,"level":"safe|low|medium|high|dangerous","summary":"1-2 câu tiếng Việt","findings":[{"quote":"đoạn trích nguyên văn","label":"Số điện thoại","detail":"vì sao nguy hiểm, 1 câu","severity":"low|medium|high"}],"safeSigns":["điều đã làm tốt"],"advice":["nên sửa/xoá gì trước khi đăng"],"safeVersion":"phiên bản viết lại đã che thông tin nhạy cảm"}
Tối đa 8 findings. ${resultLanguage(data.locale)}`;
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("privacy_text");
    const parsed = await callGatewayVerified({
      messages: [
        { role: "system", content: withSkill(sys, skill) },
        { role: "user", content: data.text },
      ],
      response_format: { type: "json_object" },
    }, ["riskScore"], data.locale);
    type TextFinding = { quote: string; label: string; detail: string; severity: "low" | "medium" | "high" };
    const findings: TextFinding[] = Array.isArray(parsed.findings)
      ? parsed.findings.slice(0, 8).map((f: any) => ({
          quote: str(f?.quote, "").slice(0, 200),
          label: str(f?.label, "Thông tin nhạy cảm").slice(0, 60),
          detail: str(f?.detail, "").slice(0, 200),
          severity: sev(f?.severity),
        }))
      : [];
    return {
      accuracy: parsed.accuracy,
      riskScore: clampScore(parsed.riskScore),
      level: str(parsed.level, "unknown"),
      summary: str(parsed.summary, fallback(data.locale, "Chưa đủ dữ liệu để kết luận.", "There is not enough information to reach a conclusion.")),
      findings: findings.filter((f) => f.quote),
      safeSigns: strArr(parsed.safeSigns),
      advice: strArr(parsed.advice),
      safeVersion: str(parsed.safeVersion, ""),
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
    };
  });

/** Kiểm tra số điện thoại: nhà mạng, vùng gọi đến, nguy cơ lừa đảo */
export const analyzePhone = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string; context?: string; locale?: ResultLocale }) => {
    const p = data?.phone;
    if (!p || typeof p !== "string" || p.replace(/\D/g, "").length < 6) {
      throw new Error("Hãy nhập số điện thoại cần kiểm tra");
    }
    return {
      phone: p.trim().slice(0, 30),
      context: typeof data?.context === "string" ? data.context.trim().slice(0, 1500) : "",
      locale: resultLocale(data.locale),
    };
  })
  .handler(async ({ data }) => {
    const { loadSkillForCheck } = await import("./ai-skills.server");
    const skill = await loadSkillForCheck("phone");
    const { lookupPhone } = await import("./phone-vn");
    const info = lookupPhone(data.phone);
    const sys = `Bạn là hệ thống cảnh báo số điện thoại lừa đảo cho học sinh Việt Nam.
Dữ liệu tra cứu đầu số (đã xác định chính xác bằng bảng đầu số chính thức) sẽ được cung cấp; TUYỆT ĐỐI không mâu thuẫn với dữ liệu đó.
Hãy đánh giá: số có đúng định dạng/đầu số thật của Việt Nam không, nguồn gốc số (di động nhà mạng nào, cố định tỉnh nào, quốc tế nước nào, đầu số dịch vụ, số gọi qua Internet), và nguy cơ lừa đảo/spam.

${SCAM_PHONE_PROMPT_BLOCK}

Trả về CHÍNH XÁC một JSON (không markdown):
{"riskScore":0-100,"level":"safe|low|medium|high|dangerous","fakeScore":0-100,"type":"scam|spam|telesales|service|personal|unknown|legit","scamCategory":"id nhóm kịch bản hoặc khong_ro","origin":"nguồn gốc số: di động VN / cố định tỉnh nào / quốc tế nước nào / đầu số dịch vụ / không xác định","locationGuess":"quận + thành phố hoặc chỉ thành phố, hoặc 'Không xác định'","strangerNote":"1 câu: đây có phải dạng số lạ không quen thuộc với người Việt không","reportNote":"1 câu nói rõ không có dữ liệu tố cáo công khai cho số này và hướng dẫn tra/phản ánh qua 156 hoặc 5656","carrierNote":"1 câu về nhà mạng/loại số","summary":"1-2 câu tiếng Việt","redFlags":["dấu hiệu đáng ngờ"],"goodSigns":["dấu hiệu bình thường"],"advice":["nên làm gì khi nhận cuộc gọi này"]}
riskScore = nguy cơ lừa đảo. fakeScore = khả năng số giả/ảo/bị giả mạo caller ID. ${resultLanguage(data.locale)}`;
    const parsed = await callGatewayVerified(
      {
        messages: [
          { role: "system", content: withSkill(sys, skill) },
          {
            role: "user",
            content: `Số cần kiểm tra: ${data.phone}
Dữ liệu tra cứu đầu số: ${JSON.stringify(info)}
${data.context ? `Người dùng mô tả cuộc gọi/tin nhắn: ${data.context}` : "Người dùng không mô tả thêm."}`,
          },
        ],
        response_format: { type: "json_object" },
      },
      ["riskScore", "fakeScore"],
      data.locale,
    );
    const rawCat = str(parsed.scamCategory, "khong_ro").trim();
    const scamCategory = SCAM_PHONE_CATEGORY_LABELS[rawCat] ? rawCat : "khong_ro";
    return {
      skillKey: skill?.key ?? null,
      skillVersion: skill?.version ?? null,
      accuracy: parsed.accuracy,
      lookup: info,
      riskScore: clampScore(parsed.riskScore),
      fakeScore: clampScore(parsed.fakeScore),
      level: str(parsed.level, "unknown"),
      type: str(parsed.type, "unknown"),
      scamCategory,
      scamCategoryLabel:
        scamCategory === "khong_ro" ? "" : (SCAM_PHONE_CATEGORY_LABELS[scamCategory] ?? ""),
      origin: str(parsed.origin, info.note),
      locationGuess: str(parsed.locationGuess, info.province),
      strangerNote: str(parsed.strangerNote, ""),
      reportNote: str(
        parsed.reportNote,
        fallback(data.locale, "Không có dữ liệu tố cáo công khai cho số này. Bạn có thể phản ánh số nghi lừa đảo qua tổng đài 156 hoặc 5656.", "No public complaint data is available for this number. In Vietnam, suspected scam numbers can be reported via 156 or 5656."),
      ),
      carrierNote: str(parsed.carrierNote, info.note),
      summary: str(parsed.summary, fallback(data.locale, "Chưa đủ dữ liệu để kết luận.", "There is not enough information to reach a conclusion.")),
      redFlags: strArr(parsed.redFlags, 8),
      goodSigns: strArr(parsed.goodSigns),
      advice: strArr(parsed.advice),
    };
  });
