import { useEffect, useRef, useState } from "react";

type Props = {
  onFile: (file: File) => void;
  /** Loại tệp chấp nhận khi dán/kéo thả. Mặc định chỉ ảnh. */
  accept?: (file: File) => boolean;
  className?: string;
  hint?: string;
  children?: React.ReactNode;
};

/**
 * Vùng cho phép DÁN ẢNH (Ctrl+V) và KÉO THẢ tệp.
 * Chỉ nhận sự kiện paste khi con trỏ đang ở trong vùng hoặc vùng đang được focus,
 * nên nhiều vùng trên cùng một trang không xung đột nhau.
 */
export function PasteDropZone({
  onFile,
  accept = (f) => f.type.startsWith("image/"),
  className = "",
  hint = "Bấm vào đây rồi nhấn Ctrl+V để dán ảnh · hoặc kéo thả tệp",
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [over, setOver] = useState(false);
  const cb = useRef(onFile);
  cb.current = onFile;
  const acceptRef = useRef(accept);
  acceptRef.current = accept;

  useEffect(() => {
    if (!active) return;
    const handler = (ev: ClipboardEvent) => {
      const items = ev.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f && acceptRef.current(f)) {
            ev.preventDefault();
            cb.current(f);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [active]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => {
        if (!ref.current?.contains(document.activeElement)) setActive(false);
      }}
      onFocus={() => setActive(true)}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setActive(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer?.files?.[0];
        if (f && acceptRef.current(f)) cb.current(f);
      }}
      className={`rounded-xl outline-none transition ${
        over ? "ring-2 ring-blue-400 bg-blue-50/60" : active ? "ring-2 ring-orange-300" : ""
      } ${className}`}
    >
      {children}
      {hint && <p className="mt-1 text-[11px] font-bold text-muted-foreground">📋 {hint}</p>}
    </div>
  );
}
