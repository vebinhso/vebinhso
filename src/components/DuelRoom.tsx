import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listDuelTopics,
  startDuel,
  getDuel,
  submitDuelAnswer,
  finishDuel,
  type DuelSnapshot,
  type DuelTopic,
  type DuelPlayerInfo,
} from "@/lib/duels.functions";

type Props = {
  duelId: string;
  meId: string;
  onClose: (result?: { win: boolean | null; delta: number }) => void;
};

const QUESTION_MS = 10_000;
const REVEAL_MS = 1500;

type RoundState =
  | { phase: "playing"; answered: Set<string> }
  | { phase: "revealed"; correctIndexes: number[]; winnerUserId: string | null; myPick: number | null };

export function DuelRoom({ duelId, meId, onClose }: Props) {
  const listTopicsFn = useServerFn(listDuelTopics);
  const getDuelFn = useServerFn(getDuel);
  const startFn = useServerFn(startDuel);
  const submitFn = useServerFn(submitDuelAnswer);
  const finishFn = useServerFn(finishDuel);

  const [snap, setSnap] = useState<DuelSnapshot | null>(null);
  const [topics, setTopics] = useState<DuelTopic[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [round, setRound] = useState<RoundState>({ phase: "playing", answered: new Set() });
  const [remaining, setRemaining] = useState(QUESTION_MS);
  const startAtRef = useRef<number>(0);
  /** winnerUserId per resolved round; null = draw. Shared identically across both clients. */
  const [roundResults, setRoundResults] = useState<(string | null)[]>([]);
  const [starting, setStarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null); // 3-2-1 GO
  const [qCount, setQCount] = useState<number>(10);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isHost = snap?.hostId === meId;
  const hostInfo: DuelPlayerInfo | null = snap?.host ?? null;
  const guestInfo: DuelPlayerInfo | null = snap?.guest ?? null;
  const currentQ = snap?.questions?.[qIndex];
  const payout = snap?.payout ?? 30;
  // Scores derived from shared roundResults so both clients render identically.
  const hostScore = roundResults.filter((w) => w && w === snap?.hostId).length;
  const guestScore = roundResults.filter((w) => w && w === snap?.guestId).length;


  /* -------- Load initial + topics -------- */
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
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => { alive = false; };
  }, [duelId, meId, getDuelFn, listTopicsFn]);

  /* -------- Realtime room channel -------- */
  useEffect(() => {
    const ch = supabase.channel(`duel-room:${duelId}`, { config: { broadcast: { self: false } } });
    chanRef.current = ch;
    ch.on("broadcast", { event: "answered" }, ({ payload }) => {
      const p = payload as { qIndex: number; userId: string; isCorrect: boolean; correctIndexes: number[]; winnerUserId: string | null };
      setRound((cur) => {
        if (cur.phase !== "playing") return cur;
        const nextAns = new Set(cur.answered);
        nextAns.add(p.userId);
        if (p.winnerUserId || nextAns.size >= 2) {
          recordResult(p.qIndex, p.winnerUserId ?? null);
          return { phase: "revealed", correctIndexes: p.correctIndexes, winnerUserId: p.winnerUserId, myPick: cur.phase === "playing" ? null : null };
        }
        return { phase: "playing", answered: nextAns };
      });
    }).on("broadcast", { event: "advance" }, ({ payload }) => {
      const p = payload as { toIndex: number };
      setQIndex((cur) => Math.max(cur, p.toIndex));
    }).on("broadcast", { event: "start_active" }, ({ payload }) => {
      const p = payload as { snap: DuelSnapshot };
      setSnap(p.snap);
      setQIndex(0);
      setRoundResults([]);
    }).subscribe();
    return () => {
      supabase.removeChannel(ch);
      chanRef.current = null;
    };
  }, [duelId, meId]);

  /** Idempotently record who won round qi (null = draw). */
  const recordResult = useCallback((qi: number, winnerUserId: string | null) => {
    setRoundResults((prev) => {
      if (prev[qi] !== undefined) return prev;
      const next = prev.slice();
      while (next.length < qi) next.push(null);
      next[qi] = winnerUserId;
      return next;
    });
  }, []);


  /* -------- Countdown 3-2-1 when duel becomes active -------- */
  useEffect(() => {
    if (snap?.status !== "active") return;
    setCountdown(3);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c == null) return c;
        if (c <= 1) { clearInterval(t); return null; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [snap?.status]);

  /* -------- Per-question timer -------- */
  useEffect(() => {
    if (!snap || snap.status !== "active" || countdown != null) return;
    setRound({ phase: "playing", answered: new Set() });
    setRemaining(QUESTION_MS);
    startAtRef.current = Date.now();
    const iv = setInterval(() => {
      const left = QUESTION_MS - (Date.now() - startAtRef.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [qIndex, snap?.status, countdown]);

  /* -------- Timer expiry → reveal (no winner) -------- */
  useEffect(() => {
    if (remaining > 0) return;
    setRound((cur) => cur.phase === "playing"
      ? { phase: "revealed", correctIndexes: [], winnerUserId: null, myPick: null }
      : cur);
  }, [remaining]);

  /* -------- After reveal, auto-advance -------- */
  useEffect(() => {
    if (round.phase !== "revealed") return;
    const t = setTimeout(() => {
      if (!snap) return;
      const next = qIndex + 1;
      if (next >= snap.questions.length) {
        void doFinish();
      } else if (isHost) {
        chanRef.current?.send({ type: "broadcast", event: "advance", payload: { toIndex: next } });
        setQIndex(next);
      }
    }, REVEAL_MS);
    return () => clearTimeout(t);
  }, [round.phase, isHost, snap?.questions.length, qIndex]);

  const doFinish = useCallback(async () => {
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
  }, [finalizing, snap, finishFn, duelId]);

  const pick = async (idx: number) => {
    if (round.phase !== "playing" || !snap || !currentQ || remaining <= 0) return;
    if (round.answered.has(meId)) return;
    // Optimistically mark self as answered
    const nextAns = new Set(round.answered);
    nextAns.add(meId);
    setRound({ phase: "playing", answered: nextAns });
    const ms = Date.now() - startAtRef.current;
    try {
      const r = await submitFn({ data: { duelId, qIndex, selected: idx, ms } });
      chanRef.current?.send({
        type: "broadcast",
        event: "answered",
        payload: {
          qIndex,
          userId: meId,
          isCorrect: r.isCorrect,
          correctIndexes: r.correctIndexes,
          winnerUserId: r.winnerUserId,
        },
      });
      setRound((cur) => {
        if (cur.phase !== "playing") return cur;
        const answered = new Set(cur.answered);
        answered.add(meId);
        if (r.winnerUserId || answered.size >= 2) {
          if (r.winnerUserId === meId) setScoreMine((s) => s + 1);
          return { phase: "revealed", correctIndexes: r.correctIndexes, winnerUserId: r.winnerUserId, myPick: idx };
        }
        return { phase: "playing", answered };
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const chooseTopic = async (t: DuelTopic) => {
    if (starting || !t.enough) return;
    setStarting(true);
    setError(null);
    try {
      const count = Math.min(30, Math.max(10, qCount));
      const s = await startFn({ data: { duelId, category: t.category, domain: t.domain, count } });
      setSnap(s);
      setQIndex(0);
      setScoreMine(0);
      setScoreOpp(0);
      chanRef.current?.send({ type: "broadcast", event: "start_active", payload: { snap: s } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  /* -------- Finished -------- */
  if (snap?.status === "finished") {
    const iAmWinner = snap.winnerId === meId;
    const iAmDraw = snap.winnerId == null;
    const mine = isHost ? snap.hostScore : snap.guestScore;
    const opp = isHost ? snap.guestScore : snap.hostScore;
    const diff = Math.abs(snap.hostScore - snap.guestScore) * (snap.payout ?? 30);
    const delta = iAmDraw ? 0 : (iAmWinner ? diff : -diff);
    return (
      <Overlay wide>
        <div className="text-6xl mb-2">{iAmDraw ? "🤝" : iAmWinner ? "🏆" : "😿"}</div>
        <h2 className="text-2xl font-black mb-1">
          {iAmDraw ? "HOÀ" : iAmWinner ? "BẠN THẮNG!" : "Bạn thua"}
        </h2>
        <p className="font-black text-lg mb-3">
          Tỉ số: <span className="text-emerald-600">{mine}</span> - <span className="text-rose-600">{opp}</span>
        </p>
        <p className={`font-black mb-4 ${iAmDraw ? "text-stone-600" : iAmWinner ? "text-emerald-600" : "text-rose-600"}`}>
          {iAmDraw ? "Không đổi số dư" : iAmWinner ? `💰 +${diff}đ` : `💸 -${diff}đ`}
        </p>
        <button onClick={() => onClose({ win: iAmDraw ? null : iAmWinner, delta })} className="toy-button toy-button-primary">
          Đóng
        </button>
      </Overlay>
    );
  }

  /* -------- Pending / topic pick -------- */
  if (!snap || snap.status === "pending") {
    return (
      <Overlay wide>
        <ArenaHeader me={meInfo} opp={oppInfo} scoreMine={0} scoreOpp={0} />
        <h2 className="text-lg font-black mt-3 mb-1">⚔️ Phòng đấu 1vs1</h2>
        {error && <p className="text-rose-600 text-sm mb-2">{error}</p>}
        {snap && isHost ? (
          <>
            <p className="text-sm mb-2 text-stone-600">
              Chọn <b>số câu</b> và <b>chủ đề</b> để bắt đầu (mỗi câu 10s · thưởng <b>{payout}đ</b>/câu đúng đầu tiên):
            </p>
            <div className="mb-3 bg-purple-50 border-2 border-purple-200 rounded-xl p-3 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-purple-700">Số câu mỗi trận</span>
                <span className="text-lg font-black text-purple-700">{qCount} câu</span>
              </div>
              <input
                type="range"
                min={10}
                max={30}
                step={1}
                value={qCount}
                onChange={(e) => setQCount(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-purple-600 font-bold mt-1">
                <span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
              </div>
            </div>
            <div className="grid gap-2 max-h-[38vh] overflow-y-auto text-left">
              {topics.length === 0 && <p className="text-sm text-stone-500">Đang tải chủ đề…</p>}
              {topics.map((t) => {
                const wanted = Math.min(qCount, t.count);
                const canStart = t.count >= 10;
                return (
                  <button
                    key={`${t.category}|${t.domain ?? "null"}`}
                    disabled={starting || !canStart}
                    onClick={() => chooseTopic(t)}
                    className={`text-left px-3 py-2 rounded-xl border-2 font-bold transition ${
                      canStart
                        ? "bg-white border-purple-300 hover:border-purple-500 hover:bg-purple-50"
                        : "bg-stone-100 border-stone-300 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="font-black text-sm">{t.label}</div>
                    <div className="text-[11px] text-stone-500">
                      {canStart
                        ? `${t.count} câu trong kho · sẽ chơi ${wanted} câu${wanted < qCount ? " (chưa đủ)" : ""}`
                        : `Còn thiếu ${10 - t.count} câu (cần tối thiểu 10)`}
                    </div>
                  </button>
                );
              })}
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

  /* -------- Active (arena + question) -------- */
  if (!currentQ) return null;
  const timeRatio = remaining / QUESTION_MS;
  const revealed = round.phase === "revealed";
  const myPick = revealed ? round.myPick : null;
  const iWon = revealed && round.winnerUserId === meId;
  const iLost = revealed && round.winnerUserId != null && round.winnerUserId !== meId;

  return (
    <div className="fixed inset-0 z-[70] p-2 sm:p-4 grid place-items-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 bg-gradient-to-b from-indigo-800/80 to-slate-800/90">
        <ArenaHeader
          me={meInfo}
          opp={oppInfo}
          scoreMine={scoreMine}
          scoreOpp={scoreOpp}
          highlightMe={iWon}
          highlightOpp={iLost}
        />

        {/* Header meta */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between text-xs sm:text-sm font-black text-white/90">
          <span className="bg-white/10 px-2 py-1 rounded-full">Câu {qIndex + 1}/{snap.questions.length}</span>
          <span className="bg-white/10 px-2 py-1 rounded-full">💰 {payout}đ/câu</span>
        </div>

        {/* Timer bar */}
        <div className="mx-4 mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${timeRatio > 0.4 ? "bg-emerald-400" : timeRatio > 0.2 ? "bg-amber-400" : "bg-rose-500"}`}
            style={{ width: `${timeRatio * 100}%` }}
          />
        </div>

        {/* Question box */}
        <div className="p-4 bg-white/95 m-3 rounded-2xl shadow-inner">
          <h3 className="text-base sm:text-lg font-black mb-2 whitespace-pre-wrap">{currentQ.text}</h3>
          {currentQ.imageUrl && (
            <img src={currentQ.imageUrl} alt="" className="w-full max-h-40 object-contain rounded-lg mb-2" />
          )}
          <div className="grid gap-2 w-full">
            {currentQ.options.map((opt, i) => {
              const isCorrect = revealed && round.correctIndexes.includes(i);
              const isMyPick = myPick === i;
              const wrongPick = revealed && isMyPick && !isCorrect;
              return (
                <button
                  key={i}
                  disabled={round.phase !== "playing" || remaining <= 0 || round.answered?.has?.(meId)}
                  onClick={() => pick(i)}
                  className={`text-left px-3 py-2 rounded-lg border-2 font-bold transition ${
                    isCorrect ? "bg-emerald-100 border-emerald-500" :
                    wrongPick ? "bg-rose-100 border-rose-500" :
                    isMyPick ? "bg-blue-100 border-blue-400" :
                    "bg-white border-stone-300 hover:border-stone-500"
                  } disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                  <span className="mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                </button>
              );
            })}
          </div>
          {revealed && (
            <p className={`mt-2 font-black text-sm ${
              round.winnerUserId == null ? "text-stone-600" :
              iWon ? "text-emerald-600" : "text-rose-600"
            }`}>
              {round.winnerUserId == null
                ? "⏰ Không ai trả lời đúng — hoà câu này"
                : iWon
                  ? `✅ Bạn nhanh nhất! +${payout}đ`
                  : `❌ Đối thủ nhanh hơn — bạn mất ${payout}đ`}
            </p>
          )}
        </div>

        <div className="px-4 pb-4">
          <button onClick={() => { void doFinish(); }} className="toy-button toy-button-ghost text-xs w-full">
            🏳️ Bỏ cuộc
          </button>
        </div>
      </div>

      {countdown != null && (
        <div className="fixed inset-0 grid place-items-center pointer-events-none z-[80]">
          <div className="text-white font-black text-[8rem] drop-shadow-2xl animate-pulse">{countdown}</div>
        </div>
      )}
    </div>
  );
}

/* -------- Sub-components -------- */

function ArenaHeader({
  me, opp, scoreMine, scoreOpp, highlightMe, highlightOpp,
}: {
  me: DuelPlayerInfo | null;
  opp: DuelPlayerInfo | null;
  scoreMine: number;
  scoreOpp: number;
  highlightMe?: boolean;
  highlightOpp?: boolean;
}) {
  return (
    <div className="relative bg-gradient-to-r from-emerald-500/30 via-transparent to-rose-500/30 p-3 border-b-2 border-white/10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <Fighter side="left" info={me} score={scoreMine} highlight={highlightMe} />
        <div className="text-center shrink-0">
          <div className="text-2xl sm:text-3xl font-black text-white drop-shadow">⚔️</div>
          <div className="text-[10px] text-white/70 font-bold">VS</div>
        </div>
        <Fighter side="right" info={opp} score={scoreOpp} highlight={highlightOpp} />
      </div>
    </div>
  );
}

function Fighter({
  side, info, score, highlight,
}: {
  side: "left" | "right";
  info: DuelPlayerInfo | null;
  score: number;
  highlight?: boolean;
}) {
  const align = side === "left" ? "items-start text-left" : "items-end text-right";
  const flexRow = side === "left" ? "" : "flex-row-reverse";
  return (
    <div className={`flex flex-col ${align} gap-1 min-w-0`}>
      <div className={`flex items-center gap-2 min-w-0 ${flexRow}`}>
        <div className={`relative w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-full overflow-hidden border-4 shadow-lg transition-all ${
          highlight ? "border-yellow-300 scale-110" : side === "left" ? "border-emerald-300" : "border-rose-300"
        }`}>
          {info?.avatarUrl ? (
            <img src={info.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full grid place-items-center text-2xl font-black text-white ${
              side === "left" ? "bg-emerald-500" : "bg-rose-500"
            }`}>
              {(info?.username || "?").charAt(0).toUpperCase()}
            </div>
          )}
          {highlight && (
            <div className="absolute inset-0 bg-yellow-300/30 animate-pulse" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-white font-black text-sm truncate">
            @{info?.username ?? "…"}
          </div>
          <div className={`text-lg font-black leading-none ${side === "left" ? "text-emerald-200" : "text-rose-200"}`}>
            {score}
          </div>
        </div>
      </div>
    </div>
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
          <b>@{fromName}</b> mời bạn vào <b>phòng đấu 1vs1</b>.
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
