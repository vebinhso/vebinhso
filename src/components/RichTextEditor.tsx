import { useEffect, useRef } from "react";

/**
 * Trình soạn thảo đơn giản: in đậm, in nghiêng, gạch dưới, cỡ chữ, màu chữ.
 * Lưu nội dung dưới dạng HTML rút gọn (đã lọc thẻ nguy hiểm khi hiển thị).
 */

const COLORS: { label: string; value: string }[] = [
  { label: "Đen", value: "#111827" },
  { label: "Đỏ", value: "#dc2626" },
  { label: "Cam", value: "#ea580c" },
  { label: "Xanh lá", value: "#16a34a" },
  { label: "Xanh dương", value: "#2563eb" },
];

const SIZES: { label: string; value: string }[] = [
  { label: "Nhỏ", value: "2" },
  { label: "Vừa", value: "3" },
  { label: "Lớn", value: "5" },
];

const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "DIV", "P", "BR", "FONT", "UL", "OL", "LI"]);

/** Lọc HTML: chỉ giữ thẻ định dạng cơ bản và thuộc tính an toàn. */
export function sanitizeRichText(html: string): string {
  if (typeof window === "undefined") return "";
  const root = document.createElement("div");
  root.innerHTML = html;
  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!ALLOWED.has(child.tagName)) {
        const text = document.createTextNode(child.textContent || "");
        child.replaceWith(text);
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const ok =
          (name === "style" && /^(color|font-size|font-weight|text-decoration|font-style)\s*:/i.test(attr.value)) ||
          (child.tagName === "FONT" && (name === "color" || name === "size"));
        if (!ok) child.removeAttribute(attr.name);
      });
      walk(child);
    });
  };
  walk(root);
  return root.innerHTML;
}

export function isRichText(value?: string | null): boolean {
  return !!value && /<(b|strong|i|em|u|span|div|p|br|font|ul|ol|li)\b/i.test(value);
}

/** Hiển thị nội dung: hỗ trợ HTML định dạng, nếu là chữ thường thì giữ xuống dòng. */
export function RichText({ value, className = "" }: { value: string; className?: string }) {
  if (!isRichText(value)) {
    return <p className={`whitespace-pre-wrap break-words ${className}`}>{value}</p>;
  }
  return (
    <div
      className={`break-words [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
    />
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  minHeight = 88,
  className = "",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // chỉ đồng bộ khi nội dung bên ngoài khác hẳn (tránh nhảy con trỏ khi gõ)
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    try {
      document.execCommand("styleWithCSS", false, cmd === "foreColor" ? "true" : "false");
      document.execCommand(cmd, false, arg);
    } catch {}
    if (ref.current) onChange(sanitizeRichText(ref.current.innerHTML));
  };

  const btn = "px-2 py-1 rounded-lg border-2 border-gray-200 bg-white text-xs font-black hover:bg-gray-50";

  return (
    <div className={`rounded-xl border-2 border-gray-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-gray-100 p-1">
        <button type="button" onClick={() => exec("bold")} className={`${btn} font-black`} title="In đậm">
          B
        </button>
        <button type="button" onClick={() => exec("italic")} className={`${btn} italic`} title="In nghiêng">
          I
        </button>
        <button type="button" onClick={() => exec("underline")} className={`${btn} underline`} title="Gạch dưới">
          U
        </button>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        {SIZES.map((s) => (
          <button key={s.value} type="button" onClick={() => exec("fontSize", s.value)} className={btn} title={`Cỡ chữ ${s.label}`}>
            {s.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-200" />
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => exec("foreColor", c.value)}
            title={`Màu ${c.label}`}
            className="h-5 w-5 rounded-full border-2 border-white shadow ring-1 ring-gray-300"
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => onChange(sanitizeRichText(ref.current?.innerHTML || ""))}
        onBlur={() => onChange(sanitizeRichText(ref.current?.innerHTML || ""))}
        className="px-3 py-2 text-sm outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight }}
      />
    </div>
  );
}

export default RichTextEditor;
