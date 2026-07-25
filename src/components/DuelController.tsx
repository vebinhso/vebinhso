import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useHouseDuel, type HousePeer } from "@/lib/useHouseDuel";
import { createDuel, respondDuel } from "@/lib/duels.functions";
import { DuelRoom, DuelInviteDialog } from "@/components/DuelRoom";

type Props = {
  ownerId: string;
  me: HousePeer;
  onPayout?: (delta: number) => void;
};

/**
 * Renders the "who's here / invite / receive invite / duel modal" UI for the
 * current house. Mount once at the top of a house-scoped route.
 */
export function DuelController({ ownerId, me, onPayout }: Props) {
  const {
    peers, incoming, activeDuelId, setActiveDuelId,
    sendInvite, cancelInvite, announceStart, announceEnd, dismissIncoming,
  } = useHouseDuel({ ownerId, me });

  const createFn = useServerFn(createDuel);
  const respondFn = useServerFn(respondDuel);
  const [inviting, setInviting] = useState<string | null>(null);
  const [pendingDuelId, setPendingDuelId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2400);
  };

  const invite = async (peer: HousePeer) => {
    if (inviting) return;
    setInviting(peer.userId);
    try {
      const r = await createFn({ data: { guestId: peer.userId, ownerId } });
      setPendingDuelId(r.duelId);
      sendInvite(peer.userId, r.duelId);
      notify(`📨 Đã gửi lời mời tới @${peer.username}`);
      // Assume acceptance if guest starts sending duel signals; else timeout in 25s
      setTimeout(() => {
        setPendingDuelId((cur) => {
          if (cur === r.duelId && !activeDuelId) {
            cancelInvite(r.duelId);
            notify("⏰ Đối thủ không phản hồi");
            return null;
          }
          return cur;
        });
      }, 25_000);
      // Host proactively enters the room immediately to choose a topic.
      announceStart(r.duelId, me.userId, peer.userId);
      setActiveDuelId(r.duelId);
    } catch (e) {
      notify(`❌ ${(e as Error).message}`);
    } finally {
      setInviting(null);
    }
  };

  const acceptIncoming = async () => {
    if (!incoming) return;
    const inv = incoming;
    dismissIncoming();
    try {
      await respondFn({ data: { duelId: inv.duelId, accept: true } });
      announceStart(inv.duelId, inv.fromId, me.userId);
      setActiveDuelId(inv.duelId);
    } catch (e) {
      notify(`❌ ${(e as Error).message}`);
    }
  };

  const declineIncoming = async () => {
    if (!incoming) return;
    const inv = incoming;
    dismissIncoming();
    try { await respondFn({ data: { duelId: inv.duelId, accept: false } }); } catch {}
    cancelInvite(inv.duelId);
  };

  const closeDuel = (result?: { win: boolean | null; delta: number }) => {
    if (activeDuelId) announceEnd(activeDuelId);
    setActiveDuelId(null);
    setPendingDuelId(null);
    if (result && result.delta !== 0) {
      onPayout?.(result.delta);
      notify(result.delta > 0 ? `💰 +${result.delta}đ` : `💸 ${result.delta}đ`);
    }
  };

  return (
    <>
      {/* Peers list — floating panel */}
      {peers.length > 0 && !activeDuelId && (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-40 max-w-[70vw]">
          <div className="glass-card p-2 shadow-lg border-2 border-purple-300">
            <div className="text-[11px] font-black text-purple-700 px-1 mb-1">⚔️ Người cùng nhà</div>
            <div className="flex flex-col gap-1 max-h-[35vh] overflow-y-auto">
              {peers.map((p) => (
                <button
                  key={p.userId}
                  disabled={!!inviting || !!pendingDuelId}
                  onClick={() => invite(p)}
                  className={`toy-button !text-xs !py-1.5 !px-2 flex items-center gap-2 ${inviting === p.userId ? "opacity-70" : ""}`}
                >
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} className="w-6 h-6 rounded-full" alt="" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-orange-400 text-white grid place-items-center text-xs font-black">
                      {(p.username || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate max-w-[10rem]">@{p.username}</span>
                  <span className="ml-1">⚔️</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-[65] glass-card px-4 py-2 font-black text-sm shadow-lg">
          {notice}
        </div>
      )}

      {incoming && !activeDuelId && (
        <DuelInviteDialog
          fromName={incoming.fromName}
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {activeDuelId && (
        <DuelRoom duelId={activeDuelId} meId={me.userId} onClose={closeDuel} />
      )}
    </>
  );
}
