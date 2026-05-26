// Friends — Supabase-backed with sync cache.
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, type Account } from "./auth";

export type Friendship = {
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
};

// Caches
let PROFILES: Account[] = [];
let FRIENDSHIPS: Friendship[] = [];
let CACHE_UID: string | null = null;

async function refresh(uid: string) {
  const [profilesRes, friendsRes] = await Promise.all([
    supabase.from("profiles").select("user_id, username, email, created_at"),
    supabase.from("friends").select("*"),
  ]);
  PROFILES = (profilesRes.data || []).map((p: any) => ({
    id: p.user_id,
    username: p.username,
    email: p.email || "",
    createdAt: p.created_at,
  }));
  FRIENDSHIPS = (friendsRes.data || []).map((f: any) => ({
    user_id: f.user_id, friend_id: f.friend_id, status: f.status, created_at: f.created_at,
  }));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("friends-change"));
}

function ensureCache() {
  const u = getCurrentUser();
  if (!u) return;
  if (CACHE_UID !== u.id) {
    CACHE_UID = u.id;
    refresh(u.id).catch(() => { /* noop */ });
  }
}

export function findUser(query: string): Account | null {
  ensureCache();
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return PROFILES.find((a) => a.username.toLowerCase() === q || a.id === q) || null;
}

export function findUserByName(username: string): Account | null {
  ensureCache();
  const u = username.trim().toLowerCase();
  if (!u) return null;
  return PROFILES.find((a) => a.username.toLowerCase() === u) || null;
}

export function getFriendship(a: string, b: string): Friendship | null {
  ensureCache();
  return FRIENDSHIPS.find(
    (f) => (f.user_id === a && f.friend_id === b) || (f.user_id === b && f.friend_id === a),
  ) || null;
}

export async function sendRequestAsync(myId: string, friendId: string): Promise<{ ok: boolean; msg: string }> {
  if (myId === friendId) return { ok: false, msg: "Không thể tự kết bạn với chính mình." };
  const existing = getFriendship(myId, friendId);
  if (existing?.status === "accepted") return { ok: false, msg: "Hai bạn đã là bạn bè." };
  // Auto-accept (simple model)
  const { error } = await supabase.from("friends").upsert({
    user_id: myId, friend_id: friendId, status: "accepted",
  });
  if (error) return { ok: false, msg: error.message };
  await refresh(myId);
  return { ok: true, msg: "Đã kết bạn thành công!" };
}

// Legacy sync wrapper (fire-and-forget)
export function sendRequest(myId: string, friendId: string): { ok: boolean; msg: string } {
  void sendRequestAsync(myId, friendId);
  return { ok: true, msg: "Đang gửi yêu cầu..." };
}

export async function acceptRequest(myId: string, requesterId: string) {
  await supabase.from("friends").update({ status: "accepted" })
    .eq("user_id", requesterId).eq("friend_id", myId);
  await refresh(myId);
}

export async function declineRequest(myId: string, requesterId: string) {
  await supabase.from("friends").delete()
    .eq("user_id", requesterId).eq("friend_id", myId);
  await refresh(myId);
}

export function listFriends(myId: string): Account[] {
  ensureCache();
  const ids = FRIENDSHIPS
    .filter((f) => f.status === "accepted" && (f.user_id === myId || f.friend_id === myId))
    .map((f) => (f.user_id === myId ? f.friend_id : f.user_id));
  return PROFILES.filter((a) => ids.includes(a.id));
}

export function listIncomingRequests(myId: string): { from: Account; created_at: number }[] {
  ensureCache();
  return FRIENDSHIPS
    .filter((f) => f.status === "pending" && f.friend_id === myId)
    .map((f) => {
      const from = PROFILES.find((a) => a.id === f.user_id);
      return from ? { from, created_at: new Date(f.created_at).getTime() } : null;
    })
    .filter((x): x is { from: Account; created_at: number } => x !== null);
}

export function me(): Account | null { return getCurrentUser(); }

export function getAllProfiles(): Account[] {
  ensureCache();
  return PROFILES;
}

export function refreshFriendsCache() {
  const u = getCurrentUser();
  if (u) refresh(u.id).catch(() => { /* noop */ });
}
