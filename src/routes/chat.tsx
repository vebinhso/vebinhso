import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useState } from "react";

export const Route = createFileRoute("/chat")({ component: Chat });

function Chat() {
  const [msgs, setMsgs] = useState([
    { from: "An Nguyễn", text: "Hôm nay đi săn boss không?", me: false },
    { from: "Bạn", text: "Đợi mình cho Shiba ăn xong nhé!", me: true },
    { from: "Bình Lê", text: "Cute quá 🥰", me: false },
  ]);
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    setMsgs([...msgs, { from: "Bạn", text, me: true }]);
    setText("");
  };

  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-2xl w-full mx-auto flex-1 flex flex-col">
        <div className="glass-card p-6 flex-1 flex flex-col">
          <h1 className="text-3xl font-black text-center mb-4">💬 TRÒ CHUYỆN</h1>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto mb-4 min-h-[300px]">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[80%] p-3 rounded-2xl ${m.me ? "self-end bg-orange-400 text-white" : "self-start bg-white border-2 border-white"}`}>
                <p className="text-xs font-black opacity-80">{m.from}</p>
                <p className="font-bold">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Nhập tin nhắn..." className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none font-bold" />
            <button onClick={send} className="toy-button toy-button-primary !text-base !px-6 !py-3">GỬI</button>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
