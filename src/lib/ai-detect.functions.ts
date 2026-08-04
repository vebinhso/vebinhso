import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

/** Phân tích ảnh: có phải do AI tạo không, mức độ bao nhiêu */
export const analyzeImage = createServerFn({ method: "POST" })
  .inputValidator((data: { imageUrl: string }) => {
    const url = data?.imageUrl;
    if (!url || typeof url !== "string") throw new Error("Thiếu ảnh");
    if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(url) && !/^https?:\/\//.test(url)) {
      throw new Error("Ảnh không hợp lệ");
    }
    if (url.length > 8_000_000) throw new Error("Ảnh quá lớn (tối đa ~5MB)");
    return { imageUrl: url };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là chuyên gia pháp y ảnh số, phát hiện ảnh do AI tạo/chỉnh sửa. Hãy phân tích kỹ: bàn tay/ngón tay, răng, mắt, chữ viết trong ảnh, hoa văn lặp, ánh sáng & bóng đổ không nhất quán, kết cấu da quá mượt, nền méo, artefact nén, logo watermark AI.
Trả về CHÍNH XÁC một JSON (không markdown):
{"aiScore":0-100,"verdict":"real|likely_real|uncertain|likely_ai|ai","confidence":0-100,"summary":"1-2 câu tiếng Việt","aiSigns":["dấu hiệu AI"],"realSigns":["dấu hiệu ảnh thật"],"editedScore":0-100,"tips":["lời khuyên kiểm chứng"]}
aiScore = mức độ ảnh do AI tạo (100 = chắc chắn AI). editedScore = mức độ đã qua chỉnh sửa/ghép. Viết tiếng Việt, dễ hiểu với học sinh.`;
    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        {
          role: "user",
          content: [
            { type: "text", text: "Ảnh này có phải do AI tạo không? Mức độ bao nhiêu?" },
            { type: "image_url", image_url: { url: data.imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });
    return {
      aiScore: clampScore(parsed.aiScore),
      verdict: str(parsed.verdict, "uncertain"),
      confidence: clampScore(parsed.confidence),
      summary: str(parsed.summary, "Không đủ dữ liệu để kết luận chắc chắn."),
      aiSigns: strArr(parsed.aiSigns),
      realSigns: strArr(parsed.realSigns),
      editedScore: clampScore(parsed.editedScore),
      tips: strArr(parsed.tips),
    };
  });

/** Kiểm tra đường link có độc hại / lừa đảo không */
export const analyzeLink = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    const u = data?.url;
    if (!u || typeof u !== "string" || u.trim().length < 3) throw new Error("Thiếu đường link");
    return { url: u.trim().slice(0, 500) };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là hệ thống kiểm tra an toàn đường link (giống Kaspersky / VirusTotal) cho học sinh Việt Nam. Phân tích URL dựa trên: tên miền lạ, đuôi miền rủi ro (.tk .xyz .top .cc), giả mạo thương hiệu (typosquatting: faceb00k, shopee-vn-khuyenmai), dùng link rút gọn, IP thay cho tên miền, quá nhiều subdomain, tham số đáng ngờ, từ khoá lừa đảo (trung thưởng, nap the, kiem tien, otp, xac minh tai khoan), không dùng HTTPS.
Trả về CHÍNH XÁC một JSON (không markdown):
{"riskScore":0-100,"level":"safe|low|medium|high|dangerous","category":"phishing|malware|scam|adult|gambling|shortener|unknown|clean","summary":"1-2 câu tiếng Việt","redFlags":["dấu hiệu nguy hiểm"],"goodSigns":["dấu hiệu an toàn"],"advice":["nên làm gì"]}
Viết tiếng Việt. Nếu không chắc, nói rõ là không chắc và khuyên thận trọng.`;
    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Kiểm tra link này: ${data.url}` },
      ],
      response_format: { type: "json_object" },
    });
    return {
      riskScore: clampScore(parsed.riskScore),
      level: str(parsed.level, "unknown"),
      category: str(parsed.category, "unknown"),
      summary: str(parsed.summary, "Chưa đủ dữ liệu để kết luận."),
      redFlags: strArr(parsed.redFlags),
      goodSigns: strArr(parsed.goodSigns),
      advice: strArr(parsed.advice),
    };
  });

/** Kiểm tra đoạn văn bản có phải do AI viết không */
export const analyzeText = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string }) => {
    const t = data?.text;
    if (!t || typeof t !== "string" || t.trim().length < 20) {
      throw new Error("Cần ít nhất 20 ký tự để phân tích");
    }
    return { text: t.trim().slice(0, 6000) };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là chuyên gia phát hiện văn bản do AI viết. Dựa trên: độ đều của câu (perplexity/burstiness thấp), cụm từ sáo rỗng, cấu trúc liệt kê máy móc, thiếu chi tiết cá nhân, giọng văn trung tính quá mức, lặp cấu trúc.
Trả về CHÍNH XÁC một JSON (không markdown):
{"aiScore":0-100,"verdict":"human|likely_human|uncertain|likely_ai|ai","confidence":0-100,"summary":"1-2 câu tiếng Việt","aiSigns":["dấu hiệu AI"],"humanSigns":["dấu hiệu người viết"],"misinfoRisk":0-100,"tips":["cách kiểm chứng thông tin"]}
misinfoRisk = nguy cơ nội dung sai lệch/lừa đảo. Viết tiếng Việt.`;
    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: data.text },
      ],
      response_format: { type: "json_object" },
    });
    return {
      aiScore: clampScore(parsed.aiScore),
      verdict: str(parsed.verdict, "uncertain"),
      confidence: clampScore(parsed.confidence),
      summary: str(parsed.summary, "Chưa đủ dữ liệu để kết luận."),
      aiSigns: strArr(parsed.aiSigns),
      humanSigns: strArr(parsed.humanSigns),
      misinfoRisk: clampScore(parsed.misinfoRisk),
      tips: strArr(parsed.tips),
    };
  });

/** Kiểm tra email có phải giả mạo / lừa đảo không */
export const analyzeEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => {
    const t = data?.content;
    if (!t || typeof t !== "string" || t.trim().length < 5) {
      throw new Error("Hãy dán địa chỉ email hoặc nội dung email cần kiểm tra");
    }
    return { content: t.trim().slice(0, 6000) };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là hệ thống phát hiện email giả mạo (phishing / spoofing / BEC) cho học sinh Việt Nam. Người dùng có thể chỉ dán ĐỊA CHỈ EMAIL, hoặc dán cả NỘI DUNG email (tiêu đề, người gửi, thân thư, link đính kèm).
Hãy phân tích: tên miền người gửi có giống thương hiệu thật không (typosquatting: g00gle, faceb0ok-support, shopee-vn.info), dùng gmail/outlook miễn phí nhưng tự xưng là ngân hàng/công ty, tên hiển thị khác địa chỉ thật, tên miền mới lạ, ký tự lạ/Unicode giả, giọng văn hối thúc – doạ khoá tài khoản, yêu cầu OTP/mật khẩu/số thẻ, link không khớp thương hiệu, tệp đính kèm nguy hiểm (.exe .zip .html), lỗi chính tả, lời chào chung chung ("Kính gửi quý khách").
Trả về CHÍNH XÁC một JSON (không markdown):
{"riskScore":0-100,"level":"safe|low|medium|high|dangerous","type":"phishing|spoofing|scam|spam|marketing|legit|unknown","impersonating":"tên thương hiệu bị giả mạo hoặc rỗng","summary":"1-2 câu tiếng Việt","redFlags":["dấu hiệu giả mạo"],"goodSigns":["dấu hiệu đáng tin"],"advice":["nên làm gì"]}
riskScore = mức độ email là giả mạo/lừa đảo. Viết tiếng Việt dễ hiểu.`;
    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Kiểm tra email này:\n${data.content}` },
      ],
      response_format: { type: "json_object" },
    });
    return {
      riskScore: clampScore(parsed.riskScore),
      level: str(parsed.level, "unknown"),
      type: str(parsed.type, "unknown"),
      impersonating: str(parsed.impersonating, ""),
      summary: str(parsed.summary, "Chưa đủ dữ liệu để kết luận."),
      redFlags: strArr(parsed.redFlags),
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
  .inputValidator((data: { content: string }) => {
    const t = data?.content;
    if (!t || typeof t !== "string" || t.trim().length < 15) {
      throw new Error("Cần ít nhất 15 ký tự (tiêu đề, nội dung tin hoặc link bài báo)");
    }
    return { content: t.trim().slice(0, 6000) };
  })
  .handler(async ({ data }) => {
    const headlines = await fetchLatestNews(data.content);
    const today = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const feedBlock = headlines.length
      ? headlines.map((h, i) => `${i + 1}. [${h.source}] ${h.title}${h.date ? ` (${h.date})` : ""}`).join("\n")
      : "(Không tìm được tin liên quan trên Google Tin tức và các báo lớn trong hôm nay)";

    const sys = `Bạn là chuyên gia kiểm chứng tin tức (fact-check) cho học sinh Việt Nam. Hôm nay là ${today}.
Người dùng dán tiêu đề, nội dung tin hoặc link bài báo. Bạn được cung cấp DANH SÁCH TIN MỚI NHẤT hôm nay lấy trực tiếp từ Google Tin tức và các báo lớn (VnExpress, Tuổi Trẻ, Thanh Niên) để đối chiếu.
Hãy làm 3 việc:
1) TIN GIẢ: tiêu đề giật gân, nguồn mơ hồ ("theo một số nguồn tin"), không tác giả/thời gian, số liệu không kiểm chứng, kêu gọi chia sẻ gấp, thuyết âm mưu, mạo danh báo chính thống, lừa đảo tài chính/sức khoẻ.
2) TIN LÁ CẢI / TRUYỀN MIỆNG: tin vỉa hè, đồn thổi, "nghe nói", "bạn của bạn tôi kể", drama showbiz câu view, đời tư, giật tít câu click, nội dung cảm xúc nhưng không có dữ kiện, chỉ lan trên mạng xã hội/nhóm chat mà không báo chính thống nào đưa.
3) ĐỐI CHIẾU: có báo chính thống nào trong danh sách đưa tin tương tự không. Nếu KHÔNG có báo nào đưa → nêu rõ "chưa có báo chính thống nào xác nhận" và tăng tabloidScore.
Trả về CHÍNH XÁC một JSON (không markdown):
{"fakeScore":0-100,"tabloidScore":0-100,"level":"safe|low|medium|high|dangerous","verdict":"likely_true|unverified|misleading|likely_fake|fake","category":"tin giả|tin sai lệch|tin lá cải|tin đồn truyền miệng|giật tít|quảng cáo trá hình|lừa đảo|tin đáng tin|chưa rõ","summary":"1-2 câu tiếng Việt","matchedNews":["tiêu đề trong danh sách có liên quan (tối đa 4), ghi rõ tên báo"],"redFlags":["dấu hiệu tin giả / lá cải"],"goodSigns":["dấu hiệu đáng tin"],"checkSteps":["cách tự kiểm chứng"]}
fakeScore = mức độ là tin giả/sai lệch. tabloidScore = mức độ lá cải, tin đồn truyền miệng, câu view. Viết tiếng Việt dễ hiểu.`;

    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        {
          role: "user",
          content: `TIN CẦN KIỂM TRA:\n${data.content}\n\nTIN MỚI NHẤT HÔM NAY (${today}) TỪ GOOGLE TIN TỨC & BÁO LỚN:\n${feedBlock}`,
        },
      ],
      response_format: { type: "json_object" },
    });
    return {
      fakeScore: clampScore(parsed.fakeScore),
      tabloidScore: clampScore(parsed.tabloidScore),
      level: str(parsed.level, "unknown"),
      verdict: str(parsed.verdict, "unverified"),
      category: str(parsed.category, "chưa rõ"),
      summary: str(parsed.summary, "Chưa đủ dữ liệu để kết luận."),
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
  .inputValidator((data: { frames: string[]; note?: string }) => {
    const frames = Array.isArray(data?.frames)
      ? data.frames.filter(
          (f) => typeof f === "string" && /^data:image\/(png|jpeg|jpg|webp);base64,/.test(f),
        )
      : [];
    if (!frames.length) throw new Error("Không đọc được khung hình từ video");
    const picked = frames.slice(0, 5);
    const total = picked.reduce((s, f) => s + f.length, 0);
    if (total > 12_000_000) throw new Error("Video quá lớn để phân tích");
    return { frames: picked, note: typeof data?.note === "string" ? data.note.slice(0, 500) : "" };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là chuyên gia pháp y video số, phát hiện video do AI tạo (Sora, Veo, Kling, Runway), deepfake hoán đổi gương mặt, lồng tiếng AI, hoặc video thật nhưng CHỨA nội dung do AI dựng.
Người dùng gửi nhiều KHUNG HÌNH liên tiếp trích từ một video. Hãy so sánh các khung hình: khuôn mặt có biến dạng/nhấp nháy giữa các khung không, viền mặt – tóc – tai có nhoè hay không khớp, mắt/răng bất thường, tay và ngón tay, chữ trong khung bị loạn, hậu cảnh trôi/biến hình, ánh sáng và bóng đổ không nhất quán, kết cấu da quá mượt, chuyển động vật lý phi thực tế, watermark của công cụ AI.
Trả về CHÍNH XÁC một JSON (không markdown):
{"aiScore":0-100,"verdict":"real|likely_real|uncertain|likely_ai|ai","confidence":0-100,"deepfakeScore":0-100,"editedScore":0-100,"summary":"1-2 câu tiếng Việt","aiSigns":["dấu hiệu AI"],"realSigns":["dấu hiệu video thật"],"tips":["cách kiểm chứng"]}
aiScore = mức độ video do AI tạo/dựng. deepfakeScore = mức độ nghi hoán đổi gương mặt. editedScore = mức độ đã cắt ghép/chỉnh sửa. Viết tiếng Việt dễ hiểu với học sinh.`;
    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
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
    });
    return {
      aiScore: clampScore(parsed.aiScore),
      verdict: str(parsed.verdict, "uncertain"),
      confidence: clampScore(parsed.confidence),
      deepfakeScore: clampScore(parsed.deepfakeScore),
      editedScore: clampScore(parsed.editedScore),
      summary: str(parsed.summary, "Chưa đủ dữ liệu để kết luận."),
      aiSigns: strArr(parsed.aiSigns),
      realSigns: strArr(parsed.realSigns),
      tips: strArr(parsed.tips),
    };
  });
