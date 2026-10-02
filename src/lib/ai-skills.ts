// Dùng chung client + server. KHÔNG import supabase ở đây.

export const SKILL_KEYS = [
  "vbs-bao-gia",
  "vbs-hinh-anh-ai",
  "vbs-video-ai",
  "vbs-link-email-gia",
  "vbs-van-ban-ai",
  "vbs-so-dien-thoai-gia",
] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];


export const CHECK_KINDS = [
  "news", "image", "video", "link", "email", "text", "phone", "privacy_media", "privacy_text",
] as const;
export type CheckKind = (typeof CHECK_KINDS)[number];

export const FEEDBACK_KINDS = ["news", "image", "video", "link", "email", "text", "phone"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const CHECK_LABELS_VI: Record<CheckKind, string> = {
  news: "Tin tức",
  image: "Ảnh",
  video: "Video",
  link: "Link",
  email: "Email",
  text: "Văn bản",
  phone: "Số điện thoại",
  privacy_media: "Lộ thông tin qua ảnh/video",
  privacy_text: "Lộ thông tin qua chữ",
};

export type RuntimeSkill = { key: string; version: number; text: string };

function splitFrontmatter(md: string): { fm: string | null; body: string } {
  const src = md.replace(/^\uFEFF/, "");
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { fm: null, body: src };
  return { fm: m[1], body: src.slice(m[0].length) };
}

export function parseSkillMarkdown(md: string): { key: string; title: string } {
  const { fm, body } = splitFrontmatter(md);
  if (fm === null) throw new Error("Thiếu frontmatter YAML (khối --- ở đầu file)");
  const nameLine = fm.split(/\r?\n/).find((l) => /^name\s*:/.test(l));
  if (!nameLine) throw new Error("Thiếu dòng name: trong frontmatter");
  const key = nameLine.replace(/^name\s*:/, "").trim().replace(/^["']|["']$/g, "");
  if (!/^vbs-[a-z0-9-]+$/.test(key)) {
    throw new Error(`Key "${key}" sai định dạng (phải khớp vbs-[a-z0-9-]+)`);
  }
  const h1 = body.split(/\r?\n/).find((l) => l.startsWith("# "));
  const title = h1 ? h1.slice(2).trim() || key : key;
  return { key, title };
}

const DROP_SECTIONS = ["## Khung trả lời", "## Ví dụ", "## Cơ sở khoa học"];

export function stripSkillForRuntime(md: string): string {
  const { body } = splitFrontmatter(md);
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      skipping = DROP_SECTIONS.some((p) => line.startsWith(p));
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").trim();
}

const ANCHOR = "Trả về CHÍNH XÁC một JSON";

export function withSkill(sys: string, skill: RuntimeSkill | null): string {
  if (!skill) return sys;
  const block = `=== SKILL VỆ BINH SỐ: ${skill.key} (phiên bản ${skill.version}) ===
${skill.text}
=== HẾT SKILL ===
CÁCH DÙNG SKILL KHI TRẢ KẾT QUẢ JSON:
- Dùng dấu hiệu, cách kiểm tra, công cụ và giọng văn của skill để viết summary, các danh sách dấu hiệu và lời khuyên.
- Điểm rủi ro (riskScore, fakeScore, misinfoRisk) theo 3 mức của skill: 🔴 Nguy hiểm từ 70 điểm, 🟡 Cần kiểm tra thêm 40-69, 🟢 An toàn dưới 40.
- Điểm khả năng do AI tạo (aiScore, deepfakeScore): Cao từ 70, Chưa rõ 40-69, Thấp dưới 40. Do AI tạo chưa chắc đã nguy hiểm.
- Các trường danh mục (category, scamCategory, aiCategory, editCategory) vẫn chọn theo bộ tiêu chí ở trên.
- Không dùng khung trả lời dạng chữ của skill. Chỉ trả về JSON theo mô tả ngay sau đây.
`;
  const idx = sys.indexOf(ANCHOR);
  if (idx < 0) return `${sys}\n\n${block}`;
  return sys.slice(0, idx) + block + "\n" + sys.slice(idx);
}
