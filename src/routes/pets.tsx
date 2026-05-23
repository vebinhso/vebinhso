import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";

export const Route = createFileRoute("/pets")({ component: Powers });

type Power = {
  id: number;
  name: string;
  icon: string;        // emoji minh hoạ
  scope: string;
  duration: string;
  value: string;       // quy đổi
  note?: string;
};

const POWERS: Power[] = [
  { id: 1,  name: "Thẻ Mưa",            icon: "🌧️",  scope: "Nhà mình / đối phương", duration: "5 phút", value: "200đ", note: "Mưa thì không xây được" },
  { id: 2,  name: "Thẻ Lốc Xoáy",       icon: "🌪️",  scope: "Nhà đối phương",       duration: "30 giây", value: "150đ", note: "Hư hỏng vật tư" },
  { id: 3,  name: "Thẻ Nắng",           icon: "☀️",  scope: "Nhà bản thân",          duration: "5 phút", value: "100đ", note: "2 nắng = 1 mưa" },
  { id: 4,  name: "Tăng Tốc Xây Dựng",  icon: "⚡",  scope: "Nhà bản thân",          duration: "Tức thì", value: "250đ", note: "Không dùng khi mưa" },
  { id: 5,  name: "Gia Cố Móng",        icon: "🧱",  scope: "Nhà bản thân",          duration: "Vĩnh viễn", value: "350đ", note: "Bắt buộc lên tầng 2" },
  { id: 6,  name: "Chống Ngập",         icon: "🛡️",  scope: "Nhà & khu vực",        duration: "1 ngày", value: "Miễn nhiễm mưa", note: "Kết hợp cây xanh" },
  { id: 7,  name: "Phủ Xanh",           icon: "🌳",  scope: "Xung quanh nhà",        duration: "Vĩnh viễn", value: "150đ", note: "+ uy tín khu phố" },
  { id: 8,  name: "Phá Dỡ",             icon: "🔨",  scope: "Nhà đối phương",        duration: "Tức thì", value: "400đ", note: "Cần bằng chứng" },
  { id: 9,  name: "Đổi Tên Nhà",        icon: "🏷️",  scope: "Nhà bản thân",         duration: "Vĩnh viễn", value: "100đ" },
  { id: 10, name: "Dọn Nhà",            icon: "🧹",  scope: "Nhà bản thân",          duration: "Tức thì", value: "50đ",  note: "Bắt buộc khi lâu không vào" },
  { id: 11, name: "Trì Trệ",            icon: "⏳",  scope: "Nhà đối phương",        duration: "Tức thì", value: "250đ" },
  { id: 12, name: "Khoá Cửa",           icon: "🔒",  scope: "Nhà bản thân",          duration: "1 giờ", value: "180đ" },
  { id: 13, name: "Vận May",            icon: "🍀",  scope: "Bản thân",              duration: "Tức thì", value: "Random" },
];

function PowerCard({ p }: { p: Power }) {
  return (
    <div className="relative group cursor-pointer">
      {/* Khung thẻ - chữ nhật, viền vàng kim loại, hiệu ứng kim quang */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-[3px] border-amber-300 shadow-[0_8px_24px_-8px_rgba(180,120,0,0.6)] transition-transform group-hover:-translate-y-1 group-hover:scale-[1.03]">
        {/* Nền vàng kim - lấy cảm hứng từ thẻ Liên Quân nhưng đổi sang tông vàng */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 25%, #fff4b8 0%, #f5c518 35%, #c98a09 75%, #7a4f00 100%)",
          }}
        />
        {/* Hoạ tiết tia sáng */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            background:
              "conic-gradient(from 220deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.5) 40deg, transparent 80deg, rgba(255,255,255,0.4) 160deg, transparent 200deg, rgba(255,255,255,0.5) 280deg, transparent 320deg)",
          }}
        />
        {/* Logo mờ giữa thẻ */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-xl rotate-45 border-2 border-amber-100/70 bg-amber-200/20 backdrop-blur-[1px]" />
        </div>

        {/* Icon quyền năng */}
        <div className="relative h-full w-full flex flex-col items-center justify-between p-3">
          <div className="text-[11px] font-black tracking-wider text-amber-900/80 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-700/30">
            #{p.id.toString().padStart(2, "0")}
          </div>
          <div className="text-6xl drop-shadow-[0_4px_6px_rgba(120,70,0,0.5)]">{p.icon}</div>
          <div className="w-full text-center bg-gradient-to-r from-amber-900 to-yellow-800 text-yellow-100 rounded-lg px-2 py-1.5 border border-amber-300/60">
            <div className="text-xs font-black leading-tight">{p.name}</div>
            <div className="text-[9px] font-bold opacity-80">{p.duration} · {p.value}</div>
          </div>
        </div>
      </div>

      {/* Tooltip / mô tả khi hover */}
      <div className="absolute inset-x-0 -bottom-1 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="mx-auto w-[90%] rounded-xl bg-black/85 text-white text-[10px] font-bold p-2 shadow-lg">
          <div>📍 {p.scope}</div>
          {p.note && <div className="opacity-80">💬 {p.note}</div>}
        </div>
      </div>
    </div>
  );
}

function Powers() {
  return (
    <GameLayout showBack>
      <div className="p-4 md:p-8 max-w-6xl w-full mx-auto">
        <div
          className="relative rounded-3xl overflow-hidden p-5 md:p-8 border-4 border-amber-300 shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, #2a1700 0%, #5a3a05 50%, #2a1700 100%)",
          }}
        >
          {/* Hoạ tiết nền vàng - vệt sáng + nebula */}
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 20% 30%, rgba(255,200,40,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,170,0,0.3), transparent 45%), radial-gradient(circle at 50% 50%, rgba(255,235,150,0.15), transparent 60%)",
            }}
          />
          {/* Vệt cong vàng kim như poster Liên Quân */}
          <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 800 400" preserveAspectRatio="none">
            <path d="M0,300 Q200,100 400,250 T800,200" stroke="#ffd766" strokeWidth="2" fill="none" />
            <path d="M0,150 Q200,350 400,200 T800,300" stroke="#ffe7a3" strokeWidth="1.5" fill="none" />
          </svg>

          <div className="relative text-center mb-6">
            <h1 className="inline-block text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-amber-400 drop-shadow-[0_3px_0_rgba(0,0,0,0.4)] tracking-wide">
              ⚡ QUYỀN NĂNG
            </h1>
            <p className="text-amber-200/90 font-bold text-xs md:text-sm mt-1">
              Bộ sưu tập 13 thẻ quyền năng vàng kim — Rê chuột để xem chi tiết
            </p>
          </div>

          {/* Grid 4 cột × 3 hàng + 1 thẻ lẻ ở hàng cuối */}
          <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {POWERS.map((p) => (
              <PowerCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
