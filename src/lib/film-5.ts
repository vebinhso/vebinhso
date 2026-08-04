import v01 from "@/assets/film6/v01.jpg";
import v02 from "@/assets/film6/v02.jpg";
import v03 from "@/assets/film6/v03.jpg";
import v04 from "@/assets/film6/v04.jpg";
import v05 from "@/assets/film6/v05-chat.png";
import v06 from "@/assets/film6/v06.jpg";
import v07 from "@/assets/film6/v07-clean.jpg";
import v08 from "@/assets/film6/v08.jpg";
import v09 from "@/assets/film6/v09.jpg";
import v10 from "@/assets/film6/v10.jpg";
import v11 from "@/assets/film6/v11.jpg";
import v12 from "@/assets/film6/v12-clean.jpg";
import v13 from "@/assets/film6/v13.jpg";
import v14 from "@/assets/film6/v14.jpg";
import v15 from "@/assets/film6/v15.jpg";
import v16 from "@/assets/film6/v16.jpg";
import v17 from "@/assets/film6/v17.jpg";
import v18 from "@/assets/film6/v18.jpg";
import v19 from "@/assets/film6/v19.jpg";
import v20 from "@/assets/film6/v20.jpg";
import v21 from "@/assets/film6/v21-bg.jpg";
import mv01 from "@/assets/film6/video/v01.mp4.asset.json";
import mv02 from "@/assets/film6/video/v02.mp4.asset.json";
import mv03 from "@/assets/film6/video/v03.mp4.asset.json";
import mv04 from "@/assets/film6/video/v04.mp4.asset.json";
import mv05 from "@/assets/film6/video/v05b.mp4.asset.json";
import mv06 from "@/assets/film6/video/v06.mp4.asset.json";
import mv07 from "@/assets/film6/video/v07b.mp4.asset.json";
import mv08 from "@/assets/film6/video/v08.mp4.asset.json";
import mv09 from "@/assets/film6/video/v09.mp4.asset.json";
import mv10 from "@/assets/film6/video/v10.mp4.asset.json";
import mv11 from "@/assets/film6/video/v11.mp4.asset.json";
import mv12 from "@/assets/film6/video/v12b.mp4.asset.json";
import mv13 from "@/assets/film6/video/v13.mp4.asset.json";
import mv14 from "@/assets/film6/video/v14.mp4.asset.json";
import mv15 from "@/assets/film6/video/v15.mp4.asset.json";
import mv16 from "@/assets/film6/video/v16.mp4.asset.json";
import mv17 from "@/assets/film6/video/v17.mp4.asset.json";
import mv18 from "@/assets/film6/video/v18.mp4.asset.json";
import mv19 from "@/assets/film6/video/v19.mp4.asset.json";
import mv20 from "@/assets/film6/video/v20.mp4.asset.json";
import v20b from "@/assets/film6/v20b.jpg";
import v20c from "@/assets/film6/v20c.jpg";
import mv20b from "@/assets/film6/video/v20b.mp4.asset.json";
import mv20c from "@/assets/film6/video/v20c.mp4.asset.json";

/** A = người lỡ vé · N = người cẩn trọng · B = người hành động · X = "chị V" (avatar vô danh) */
export type Speaker = "narrator" | "A" | "N" | "B" | "X";

export type Choice = {
  label: string;
  next: string;
  tone?: "safe" | "risky" | "neutral";
};

export type Motion = "kenburns" | "push" | "shake" | "freeze";

export type ChatOverlayMessage = {
  text: string;
  type: "incoming" | "outgoing";
  x: number;
  y: number;
  w: number;
};

export type FilmNode = {
  id: string;
  image: string;
  video?: string;
  speaker: Speaker;
  action?: string;
  text: string;
  motion?: Motion;
  mood?: "danger" | "safe" | "neutral";
  choiceImage?: string;
  next?: string;
  choices?: Choice[];
  ending?: {
    kind: "safe" | "loss";
    code: string;
    title: string;
    lesson: string;
  };
  chatOverlay?: {
    messages: ChatOverlayMessage[];
    coverRects?: { x: number; y: number; w: number; h: number }[];
  };
};

export const SPEAKER_META: Record<
  Speaker,
  { name: string; color: string; voice: string; instructions: string; speed: number; pitch: number; rate: number }
> = {
  narrator: {
    name: "Người dẫn chuyện",
    color: "text-amber-300",
    voice: "sage",
    instructions:
      "Giọng trung tính 25–35 tuổi, điềm tĩnh, ấm, chuyên nghiệp, phát âm rõ ràng theo phong cách phim tài liệu. Khách quan, không diễn quá.",
    speed: 1,
    pitch: 1,
    rate: 1,
  },
  A: {
    name: "An",
    color: "text-pink-300",
    voice: "coral",
    instructions:
      "Nữ sinh 17 tuổi, giọng trong, dễ xúc động, khao khát và cả tin. Khi lo lắng thì nói nhanh, hụt hơi, đôi lúc nghẹn giọng.",
    speed: 1,
    pitch: 1.12,
    rate: 1.02,
  },
  N: {
    name: "Ngân",
    color: "text-sky-300",
    voice: "shimmer",
    instructions:
      "Nữ sinh 17 tuổi, giọng trầm hơn bạn bè, chậm, chắc, tỉnh táo. Là tiếng nói lý trí, hay đặt câu hỏi ngược.",
    speed: 0.97,
    pitch: 0.98,
    rate: 0.98,
  },
  B: {
    name: "Bình",
    color: "text-emerald-300",
    voice: "verse",
    instructions:
      "Nam sinh 17 tuổi, giọng sáng, nhanh, sôi nổi, bốc đồng nhưng tinh mắt. Khi phát hiện điều bất thường thì hạ giọng, nghiêm lại.",
    speed: 1.03,
    pitch: 1.05,
    rate: 1.03,
  },
  X: {
    name: '"Chị V" (tài khoản lạ)',
    color: "text-red-400",
    voice: "ash",
    instructions:
      "Giọng vô hình sau một tài khoản ảo: lạnh, ngọt giả tạo, luôn hối thúc. Không bao giờ lộ diện, không bao giờ gọi video.",
    speed: 1,
    pitch: 0.8,
    rate: 1,
  },
};

export const FILM_TITLE = "BA VÉ LIỀN KỀ";
export const FILM_POSTER = v01;
export const FILM_SUMMARY_IMAGE = v21;
export const FILM_START = "v01";

export const FILM_NOTES = [
  "Người bán không chịu gọi video, không cho xem giấy tờ, chỉ nhắn tin — đó là dấu hiệu đỏ đầu tiên.",
  "Ảnh xác nhận, email ban tổ chức, biên lai đều có thể được tạo bằng ứng dụng chỉnh ảnh AI. Hãy phóng to soi logo và watermark.",
  "Chuyển khoản là mất dấu. Hãy giao dịch qua kênh chính thức hoặc gặp mặt tại nơi công cộng.",
  "Càng bị giục 'chốt trong 10 phút' thì càng phải dừng lại. Gấp gáp là vũ khí của kẻ lừa đảo.",
];

export const FILM: Record<string, FilmNode> = {
  /* ===== MỞ ĐẦU ===== */
  v01: {
    id: "v01",
    image: v01,
    video: mv01.url,
    speaker: "narrator",
    action: "Ba đứa, một tấm poster",
    text: "An, Ngân và Bình đã đếm ngược concert này suốt bốn tháng. Tấm poster dán trên tường quán trà sữa góc phố như một lời hứa.",
    motion: "kenburns",
    mood: "neutral",
    next: "v02",
  },
  v02: {
    id: "v02",
    image: v02,
    video: mv02.url,
    speaker: "A",
    action: "20:00 — mở bán",
    text: "Hết vé rồi... Mới có bốn mươi giây thôi mà. Tớ bấm nhanh hết sức rồi đấy.",
    motion: "push",
    mood: "neutral",
    next: "v03",
  },
  v03: {
    id: "v03",
    image: v03,
    video: mv03.url,
    speaker: "B",
    action: "Ba chiếc điện thoại trên bàn",
    text: "Còn cách khác. Mấy hội nhóm pass vé lúc nào chẳng có người bán lại. Để tớ tìm.",
    motion: "kenburns",
    mood: "neutral",
    next: "v04",
  },
  v04: {
    id: "v04",
    image: v04,
    video: mv04.url,
    speaker: "narrator",
    action: "Bài đăng vừa lên hai phút",
    text: 'Một tài khoản tên "Chị V" đăng bán ba vé liền kề, rẻ hơn giá gốc. Ảnh đại diện là một hình bóng mờ, không rõ mặt. Trang cá nhân mới lập tháng trước.',
    motion: "push",
    mood: "danger",
    next: "v05",
  },
  v05: {
    id: "v05",
    image: v05,
    video: mv05.url,
    speaker: "X",
    action: "Tin nhắn đầu tiên",
    text: "Chị còn 3 vé nè, chốt lẹ kẻo hết đấy.",
    motion: "freeze",
    mood: "danger",
    next: "v06",
  },

  /* ===== NÚT QUYẾT ĐỊNH 1 ===== */
  v06: {
    id: "v06",
    image: v06,
    video: mv06.url,
    speaker: "narrator",
    action: "★ NÚT QUYẾT ĐỊNH 1",
    text: "Ba khuôn mặt, một màn hình. An muốn tin. Bình muốn chốt ngay. Ngân muốn kiểm tra. Ba đứa nhìn nhau, không ai dám quyết một mình.",
    motion: "freeze",
    mood: "danger",
    choices: [
      { label: "Tin và chuyển cọc ngay để giữ vé", next: "v07", tone: "risky" },
      { label: "Dừng lại, soi kỹ ảnh và yêu cầu gọi video", next: "v19", tone: "safe" },
    ],
  },

  /* ===== NHÁNH 1A — TIN ===== */
  v07: {
    id: "v07",
    image: v07,
    video: mv07.url,
    speaker: "X",
    action: "Ảnh email xác nhận",
    text: "Đây là email ban tổ chức gửi chị nè. Chị mua chính chủ, có xác nhận đàng hoàng, em yên tâm.",
    motion: "push",
    mood: "danger",
    next: "v08",
  },
  v08: {
    id: "v08",
    image: v08,
    video: mv08.url,
    speaker: "A",
    action: "Nhẹ cả người",
    text: "Có email hẳn hoi này. Chị ấy trả lời nhanh, nói chuyện dễ thương nữa. Tớ tin được mà.",
    motion: "kenburns",
    mood: "neutral",
    next: "v09",
  },
  v09: {
    id: "v09",
    image: v09,
    video: mv09.url,
    speaker: "X",
    action: "Tin nhắn dồn dập",
    text: "Có bạn khác vừa chuyển cọc rồi đó em. Chị giữ thêm mười phút thôi nha, quá giờ chị nhả vé.",
    motion: "shake",
    mood: "danger",
    next: "v10",
  },
  v10: {
    id: "v10",
    image: v10,
    video: mv10.url,
    speaker: "A",
    action: "Chuyển 3.000.000đ tiền cọc",
    text: "Tớ chuyển đây. Tiền để dành cả năm của tớ... nhưng ba đứa mình phải đi cùng nhau chứ.",
    motion: "push",
    mood: "danger",
    next: "v11",
  },
  v11: {
    id: "v11",
    image: v11,
    video: mv11.url,
    speaker: "narrator",
    action: "Một file PDF được gửi tới",
    text: '"Chị V" gửi lại một file vé điện tử. Bình reo lên. Ngân im lặng — cô thấy mã QR trong file mờ hơn bình thường một chút.',
    motion: "kenburns",
    mood: "neutral",
    next: "v12",
  },
  v12: {
    id: "v12",
    image: v12,
    video: mv12.url,
    speaker: "X",
    action: "Yêu cầu mới",
    text: "Vé này chị phải sang tên trên hệ thống. Em chuyển nốt 100% rồi chị sang tên luôn, không thì hệ thống huỷ mất.",
    motion: "shake",
    mood: "danger",
    next: "v13",
  },

  /* ===== NÚT QUYẾT ĐỊNH 2 ===== */
  v13: {
    id: "v13",
    image: v13,
    video: mv13.url,
    speaker: "narrator",
    action: "★ NÚT QUYẾT ĐỊNH 2",
    text: "Ba triệu đã đi rồi. Chuyển nốt thì có thể mất thêm. Không chuyển thì coi như mất cọc. An siết chặt điện thoại, không biết chọn đường nào.",
    motion: "freeze",
    mood: "danger",
    choices: [
      { label: "Chuyển nốt phần còn lại cho xong", next: "v14", tone: "risky" },
      { label: "Dừng lại, không chuyển thêm đồng nào", next: "v17", tone: "safe" },
    ],
  },

  /* ===== 2A — CHUYỂN NỐT ===== */
  v14: {
    id: "v14",
    image: v14,
    video: mv14.url,
    speaker: "A",
    action: "Chuyển nốt",
    text: "Lỡ rồi... Nếu dừng lại bây giờ thì ba triệu kia thành công cốc. Tớ chuyển nốt.",
    motion: "push",
    mood: "danger",
    next: "v15",
  },
  v15: {
    id: "v15",
    image: v15,
    video: mv15.url,
    speaker: "narrator",
    action: "Tài khoản đã bị chặn",
    text: "Ba phút sau, tin nhắn không gửi được nữa. Trang cá nhân biến mất. Bài đăng bán vé cũng không còn.",
    motion: "freeze",
    mood: "danger",
    next: "v16",
  },
  v16: {
    id: "v16",
    image: v16,
    video: mv16.url,
    speaker: "narrator",
    action: "Trước cổng concert",
    text: 'Máy quét kêu một tiếng khô khốc rồi báo đỏ. Mã QR trong file PDF chỉ là ảnh in lại của một vé đã dùng.',
    motion: "kenburns",
    mood: "danger",
    ending: {
      kind: "loss",
      code: "C",
      title: "KẾT THÚC C — ĐỨNG NGOÀI CỔNG",
      lesson:
        "Mất trắng toàn bộ tiền vé.\n\nBÀI HỌC:\n• Đã lỡ mất tiền cọc thì dừng lại vẫn rẻ hơn chuyển tiếp — kẻ lừa đảo luôn khai thác tâm lý 'tiếc tiền đã bỏ ra'.\n• File PDF, mã QR, email xác nhận đều có thể làm giả trong vài phút.\n• Chuyển khoản cho người lạ là mất dấu. Hãy mua qua kênh chính thức hoặc gặp mặt trực tiếp.\n• Nếu đã chuyển tiền: lưu toàn bộ tin nhắn, sao kê và báo ngay cho người lớn và cơ quan công an.",
    },
  },

  /* ===== 2B — DỪNG LẠI ===== */
  v17: {
    id: "v17",
    image: v17,
    video: mv17.url,
    speaker: "N",
    action: "Giữ lại điện thoại",
    text: "Không chuyển nữa. Người bán thật không bao giờ ép giờ như vậy. Mình dừng ở đây, mất ba triệu còn hơn mất sáu.",
    motion: "push",
    mood: "safe",
    next: "v18",
  },
  v18: {
    id: "v18",
    image: v18,
    video: mv18.url,
    speaker: "X",
    action: '"Chị V" trở mặt',
    text: "Không chuyển thì mất cọc nhé. Đừng có nhắn nữa. Loại trẻ ranh không có tiền còn bày đặt.",
    motion: "shake",
    mood: "danger",
    ending: {
      kind: "safe",
      code: "B",
      title: "KẾT THÚC B — DỪNG ĐÚNG LÚC",
      lesson:
        "Mất 3.000.000đ tiền cọc, nhưng giữ lại được phần còn lại.\n\nBÀI HỌC:\n• Ngay khi người bán đổi giọng, ép giờ hoặc xúc phạm — đó là lúc dừng, không phải lúc cố.\n• Số tiền đã mất không kéo về được bằng cách mất thêm.\n• Chụp màn hình toàn bộ hội thoại, số tài khoản, bài đăng rồi báo người lớn và trình báo công an.\n• Cảnh báo lại nhóm bạn để không ai chuyển tiền cho tài khoản đó.",
    },
  },

  /* ===== NHÁNH 1B — SOI KỸ ===== */
  v19: {
    id: "v19",
    image: v19,
    video: mv19.url,
    speaker: "B",
    action: "Phóng to ảnh xác nhận",
    text: "Khoan đã. Logo ban tổ chức ở đây bị móp một bên, mà góc ảnh còn sót nguyên watermark của app chỉnh ảnh AI. Cái email này là ảnh ghép.",
    motion: "push",
    mood: "safe",
    next: "v20",
  },
  v20: {
    id: "v20",
    image: v20,
    video: mv20.url,
    speaker: "N",
    action: "Yêu cầu gọi video",
    text: "Bọn em muốn gọi video ba mươi giây, chị cầm vé giơ lên là xong.",
    motion: "freeze",
    mood: "safe",
    next: "v20b",
  },
  v20b: {
    id: "v20b",
    image: v20b,
    video: mv20b.url,
    speaker: "B",
    action: "Đưa điện thoại lên tai — gọi thử",
    text: "Để tớ gọi thử xem chị ấy có nghe máy không...",
    motion: "push",
    mood: "safe",
    next: "v20c",
  },
  v20c: {
    id: "v20c",
    image: v20c,
    video: mv20c.url,
    speaker: "narrator",
    action: "Hạ điện thoại xuống — màn hình báo ĐÃ CHẶN",
    text: '"Chị V" tắt máy, rồi chặn luôn cả ba đứa.',
    motion: "freeze",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "A",
      title: "KẾT THÚC A — KHÔNG MẤT ĐỒNG NÀO",
      lesson:
        "Không mất đồng nào.\n\nBÀI HỌC:\n• Logo méo, chữ lệch, watermark app chỉnh ảnh = ảnh ghép.\n• Người bán thật không ngại gọi video 30 giây.\n• Tài khoản mới lập, ảnh mờ, không bạn chung — đủ để nói không.",
    },
  },

  v21: {
    id: "v21",
    image: v21,
    speaker: "narrator",
    action: "Tổng kết",
    text: "Ba dấu hiệu của một vụ pass vé lừa đảo: người bán giấu mặt, bằng chứng là ảnh, và luôn có một cái đồng hồ đếm ngược do chính họ đặt ra.",
    motion: "freeze",
    mood: "neutral",
  },
};
