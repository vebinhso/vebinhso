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

let inflight: Promise<void> | null = null;
let loadedOnce = false;

async function refresh(uid: string) {
  // Chờ phiên đăng nhập sẵn sàng, nếu không RLS sẽ trả về rỗng
  try {
    await supabase.auth.getSession();
  } catch {
    /* noop */
  }
  const [profilesRes, friendsRes] = await Promise.all([
    supabase.from("profiles").select("user_id, username, created_at"),
    supabase.from("friends").select("*"),
  ]);
  PROFILES = (profilesRes.data || []).map((p: any) => ({
    id: p.user_id,
    username: p.username,
    email: "",
    createdAt: p.created_at,
  }));
  FRIENDSHIPS = (friendsRes.data || []).map((f: any) => ({
    user_id: f.user_id, friend_id: f.friend_id, status: f.status, created_at: f.created_at,
  }));
  CACHE_UID = uid;
  loadedOnce = PROFILES.length > 0;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("friends-change"));
}

/** Đảm bảo danh sách bạn bè đã được tải xong (dùng await để hiện ngay khi vào trang). */
export async function ensureFriendsLoaded(): Promise<void> {
  const u = getCurrentUser();
  if (!u) return;
  if (CACHE_UID === u.id && loadedOnce) return;
  if (!inflight) {
    inflight = refresh(u.id)
      .catch(() => { /* noop */ })
      .finally(() => { inflight = null; });
  }
  await inflight;
}

function ensureCache() {
  const u = getCurrentUser();
  if (!u) return;
  if (CACHE_UID !== u.id || !loadedOnce) void ensureFriendsLoaded();
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
  if (existing?.status === "pending") return { ok: false, msg: "Đã gửi lời mời, đang chờ phản hồi." };
  // Gửi lời mời ở trạng thái "pending" — người nhận sẽ đồng ý hoặc từ chối.
  const { error } = await supabase.from("friends").insert({
    user_id: myId, friend_id: friendId, status: "pending",
  });
  if (error) return { ok: false, msg: error.message };
  await refresh(myId);
  return { ok: true, msg: "Đã gửi lời mời kết bạn!" };
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
