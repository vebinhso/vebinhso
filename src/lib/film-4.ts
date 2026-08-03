import l01 from "@/assets/film5/poster.jpg";
import l03c from "@/assets/film5/clean/l03c.jpg";
import vl03c from "@/assets/film5/video/l03c.mp4.asset.json";
import l03 from "@/assets/film5/clean/l03b.jpg";
import vl03 from "@/assets/film5/video/l03b.mp4.asset.json";
import l02c from "@/assets/film5/clean/l03.jpg";
import vl02c from "@/assets/film5/video/l03.mp4.asset.json";
import l02 from "@/assets/film5/clean/l02b.jpg";
import vl02 from "@/assets/film5/video/l02b.mp4.asset.json";

export type Speaker = "narrator" | "L" | "X";

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
  /** Hiện lớp phủ nội dung email lừa đảo (dựng bằng CSS) */
  mailOverlay?: boolean;
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
    image: l03c,
    video: vl03c.url,
    speaker: "L",
    action: "16:30 — Đọc email",
    text: "Thật à, mình còn có email...",
    motion: "push",
    mood: "neutral",
    mailOverlay: true,
    next: "l04",
  },
  l04: {
    id: "l04",
    image: l03,
    speaker: "narrator",
    action: "Câu chuyện tiếp theo",
    text: "Câu chuyện tiếp theo đang được xây dựng. Hãy quay lại sau để cùng L đưa ra lựa chọn đúng đắn trước những chiêu trò lừa đảo trúng thưởng.",
    motion: "freeze",
    mood: "neutral",
    ending: {
      kind: "safe",
      code: "TBC",
      title: "TIẾP TỤC",
      lesson:
        "Câu chuyện của L chưa kết thúc. Hãy nhớ: không có phần thưởng nào miễn phí mà đòi hỏi thông tin cá nhân hoặc tiền của bạn trước.",
    },
  },
};

export const FILM_START = "l02";
