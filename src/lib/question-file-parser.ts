// Parse rich file formats (DOCX, PPTX, PDF, TXT) into raw text so users
// can paste-import questions. Actual CSV/JSON parsing happens elsewhere.
import type { TeacherQuestion } from "@/lib/teacher";

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const ext = name.slice(name.lastIndexOf(".") + 1);

  if (["csv", "json", "txt", "md"].includes(ext)) return await file.text();

  if (ext === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const arrayBuffer = await file.arrayBuffer();
    const res = await (mammoth as any).extractRawText({ arrayBuffer });
    return String(res?.value || "");
  }

  if (ext === "pptx") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slideFiles = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    slideFiles.sort();
    const parts: string[] = [];
    for (const name of slideFiles) {
      const xml = await zip.files[name].async("string");
      const texts = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) => decode(m[1]));
      parts.push(texts.join(" "));
    }
    return parts.join("\n");
  }

  if (ext === "pdf") {
    const pdfjs: any = await import("pdfjs-dist");
    // Worker: use inlined data URL so Cloudflare/edge dev doesn't need extra assets.
    try {
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    } catch { /* fallback: main thread */ }
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const out: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      out.push(tc.items.map((it: any) => it.str).join(" "));
    }
    return out.join("\n");
  }

  // Fallback: try plain text
  return await file.text();
}

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/**
 * Heuristic parser: turn a block of raw text (from docx/pdf/pptx) into
 * TeacherQuestion[]. Recognises common Vietnamese/English formats:
 *
 *   Câu 1: Nội dung câu hỏi?
 *   A. đáp án 1
 *   B. đáp án 2 *
 *   C. đáp án 3
 *   D. đáp án 4
 *   Đáp án: B      (optional — otherwise mark correct with * or ✓)
 */
export function parseQuestionsFromText(text: string): TeacherQuestion[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const questions: TeacherQuestion[] = [];
  let cur: { text: string; options: { text: string; correct: boolean }[]; declaredAnswer?: string } | null = null;

  const flush = () => {
    if (!cur) return;
    if (!cur.text || cur.options.length < 2) { cur = null; return; }
    let correctIndexes = cur.options
      .map((o, i) => (o.correct ? i : -1))
      .filter((i) => i >= 0);
    if (correctIndexes.length === 0 && cur.declaredAnswer) {
      const letter = cur.declaredAnswer.trim().toUpperCase().charAt(0);
      const idx = "ABCDEFGH".indexOf(letter);
      if (idx >= 0 && idx < cur.options.length) correctIndexes = [idx];
    }
    if (correctIndexes.length === 0) correctIndexes = [0];
    questions.push({
      text: cur.text.trim(),
      choices: cur.options.map((o) => ({ text: o.text.trim() })),
      correctIndexes,
      reward: 10,
      enabled: true,
    });
    cur = null;
  };

  const qStart = /^(?:Câu|Cau|Question|Q|C)\s*[.:)-]?\s*\d+[.:)-]?\s*(.*)$/i;
  const optStart = /^([A-Ha-h])[.):\-]\s*(.+)$/;
  const answerLine = /^(?:Đáp\s*án|Dap\s*an|Answer|Ans)\s*[:\-]\s*(.+)$/i;

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    const mA = line.match(answerLine);
    if (mA && cur) { cur.declaredAnswer = mA[1]; continue; }

    const mQ = line.match(qStart);
    if (mQ) {
      flush();
      cur = { text: mQ[1] || "", options: [] };
      continue;
    }

    const mO = line.match(optStart);
    if (mO && cur) {
      let txt = mO[2];
      let correct = false;
      if (/[*✓✔]\s*$/.test(txt) || /^\s*[*✓✔]/.test(txt)) {
        correct = true;
        txt = txt.replace(/[*✓✔]/g, "").trim();
      }
      cur.options.push({ text: txt, correct });
      continue;
    }

    // Continuation: append to question text or last option
    if (cur) {
      if (cur.options.length === 0) cur.text += " " + line;
      else cur.options[cur.options.length - 1].text += " " + line;
    }
  }
  flush();
  return questions;
}
