import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(body: unknown) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI chưa được cấu hình");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

const str = (v: unknown, fb = "") => (typeof v === "string" && v.trim() ? v.trim().slice(0, 600) : fb);
const strArr = (v: unknown, max = 6) =>
  Array.isArray(v)
    ? v.filter((x) => typeof x === "string" && x.trim()).slice(0, max).map((x) => String(x).trim().slice(0, 160))
    : [];

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

export type FoundItem = {
  title: string;
  link: string;
  source: string;
  date: string;
  snippet: string;
  kind: "news" | "web" | "video";
};

async function safeFetch(url: string, ms = 8000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        "Accept-Language": "vi,en;q=0.8",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

/** Google News RSS — bao phủ mọi báo lớn nhỏ (kể cả Mực Tím, báo địa phương) */
async function googleNews(query: string): Promise<FoundItem[]> {
  const xml = await safeFetch(
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`,
  );
  if (!xml) return [];
  const items = xml.split(/<item[\s>]/).slice(1, 16);
  const out: FoundItem[] = [];
  for (const raw of items) {
    const title = decodeXml(raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    if (!title) continue;
    out.push({
      title: title.slice(0, 200),
      link: decodeXml(raw.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").slice(0, 500),
      source: decodeXml(raw.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "") || "Google Tin tức",
      date: decodeXml(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ""),
      snippet: decodeXml(raw.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").slice(0, 220),
      kind: "news",
    });
  }
  return out;
}

function hostOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Tìm trang web / video bằng DuckDuckGo (bản HTML nhẹ) */
async function ddg(query: string, kind: "web" | "video"): Promise<FoundItem[]> {
  const html = await safeFetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=vn-vi`);
  if (!html) return [];
  const out: FoundItem[] = [];
  const re =
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 14) {
    let link = m[1] ?? "";
    const dec = link.match(/uddg=([^&]+)/);
    if (dec?.[1]) link = decodeURIComponent(dec[1]);
    if (!/^https?:\/\//.test(link)) continue;
    const title = decodeXml(m[2] ?? "");
    if (!title) continue;
    out.push({
      title: title.slice(0, 200),
      link: link.slice(0, 500),
      source: hostOf(link) || "Web",
      date: "",
      snippet: decodeXml(m[3] ?? "").slice(0, 220),
      kind,
    });
  }
  return out;
}

function dedupe(items: FoundItem[]) {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = (i.link || i.title).toLowerCase();
    if (!i.link || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Truy nguồn: dán ảnh hoặc thông tin → tìm bài báo, trang tin, video có nội dung đó */
export const findSources = createServerFn({ method: "POST" })
  .inputValidator((data: { text?: string; imageUrl?: string }) => {
    const text = typeof data?.text === "string" ? data.text.trim().slice(0, 3000) : "";
    const imageUrl = typeof data?.imageUrl === "string" ? data.imageUrl : "";
    if (imageUrl && !/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(imageUrl) && !/^https?:\/\//.test(imageUrl)) {
      throw new Error("Ảnh không hợp lệ");
    }
    if (imageUrl.length > 8_000_000) throw new Error("Ảnh quá lớn (tối đa ~5MB)");
    if (!text && !imageUrl) throw new Error("Hãy dán một tấm ảnh hoặc nhập thông tin cần truy nguồn");
    if (!imageUrl && text.length < 8) throw new Error("Cần ít nhất 8 ký tự để tìm nguồn");
    return { text, imageUrl };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là trợ lý truy tìm nguồn gốc thông tin cho học sinh Việt Nam. Người dùng gửi một tấm ảnh và/hoặc một đoạn thông tin, và muốn tìm những BÀI BÁO, TRANG TIN, VIDEO đã đăng nội dung đó.
Nhiệm vụ: mô tả ngắn nội dung, rồi tạo các TỪ KHOÁ TÌM KIẾM tiếng Việt tốt nhất để tra trên Google Tin tức và web (bao gồm cả báo nhỏ như Mực Tím, báo địa phương, trang trường học).
Trả về CHÍNH XÁC một JSON (không markdown):
{"describe":"mô tả 1-2 câu nội dung ảnh/thông tin","queries":["từ khoá tìm kiếm 1","2","3"],"entities":["tên người/địa danh/sự kiện nhận ra"],"tips":["mẹo tự truy nguồn ảnh, ví dụ tìm ảnh ngược"]}
queries: 2-4 truy vấn ngắn (3-10 từ), khác góc độ nhau, tiếng Việt, không dấu ngoặc kép.`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Hãy giúp tôi tìm bài báo/video/trang tin có nội dung này.${data.text ? `\nThông tin: ${data.text}` : ""}`,
      },
    ];
    if (data.imageUrl) userContent.push({ type: "image_url", image_url: { url: data.imageUrl } });

    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    let queries = strArr(parsed.queries, 4).filter((q) => q.length > 2);
    if (!queries.length) queries = [data.text.slice(0, 120) || "tin tức"];

    const tasks: Promise<FoundItem[]>[] = [];
    for (const q of queries.slice(0, 3)) {
      tasks.push(googleNews(q));
      tasks.push(ddg(q, "web"));
    }
    tasks.push(ddg(`${queries[0]} site:youtube.com`, "video"));
    const settled = await Promise.all(tasks);
    const all = dedupe(settled.flat()).slice(0, 40);

    // Bước xác minh: chỉ giữ lại nguồn THỰC SỰ đăng nội dung/ảnh này
    let kept = all;
    if (all.length) {
      const list = all
        .map((it, i) => `${i}. [${it.source}] ${it.title} — ${it.snippet}`.slice(0, 300))
        .join("\n");
      const verifySys = `Bạn là người kiểm chứng nguồn. Người dùng có một nội dung/ảnh. Dưới đây là danh sách kết quả tìm kiếm thô.
Chỉ chọn những mục THỰC SỰ nói về đúng nội dung/ảnh đó (cùng sự việc, cùng nhân vật, cùng sự kiện). Loại bỏ mọi mục chỉ trùng từ khoá chung chung, khác sự việc, hoặc không liên quan.
Nếu KHÔNG có mục nào thật sự khớp, trả mảng rỗng.
Trả về CHÍNH XÁC JSON: {"matches":[{"i":số thứ tự,"score":0-100,"why":"lý do ngắn"}],"verdict":"mô tả 1 câu"}
Chỉ đưa mục có score >= 70.`;
      const vUser: any[] = [
        {
          type: "text",
          text: `Nội dung cần truy nguồn: ${data.text || "(xem ảnh đính kèm)"}\nMô tả nhận diện: ${str(parsed.describe, "")}\n\nKẾT QUẢ TÌM KIẾM:\n${list}`,
        },
      ];
      if (data.imageUrl) vUser.push({ type: "image_url", image_url: { url: data.imageUrl } });
      const v = await callGateway({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: verifySys },
          { role: "user", content: vUser },
        ],
        response_format: { type: "json_object" },
      });
      const matches = Array.isArray(v?.matches) ? v.matches : [];
      const picked = matches
        .filter((m: any) => typeof m?.i === "number" && Number(m?.score ?? 0) >= 70 && all[m.i])
        .map((m: any) => ({ ...all[m.i]!, why: str(m.why, "") }));
      kept = picked;
    }

    const news = kept.filter((i) => i.kind === "news").slice(0, 12);
    const video = kept
      .filter((i) => i.kind === "video" || /youtube\.com|youtu\.be|tiktok\.com/.test(i.link))
      .slice(0, 6);
    const videoLinks = new Set(video.map((v) => v.link));
    const web = kept.filter((i) => i.kind === "web" && !videoLinks.has(i.link)).slice(0, 12);

    const total = news.length + web.length + video.length;

    return {
      describe: str(parsed.describe, "Đã phân tích nội dung bạn gửi."),
      queries: queries.slice(0, 3),
      entities: strArr(parsed.entities, 6),
      tips: strArr(parsed.tips, 5),
      news,
      web,
      video,
      total,
      scanned: all.length,
      found: total > 0,
      checkedAt: new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    };
  });

