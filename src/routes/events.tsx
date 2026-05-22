import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";

export const Route = createFileRoute("/events")({ component: Events });

const events = [
  { icon: "🎉", title: "Lễ hội mùa hè", desc: "Nhận x2 vàng khi cho ăn", time: "Còn 2 ngày" },
  { icon: "🎁", title: "Quà đăng nhập", desc: "Đăng nhập 7 ngày nhận Shiba Vàng", time: "Hằng ngày" },
  { icon: "⚔️", title: "Đấu trường", desc: "Top 10 nhận skin huyền thoại", time: "Còn 5 ngày" },
  { icon: "🌸", title: "Sự kiện hoa anh đào", desc: "Trang trí sân vườn miễn phí", time: "Sắp mở" },
];

function Events() {
  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-black text-center mb-6">🔥 SỰ KIỆN HOT</h1>
          <div className="flex flex-col gap-4">
            {events.map((e) => (
              <div key={e.title} className="flex items-center gap-4 bg-white/85 rounded-3xl p-4 border-2 border-white">
                <div className="text-5xl">{e.icon}</div>
                <div className="flex-1">
                  <h3 className="font-black text-lg">{e.title}</h3>
                  <p className="text-sm font-bold text-muted-foreground">{e.desc}</p>
                  <p className="text-xs font-black text-orange-600 mt-1">⏰ {e.time}</p>
                </div>
                <button className="toy-button toy-button-accent !text-sm !py-2 !px-4">THAM GIA</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
