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

/** Kiểm tra tin tức có phải tin giả không */
export const analyzeNews = createServerFn({ method: "POST" })
  .inputValidator((data: { content: string }) => {
    const t = data?.content;
    if (!t || typeof t !== "string" || t.trim().length < 15) {
      throw new Error("Cần ít nhất 15 ký tự (tiêu đề, nội dung tin hoặc link bài báo)");
    }
    return { content: t.trim().slice(0, 6000) };
  })
  .handler(async ({ data }) => {
    const sys = `Bạn là chuyên gia kiểm chứng tin tức (fact-check) cho học sinh Việt Nam. Người dùng dán tiêu đề, nội dung tin hoặc link bài báo.
Phân tích: tiêu đề giật gân/câu view, không nêu nguồn hoặc nguồn mơ hồ ("theo một số nguồn tin"), không có tên tác giả/thời gian, số liệu không kiểm chứng, ngôn ngữ cảm xúc – kích động, kêu gọi chia sẻ gấp, thuyết âm mưu, ảnh cũ dùng lại, mạo danh báo chính thống (VTV, VnExpress, Tuổi Trẻ), nội dung mâu thuẫn với kiến thức phổ thông, tin lừa đảo tài chính/sức khoẻ.
Trả về CHÍNH XÁC một JSON (không markdown):
{"fakeScore":0-100,"level":"safe|low|medium|high|dangerous","verdict":"likely_true|unverified|misleading|likely_fake|fake","category":"tin giả|tin sai lệch|giật tít|quảng cáo trá hình|lừa đảo|tin đáng tin|chưa rõ","summary":"1-2 câu tiếng Việt","redFlags":["dấu hiệu tin giả"],"goodSigns":["dấu hiệu đáng tin"],"checkSteps":["cách tự kiểm chứng"]}
fakeScore = mức độ tin này là tin giả/sai lệch. Nếu không có đủ dữ kiện, chọn "unverified" và nói rõ cần kiểm chứng. Viết tiếng Việt.`;
    const parsed = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Kiểm tra tin tức này:\n${data.content}` },
      ],
      response_format: { type: "json_object" },
    });
    return {
      fakeScore: clampScore(parsed.fakeScore),
      level: str(parsed.level, "unknown"),
      verdict: str(parsed.verdict, "unverified"),
      category: str(parsed.category, "chưa rõ"),
      summary: str(parsed.summary, "Chưa đủ dữ liệu để kết luận."),
      redFlags: strArr(parsed.redFlags),
      goodSigns: strArr(parsed.goodSigns),
      checkSteps: strArr(parsed.checkSteps),
    };
  });
