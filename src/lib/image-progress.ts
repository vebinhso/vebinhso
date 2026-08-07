// Hiển thị ảnh trực tiếp bằng URL để tận dụng cache HTTP của trình duyệt.
// Không fetch lại thành blob: cách cũ khiến ảnh bị tải hai lần và chỉ hiện sau khi nhận đủ 100%.
import { useEffect, useState } from "react";

const warmed = new Set<string>();

/** Nạp sẵn bằng bộ tải ảnh gốc; trình duyệt tự dùng lại cùng response từ HTTP cache. */
export function warmImage(url: string) {
  if (!url || warmed.has(url) || typeof window === "undefined") return;
  warmed.add(url);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

/**
 * Trả về { src, percent, ready }.
 * URL được trả ngay ở lần render đầu để thẻ img có thể bắt đầu tải tức thì.
 * Không chặn giao diện để đợi fetch stream hoàn tất.
 */
export function useImageProgress(url?: string | null) {
  const [src, setSrc] = useState(url || "");

  useEffect(() => {
    setSrc(url || "");
    if (url) warmImage(url);
  }, [url]);

  return { src, percent: src ? 100 : 0, ready: !!src };
}
