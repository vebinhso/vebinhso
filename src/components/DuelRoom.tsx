import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listDuelTopics,
  startDuel,
  getDuel,
  submitDuelAnswer,
  finishDuel,
  type DuelSnapshot,
  type DuelTopic,
} from "@/lib/duels.functions";

type Props = {
  duelId: string;
  meId: string;
  onClose: (result?: { win: boolean | null; delta: number }) => void;
};

const QUESTION_MS = 10_000;

export function DuelRoom({ duelId, meId, onClose }: Props) {
  const listTopicsFn = useServerFn(listDuelTopics);
  const getDuelFn = useServerFn(getDuel);
  const startFn = useServerFn(startDuel);
  const submitFn = useServerFn(submitDuelAnswer);
  const finishFn = useServerFn(finishDuel);

  const [snap, setSnap] = useState<DuelSnapshot | null>(null);
  const [topics, setTopics] = useState<DuelTopic[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [reveal, setReveal] = useState<number[] | null>(null);
  const [remaining, setRemaining] = useState(QUESTION_MS);
  const startAtRef = useRef<number>(0);
  const [scoreMine, setScoreMine] = useState(0);
  const [scoreOpp, setScoreOpp] = useState(0);
  const [starting, setStarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial snapshot + topics
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getDuelFn({ data: { duelId } });
        if (!alive) return;
        setSnap(s);
        if (s.status === "pending" && s.hostId === meId) {
          const t = await listTopicsFn();
          if (alive) setTopics(t);
        }
        if (s.status === "finished") {
          const iAmWinner = s.winnerId === meId;
          const iAmDraw = s.winnerId == null;
          onClose({
            win: iAmDraw ? null : iAmWinner,
            delta: iAmDraw ? 0 : (iAmWinner ? s.payout : -s.payout),
          });
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => { alive = false; };
  }, [duelId, meId, getDuelFn, listTopicsFn, onClose]);

  // Guest polling: wait for host to start
  useEffect(() => {
    if (!snap || snap.status !== "pending") return;
    if (snap.hostId === meId) return;
    const t = setInterval(async () => {
      try {
        const s = await getDuelFn({ data: { duelId } });
        setSnap(s);
        if (s.status !== "pending") clearInterval(t);
      } catch {}
    }, 1200);
    return () => clearInterval(t);
  }, [snap?.status, snap?.hostId, meId, duelId, getDuelFn]);

  // Per-question countdown
  useEffect(() => {
    if (!snap || snap.status !== "active") return;
    setSelected(null);
    setReveal(null);
    setRemaining(QUESTION_MS);
    startAtRef.current = Date.now();
    const iv = setInterval(() => {
      const left = QUESTION_MS - (Date.now() - startAtRef.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(iv);
        // auto-advance after showing "hết giờ" 900ms
        setTimeout(advance, 900);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [qIndex, snap?.status]);

  const currentQ = snap?.questions?.[qIndex];
  const isHost = snap?.hostId === meId;

  const advance = () => {
    setQIndex((i) => {
      if (!snap) return i;
      if (i + 1 >= snap.questions.length) {
        void doFinish();
        return i;
      }
      return i + 1;
    });
  };

  const doFinish = async () => {
    if (finalizing || !snap) return;
    setFinalizing(true);
    try {
      const fin = await finishFn({ data: { duelId } });
      setSnap(fin);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFinalizing(false);
    }
  };

  const pick = async (idx: number) => {
    if (selected != null || !snap || !currentQ) return;
    setSelected(idx);
    const ms = Date.now() - startAtRef.current;
    try {
      const r = await submitFn({ data: { duelId, qIndex, selected: idx, ms } });
      setReveal(r.correctIndexes);
      if (r.isCorrect) setScoreMine((s) => s + 1);
      // Show result for 1.4s then advance
      setTimeout(advance, 1400);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const chooseTopic = async (t: DuelTopic) => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const s = await startFn({ data: { duelId, category: t.category, domain: t.domain } });
      setSnap(s);
      setQIndex(0);
      setScoreMine(0);
      setScoreOpp(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  // Finished view
  if (snap?.status === "finished") {
    const iAmWinner = snap.winnerId === meId;
    const iAmDraw = snap.winnerId == null;
    const mine = isHost ? snap.hostScore : snap.guestScore;
    const opp = isHost ? snap.guestScore : snap.hostScore;
    return (
      <Overlay>
        <div className="text-6xl mb-2">{iAmDraw ? "🤝" : iAmWinner ? "🏆" : "😿"}</div>
        <h2 className="text-2xl font-black mb-1">
          {iAmDraw ? "HOÀ" : iAmWinner ? "BẠN THẮNG!" : "Bạn thua"}
        </h2>
        <p className="font-black text-lg mb-3">
          Tỉ số: <span className="text-emerald-600">{mine}</span> - <span className="text-rose-600">{opp}</span>
        </p>
        <p className={`font-black mb-4 ${iAmDraw ? "text-stone-600" : iAmWinner ? "text-emerald-600" : "text-rose-600"}`}>
          {iAmDraw ? "Không đổi số dư" : iAmWinner ? `💰 +${snap.payout}đ` : `💸 -${snap.payout}đ`}
        </p>
        <button
          onClick={() => onClose({ win: iAmDraw ? null : iAmWinner, delta: iAmDraw ? 0 : (iAmWinner ? snap.payout : -snap.payout) })}
          className="toy-button toy-button-primary"
        >
          Đóng
        </button>
      </Overlay>
    );
  }

  // Waiting for host to pick / pending
  if (!snap || snap.status === "pending") {
    return (
      <Overlay>
        <h2 className="text-2xl font-black mb-2">⚔️ Phòng đấu</h2>
        {error && <p className="text-rose-600 text-sm mb-2">{error}</p>}
        {snap && isHost ? (
          <>
            <p className="text-sm mb-3 text-stone-600">Chọn một chủ đề để bắt đầu (10 câu × 10s):</p>
            <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
              {topics.length === 0 && (
                <p className="text-sm text-stone-500">Đang tải chủ đề…</p>
              )}
              {topics.map((t) => (
                <button
                  key={`${t.category}|${t.domain ?? "all"}`}
                  disabled={starting}
                  onClick={() => chooseTopic(t)}
                  className="toy-button text-left !py-2 !px-3"
                >
                  <div className="font-black">{t.label}</div>
                  <div className="text-xs text-stone-500">{t.count} câu · nhấn để bắt đầu</div>
                </button>
              ))}
            </div>
            <button onClick={() => onClose()} className="toy-button toy-button-ghost mt-4 w-full">Huỷ</button>
          </>
        ) : (
          <>
            <p className="mb-4">Đang chờ chủ phòng chọn chủ đề…</p>
            <button onClick={() => onClose()} className="toy-button toy-button-ghost">Rời phòng</button>
          </>
        )}
      </Overlay>
    );
  }

  // Active — question
  if (!currentQ) return null;
  const timeRatio = remaining / QUESTION_MS;
  return (
    <Overlay wide>
      <div className="w-full flex items-center justify-between mb-2 text-sm font-black">
        <span className="text-emerald-700">Bạn: {scoreMine}</span>
        <span className="text-stone-500">Câu {qIndex + 1}/{snap.questions.length}</span>
        <span className="text-rose-700">Đối thủ: {scoreOpp}</span>
      </div>
      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all ${timeRatio > 0.4 ? "bg-emerald-500" : timeRatio > 0.2 ? "bg-amber-500" : "bg-rose-500"}`}
          style={{ width: `${timeRatio * 100}%` }}
        />
      </div>
      <h3 className="text-base sm:text-lg font-black mb-2 whitespace-pre-wrap">{currentQ.text}</h3>
      {currentQ.imageUrl && (
        <img src={currentQ.imageUrl} alt="" className="w-full max-h-48 object-contain rounded-lg mb-2" />
      )}
      <div className="grid gap-2 w-full">
        {currentQ.options.map((opt, i) => {
          const isPicked = selected === i;
          const isCorrect = reveal?.includes(i);
          const isWrongPick = reveal != null && isPicked && !isCorrect;
          return (
            <button
              key={i}
              disabled={selected != null || remaining <= 0}
              onClick={() => pick(i)}
              className={`text-left px-3 py-2 rounded-lg border-2 font-bold transition ${
                reveal != null && isCorrect ? "bg-emerald-100 border-emerald-500" :
                isWrongPick ? "bg-rose-100 border-rose-500" :
                isPicked ? "bg-blue-100 border-blue-400" :
                "bg-white border-stone-300 hover:border-stone-500"
              } ${(selected != null || remaining <= 0) && !isPicked && !isCorrect ? "opacity-70" : ""}`}
            >
              <span className="mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>
      {reveal != null && (
        <p className={`mt-2 font-black text-sm ${reveal.includes(selected ?? -1) ? "text-emerald-600" : "text-rose-600"}`}>
          {reveal.includes(selected ?? -1) ? "✅ Chính xác!" : "❌ Sai rồi"}
        </p>
      )}
      {remaining <= 0 && selected == null && (
        <p className="mt-2 font-black text-sm text-rose-600">⏰ Hết giờ</p>
      )}
      <button onClick={() => { void doFinish(); }} className="toy-button toy-button-ghost mt-3 text-xs">
        Bỏ cuộc
      </button>
    </Overlay>
  );
}

function Overlay({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 grid place-items-center p-3">
      <div className={`bg-white rounded-2xl shadow-2xl p-5 ${wide ? "max-w-lg" : "max-w-sm"} w-full text-center`}>
        {children}
      </div>
    </div>
  );
}

/** Small inline invite dialog. */
export function DuelInviteDialog({
  fromName,
  onAccept,
  onDecline,
}: {
  fromName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [left, setLeft] = useState(20);
  useEffect(() => {
    const t = setInterval(() => setLeft((v) => {
      if (v <= 1) { clearInterval(t); onDecline(); return 0; }
      return v - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [onDecline]);
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 grid place-items-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full text-center">
        <div className="text-5xl mb-2">⚔️</div>
        <h3 className="text-xl font-black mb-1">Lời mời đấu</h3>
        <p className="mb-3">
          <b>@{fromName}</b> mời bạn vào <b>phòng đấu 1vs1</b> (10 câu, 30đ).
        </p>
        <p className="text-xs text-stone-500 mb-3">Tự huỷ sau {left}s</p>
        <div className="flex gap-2">
          <button onClick={onDecline} className="toy-button toy-button-ghost flex-1">Từ chối</button>
          <button onClick={onAccept} className="toy-button toy-button-primary flex-1">Đồng ý</button>
        </div>
      </div>
    </div>
  );
}
