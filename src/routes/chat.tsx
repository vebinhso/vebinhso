import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { listFriends } from "@/lib/friends";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat")({ component: Chat });

type Msg = {
  id: string;
  from: string;
  text: string;
  at: number;
  delivered_at: number | null;
  seen_at: number | null;
};

function threadKey(a: string, b: string) {
  return [a, b].sort().join("-");
}

function Chat() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [friends, setFriends] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [peerTyping, setPeerTyping] = useState(false);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate({ to: "/login" }); return; }
    setUser(u);
    setFriends(listFriends(u.id));
  }, [navigate]);

  // Presence: track online users globally
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnlineIds(new Set(Object.keys(state)));
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ online_at: Date.now() });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markDeliveredSeen = async (friendId: string) => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    // Mark all incoming messages from this friend as delivered+seen
    await supabase
      .from("messages")
      .update({ delivered_at: nowIso, seen_at: nowIso })
      .eq("to_id", user.id)
      .eq("from_id", friendId)
      .is("seen_at", null);
  };

  const loadMsgs = async () => {
    if (!user || activeId == null) { setMsgs([]); return; }
    const tk = threadKey(user.id, activeId);
    const { data } = await supabase
      .from("messages")
      .select("id, from_id, text, created_at, delivered_at, seen_at")
      .eq("thread_key", tk)
      .order("created_at", { ascending: true });
    if (data) {
      setMsgs(data.map((r: any) => ({
        id: r.id,
        from: r.from_id,
        text: r.text,
        at: new Date(r.created_at).getTime(),
        delivered_at: r.delivered_at ? new Date(r.delivered_at).getTime() : null,
        seen_at: r.seen_at ? new Date(r.seen_at).getTime() : null,
      })));
    }
  };

  // Load + realtime subscriptions for the active thread
  useEffect(() => {
    setPeerTyping(false);
    if (!user || activeId == null) { setMsgs([]); return; }
    loadMsgs().then(() => markDeliveredSeen(activeId));

    const tk = threadKey(user.id, activeId);

    // Postgres changes for this thread
    const dbCh = supabase
      .channel(`messages-${tk}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `thread_key=eq.${tk}` },
        () => { loadMsgs().then(() => markDeliveredSeen(activeId)); },
      )
      .subscribe();

    // Typing broadcast channel
    const typingCh = supabase.channel(`typing-${tk}`, {
      config: { broadcast: { self: false } },
    });
    typingCh.on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload?.from === activeId) {
        setPeerTyping(true);
        if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 2500);
      }
    });
    typingCh.subscribe();
    typingChannelRef.current = typingCh;

    return () => {
      supabase.removeChannel(dbCh);
      supabase.removeChannel(typingCh);
      typingChannelRef.current = null;
      if (peerTypingTimeoutRef.current) clearTimeout(peerTypingTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeId]);

  if (!user) return null;

  const send = async () => {
    if (!text.trim() || activeId == null || !user) return;
    const tk = threadKey(user.id, activeId);
    const content = text.trim();
    setText("");
    await supabase.from("messages").insert({
      thread_key: tk, from_id: user.id, to_id: activeId, text: content,
    });
    loadMsgs();
  };

  const handleTextChange = (v: string) => {
    setText(v);
    const now = Date.now();
    if (typingChannelRef.current && now - lastTypingSentRef.current > 1200) {
      lastTypingSentRef.current = now;
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { from: user.id },
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { lastTypingSentRef.current = 0; }, 1500);
  };

  const activeFriend = friends.find((f) => f.id === activeId) || null;

  return (
    <GameLayout showBack>
      <div className="p-4 md:p-8 max-w-4xl w-full mx-auto flex-1 flex flex-col">
        <div className="glass-card p-4 flex-1 flex flex-col md:flex-row gap-3 min-h-[60vh]">
          {/* Friends list */}
          <aside className="md:w-[220px] border-b-2 md:border-b-0 md:border-r-2 border-white/60 pb-3 md:pb-0 md:pr-3">
            <h2 className="font-black text-center mb-3">💬 BẠN BÈ</h2>
            {friends.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground italic">Chưa có bạn bè để trò chuyện.</p>
            ) : (
              <div className="flex md:flex-col gap-2 overflow-x-auto">
                {friends.map((f) => {
                  const active = activeId === f.id;
                  const online = onlineIds.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveId(f.id)}
                      className={`text-left px-3 py-2 rounded-xl border-2 transition min-w-[160px] ${
                        active ? "bg-orange-400 text-white border-orange-600" : "bg-white/80 border-white hover:bg-white"
                      }`}
                    >
                      <div className="font-black text-sm truncate flex items-center gap-1.5">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full border ${
                            online ? "bg-green-500 border-green-700" : "bg-red-500 border-red-700"
                          }`}
                          title={online ? "Online" : "Offline"}
                        />
                        <span className="truncate">{f.username}</span>
                      </div>
                      <div className={`text-[10px] truncate ${active ? "text-white/80" : "text-muted-foreground"}`}>
                        {online ? "Đang online" : "Offline"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Conversation */}
          <div className="flex-1 flex flex-col">
            {!activeFriend ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <p className="font-bold text-muted-foreground">
                  {friends.length === 0
                    ? "Hãy kết bạn ở Trang chủ để bắt đầu trò chuyện."
                    : "Chọn một người bạn để mở cuộc trò chuyện."}
                </p>
              </div>
            ) : (
              <>
                <div className="font-black text-center mb-2 flex items-center justify-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full border ${
                      onlineIds.has(activeFriend.id)
                        ? "bg-green-500 border-green-700"
                        : "bg-red-500 border-red-700"
                    }`}
                  />
                  {activeFriend.username}
                  <span className="text-xs text-orange-700">#{activeFriend.id}</span>
                </div>
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto mb-3 min-h-[260px] max-h-[55vh] p-2 bg-white/40 rounded-xl">
                  {msgs.length === 0 ? (
                    <p className="m-auto text-sm text-muted-foreground italic">Chưa có tin nhắn nào. Hãy chào nhau! 👋</p>
                  ) : (
                    msgs.map((m, i) => {
                      const me = m.from === user.id;
                      const isLastMine = me && i === msgs.length - 1 - [...msgs].reverse().findIndex((x) => x.from === user.id);
                      const status = m.seen_at ? "✓✓ Đã xem" : m.delivered_at ? "✓✓ Đã nhận" : "✓ Đã gửi";
                      return (
                        <div key={m.id} className={`flex flex-col ${me ? "items-end" : "items-start"}`}>
                          <div className={`max-w-[80%] p-2.5 rounded-2xl ${me ? "bg-orange-400 text-white" : "bg-white border-2 border-white"}`}>
                            <p className="font-bold text-sm">{m.text}</p>
                          </div>
                          {me && isLastMine && (
                            <span className={`text-[10px] font-bold mt-0.5 mr-1 ${m.seen_at ? "text-blue-600" : "text-muted-foreground"}`}>
                              {status}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                  {peerTyping && (
                    <div className="self-start bg-white border-2 border-white px-3 py-1.5 rounded-2xl">
                      <span className="text-xs font-bold text-muted-foreground italic">
                        {activeFriend.username} đang nhập...
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold"
                  />
                  <button onClick={send} className="toy-button toy-button-primary !text-base !px-6 !py-3">GỬI</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
