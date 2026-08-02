/**
 * Bộ chạy phụ đề mượt & không bao giờ "thụt lùi".
 * - Luôn tiến tới (monotonic): số ký tự hiển thị chỉ tăng.
 * - Làm mượt: chữ tiến dần tới vị trí giọng đọc thay vì nhảy giật.
 */
export type CaptionEngine = ReturnType<typeof createCaptionEngine>;

export function createCaptionEngine(
  text: string,
  onText: (s: string) => void,
  onFull: () => void,
) {
  const len = text.length;
  let shown = 0; // số ký tự đang hiện (float)
  let target = 0; // đích mong muốn
  let raf = 0;
  let stopped = false;
  let lastTs = 0;
  let fullFired = false;

  // nguồn dẫn nhịp
  let mode: "idle" | "timer" | "audio" = "idle";
  let timerStart = 0;
  let timerTotal = Math.max(1600, len * 62);
  let timerDone: (() => void) | null = null;
  let timerEnded = false;
  let audio: HTMLAudioElement | null = null;

  const setTarget = (chars: number) => {
    const n = Math.max(0, Math.min(len, chars));
    if (n > target) target = n;
  };

  const loop = (ts: number) => {
    if (stopped) return;
    const dt = lastTs ? Math.min(120, ts - lastTs) : 16;
    lastTs = ts;

    if (mode === "timer") {
      const r = (ts - timerStart) / timerTotal;
      setTarget(len * r);
      if (r >= 1 && !timerEnded) {
        timerEnded = true;
        timerDone?.();
      }
    } else if (mode === "audio" && audio) {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) setTarget(len * (audio.currentTime / d) * 1.02);
    }

    const diff = target - shown;
    if (diff > 0.01) {
      // lấp khoảng cách trong ~200ms, tối thiểu 16 ký tự/giây → luôn mượt
      const speed = Math.max(diff / 0.2, 16);
      shown = Math.min(target, shown + (speed * dt) / 1000);
      onText(text.slice(0, Math.floor(shown)));
      if (shown >= len - 0.01 && !fullFired) {
        fullFired = true;
        onFull();
      }
    }
    raf = requestAnimationFrame(loop);
  };

  const ensureLoop = () => {
    if (!raf && !stopped) raf = requestAnimationFrame(loop);
  };

  return {
    /** Đã có nguồn dẫn nhịp (timer hoặc audio) hay chưa */
    isRunning() {
      return mode !== "idle";
    },
    /** Chạy phụ đề theo đồng hồ (khi chưa/không có giọng đọc) */
    startTimer(onEnd?: () => void) {
      mode = "timer";
      timerEnded = false;
      timerDone = onEnd ?? null;
      timerStart = performance.now();
      timerTotal = Math.max(1600, len * 62);
      ensureLoop();
    },
    /** Bám theo con trỏ phát của audio */
    followAudio(el: HTMLAudioElement) {
      mode = "audio";
      audio = el;
      ensureLoop();
    },
    /** Mốc từ SpeechSynthesis (chỉ đẩy tới, không kéo lùi) */
    boundary(charIndex: number) {
      setTarget(charIndex);
      ensureLoop();
    },
    /** Kết thúc: hiện trọn câu (vẫn chạy mượt tới cuối) */
    complete() {
      mode = "idle";
      setTarget(len);
      ensureLoop();
    },
    /** Hiện ngay toàn bộ (người chơi bấm bỏ qua) */
    finishNow() {
      mode = "idle";
      shown = len;
      target = len;
      onText(text);
      if (!fullFired) {
        fullFired = true;
        onFull();
      }
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
