import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import { listFriends } from "@/lib/friends";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat")({ component: Chat });

type Msg = { id: string; from: string; text: string; at: number };

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

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate({ to: "/login" }); return; }
    setUser(u);
    setFriends(listFriends(u.id));
  }, [navigate]);

  const loadMsgs = async () => {
    if (!user || activeId == null) { setMsgs([]); return; }
    const tk = threadKey(user.id, activeId);
    const { data } = await supabase
      .from("messages")
      .select("id, from_id, text, created_at")
      .eq("thread_key", tk)
      .order("created_at", { ascending: true });
    if (data) {
      setMsgs(data.map((r: any) => ({ id: r.id, from: r.from_id, text: r.text, at: new Date(r.created_at).getTime() })));
    }
  };

  useEffect(() => {
    loadMsgs();
    if (activeId == null) return;
    const t = setInterval(loadMsgs, 3000);
    return () => clearInterval(t);
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
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveId(f.id)}
                      className={`text-left px-3 py-2 rounded-xl border-2 transition min-w-[160px] ${
                        active ? "bg-orange-400 text-white border-orange-600" : "bg-white/80 border-white hover:bg-white"
                      }`}
                    >
                      <div className="font-black text-sm truncate">{f.username}</div>
                      <div className={`text-[10px] truncate ${active ? "text-white/80" : "text-muted-foreground"}`}>
                        Nhấn để mở
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
                <div className="font-black text-center mb-2">
                  {activeFriend.username} <span className="text-xs text-orange-700">#{activeFriend.id}</span>
                </div>
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto mb-3 min-h-[260px] max-h-[55vh] p-2 bg-white/40 rounded-xl">
                  {msgs.length === 0 ? (
                    <p className="m-auto text-sm text-muted-foreground italic">Chưa có tin nhắn nào. Hãy chào nhau! 👋</p>
                  ) : (
                    msgs.map((m) => {
                      const me = m.from === user.id;
                      return (
                        <div key={m.id} className={`max-w-[80%] p-2.5 rounded-2xl ${me ? "self-end bg-orange-400 text-white" : "self-start bg-white border-2 border-white"}`}>
                          <p className="font-bold text-sm">{m.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
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
