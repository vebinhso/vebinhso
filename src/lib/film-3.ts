import s01 from "@/assets/film4/clean/s01.jpg";
import s02 from "@/assets/film4/clean/s02.jpg";
import s03 from "@/assets/film4/clean/s03.jpg";
import s04 from "@/assets/film4/clean/s04.jpg";
import s04choice from "@/assets/film4/clean/s04-choice.jpg";
import s04decide from "@/assets/film4/clean/s04-decide.jpg";
import s05 from "@/assets/film4/clean/s05.jpg";
import s06 from "@/assets/film4/clean/s06.jpg";
import s07 from "@/assets/film4/clean/s07.jpg";
import s08 from "@/assets/film4/clean/s08.jpg";
import s09 from "@/assets/film4/clean/s09.jpg";
import s10 from "@/assets/film4/clean/s10.jpg";
import s11 from "@/assets/film4/clean/s11c.jpg";
import s12 from "@/assets/film4/clean/s12.jpg";
import s13 from "@/assets/film4/clean/s13.jpg";
import s14 from "@/assets/film4/clean/s14b.jpg";
import s15 from "@/assets/film4/clean/s15b.jpg";
import s16 from "@/assets/film4/clean/s16.jpg";

import vs01 from "@/assets/film4/video/b02.mp4.asset.json";
import vs02 from "@/assets/film4/video/b03.mp4.asset.json";
import vs03 from "@/assets/film4/video/b04.mp4.asset.json";
import vs04 from "@/assets/film4/video/b05.mp4.asset.json";
import vs04b from "@/assets/film4/video/b05b.mp4.asset.json";
import vs05 from "@/assets/film4/video/b06.mp4.asset.json";
import vs06 from "@/assets/film4/video/b07.mp4.asset.json";
import vs07 from "@/assets/film4/video/b08.mp4.asset.json";
import vs08 from "@/assets/film4/video/b09.mp4.asset.json";
import vs09 from "@/assets/film4/video/b10.mp4.asset.json";
import vs10 from "@/assets/film4/video/b11.mp4.asset.json";
import vs11 from "@/assets/film4/video/s11c.mp4.asset.json";
import vs12 from "@/assets/film4/video/b13.mp4.asset.json";
import vs13 from "@/assets/film4/video/b14.mp4.asset.json";
import vs16 from "@/assets/film4/video/b17.mp4.asset.json";

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
  /** Hiện lớp phủ tin nhắn cảnh báo nhóm lớp (dựng bằng CSS) */
  groupChatOverlay?: boolean;
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
  /** Hiện lớp phủ báo mất tài khoản */
  lostOverlay?: boolean;
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

export const FILM_TITLE = "CÚ BẤM VÌ BẠN BÈ";
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
    next: "s04q",
  },
  // S04q — Người dẫn chuyện đọc yêu cầu quyết định
  s04q: {
    id: "s04q",
    image: s04decide,
    video: vs04b.url,
    speaker: "narrator",
    action: "Bảo cầm điện thoại, ngón cái lơ lửng — cậu không biết phải làm gì",
    text: "Bảo cầm chặt điện thoại, ngón cái lơ lửng trên đường link mà không biết phải làm gì. Bạn đang vào vai Bảo. Bảo nên làm gì bây giờ? Hãy chọn một trong hai phương án dưới đây.",
    motion: "push",
    mood: "danger",
    choiceImage: s04choice,
    choices: [
      {
        label: "A. Bạn cùng trường nhờ gấp, link nhìn cũng đàng hoàng — bấm vote luôn",
        next: "s05",
        tone: "risky",
      },
      {
        label: "B. Lâu rồi Hà không nhắn... dừng lại kiểm tra kỹ đường link đã",
        next: "b01",
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
    next: "s11",
  },
  // S11 — Cuộc gọi của Tuấn
  s11: {
    id: "s11",
    image: s11,
    video: vs11.url,
    speaker: "T",
    action: "Bảo nghe điện thoại giữa đêm, mặt tái đi",
    text: "Bảo ơi! Mày bị hack Facebook đúng không? Nick mày đang đi gửi link mượn năm triệu khắp lớp mình kìa!",
    motion: "shake",
    mood: "danger",
    next: "s11b",
  },
  s11b: {
    id: "s11b",
    image: s11,
    video: vs11.url,
    speaker: "B",
    action: "Bảo chết lặng, tay bấu lấy tóc",
    text: "Hả??? Tớ có nhắn cho ai đâu! Tớ vừa vote cho Hà xong mà?!",
    motion: "shake",
    mood: "danger",
    next: "s12",
  },
  // S12 — Mất tài khoản
  s12: {
    id: "s12",
    image: s12,
    video: vs12.url,
    speaker: "narrator",
    action: "Bảo thử đăng nhập lại, màn hình báo lỗi đỏ",
    text: "Bảo thử đăng nhập lại. Mật khẩu không chính xác. Kẻ gian đã đổi mật khẩu, đổi cả email khôi phục và bật xác thực hai lớp bằng số điện thoại của chúng. Tài khoản sáu năm của Bảo — mất trong mười lăm phút.",
    motion: "push",
    mood: "danger",
    lostOverlay: true,
    next: "s13",
  },
  // S13 — Câu hỏi lựa chọn 2.A
  s13: {
    id: "s13",
    image: s13,
    video: vs13.url,
    speaker: "narrator",
    action: "Bảo ngồi thu lu bên mép giường trong bóng tối",
    text: "Nick của Bảo đang đi lừa cả lớp. Bảo làm gì ngay bây giờ?",
    motion: "kenburns",
    mood: "danger",

    choices: [
      {
        label:
          'A1. Gọi điện, nhắn Zalo, báo nhóm lớp: "Nick tớ bị hack, đừng bấm link, đừng chuyển tiền!" — và nói với bố mẹ',
        next: "s14",
        tone: "safe",
      },
      {
        label: 'A2. Xấu hổ, không dám kể, tự bấm "Quên mật khẩu" liên tục',
        next: "endA2",
        tone: "risky",
      },
    ],
  },
  // S14 — Bảo cảnh báo nhóm lớp
  s14: {
    id: "s14",
    image: s14,
    groupChatOverlay: true,
    speaker: "B",
    action: "Bảo đăng cảnh báo lên nhóm lớp và các nhóm bạn bè",
    text: "Mọi người ơi, nick Facebook của tớ vừa bị hack. Tuyệt đối đừng bấm link, đừng chuyển tiền cho nick đó!",
    motion: "push",
    mood: "safe",
    next: "s14b",
  },
  s14b: {
    id: "s14b",
    image: s14,
    groupChatOverlay: true,
    speaker: "narrator",
    action: "Tin nhắn cảnh báo lan nhanh trong nhóm lớp",
    text: "Tốc độ quan trọng hơn thể diện. Mỗi phút im lặng là thêm một người bạn có thể mất tiền. Bảo gọi điện, nhắn Zalo và báo vào tất cả các nhóm bạn bè.",
    motion: "kenburns",
    mood: "safe",
    next: "s15",
  },
  // S15 — Nhờ phụ huynh hỗ trợ
  s15: {
    id: "s15",
    image: s15,
    video: vs15.url,
    speaker: "narrator",
    action: "Bảo cùng bố mẹ liên hệ hỗ trợ để khoá tài khoản",
    text: "Bảo kể hết mọi chuyện với bố mẹ. Hai bố con cùng ngồi trước máy tính: báo cáo tài khoản bị hack, yêu cầu khoá tài khoản, xác minh danh tính, đổi email khôi phục và bật xác thực hai lớp.",
    motion: "push",
    mood: "safe",
    next: "s16",
  },
  // S16 — Kết quả tốt
  s16: {
    id: "s16",
    image: s16,
    video: vs16.url,
    speaker: "narrator",
    action: "Cả lớp cảm ơn Bảo vì đã báo kịp thời",
    text: "Mọi người đã được cảnh báo kịp thời, không ai bị sập bẫy. Tài khoản của Bảo đang được khôi phục. Cả lớp nhắn lại: may mà Bảo báo sớm.",
    motion: "kenburns",
    mood: "safe",
    next: "endA1",
  },
  endA1: {
    id: "endA1",
    image: s13,
    speaker: "narrator",
    text: "Bảo cảnh báo kịp thời nên không ai trong lớp bị lừa. Cậu nhờ bố mẹ hỗ trợ báo khoá tài khoản, giữ được uy tín và học được một bài học quý giá.",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "A1",
      title: "KẾT QUẢ KHI CHỌN A1",
      lesson:
        '• Bảo cảnh báo kịp thời, bạn bè không ai bị lừa!\n• Bảo nhờ phụ huynh hỗ trợ báo khoá nick.\n• Bảo giữ được uy tín và học được bài học quý giá!\n\nBÀI HỌC: Khi nhận tin nhắn nhờ "bấm link bình chọn/vote", hãy luôn cảnh giác, kiểm tra kỹ và xác thực lại với bạn bè qua kênh liên lạc khác để bảo vệ mình và những người xung quanh!',
    },
  },
  endA2: {
    id: "endA2",
    image: s13,
    speaker: "narrator",
    text: "Bảo im lặng vì xấu hổ. Trong lúc cậu loay hoay bấm quên mật khẩu, một bạn trong lớp đã chuyển đi hai triệu đồng cho kẻ gian.",
    mood: "danger",
    ending: {
      kind: "loss",
      code: "A2",
      title: "KẾT QUẢ KHI CHỌN A2",
      lesson:
        '• Vì im lặng, một bạn trong lớp bị lừa chuyển 2 triệu đồng!\n• Bảo mất nick mạng xã hội kỷ niệm.\n• Bảo áy náy, mất uy tín nghiêm trọng với bạn bè.\n\nBÀI HỌC: Khi nhận tin nhắn nhờ "bấm link bình chọn/vote", hãy luôn cảnh giác, kiểm tra kỹ và xác thực lại với bạn bè qua kênh liên lạc khác để bảo vệ mình và những người xung quanh!',
    },
  },
  // ===== NHÁNH B — Bảo dừng lại kiểm tra đường link =====
  b01: {
    id: "b01",
    image: s03,
    video: vs03.url,
    speaker: "narrator",
    action: "Bảo rụt tay lại, phóng to đường link để soi từng chữ",
    text: "Bảo rụt ngón tay lại. Cậu phóng to thanh địa chỉ và soi từng chữ: tên miền kết thúc bằng chấm t-o-p, không phải trang chính thức nào cả, và ổ khoá bên trái vẫn đang mở. Một trang bình chọn thật không bao giờ trông như vậy.",
    motion: "push",
    mood: "safe",
    linkOverlay: true,
    next: "b02",
  },
  b02: {
    id: "b02",
    image: s04,
    video: vs04.url,
    speaker: "B",
    action: "Bảo ngồi dậy, tay cầm điện thoại, suy nghĩ",
    text: "Link này lạ thật... Nhưng nhỡ đâu Hà cần gấp thì sao? Mình nên làm gì bây giờ?",
    motion: "push",
    mood: "neutral",
    next: "b03",
  },
  b03: {
    id: "b03",
    image: s04,
    video: vs04.url,
    speaker: "narrator",
    action: "Bảo phải quyết định lần thứ hai",
    text: "Bảo tin đây là link giả. Nhưng cậu vẫn chưa biết chắc người nhắn có đúng là Hà không. Bảo làm gì tiếp theo?",
    motion: "kenburns",
    mood: "neutral",
    choices: [
      {
        label: "B1. Gọi điện trực tiếp cho Hà bằng số điện thoại để xác minh",
        next: "b04",
        tone: "safe",
      },
      {
        label: 'B2. Nhắn lại ngay trong Messenger hỏi "Hà ơi có phải cậu không?"',
        next: "b10",
        tone: "risky",
      },
      {
        label: "B3. Không bấm, nhưng cũng im lặng bỏ qua, không nói với ai",
        next: "endB3",
        tone: "neutral",
      },
    ],
  },
  // B1 — xác minh qua kênh khác
  b04: {
    id: "b04",
    image: s11,
    video: vs11.url,
    speaker: "H",
    action: "Bảo gọi điện thoại cho Hà — Hà bắt máy, giọng hốt hoảng",
    text: "Bảo hả? Tớ có nhắn gì đâu! Nick Facebook của tớ bị mất từ chiều rồi, tớ không vào lại được! Cậu đừng bấm cái link đó nhé!",
    motion: "push",
    mood: "safe",
    next: "b05",
  },
  b05: {
    id: "b05",
    image: s14,
    groupChatOverlay: true,
    speaker: "B",
    action: "Bảo đăng cảnh báo lên nhóm lớp ngay lập tức",
    text: "Mọi người ơi, nick của Hà đang bị kẻ gian chiếm. Nếu nhận được link bình chọn thì tuyệt đối đừng bấm và đừng đăng nhập gì hết nhé!",
    motion: "push",
    mood: "safe",
    next: "endB1",
  },
  endB1: {
    id: "endB1",
    image: s16,
    video: vs16.url,
    speaker: "narrator",
    text: "Bảo giữ được tài khoản, giúp Hà báo khoá nick và cảnh báo cả lớp trước khi có ai kịp sập bẫy.",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "B1",
      title: "KẾT QUẢ KHI CHỌN B1 — KẾT TỐT NHẤT",
      lesson:
        "• Bảo không mất tài khoản.\n• Hà được báo sớm nên kịp khôi phục nick.\n• Cả lớp được cảnh báo, không ai bị lừa.\n\nBÀI HỌC: Xác minh qua MỘT KÊNH KHÁC (gọi điện, gặp trực tiếp) là cách chắc chắn nhất. Tin nhắn đến từ nick bạn bè vẫn có thể do kẻ gian gửi.",
    },
  },
  // B2 — hỏi lại ngay trong Messenger (chính kẻ gian trả lời)
  b10: {
    id: "b10",
    image: s02,
    video: vs02.url,
    speaker: "X",
    action: "Tin nhắn trả lời đến chỉ sau vài giây",
    text: "Tớ đây mà, Hà nè. Link của ban tổ chức đó, an toàn tuyệt đối. Bảo bấm nhanh giúp tớ với, sắp đóng cổng rồi!",
    motion: "push",
    mood: "danger",
    next: "b11",
  },
  b11: {
    id: "b11",
    image: s04,
    video: vs04.url,
    speaker: "narrator",
    action: "Bảo tạm yên tâm — nhưng người trả lời không phải Hà",
    text: "Bảo thấy yên tâm hơn hẳn. Nhưng người vừa trả lời cậu chính là kẻ đang chiếm tài khoản của Hà. Hỏi lại trong cùng một kênh đã bị chiếm thì câu trả lời luôn là câu kẻ gian muốn bạn nghe.",
    motion: "push",
    mood: "danger",
    next: "b12",
  },
  b12: {
    id: "b12",
    image: s04,
    video: vs04.url,
    speaker: "narrator",
    action: "Ngón tay Bảo lại đưa về phía đường link",
    text: "Bảo quyết định thế nào?",
    motion: "kenburns",
    mood: "danger",
    choices: [
      {
        label: "B2a. Vẫn thấy gợn — gọi điện thoại cho Hà để chắc chắn",
        next: "b04",
        tone: "safe",
      },
      {
        label: "B2b. Đã hỏi rồi mà, bấm vào link vote thôi",
        next: "s05",
        tone: "risky",
      },
    ],
  },
  endB3: {
    id: "endB3",
    image: s10,
    video: vs10.url,
    speaker: "narrator",
    text: "Bảo không bấm link nên giữ được tài khoản. Nhưng cậu im lặng, và sáng hôm sau hai bạn trong lớp đã đăng nhập vào trang giả đó.",
    mood: "danger",
    ending: {
      kind: "loss",
      code: "B3",
      title: "KẾT QUẢ KHI CHỌN B3 — AN TOÀN MỘT MÌNH",
      lesson:
        "• Bảo giữ được tài khoản của mình.\n• Nhưng Hà không được báo, vẫn mất nick.\n• Hai bạn khác trong lớp đã sập bẫy vì không ai cảnh báo.\n\nBÀI HỌC: Phát hiện bẫy mà im lặng thì cái bẫy vẫn còn đó. Hãy cảnh báo bạn bè ngay để ngăn người tiếp theo.",
    },
  },
};

export const FILM_START = "s01";
