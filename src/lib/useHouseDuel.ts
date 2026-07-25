// Realtime hook: house-scoped duel invites & signalling via Supabase broadcast.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HousePeer = {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type IncomingInvite = {
  duelId: string;
  fromId: string;
  fromName: string;
};

export type DuelStartSignal = { duelId: string };

type HelloMsg = { userId: string; username: string; displayName?: string | null; avatarUrl?: string | null };

type Args = {
  ownerId: string | null | undefined;
  me: HousePeer | null;
};

/**
 * Manages a `house-duel:<ownerId>` broadcast channel. Tracks other players in
 * the same house via periodic "hello" pings, and relays duel invites/starts.
 */
export function useHouseDuel({ ownerId, me }: Args) {
  const [peers, setPeers] = useState<HousePeer[]>([]);
  const [incoming, setIncoming] = useState<IncomingInvite | null>(null);
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef(new Map<string, { peer: HousePeer; lastSeen: number }>());

  useEffect(() => {
    if (!ownerId || !me) return;
    const channel = supabase.channel(`house-duel:${ownerId}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    chanRef.current = channel;

    const sendHello = () => {
      channel.send({
        type: "broadcast",
        event: "hello",
        payload: {
          userId: me.userId,
          username: me.username,
          displayName: me.displayName ?? null,
          avatarUrl: me.avatarUrl ?? null,
        } satisfies HelloMsg,
      });
    };

    channel
      .on("broadcast", { event: "hello" }, ({ payload }) => {
        const p = payload as HelloMsg;
        if (!p?.userId || p.userId === me.userId) return;
        peersRef.current.set(p.userId, {
          peer: {
            userId: p.userId,
            username: p.username,
            displayName: p.displayName ?? null,
            avatarUrl: p.avatarUrl ?? null,
          },
          lastSeen: Date.now(),
        });
        refreshPeers();
        // Immediately reply so the new joiner also sees us.
        sendHello();
      })
      .on("broadcast", { event: "bye" }, ({ payload }) => {
        const uid = (payload as { userId?: string })?.userId;
        if (!uid) return;
        peersRef.current.delete(uid);
        refreshPeers();
      })
      .on("broadcast", { event: "invite" }, ({ payload }) => {
        const p = payload as { duelId: string; toId: string; fromId: string; fromName: string };
        if (p?.toId !== me.userId) return;
        setIncoming({ duelId: p.duelId, fromId: p.fromId, fromName: p.fromName });
      })
      .on("broadcast", { event: "invite_cancel" }, ({ payload }) => {
        const p = payload as { duelId: string };
        setIncoming((cur) => (cur?.duelId === p.duelId ? null : cur));
      })
      .on("broadcast", { event: "start" }, ({ payload }) => {
        const p = payload as { duelId: string; hostId: string; guestId: string };
        if (p.hostId === me.userId || p.guestId === me.userId) setActiveDuelId(p.duelId);
      })
      .on("broadcast", { event: "end" }, ({ payload }) => {
        const p = payload as { duelId: string };
        setActiveDuelId((cur) => (cur === p.duelId ? null : cur));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") sendHello();
      });

    const helloTimer = setInterval(sendHello, 8000);
    const pruneTimer = setInterval(() => {
      const cutoff = Date.now() - 25_000;
      let changed = false;
      for (const [id, v] of peersRef.current) {
        if (v.lastSeen < cutoff) {
          peersRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) refreshPeers();
    }, 5000);

    function refreshPeers() {
      setPeers(Array.from(peersRef.current.values()).map((v) => v.peer));
    }

    return () => {
      try { channel.send({ type: "broadcast", event: "bye", payload: { userId: me.userId } }); } catch {}
      supabase.removeChannel(channel);
      chanRef.current = null;
      peersRef.current.clear();
      setPeers([]);
      setIncoming(null);
    };
  }, [ownerId, me?.userId]);

  const sendInvite = useCallback((toId: string, duelId: string) => {
    if (!chanRef.current || !me) return;
    chanRef.current.send({
      type: "broadcast",
      event: "invite",
      payload: { duelId, toId, fromId: me.userId, fromName: me.displayName || me.username },
    });
  }, [me]);

  const cancelInvite = useCallback((duelId: string) => {
    chanRef.current?.send({ type: "broadcast", event: "invite_cancel", payload: { duelId } });
  }, []);

  const announceStart = useCallback((duelId: string, hostId: string, guestId: string) => {
    chanRef.current?.send({
      type: "broadcast",
      event: "start",
      payload: { duelId, hostId, guestId },
    });
    setActiveDuelId(duelId);
  }, []);

  const announceEnd = useCallback((duelId: string) => {
    chanRef.current?.send({ type: "broadcast", event: "end", payload: { duelId } });
    setActiveDuelId((cur) => (cur === duelId ? null : cur));
  }, []);

  const dismissIncoming = useCallback(() => setIncoming(null), []);

  return useMemo(() => ({
    peers,
    incoming,
    activeDuelId,
    setActiveDuelId,
    sendInvite,
    cancelInvite,
    announceStart,
    announceEnd,
    dismissIncoming,
  }), [peers, incoming, activeDuelId, sendInvite, cancelInvite, announceStart, announceEnd, dismissIncoming]);
}
