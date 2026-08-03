import l01 from "@/assets/film5/poster.jpg";
import l03c from "@/assets/film5/clean/l03c.jpg";
import l03d from "@/assets/film5/clean/l03d.jpg";
import l03e from "@/assets/film5/clean/l03e.jpg";
import vl03e from "@/assets/film5/video/l03e.mp4.asset.json";
import l04img from "@/assets/film5/clean/l04.jpg";
import vl04 from "@/assets/film5/video/l04.mp4.asset.json";
import vl03d from "@/assets/film5/video/l03d.mp4.asset.json";
import vl03c from "@/assets/film5/video/l03c.mp4.asset.json";
import l03 from "@/assets/film5/clean/l03b.jpg";
import vl03 from "@/assets/film5/video/l03b.mp4.asset.json";
import l02c from "@/assets/film5/clean/l03.jpg";
import vl02c from "@/assets/film5/video/l03.mp4.asset.json";
import l03f from "@/assets/film5/clean/l03f.jpg";
import vl03f from "@/assets/film5/video/l03f.mp4.asset.json";
import l03g from "@/assets/film5/clean/l03g.jpg";
import vl03g from "@/assets/film5/video/l03g.mp4.asset.json";
import l06b from "@/assets/film5/clean/l06b.jpg";
import vl06b from "@/assets/film5/video/l06b.mp4.asset.json";
import l07b from "@/assets/film5/clean/l07b.jpg";
import vl07b from "@/assets/film5/video/l07b.mp4.asset.json";
import l08 from "@/assets/film5/clean/l08.jpg";
import vl08 from "@/assets/film5/video/l08.mp4.asset.json";
import l08b from "@/assets/film5/clean/l08b.jpg";
import vl08b from "@/assets/film5/video/l08b.mp4.asset.json";
import l09 from "@/assets/film5/clean/l09b.jpg";
import vl09 from "@/assets/film5/video/l09b.mp4.asset.json";
import l09c from "@/assets/film5/clean/l09c.jpg";
import vl09c from "@/assets/film5/video/l09c.mp4.asset.json";
import l11a1 from "@/assets/film5/clean/l11a1.jpg";
import vl11a1 from "@/assets/film5/video/l11a1.mp4.asset.json";
import l12a2 from "@/assets/film5/clean/l12a2.jpg";
import vl12a2 from "@/assets/film5/video/l12a2.mp4.asset.json";
import l13a2 from "@/assets/film5/clean/l13a2.jpg";
import vl13a2 from "@/assets/film5/video/l13a2.mp4.asset.json";
import l02 from "@/assets/film5/clean/l02b.jpg";
import vl02 from "@/assets/film5/video/l02b.mp4.asset.json";
import l05a from "@/assets/film5/clean/l05a.jpg";
import vl05a from "@/assets/film5/video/l05a.mp4.asset.json";
import l05a2 from "@/assets/film5/clean/l05a2.jpg";
import vl05a2 from "@/assets/film5/video/l05a2.mp4.asset.json";
import l06 from "@/assets/film5/clean/l06.jpg";
import vl06 from "@/assets/film5/video/l06.mp4.asset.json";
import l07 from "@/assets/film5/clean/l07.jpg";
import vl07 from "@/assets/film5/video/l07.mp4.asset.json";
import l07e from "@/assets/film5/clean/l07e.jpg";
import vl07e from "@/assets/film5/video/l07e.mp4.asset.json";

export type Speaker = "narrator" | "L" | "X" | "R";

export type Choice = {
  label: string;
  next: string;
  tone?: "safe" | "risky" | "neutral";
};

/** Hiệu ứng camera cho từng cảnh để ảnh tĩnh "sống" như video */
export type Motion = "kenburns" | "push" | "shake" | "freeze";

export type FilmNode = {
  id: string;
  image: string;
  video?: string;
  speaker: Speaker;
  action?: string;
  text: string;
  motion?: Motion;
  /** phủ màu: nguy hiểm (lạnh) hay an toàn (ấm) */
  mood?: "danger" | "safe" | "neutral";
  /** Hiện lớp phủ thông báo email giả mạo */
  emailOverlay?: boolean;
  /** Lớp phủ soi kỹ dấu hiệu lừa đảo (địa chỉ email lạ, link .net) */
  inspectOverlay?: boolean;
  /** Hiện lớp phủ nội dung email lừa đảo (dựng bằng CSS) */
  mailOverlay?: boolean;
  /** Lớp phủ biểu mẫu trang web giả đòi thông tin + mật khẩu game */
  formOverlay?: boolean;
  /** Lớp phủ điện thoại hiển thị form đã điền đầy đủ thông tin */
  phoneFormOverlay?: boolean;
  phoneConfirm?: boolean;
  /** Vị trí khung điện thoại trên khung hình (theo % của khung 16:9), khớp với điện thoại nhân vật đang cầm */
  phoneAnchor?: { x: number; y: number; h: number; rot?: number };
  /** ảnh riêng khi hiện lựa chọn */
  choiceImage?: string;
  next?: string;
  choices?: Choice[];
  ending?: {
    kind: "safe" | "loss";
    code: string;
    title: string;
    lesson: string;
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
      "Giọng trung tính 25–35 tuổi, điềm tĩnh, ấm, chuyên nghiệp, phát âm rõ ràng, đáng tin cậy theo phong cách phim tài liệu. Tốc độ vừa phải, chuyển ý mượt mà, nhấn nhá đúng chi tiết quan trọng. Khách quan, không diễn quá.",
    speed: 1,
    pitch: 1,
    rate: 1,
  },
  L: {
    name: "L",
    color: "text-pink-300",
    voice: "coral",
    instructions:
      "Nữ học sinh 14 tuổi, giọng nhẹ, trong trẻo, tò mò và hơi hồi hộp khi có chuyện bất ngờ. Nói tự nhiên, đôi khi ngập ngừng. Cảm xúc biến đổi từ thư giãn → tò mò → lo lắng → tỉnh táo.",
    speed: 1,
    pitch: 1.15,
    rate: 1.02,
  },
  X: {
    name: "Kẻ gian",
    color: "text-red-400",
    voice: "ash",
    instructions:
      "Giọng nam trưởng thành, lạnh, trầm, không cảm xúc, nói ngắn gọn và tính toán. Là giọng vô hình đứng sau các trang giả mạo. Không hét lên.",
    speed: 1,
    pitch: 0.75,
    rate: 1,
  },
  R: {
    name: "Chú thợ sửa máy",
    color: "text-sky-300",
    voice: "ash",
    instructions:
      "Nam trung niên 45 tuổi, giọng khàn ấm, mộc mạc, nói chậm rãi và tiếc nuối khi báo tin xấu cho khách nhỏ tuổi. Thân thiện nhưng bất lực.",
    speed: 0.96,
    pitch: 0.85,
    rate: 0.98,
  },
};

export const FILM_TITLE = "MÓN QUÀ ĐẮT NHẤT LÀ MÓN QUÀ MIỄN PHÍ";
export const FILM_POSTER = l01;
export const FILM_SUMMARY_IMAGE = l02;

export const FILM_NOTES = [
  "Email trúng thưởng iPhone thường yêu cầu điền thông tin cá nhân hoặc thanh toán phí nhận quà.",
  "Không bao giờ cung cấp thông tin cá nhân, mật khẩu hoặc mã OTP cho người lạ qua email/link.",
  "Kiểm tra địa chỉ người gửi: các thư giả mạo thường sai chính tả hoặc dùng tên miền giả.",
  "Khi nghi ngờ, hãy hỏi người thân hoặc liên hệ tổng đài chính thức của chương trình.",
];

export const FILM: Record<string, FilmNode> = {
  /* ===== MỞ ĐẦU ===== */
  l01: {
    id: "l01",
    image: l01,
    speaker: "narrator",
    action: "24 giờ để nhận thưởng",
    text: "Một buổi tối bình thường. L, học sinh lớp 9, đang thư giãn trên giường sau giờ học. Rồi điện thoại rung lên với một thông báo lạ: 'Bạn đã trúng thưởng iPhone!'",
    motion: "kenburns",
    mood: "neutral",
    next: "l02",
  },
  l02: {
    id: "l02",
    image: l02,
    video: vl02.url,
    speaker: "narrator",
    action: "21:15 — Bạn có 1 thư mới",
    text: "Hai mươi mốt giờ mười lăm. L vừa tan học và đang lướt điện thoại giải trí. Bỗng một thông báo mới trượt xuống từ đầu màn hình — một phong bì hiện lên, ghi rằng bạn đã trúng thưởng điện thoại iPhone 17.",
    motion: "push",
    mood: "neutral",
    next: "l02c",
  },
  l02c: {
    id: "l02c",
    image: l02c,
    video: vl02c.url,
    speaker: "L",
    action: "21:16 — Màn hình khoá",
    text: "Ủa... mình trúng thật sao? Thông báo ghi là chúc mừng mình trúng giải nhất luôn kìa...",
    motion: "push",
    mood: "neutral",
    next: "l03",
  },

  l03: {
    id: "l03",
    image: l03f,
    video: vl03f.url,
    speaker: "L",
    action: "16:30 — Đọc email",
    text: "Thật à, mình còn có email...",
    motion: "push",
    mood: "neutral",
    next: "l03d",
  },
  l03d: {
    id: "l03d",
    image: l03g,
    video: vl03g.url,
    speaker: "L",
    action: "Nhìn kỹ thông tin...",
    text: "Khoan đã... địa chỉ email này lạ quá, đuôi là gmail-free-service.com chứ không phải nhà phát hành game. Đường link cũng có đuôi .net rất đáng ngờ...",
    motion: "push",
    mood: "danger",
    next: "l03e",
  },
  l03e: {
    id: "l03e",
    image: l03e,
    video: vl03e.url,
    speaker: "L",
    action: "Phân vân",
    text: "iPhone 17 Pro Max siêu xịn... Nhưng sao email với đường link lạ thế nhỉ?",
    motion: "kenburns",
    mood: "neutral",
    next: "l04",
  },
  l04: {
    id: "l04",
    image: l04img,
    video: vl04.url,
    speaker: "narrator",
    action: "BẠN SẼ LÀM GÌ?",
    text: "Đứng trước email thông báo trúng thưởng hấp dẫn này... L nên làm gì?",
    motion: "push",
    mood: "neutral",
    choices: [
      { label: "A. Phần thưởng to quá — bấm ngay vào đường link để nhận thưởng", next: "l05a", tone: "risky" },
      { label: "B. Dừng lại, kiểm tra kỹ địa chỉ email và đường link trước", next: "l05b", tone: "safe" },
    ],
  },
  l05a: {
    id: "l05a",
    image: l05a,
    video: vl05a.url,
    speaker: "L",
    action: "Vì ham phần thưởng...",
    text: "iPhone 17 Pro Max! Thử xem sao nhỉ!",
    motion: "push",
    mood: "danger",
    next: "l05a2",
  },
  l05a2: {
    id: "l05a2",
    image: l06b,
    video: vl06b.url,
    speaker: "narrator",
    action: "Trang web giả",
    text: "Đường link mở ra một trang web lấp lánh vàng, yêu cầu L điền hàng loạt thông tin cá nhân... và cả mật khẩu tài khoản game.",
    motion: "push",
    mood: "danger",
    next: "l06",
  },
  l06: {
    id: "l06",
    image: l07b,
    video: vl07b.url,
    speaker: "L",
    action: "Điền thông tin",
    text: "Chỉ cần điền nốt mật khẩu là xong... Mình sẽ có iPhone 17 Pro Max thôi!",
    motion: "push",
    mood: "danger",
    next: "l07",
  },
  l07: {
    id: "l07",
    image: l07e,
    video: vl07e.url,
    speaker: "narrator",
    action: "Bấm xác nhận",
    text: "L điền xong và bấm nút XÁC NHẬN NHẬN THƯỞNG. Ánh sáng vàng của trang web tắt ngấm, chỉ còn một màn hình xám đang xử lý...",
    motion: "push",
    mood: "danger",
    next: "l08",
  },
  l08: {
    id: "l08",
    image: l08,
    video: vl08.url,
    speaker: "narrator",
    action: "Máy bắt đầu lạ",
    text: "Máy chậm hẳn, màn hình giật lag liên tục và pin tụt nhanh bất thường. L bấm mãi mà mọi thứ cứ đứng im.",
    motion: "shake",
    mood: "danger",
    next: "l08b",
  },
  l08b: {
    id: "l08b",
    image: l08b,
    video: vl08b.url,
    speaker: "narrator",
    action: "Khởi động lại máy",
    text: "L thấy lạ nên tắt nguồn và khởi động lại máy. Cô ngồi im nhìn màn hình quay vòng, chờ mãi...",
    motion: "push",
    mood: "danger",
    next: "l09",
  },
  l09: {
    id: "l09",
    image: l09,
    video: vl09.url,
    speaker: "L",
    action: "Tắt máy và khởi động lại",
    text: "Sao máy tắt rồi? Không lên nữa!",
    motion: "shake",
    mood: "danger",
    next: "l09c",
  },
  l09c: {
    id: "l09c",
    image: l09c,
    video: vl09c.url,
    speaker: "narrator",
    action: "LINH LÀM GÌ BÂY GIỜ?",
    text: "Điện thoại của Linh đã bị hỏng/mã hoá do mã độc. Linh nên làm gì tiếp theo?",
    motion: "push",
    mood: "neutral",
    choices: [
      {
        label:
          "A1. Nói với bố mẹ, mượn máy khác đổi mật khẩu ngay, rồi mang máy đi kiểm tra",
        next: "l10a1",
        tone: "safe",
      },
      {
        label: "A2. Giấu bố mẹ, tự mang máy đi tiệm sửa, không kể với ai",
        next: "l10a2",
        tone: "risky",
      },
    ],
  },
  l10a1: {
    id: "l10a1",
    image: l09c,
    video: vl09c.url,
    speaker: "L",
    action: "Nói thật với bố mẹ",
    text: "Bố mẹ ơi, con lỡ điền mật khẩu vào một trang lạ... Con cần mượn máy để đổi mật khẩu ngay!",
    motion: "push",
    mood: "safe",
    next: "l11a1",
  },
  l11a1: {
    id: "l11a1",
    image: l11a1,
    video: vl11a1.url,
    speaker: "narrator",
    action: "Mang máy đi kiểm tra",
    text: "Ba mẹ đưa Linh đến một cửa hàng uy tín để kiểm tra và sửa chữa. Kỹ thuật viên cho biết máy đã dính mã độc làm hỏng hệ thống và sẽ khôi phục lại giúp em.",
    motion: "push",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "A1-SAFE",
      title: "XỬ LÝ ĐÚNG",
      lesson:
        "Khi lỡ bị lừa, việc quan trọng nhất là báo người lớn và đổi mật khẩu ngay trên một thiết bị khác an toàn, bật xác thực 2 lớp, rồi mang máy đến cửa hàng uy tín để kiểm tra và gỡ mã độc. Nói ra sớm giúp chặn thiệt hại trước khi kẻ gian kịp chiếm tài khoản.",
    },
  },
  l10a2: {
    id: "l10a2",
    image: l12a2,
    video: vl12a2.url,
    speaker: "narrator",
    action: "L12 — GIẤU",
    text: "Linh không kể với ai. Cô bé nghĩ sửa xong máy là xong chuyện.",
    motion: "push",
    mood: "danger",
    next: "l13a2",
  },
  l13a2: {
    id: "l13a2",
    image: l13a2,
    video: vl13a2.url,
    speaker: "R",
    action: "Ở tiệm sửa điện thoại",
    text: "Máy này bị mã độc phá hỏng phần cứng rồi, khó cứu lắm cháu ạ... Dữ liệu trong máy chú cũng không lấy lại được đâu.",
    motion: "shake",
    mood: "danger",
    next: "l13a2b",
  },
  l13a2b: {
    id: "l13a2b",
    image: l13a2,
    video: vl13a2.url,
    speaker: "L",
    action: "Linh hoảng hốt",
    text: "Giờ mình phải làm sao đây... Mình không dám nói với bố mẹ...",
    motion: "shake",
    mood: "danger",
    ending: {
      kind: "loss",
      code: "A2-LOSS",
      title: "HẬU QUẢ",
      lesson:
        "Vì không báo ai và không đổi mật khẩu kịp, kẻ gian tranh thủ dùng chính thông tin Linh vừa điền để chiếm tài khoản, rồi nhắn tin lừa tiếp bạn bè trong danh bạ. Sửa được máy cũng không lấy lại được tài khoản — hãy báo người lớn và đổi mật khẩu ngay thay vì giấu chuyện.",
    },
  },




  l05b: {
    id: "l05b",
    image: l03d,
    speaker: "narrator",
    action: "Nhánh B — đang xây dựng",
    text: "L dừng lại và soi kỹ địa chỉ email cùng đường link. Phần tiếp theo của nhánh này đang được dựng. Hãy quay lại sau nhé!",
    motion: "freeze",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "B-TBC",
      title: "TIẾP TỤC",
      lesson:
        "Luôn kiểm tra tên miền người gửi và đường link trước khi bấm. Không có phần thưởng miễn phí nào đòi hỏi thông tin cá nhân của bạn.",
    },
  },
};

export const FILM_START = "l02";

/**
 * KHOÁ TẠO HÌNH NHÂN VẬT — dùng chung cho MỌI cảnh của kịch bản 4.
 * Khi tạo/chỉnh bất kỳ ảnh hoặc video nào của KB4, luôn đính kèm ảnh
 * `src/assets/film5/ref-l.jpg` (character sheet của L) làm ảnh tham chiếu
 * và ghép prompt với FILM4_STYLE_LOCK bên dưới.
 */
export const FILM4_CHAR_REF = "src/assets/film5/ref-l.jpg";

export const FILM4_STYLE_LOCK =
  "Nhân vật L: nữ sinh Việt Nam 14 tuổi, tóc đen thẳng ngang vai, mắt nâu, " +
  "áo sơ mi trắng + nơ xanh navy — giữ nguyên khuôn mặt và kiểu tóc y hệt ảnh tham chiếu. " +
  "Modern 2D anime, tô phẳng, cùng bảng màu. Khung hình 16:9 (1920x1080), " +
  "bố cục ngang, nhân vật cỡ trung, đường chân trời/tầm mắt ở khoảng 45% chiều cao khung, " +
  "không zoom lệch giữa các cảnh. Tuyệt đối không có chữ, số hay ký tự nào trong ảnh.";

/** Tỉ lệ khung hình khoá cứng cho toàn bộ kịch bản 4 */
export const FILM4_ASPECT = 16 / 9;
