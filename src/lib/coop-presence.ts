// Real-time co-op presence: broadcast local player pos on a per-house channel
// and expose the list of other players currently in the same house.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RemotePlayer = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  x: number;
  z: number;
  angle: number;
  floor: number;
  lastSeen: number;
};

type Broadcast = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  x: number;
  z: number;
  angle: number;
  floor: number;
};

/**
 * Join a house presence channel (either your own house, or one you're visiting).
 * ownerId: the house owner's user id.
 * me: your identity to broadcast.
 * getPos: sampled ~10Hz to broadcast your current position/angle/floor.
 */
export function useHouseCoopPresence(opts: {
  enabled: boolean;
  ownerId: string | null;
  me: { userId: string; username: string; avatarUrl: string | null } | null;
  getPos: () => { x: number; z: number; angle: number; floor: number };
}) {
  const { enabled, ownerId, me } = opts;
  const [remotes, setRemotes] = useState<RemotePlayer[]>([]);
  const remotesRef = useRef<Map<string, RemotePlayer>>(new Map());
  const getPosRef = useRef(opts.getPos);
  getPosRef.current = opts.getPos;

  useEffect(() => {
    if (!enabled || !ownerId || !me) return;
    const chanName = `house:${ownerId}`;
    const channel = supabase.channel(chanName, {
      config: { broadcast: { self: false, ack: false } },
    });

    channel.on("broadcast", { event: "pos" }, (payload: any) => {
      const p = payload.payload as Broadcast;
      if (!p || p.userId === me.userId) return;
      remotesRef.current.set(p.userId, {
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        x: p.x,
        z: p.z,
        angle: p.angle,
        floor: p.floor,
        lastSeen: Date.now(),
      });
    });
    channel.on("broadcast", { event: "leave" }, (payload: any) => {
      const uid = payload.payload?.userId;
      if (uid) remotesRef.current.delete(uid);
    });

    let subscribed = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") subscribed = true;
    });

    // Broadcast own pos ~10Hz.
    const broadcastId = setInterval(() => {
      if (!subscribed) return;
      const pos = getPosRef.current();
      const msg: Broadcast = {
        userId: me.userId,
        username: me.username,
        avatarUrl: me.avatarUrl,
        x: pos.x,
        z: pos.z,
        angle: pos.angle,
        floor: pos.floor,
      };
      channel.send({ type: "broadcast", event: "pos", payload: msg });
    }, 100);

    // Prune stale (>3s no update) and publish remotes @ ~6Hz.
    const pruneId = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [k, v] of remotesRef.current) {
        if (now - v.lastSeen > 3000) {
          remotesRef.current.delete(k);
          changed = true;
        }
      }
      // Always publish snapshot for smooth motion.
      setRemotes(Array.from(remotesRef.current.values()));
      void changed;
    }, 160);

    return () => {
      channel.send({ type: "broadcast", event: "leave", payload: { userId: me.userId } });
      clearInterval(broadcastId);
      clearInterval(pruneId);
      supabase.removeChannel(channel);
      remotesRef.current.clear();
      setRemotes([]);
    };
  }, [enabled, ownerId, me?.userId, me?.username, me?.avatarUrl]);

  return remotes;
}
