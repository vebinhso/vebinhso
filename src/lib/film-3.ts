import s01 from "@/assets/film4/clean/s01.jpg";
import s02 from "@/assets/film4/clean/s02.jpg";
import s03 from "@/assets/film4/clean/s03.jpg";
import s04 from "@/assets/film4/clean/s04.jpg";
import s04choice from "@/assets/film4/clean/s04-choice.jpg";
import s05 from "@/assets/film4/clean/s05.jpg";
import s06 from "@/assets/film4/clean/s06.jpg";
import s07 from "@/assets/film4/clean/s07.jpg";
import s08 from "@/assets/film4/clean/s08.jpg";
import s09 from "@/assets/film4/clean/s09.jpg";
import s10 from "@/assets/film4/clean/s10.jpg";


import vs01 from "@/assets/film4/video/b02.mp4.asset.json";
import vs02 from "@/assets/film4/video/b03.mp4.asset.json";
import vs03 from "@/assets/film4/video/b04.mp4.asset.json";
import vs04 from "@/assets/film4/video/b05.mp4.asset.json";
import vs05 from "@/assets/film4/video/b06.mp4.asset.json";
import vs06 from "@/assets/film4/video/b07.mp4.asset.json";
import vs07 from "@/assets/film4/video/b08.mp4.asset.json";
import vs08 from "@/assets/film4/video/b09.mp4.asset.json";
import vs09 from "@/assets/film4/video/b10.mp4.asset.json";
import vs10 from "@/assets/film4/video/b11.mp4.asset.json";


export type Speaker = "narrator" | "B" | "H" | "T" | "X";

export type Choice = {
  label: string;
  next: string;
  tone?: "safe" | "risky" | "neutral";
};

export type Motion = "kenburns" | "push" | "shake" | "freeze";

export type FilmNode = {
  id: string;
  image: string;
  video?: string;
  speaker: Speaker;
  action?: string;
  text: string;
  motion?: Motion;
  mood?: "danger" | "safe" | "neutral";
  /** Hiện lớp phủ đường link giả mạo (dựng bằng CSS) */
  linkOverlay?: boolean;
  /** Hiện lớp phủ trang bình chọn giả (dựng bằng CSS) */
  voteOverlay?: boolean;
  /** Hiện lớp phủ hộp đăng nhập giả + thanh địa chỉ */
  loginOverlay?: boolean;
  /** Hiện lớp phủ dãy chấm mật khẩu đang gõ */
  typingOverlay?: boolean;
  /** Hiện lớp phủ thông báo bình chọn thành công */
  successOverlay?: boolean;
  /** Hiện lớp phủ danh sách tài khoản bị đánh cắp */
  listOverlay?: boolean;
  /** Hiện lớp phủ loạt thông báo dồn dập */
  notifOverlay?: boolean;
  /** Giới hạn thời gian suy nghĩ (giây) cho nút quyết định */
  timeLimitSec?: number;
  /** Ảnh riêng hiển thị khi tới lúc chọn đáp án */
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
  B: {
    name: "Bảo",
    color: "text-sky-300",
    voice: "echo",
    instructions:
      "Nam học sinh 15–16 tuổi, giọng trẻ, trong, thân thiện và tốt bụng. Nói tự nhiên như đang nghĩ thành tiếng. Diễn biến cảm xúc: quan tâm bạn → hơi vội vàng → nghi ngờ → bối rối → quyết đoán.",
    speed: 1,
    pitch: 1.08,
    rate: 1,
  },
  H: {
    name: "Hà",
    color: "text-pink-300",
    voice: "coral",
    instructions:
      "Nữ học sinh 15–16 tuổi, giọng nhẹ, dễ thương, hơi hồi hộp và gấp gáp khi nhờ vả. Về sau hoảng hốt vì mất tài khoản. Nói tự nhiên, lễ phép, không kịch tính hoá.",
    speed: 1,
    pitch: 1.18,
    rate: 1.02,
  },
  T: {
    name: "Tuấn",
    color: "text-emerald-300",
    voice: "alloy",
    instructions:
      "Nam học sinh 15–16 tuổi, bạn thân, giọng chắc, tỉnh táo, nói nhanh và thẳng thắn khi cảnh báo bạn. Không hoảng loạn, có chút hài hước tự nhiên.",
    speed: 1.05,
    pitch: 0.98,
    rate: 1.05,
  },
  X: {
    name: "Kẻ gian",
    color: "text-red-400",
    voice: "ash",
    instructions:
      "Giọng nam trưởng thành, lạnh, trầm, không cảm xúc, nói ngắn gọn và tính toán. Là giọng vô hình đứng sau các trang giả mạo. Không hét lên, chỉ đều đều và đáng sợ.",
    speed: 1,
    pitch: 0.75,
    rate: 1,
  },
};

export const FILM_TITLE = "MỘT CÚ BẤM VÌ BẠN";
export const FILM_POSTER = s01;
export const FILM_SUMMARY_IMAGE = s02;

export const FILM_NOTES = [
  "Tin nhắn đến từ nick bạn bè vẫn có thể là kẻ gian đang chiếm tài khoản của bạn ấy.",
  "Không bao giờ đăng nhập tài khoản qua đường link lạ — hãy soi kỹ tên miền.",
  "Xác minh bằng một kênh khác (gọi điện, gặp trực tiếp) trước khi bấm hay giúp đỡ.",
  "Khi phát hiện bẫy, hãy cảnh báo bạn bè ngay để ngăn người tiếp theo sập bẫy.",
];

export const FILM: Record<string, FilmNode> = {
  // S01 — Buổi tối, Bảo đang lướt Messenger
  s01: {
    id: "s01",
    image: s01,
    video: vs01.url,
    speaker: "narrator",
    action: "21:40 — phòng riêng của Bảo, ánh đèn bàn ấm",
    text: "Hai mươi mốt giờ bốn mươi. Một buổi tối bình thường. Bảo, học sinh lớp 10, đang nằm lướt Messenger sau giờ học bài.",
    motion: "kenburns",
    mood: "neutral",
    next: "s02",
  },
  // S02 — Tin nhắn từ nick của Hà
  s02: {
    id: "s02",
    image: s02,
    video: vs02.url,
    speaker: "H",
    action: "Một tin nhắn mới bật lên từ nick của Hà — bạn cùng khối",
    text: "Bảo ơi, cứu tớ với! Tớ đang lọt Top 5 cuộc thi Mẫu Ảnh Học Sinh Tài Năng 2026 của thành phố nè. Hôm nay là ngày cuối đóng cổng bình chọn rồi mà tớ đang thiếu mất chục vote nữa là bị loại. Bảo vào link này bấm vote giúp tớ với, tớ ơn Bảo nhiều lắm nè!",
    motion: "push",
    mood: "danger",
    next: "s03",
  },
  // S03 — Đường link được gửi kèm
  s03: {
    id: "s03",
    image: s03,
    video: vs03.url,
    speaker: "narrator",
    action: "Ngón tay Bảo dừng lại ngay trên đường link",
    text: "Kèm theo tin nhắn là một đường link. Nhìn thoáng qua thì rất giống trang bình chọn thật, nhưng tên miền lại kết thúc bằng chấm t-o-p, và thanh địa chỉ không có biểu tượng ổ khoá — kết nối không được mã hoá.",
    motion: "push",
    mood: "danger",
    linkOverlay: true,
    next: "s04",
  },
  // S04 — Bảo phân vân: nút quyết định số 1
  s04: {
    id: "s04",
    image: s04,
    video: vs04.url,
    speaker: "B",
    action: "Ngón cái Bảo lơ lửng trên màn hình — cậu chỉ muốn giúp bạn",
    text: "Bạn cùng trường nhờ gấp thế này... mình giúp một cái cũng nhanh thôi mà. Nhưng mà lâu rồi Hà đâu có nhắn tin cho mình...",
    motion: "push",
    mood: "danger",
    timeLimitSec: 10,
    choiceImage: s04choice,
    choices: [
      {
        label: "A. Bạn cùng trường nhờ gấp, link nhìn cũng đàng hoàng — bấm vote luôn",
        next: "s05",
        tone: "risky",
      },
      {
        label: "B. Lâu rồi Hà không nhắn... dừng lại kiểm tra kỹ đường link đã",
        next: "pendingB",
        tone: "safe",
      },
    ],

  },
  // S05 (B06) — Trang web quá đẹp
  s05: {
    id: "s05",
    image: s05,
    video: vs05.url,
    speaker: "narrator",
    action: "Trang web mở ra — hồng rực, lấp lánh, quá hoàn hảo",
    text: "Một trang web hồng rực hiện ra với hình ảnh của Hà. Kim tuyến bay lơ lửng, bóng bay, ruy băng, một chiếc nút khổng lồ phát sáng, và một chiếc đồng hồ đếm ngược đang chạy. Mọi thứ đẹp đến mức không kịp để ai nghi ngờ — đó chính là điều đáng ngờ nhất.",
    motion: "push",
    mood: "danger",
    voteOverlay: true,
    next: "s06",
  },
  // S06 — Hộp đăng nhập giả
  s06: {
    id: "s06",
    image: s06,
    video: vs06.url,
    speaker: "narrator",
    action: "Một hộp đăng nhập trượt lên che kín trang hồng",
    text: "Bảo bấm nút bình chọn. Một hộp thoại trượt lên: để tránh gian lận vote, vui lòng đăng nhập tài khoản Facebook hoặc Zalo để hệ thống xác minh. Trên thanh địa chỉ, chữ facebook chấm com chỉ là phần đầu — tên miền thật lại là vote hai nghìn không trăm hai sáu chấm xyz. Và ổ khoá vẫn đang mở.",
    motion: "push",
    mood: "danger",
    loginOverlay: true,
    next: "s07",
  },
  // S07 — Bảo gõ mật khẩu
  s07: {
    id: "s07",
    image: s07,
    video: vs07.url,
    speaker: "narrator",
    action: "Ngón cái gõ trên bàn phím, từng dấu chấm hiện ra",
    text: "Giao diện giống hệt Facebook thật, nên Bảo không nghĩ ngợi gì thêm. Cậu gõ email, rồi gõ mật khẩu. Bảo mất bốn giây để gõ xong. Bốn giây — và mọi thứ không thể quay lại.",
    motion: "push",
    mood: "danger",
    typingOverlay: true,
    next: "s08",
  },
  // S08 — Trang web báo thành công
  s08: {
    id: "s08",
    image: s08,
    video: vs08.url,
    speaker: "narrator",
    action: "Trang web quay vòng vòng rồi báo thành công",
    text: "Trang web quay vòng vòng rồi báo thành công: cảm ơn bạn đã bình chọn. Bảo mỉm cười, úp điện thoại xuống bàn, kéo chăn lên đi ngủ. Cậu thấy mình vừa làm một việc tốt.",
    motion: "kenburns",
    mood: "neutral",
    successOverlay: true,
    next: "s09",
  },
  // S09 — Phía bên kia màn hình
  s09: {
    id: "s09",
    image: s09,
    video: vs09.url,
    speaker: "narrator",
    action: "Căn phòng tối đen, hai bàn tay đeo găng gõ phím",
    text: "Ở một nơi khác, trong căn phòng tối đen, hai bàn tay đeo găng đang gõ phím. Trên màn hình, một dòng mới hiện lên và sáng xanh: tài khoản thứ hai trăm mười bốn trong đêm nay. Không có ai nhắm vào Bảo cả. Bảo chỉ là một dòng trong danh sách.",
    motion: "push",
    mood: "danger",
    listOverlay: true,
    next: "s10",
  },
  // S10 — Bừng tỉnh giữa đêm
  s10: {
    id: "s10",
    image: s10,
    video: vs10.url,
    speaker: "narrator",
    action: "Bảo bật dậy giữa đêm, chộp lấy điện thoại",
    text: "Bảo bật dậy giữa đêm, chăn hất tung, tay quờ lấy chiếc điện thoại trên bàn. Màn hình sáng trắng loá cả gương mặt cậu: mười bảy tin nhắn Zalo, bốn cuộc gọi nhỡ, sáu mươi ba tin trong nhóm lớp. Tất cả đều đang hỏi cùng một chuyện.",
    motion: "shake",
    mood: "danger",
    notifOverlay: true,
    next: "pendingA",
  },
  pendingA: {
    id: "pendingA",
    image: s08,
    speaker: "narrator",
    text: "Sáng hôm sau, mọi chuyện mới bắt đầu...",
    mood: "danger",
    ending: {
      kind: "loss",
      code: "…",
      title: "PHẦN TIẾP THEO ĐANG ĐƯỢC DỰNG",
      lesson:
        "Nhánh sau đêm đó (S09 trở đi) sẽ được bổ sung ở bản cập nhật kế tiếp. Ghi nhớ: một đường link lạ gửi kèm lời nhờ gấp luôn là dấu hiệu cần dừng lại.",
    },
  },
  pendingB: {
    id: "pendingB",
    image: s04,
    speaker: "narrator",
    text: "Bảo rụt tay lại, nhìn kỹ đường link thêm một lần nữa...",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "…",
      title: "PHẦN TIẾP THEO ĐANG ĐƯỢC DỰNG",
      lesson:
        "Nhánh kiểm tra đường link (S05 trở đi) sẽ được bổ sung ở bản cập nhật kế tiếp. Ghi nhớ: hãy xác minh với bạn qua một kênh khác trước khi giúp.",
    },
  },
};


export const FILM_START = "s01";
