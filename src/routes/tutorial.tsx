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
      { h: "2. Chọn nhân vật", p: "Vào mục Nhân vật để chọn thú cưng & ngoại hình yêu thích. Bạn có thể dùng AI để tạo màu trang phục từ mô tả, hoặc tải ảnh đại diện riêng." },
      { h: "3. Vào CHƠI NGAY", p: "Tại trang chủ bấm CHƠI NGAY để vào sảnh trò chơi. Chọn BẢN ĐỒ NHÀ (xây dựng) hoặc BẢN ĐỒ LÂU ĐÀI MA THUẬT (phiêu lưu)." },
      { h: "4. Khảo sát trải nghiệm", p: "Đừng quên bấm 💗 KHẢO SÁT ở trang chủ để góp ý giúp trò chơi hoàn thiện hơn!" },
    ],
  },
  {
    title: "Kiếm tiền & lên cấp",
    icon: "💰",
    steps: [
      { h: "Trả lời câu hỏi", p: "Bấm ❓ KIẾM TIỀN trong sân chơi. Mỗi câu đúng cộng tiền + streak. Có thể trả lời liên tục, bấm ✖ Thoát để dừng." },
      { h: "Nhận thưởng tiện ích", p: "Vào 🎁 TIỆN ÍCH để nhận mốc thưởng hằng ngày / tuần / theo cấp độ — số tiền sẽ tự cộng vào ví." },
      { h: "Nhặt xu rơi trên map", p: "Trong bản đồ Nhà, đi lại xung quanh để nhặt xu (+10đ/xu). Cẩn thận boom — đạp trúng phải trả lời đúng 2 câu hỏi liên tiếp để vô hiệu." },
      { h: "Lên cấp", p: "Cần đủ tiền trong ví + đủ số câu trả lời đúng để lên cấp tiếp theo. Lên cấp mở khóa vật liệu mới và quyền xây tầng cao hơn." },
    ],
  },
  {
    title: "Cửa hàng & xây nhà",
    icon: "🏠",
    steps: [
      { h: "Mua vật liệu", p: "Bấm 🛒 CỬA HÀNG trong game, chọn danh mục (nội thất, cột/trụ, gạch, bê tông, mái ngói/tôn, palette màu…) → mua vật phẩm bạn cần." },
      { h: "Đặt vật liệu — PC", p: "Trên máy tính: nhấp chuột trái vào vị trí trên mảnh đất để đặt vật. Phím R để xoay 90° trước khi đặt. Chuột phải vào vật đã đặt để gỡ và hoàn tiền." },
      { h: "Đặt vật liệu — Mobile", p: "Trên điện thoại: nhấn vào vật liệu trong khung chọn để kích hoạt, sau đó chạm vào mảnh đất để đặt. Khi nhấn vào vật liệu sẽ hiển thị bảng điều chỉnh hướng — dùng để xoay trước khi đặt." },
      { h: "Xây tường", p: "Chọn chế độ XÂY TƯỜNG → bấm vào 2 cột trụ để nối tường. Tường tốn gạch + bê tông, có thể đổi màu bằng palette đã mua." },
      { h: "Xây sàn & mái", p: "Chọn XÂY SÀN hoặc LỢP MÁI → bấm vào 4 cột trụ tạo hình chữ nhật để tự động xây. Sàn tốn bê tông, mái tốn gạch ngói hoặc tôn." },
      { h: "Đa tầng", p: "Tầng trệt (0) miễn phí. Tầng 1 cần Cấp 3, tầng 2 cần Cấp 10, tầng 3 cần Cấp 18. Phải lợp sàn tầng dưới trước khi lên tầng trên." },
      { h: "Gắn cửa & cửa sổ", p: "Cửa chính và cửa sổ tự động snap vào tường gần nhất khi đặt. Cần xây tường trước, sau đó mới gắn được. Cửa nên xoay về 0° để khớp tường đẹp nhất." },
      { h: "Chỉnh sửa vật đã đặt", p: "Nhấn (PC) hoặc chạm (Mobile) vào vật đã đặt để mở khung chỉnh sửa: xoay tự do 360°, dịch chuyển sang vị trí mới, hoặc gỡ bỏ." },
      { h: "Bảng tên nhà", p: "Mua biển tên (sign) trong cửa hàng, đặt vào vườn, sau đó chạm vào để viết tên tuỳ ý." },
      { h: "Tài sản ròng", p: "Mỗi vật đặt, tường, sàn, mái đều làm tăng tài sản ròng — dùng để khoe & xếp hạng trên bảng BXH." },
    ],
  },
  {
    title: "Bạn bè & xếp hạng",
    icon: "🫂",
    steps: [
      { h: "Kết bạn theo tên", p: "Ở trang chủ, nhập đúng tên đăng nhập của bạn rồi 🔍 TÌM → 📨 GỬI YÊU CẦU." },
      { h: "Chấp nhận lời mời", p: "Lời mời hiện ở khung BẠN BÈ ONLINE bên trái trang chủ — bấm ✓ ĐỒNG Ý hoặc ✗ TỪ CHỐI." },
      { h: "Bảng xếp hạng", p: "Vào 📊 XẾP HẠNG để xem top theo Tiền / Cấp độ / Số bạn bè." },
      { h: "Trò chuyện & chụp ảnh", p: "Bấm 💬 TRÒ CHUYỆN để chat với bạn bè, hoặc 📸 để chụp màn hình chia sẻ khoảnh khắc đẹp trong game." },
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
      { h: "Thẻ quyền năng", p: "Vào ⚡ QUYỀN NĂNG để xem các thẻ buff (Mưa, Lốc xoáy, Nắng, Gia cố móng, Phủ xanh…) — mua bằng tiền và kích hoạt khi vào game. Bán lại nhận 70% giá." },
      { h: "Sự kiện hot", p: "Bấm SỰ KIỆN HOT 🔥 để xem nhiệm vụ thời gian giới hạn với thưởng lớn." },
      { h: "Hiệu ứng thời tiết", p: "Một số thẻ kích hoạt thay đổi thời tiết trong bản đồ Nhà: mưa làm chậm xây dựng, nắng hỗ trợ tiến độ, lốc xoáy có thể gây hư hỏng." },
    ],
  },
  {
    title: "Nhân vật & Trang phục",
    icon: "🎨",
    steps: [
      { h: "Thiết kế bằng AI", p: "Vào mục Nhân vật, mô tả bộ trang phục mong muốn (VD: áo khoác đỏ, quần đen, mũ vàng…) rồi bấm ✨ AI lên màu. Hệ thống sẽ tạo bảng màu tự động." },
      { h: "Tải ảnh đại diện", p: "Bấm 📷 Tải ảnh đại diện để upload ảnh riêng (tối đa 2MB, JPG/PNG). Ảnh sẽ hiển thị ở trang chủ và trong game." },
      { h: "Lưu & thay đổi", p: "Sau khi chỉnh sửa xong, bấm ✅ Lưu & Chơi. Bạn có thể quay lại thay đổi trang phục bất cứ lúc nào." },
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
