// Tải ảnh kèm phần trăm THẬT (theo số byte đã nhận) + bộ nhớ đệm blob để mở lại là hiện ngay.
import { useEffect, useState } from "react";

const blobCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

/** Tải sẵn ảnh vào bộ nhớ đệm (không cần %) */
export function warmImage(url: string) {
  if (!url || blobCache.has(url) || inflight.has(url)) return;
  void fetchImage(url, () => {});
}

async function fetchImage(url: string, onPct: (p: number) => void): Promise<string> {
  const cached = blobCache.get(url);
  if (cached) {
    onPct(100);
    return cached;
  }
  const running = inflight.get(url);
  if (running) {
    onPct(60);
    return running;
  }

  const task = (async () => {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error("tải ảnh lỗi");
    const total = Number(res.headers.get("content-length") || 0);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        // có content-length → % thật; không có → ước lượng theo byte đã nhận
        onPct(total ? Math.min(99, (received / total) * 100) : Math.min(95, received / 8000));
      }
    }
    const blob = new Blob(chunks as BlobPart[], {
      type: res.headers.get("content-type") || "image/jpeg",
    });
    const objUrl = URL.createObjectURL(blob);
    blobCache.set(url, objUrl);
    inflight.delete(url);
    return objUrl;
  })();

  inflight.set(url, task);
  task.catch(() => inflight.delete(url));
  return task;
}

/**
 * Trả về { src, percent, ready }.
 * - Ảnh đã có trong đệm: hiện ngay lập tức (không nhấp nháy thanh tải).
 * - Ảnh mới: phần trăm bám đúng lượng dữ liệu đã tải.
 */
export function useImageProgress(url?: string | null) {
  const cachedNow = url ? blobCache.get(url) : undefined;
  const [state, setState] = useState<{ src: string; percent: number }>(() => ({
    src: cachedNow || "",
    percent: cachedNow ? 100 : 0,
  }));

  useEffect(() => {
    if (!url) {
      setState({ src: "", percent: 0 });
      return;
    }
    const hit = blobCache.get(url);
    if (hit) {
      setState({ src: hit, percent: 100 });
      return;
    }
    let alive = true;
    setState({ src: "", percent: 0 });
    fetchImage(url, (p) => {
      if (alive) setState((s) => (p > s.percent ? { ...s, percent: p } : s));
    })
      .then((src) => alive && setState({ src, percent: 100 }))
      // dự phòng: dùng thẳng URL gốc nếu fetch bị chặn
      .catch(() => alive && setState({ src: url, percent: 100 }));
    return () => {
      alive = false;
    };
  }, [url]);

  return { src: state.src, percent: state.percent, ready: state.percent >= 100 && !!state.src };
}
