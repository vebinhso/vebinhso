import { createFileRoute, Link } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useState } from "react";

export const Route = createFileRoute("/tutorial")({ component: Tutorial });

type Section = {
  title: string;
  icon: string;
  steps: { h: string; p: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "Bắt đầu nhanh",
    icon: "🚀",
    steps: [
      { h: "1. Đăng ký & xác nhận email", p: "Tạo tài khoản bằng tên + email. Mở email để bấm nút xác nhận, sau đó đăng nhập." },
      { h: "2. Chọn nhân vật", p: "Vào mục Nhân vật để chọn thú cưng & ngoại hình yêu thích." },
      { h: "3. Vào CHƠI NGAY", p: "Tại trang chủ bấm CHƠI NGAY để vào sảnh trò chơi." },
    ],
  },
  {
    title: "Kiếm tiền & lên cấp",
    icon: "💰",
    steps: [
      { h: "Trả lời câu hỏi", p: "Bấm ❓ KIẾM TIỀN trong sân chơi. Mỗi câu đúng cộng tiền + streak. Có thể trả lời liên tục, bấm ✖ Thoát để dừng." },
      { h: "Nhận thưởng tiện ích", p: "Vào 🎁 TIỆN ÍCH để nhận mốc thưởng — số tiền sẽ tự cộng vào ví." },
      { h: "Lên cấp", p: "Cần đủ tiền trong ví + đủ số câu trả lời đúng để lên cấp tiếp theo." },
    ],
  },
  {
    title: "Cửa hàng & xây nhà",
    icon: "🏠",
    steps: [
      { h: "Mua vật liệu", p: "Bấm 🛒 CỬA HÀNG, chọn danh mục → mua & đặt vào ô trống trong vườn." },
      { h: "Xoay & xóa", p: "Phím R để xoay vật trước khi đặt. Chuột phải vào vật đã đặt để gỡ và hoàn tiền." },
      { h: "Tài sản ròng", p: "Mỗi vật đặt làm tăng tài sản ròng — dùng để khoe & xếp hạng." },
    ],
  },
  {
    title: "Bạn bè & xếp hạng",
    icon: "🫂",
    steps: [
      { h: "Kết bạn theo tên", p: "Ở trang chủ, nhập đúng tên đăng nhập của bạn rồi 🔍 TÌM → 📨 GỬI YÊU CẦU." },
      { h: "Chấp nhận lời mời", p: "Lời mời hiện ở khung BẠN BÈ ONLINE — bấm ✓ ĐỒNG Ý hoặc ✗ TỪ CHỐI." },
      { h: "Bảng xếp hạng", p: "Vào 📊 XẾP HẠNG để xem top theo Tiền / Cấp độ / Số bạn bè." },
    ],
  },
  {
    title: "Bản đồ Lâu Đài Ma Thuật",
    icon: "🏰",
    steps: [
      { h: "Stage 1 — 10 cánh cửa", p: "Đi từ Cửa 1 đến Cửa 10, mỗi cửa là một câu đố/phòng nhỏ. Cuối stage có Cửa Qua Màn." },
      { h: "Hành lang Stage 2", p: "Bức tường mở trong 20 giây (đồng hồ hiện góc phải). Chạy qua để vào Khu vực 2." },
      { h: "Stage 2 — phòng & boss", p: "Có 4 phòng theme khác nhau + boss phù thủy. Nhặt khiêng ở Phòng 2 và dùng nút 🛡️ để đỡ sét." },
      { h: "Lưu tiến trình", p: "Khi thoát khỏi bản đồ, tiến trình (cửa, đồ vật, xu) được giữ nguyên cho lần vào sau." },
    ],
  },
  {
    title: "Quyền năng & sự kiện",
    icon: "⚡",
    steps: [
      { h: "Thẻ quyền năng", p: "Vào ⚡ QUYỀN NĂNG để xem các thẻ buff — kích hoạt khi vào trận." },
      { h: "Sự kiện hot", p: "Bấm SỰ KIỆN HOT 🔥 để xem nhiệm vụ thời gian giới hạn với thưởng lớn." },
    ],
  },
];

function Tutorial() {
  const [open, setOpen] = useState<number>(0);
  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto">
        <div className="glass-card p-6">
          <h1 className="text-3xl font-black text-center mb-2">📖 HƯỚNG DẪN</h1>
          <p className="text-center text-sm font-bold text-muted-foreground mb-5">
            Tất cả những gì cần biết để chơi mượt mà.
          </p>

          <div className="flex flex-col gap-3">
            {SECTIONS.map((s, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="bg-white/80 rounded-2xl border-2 border-white overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between px-4 py-3 font-black text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{s.icon}</span> {s.title}
                    </span>
                    <span className="text-orange-600">{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 flex flex-col gap-2">
                      {s.steps.map((st, k) => (
                        <div key={k} className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                          <div className="font-black text-sm text-orange-700">{st.h}</div>
                          <div className="text-xs font-medium text-foreground/80 mt-1">{st.p}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center gap-2">
            <Link to="/play" className="toy-button toy-button-primary">▶ VÀO CHƠI</Link>
            <Link to="/" className="toy-button">🏡 VỀ NHÀ</Link>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
