import { getAccounts, getCurrentUser, type Account } from "./auth";

export type Friendship = {
  requester_id: number;
  receiver_id: number;
  status: "pending" | "accepted";
  created_at: number;
};

const KEY = "vebinhso_friendships";

function read(): Friendship[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: Friendship[]) { localStorage.setItem(KEY, JSON.stringify(list)); }

export function findUser(query: string): Account | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const accounts = getAccounts();
  return (
    accounts.find(
      (a) => a.username.toLowerCase() === q || String(a.id) === q,
    ) || null
  );
}

/** Tìm theo cả username VÀ id (phải khớp đồng thời). */
export function findUserStrict(username: string, id: string): Account | null {
  const u = username.trim().toLowerCase();
  const i = id.trim();
  if (!u || !i) return null;
  return (
    getAccounts().find(
      (a) => a.username.toLowerCase() === u && String(a.id) === i,
    ) || null
  );
}

export function getFriendship(a: number, b: number): Friendship | null {
  return (
    read().find(
      (f) =>
        (f.requester_id === a && f.receiver_id === b) ||
        (f.requester_id === b && f.receiver_id === a),
    ) || null
  );
}

export function sendRequest(myId: number, friendId: number): { ok: boolean; msg: string } {
  if (myId === friendId) return { ok: false, msg: "Không thể tự kết bạn với chính mình." };
  const list = read();
  const existing = list.find(
    (f) =>
      (f.requester_id === myId && f.receiver_id === friendId) ||
      (f.requester_id === friendId && f.receiver_id === myId),
  );
  if (existing) {
    if (existing.status === "accepted") return { ok: false, msg: "Hai bạn đã là bạn bè." };
    existing.status = "accepted";
    write(list);
    return { ok: true, msg: "Đã kết bạn thành công!" };
  }
  // Khớp đúng cả tên + ID => kết bạn ngay lập tức
  list.push({ requester_id: myId, receiver_id: friendId, status: "accepted", created_at: Date.now() });
  write(list);
  return { ok: true, msg: "Đã kết bạn thành công!" };
}

export function acceptRequest(myId: number, requesterId: number) {
  const list = read();
  const f = list.find(
    (x) => x.requester_id === requesterId && x.receiver_id === myId && x.status === "pending",
  );
  if (f) { f.status = "accepted"; write(list); }
}

export function declineRequest(myId: number, requesterId: number) {
  const list = read().filter(
    (x) => !(x.requester_id === requesterId && x.receiver_id === myId && x.status === "pending"),
  );
  write(list);
}

export function listFriends(myId: number): Account[] {
  const accounts = getAccounts();
  const ids = read()
    .filter((f) => f.status === "accepted" && (f.requester_id === myId || f.receiver_id === myId))
    .map((f) => (f.requester_id === myId ? f.receiver_id : f.requester_id));
  return accounts.filter((a) => ids.includes(a.id));
}

export function listIncomingRequests(myId: number): { from: Account; created_at: number }[] {
  const accounts = getAccounts();
  return read()
    .filter((f) => f.status === "pending" && f.receiver_id === myId)
    .map((f) => ({ from: accounts.find((a) => a.id === f.requester_id)!, created_at: f.created_at }))
    .filter((x) => !!x.from);
}

export function me(): Account | null { return getCurrentUser(); }
