import s01 from "@/assets/film2/clean3/poster-user.png";
import a02 from "@/assets/film2/audio/s02-narrator.mp3.asset.json";
import a12 from "@/assets/film2/audio/s12-narrator.mp3.asset.json";
import a03 from "@/assets/film2/audio/s03-narrator.mp3.asset.json";
import a22 from "@/assets/film2/audio/s24-narrator.mp3.asset.json";
import a11 from "@/assets/film2/audio/s11-narrator.mp3.asset.json";
import a21 from "@/assets/film2/audio/s21-narrator.mp3.asset.json";
import a14 from "@/assets/film2/audio/s14-narrator.mp3.asset.json";
import a17 from "@/assets/film2/audio/s17-narrator.mp3.asset.json";
import a20 from "@/assets/film2/audio/s20-narrator.mp3.asset.json";
import a04 from "@/assets/film2/audio/s04-n.mp3.asset.json";
import a15 from "@/assets/film2/audio/s16-n.mp3.asset.json";
import a07 from "@/assets/film2/audio/s07-n.mp3.asset.json";
import a07b from "@/assets/film2/audio/s07b-k.mp3.asset.json";
import a18 from "@/assets/film2/audio/s19-k.mp3.asset.json";
import a16 from "@/assets/film2/audio/s16-k.mp3.asset.json";
import a05 from "@/assets/film2/audio/s05-k.mp3.asset.json";
import a26 from "@/assets/film2/audio/s26-n.mp3.asset.json";
import a08 from "@/assets/film2/audio/s08-k.mp3.asset.json";
import a09 from "@/assets/film2/audio/s09-k.mp3.asset.json";
import a13 from "@/assets/film2/audio/s13-n.mp3.asset.json";
import s02 from "@/assets/film2/clean/s02.jpg";
import s03 from "@/assets/film2/clean/s03.jpg";
import s04 from "@/assets/film2/clean/s04.jpg";
import s05 from "@/assets/film2/clean/s05.jpg";
import s06 from "@/assets/film2/clean/s06.jpg";
import s07 from "@/assets/film2/clean/s07.jpg";
import s08 from "@/assets/film2/clean/s08b.jpg";
import s09 from "@/assets/film2/clean/s09.jpg";
import s10 from "@/assets/film2/clean3/s10c.jpg";
import s11 from "@/assets/film2/clean3/s11.jpg";
import s12 from "@/assets/film2/clean2/s12.jpg";
import s13 from "@/assets/film2/clean2/s13.jpg";
import s14 from "@/assets/film2/clean2/s14.jpg";
import s15 from "@/assets/film2/clean2/s15.jpg";
import s16 from "@/assets/film2/clean2/s16.jpg";
import s17 from "@/assets/film2/clean2/s17.jpg";
import s18 from "@/assets/film2/clean2/s18.jpg";
import s19 from "@/assets/film2/clean/s19.jpg";
import s20 from "@/assets/film2/clean2/s20.jpg";
import s21 from "@/assets/film2/clean2/s21.jpg";
import s22 from "@/assets/film2/clean2/s22.jpg";
import s23 from "@/assets/film2/clean6/s23w.jpg";
import s24 from "@/assets/film2/clean6/s24w.jpg";
import s25 from "@/assets/film2/clean3/s25b.jpg";
import s26 from "@/assets/film2/clean3/s26.jpg";
import s27 from "@/assets/film2/clean3/s27.jpg";
import v02 from "@/assets/film2/v02.mp4.asset.json";
import v03 from "@/assets/film2/v03.mp4.asset.json";
import v04 from "@/assets/film2/v04.mp4.asset.json";
import v05 from "@/assets/film2/v05.mp4.asset.json";
import v07 from "@/assets/film2/v07.mp4.asset.json";
import v08 from "@/assets/film2/v08c.mp4.asset.json";
import v09 from "@/assets/film2/v09.mp4.asset.json";
import v10 from "@/assets/film2/v10c.mp4.asset.json";
import v11 from "@/assets/film2/v11.mp4.asset.json";
import v12 from "@/assets/film2/v12.mp4.asset.json";
import v13 from "@/assets/film2/v13.mp4.asset.json";
import v14 from "@/assets/film2/v14.mp4.asset.json";
import v15 from "@/assets/film2/v15.mp4.asset.json";
import v16 from "@/assets/film2/v16.mp4.asset.json";
import v17 from "@/assets/film2/v17.mp4.asset.json";
import v18 from "@/assets/film2/v18.mp4.asset.json";
import v20 from "@/assets/film2/v20.mp4.asset.json";
import v21 from "@/assets/film2/v21.mp4.asset.json";
import v22 from "@/assets/film2/v22c.mp4.asset.json";
import v23 from "@/assets/film2/v23w.mp4.asset.json";
import v24 from "@/assets/film2/v24w.mp4.asset.json";
import v25 from "@/assets/film2/v25b.mp4.asset.json";
import v26 from "@/assets/film2/v26b.mp4.asset.json";

export type Speaker = "K" | "N" | "narrator";

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
  /** Giọng đọc thu sẵn (ưu tiên hơn TTS) */
  audio?: string;
  speaker: Speaker;
  action?: string;
  text: string;
  motion?: Motion;
  /** phủ màu: nguy hiểm (lạnh) hay an toàn (ấm) */
  mood?: "danger" | "safe" | "neutral";
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
  K: {
    name: "K — Kẻ giả danh công an",
    color: "text-red-400",
    voice: "onyx",
    instructions:
      "Nam 35–50 tuổi, giọng trầm, lạnh, đầy quyền uy và tự tin. Nói NHANH, dứt khoát, ra lệnh thay vì đề nghị, thường ngắt lời. Không cười, hầu như không nói 'làm ơn'. Dùng từ ngữ pháp lý, hành chính. Bình tĩnh khi kiểm soát nhưng có thể lập tức trở nên đe doạ. Ấn tượng: một điều tra viên dày dạn.",
    speed: 1.12,
    pitch: 0.7,
    rate: 1.12,
  },
  N: {
    name: "N — Nạn nhân",
    color: "text-sky-300",
    voice: "nova",
    instructions:
      "Nam trẻ 18–25 tuổi, giọng thân thiện, lễ phép, ngây thơ, tò mò và hơi rụt rè. Nói với tốc độ vừa, hơi chậm; hay đặt câu hỏi, ngập ngừng trước khi trả lời, có những khoảng ngắt ngắn. Khi sợ thì giọng run nhẹ và hụt hơi. Diễn biến cảm xúc: thoải mái → bối rối → lo lắng → hoảng sợ → nhẹ nhõm. Tuyệt đối không hung hăng.",
    speed: 0.95,
    pitch: 1.18,
    rate: 0.96,
  },
  narrator: {
    name: "Người dẫn chuyện",
    color: "text-amber-300",
    voice: "sage",
    instructions:
      "Giọng trung tính 25–35 tuổi, điềm tĩnh, ấm, chuyên nghiệp, phát âm rõ ràng, đáng tin cậy theo phong cách phim tài liệu (National Geographic). Tốc độ vừa phải, chuyển ý mượt mà, nhấn nhá đúng chi tiết quan trọng. Khách quan, không diễn quá, không hoảng loạn, không la hét.",
    speed: 1,
    pitch: 1,
    rate: 1,
  },
};

export const FILM_TITLE = "ALO, CẢNH SÁT ĐÂY!";
export const FILM_POSTER = s01;
export const FILM_SUMMARY_IMAGE = s27;

export const FILM_NOTES = [
  "Không cung cấp thông tin cá nhân cho người lạ.",
  "Không cài đặt ứng dụng lạ, không cấp quyền truy cập.",
  "Khi nghi ngờ, hãy hỏi người thân hoặc gọi cơ quan chức năng.",
  "An toàn mạng — Trách nhiệm của mỗi chúng ta!",
];

export const FILM: Record<string, FilmNode> = {
  /* ===== MỞ ĐẦU ===== */
  s02: {
    id: "s02",
    image: s02,
    video: v02.url,
    audio: a02.url,
    speaker: "narrator",
    action: "18:40 — Căn hộ nhỏ, nắng chiều",
    text: "Mười tám giờ bốn mươi. Một buổi chiều bình thường như mọi ngày. Anh N tưới cây bên cửa sổ, ly trà còn ấm trên bàn.",
    motion: "kenburns",
    mood: "safe",
    next: "s03",
  },
  s03: {
    id: "s03",
    image: s03,
    video: v03.url,
    speaker: "narrator",
    action: "Điện thoại rung trên mặt bàn gỗ",
    text: "Điện thoại reo. Màn hình hiện: Số lạ.",
    audio: a03.url,
    motion: "push",
    next: "s04",
  },
  s04: {
    id: "s04",
    image: s04,
    video: v04.url,
    speaker: "N",
    action: "Đưa máy lên tai, giọng lịch sự",
    text: "Alo, ai vậy dạ?",
    audio: a04.url,
    motion: "kenburns",
    next: "s05",
  },
  s05: {
    id: "s05",
    image: s05,
    video: v05.url,
    audio: a05.url,
    speaker: "K",
    action: "Đầu dây bên kia — phòng tối, tai nghe, hai màn hình xanh lơ",
    text: "Xin chào anh em, tôi là Kà, cán bộ điều tra, anh có liên quan đến một đường dây tội phạm mà chúng tôi đang theo dõi.",
    motion: "push",
    mood: "danger",
    next: "s06",
  },

  s06: {
    id: "s06",
    image: s06,
    speaker: "narrator",
    text: "Bạn sẽ phản ứng thế nào?",
    motion: "freeze",
    choices: [
      { label: "A. Hoảng sợ, nghe theo và làm theo hướng dẫn", next: "s07", tone: "risky" },
      { label: "B. Bình tĩnh, nghi ngờ và hỏi lại thông tin", next: "s26", tone: "safe" },
    ],
  },

  /* ===== NHÁNH 1A — RƠI VÀO BẪY ===== */
  s07: {
    id: "s07",
    image: s07,
    video: v07.url,
    audio: a07.url,
    speaker: "N",
    action: "Mồ hôi vã ra, giọng run",
    text: "Cán bộ ơi, chắc có nhầm lẫn gì rồi. Cả đời tôi chưa từng bước chân vào đồn công an.",
    motion: "shake",
    mood: "danger",
    next: "s07b",
  },
  s07b: {
    id: "s07b",
    image: s07,
    video: v07.url,
    audio: a07b.url,
    speaker: "K",
    action: "Ép sát, hạ giọng đe doạ",
    text: "Nếu anh không hợp tác, chúng tôi sẽ bắt giữ ngay và phong toả toàn bộ tài khoản của anh.",
    motion: "shake",
    mood: "danger",
    next: "s08",
  },
  s08: {
    id: "s08",
    image: s08,
    video: v08.url,
    audio: a08.url,
    speaker: "K",
    action: "Đòn cô lập",
    text: "Khóa anh vào phòng, khóa cửa lại, không được cho ai nghe thấy cuộc gọi này.",
    motion: "push",
    mood: "danger",
    next: "s09",
  },
  s09: {
    id: "s09",
    image: s09,
    video: v09.url,
    audio: a09.url,
    speaker: "K",
    action: "Ra giá",
    text: "Để chứng minh sự trong sạch, anh phải chuyển 600 triệu đồng vào tài khoản tạm giữ của cơ quan điều tra.",
    motion: "push",
    mood: "danger",
    next: "s10",
  },
  s10: {
    id: "s10",
    image: s10,
    video: v10.url,
    speaker: "narrator",
    action: "Tin nhắn đến — một tấm ảnh đóng dấu đỏ",
    text: "K gửi cho N một lệnh bắt giữ giả mạo để tăng độ tin tưởng. Không cơ quan tố tụng nào gửi lệnh bắt qua tin nhắn.",
    motion: "push",
    mood: "danger",
    next: "s11",
  },
  s11: {
    id: "s11",
    image: s11,
    video: v11.url,
    speaker: "narrator",
    action: "Hai bàn tay run rẩy giữ điện thoại",
    text: "Sáu trăm triệu. Ô xác nhận đã sáng lên. Ngón tay N run bần bật, mồ hôi vã ra.",
    audio: a11.url,
    motion: "shake",
    mood: "danger",
    next: "s12",
  },
  s12: {
    id: "s12",
    image: s12,
    video: v12.url,
    audio: a12.url,
    speaker: "narrator",
    action: "NÚT QUYẾT ĐỊNH 2",
    text: "Chỉ một lựa chọn đúng để bảo vệ mình, bạn sẽ làm gì?",
    motion: "freeze",
    choices: [
      { label: "A. Viện lý do, kéo dài thời gian, không chuyển tiền", next: "s13", tone: "safe" },
      { label: "B. Chuyển 300 triệu ngay cho xong chuyện", next: "s15", tone: "risky" },
    ],
  },

  /* ===== 2A — CÙ CƯA → KẾT THÚC B ===== */
  s13: {
    id: "s13",
    image: s13,
    video: v13.url,
    audio: a13.url,
    speaker: "N",
    action: "Ngồi thẳng lại, nở nụ cười ranh mãnh",
    text: "Tôi cần thêm thời gian suy nghĩ, mà giờ tôi không có tiền, cán bộ có cho trả góp không à?",
    motion: "kenburns",
    next: "s14",
  },
  s14: {
    id: "s14",
    image: s14,
    video: v14.url,
    speaker: "narrator",
    action: "Cuộc gọi đã kết thúc",
    text: "N quyết định cúp máy và không tiếp tục cuộc gọi nữa. Đèn bật sáng, căn phòng ấm trở lại. Không một đồng nào rời khỏi tài khoản.",
    audio: a14.url,
    motion: "kenburns",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "B",
      title: "KẾT THÚC B — THOÁT HIỂM AN TOÀN",
      lesson:
        "Kéo dài thời gian là vũ khí mạnh nhất của bạn. Hãy cúp máy, hít thở, rồi tự gọi lại cho công an phường bằng số chính thức.",
    },
  },

  /* ===== 2B — ĐÃ CHUYỂN TIỀN ===== */
  s15: {
    id: "s15",
    image: s15,
    video: v15.url,
    speaker: "N",
    action: "Màn hình báo chuyển khoản thành công",
    text: "Tôi chuyển đủ ba trăm triệu rồi ạ, cán bộ kiểm tra giúp tôi với!",
    audio: a15.url,
    motion: "push",
    mood: "danger",
    next: "s16",
  },
  s16: {
    id: "s16",
    image: s16,
    video: v16.url,
    audio: a16.url,
    speaker: "K",
    action: "Cười lớn, bắt đầu vắt chanh",
    text: "Anh làm cái gì thế này? Sai cú pháp một ký tự nên hệ thống treo mất rồi. Phải chuyển thêm 300 triệu nữa mới giải phóng được cả hai khoản.",
    motion: "shake",
    mood: "danger",
    next: "s17",
  },
  s17: {
    id: "s17",
    image: s17,
    video: v17.url,
    speaker: "narrator",
    action: "Hai giờ mười bốn phút sáng — quầy vay tín chấp",
    text: "N hoang mang, đi vay thêm tiền để phục vụ điều tra. Đây là bẫy chi phí chìm: đã mất ba trăm triệu nên càng cố cứu bằng ba trăm triệu nữa.",
    audio: a17.url,
    motion: "kenburns",
    mood: "danger",
    next: "s18",
  },
  s18: {
    id: "s18",
    image: s18,
    video: v18.url,
    audio: a18.url,
    speaker: "K",
    action: "Gửi một đường link lạ",
    text: "Tải ứng dụng này để bộ Công an giám sát điện thoại của anh. Cài xong thì báo lại tôi ngay.",
    motion: "push",
    mood: "danger",
    next: "s19",
  },
  s19: {
    id: "s19",
    image: s19,
    speaker: "narrator",
    action: "NÚT QUYẾT ĐỊNH 3",
    text: "Đây là bước cuối cùng và cũng là nguy hiểm nhất. Bạn sẽ làm gì?",
    motion: "freeze",
    choices: [
      { label: "A. Cài đặt và cấp quyền theo hướng dẫn", next: "s20", tone: "risky" },
      { label: "B. Dừng lại, đọc kỹ cảnh báo của điện thoại", next: "s23", tone: "safe" },
    ],
  },

  /* ===== 3A — MẤT TRẮNG ===== */
  s20: {
    id: "s20",
    image: s20,
    video: v20.url,
    speaker: "narrator",
    action: "Hộp thoại xin quyền hiện lên",
    text: "Ứng dụng đòi quyền đọc tin nhắn, đọc danh bạ, truy cập bộ nhớ và quản trị thiết bị. N bấm Cho phép tất cả. Quyền trợ năng nghĩa là cho người lạ nhìn và bấm thay bạn. Quyền SMS nghĩa là chúng đọc được mã OTP.",
    audio: a20.url,
    motion: "push",
    mood: "danger",
    next: "s21",
  },
  s21: {
    id: "s21",
    image: s21,
    video: v21.url,
    speaker: "narrator",
    action: "Bên kia màn hình: 'Đã kết nối'",
    text: "K chiếm quyền điều khiển điện thoại của N từ xa. Hắn tự mở app ngân hàng, tự đọc mã OTP, tự bấm xác nhận.",
    audio: a21.url,
    motion: "kenburns",
    mood: "danger",
    next: "s22",
  },
  s22: {
    id: "s22",
    image: s22,
    video: v22.url,
    speaker: "N",
    action: "Số dư: 0 đồng",
    text: "Toàn bộ tiền trong tài khoản đã bị rút sạch. Số điện thoại kia giờ không còn tồn tại.",
    audio: a22.url,
    motion: "shake",
    mood: "danger",
    ending: {
      kind: "loss",
      code: "D",
      title: "KẾT THÚC D — MẤT TRẮNG",
      lesson:
        "Không bao giờ cài ứng dụng ngoài kho chính thức. Quyền Trợ năng cộng quyền đọc SMS chính là chìa khoá tài khoản ngân hàng của bạn.",
    },
  },

  /* ===== 3B — PHẢN ĐÒN ===== */
  s23: {
    id: "s23",
    image: s23,
    video: v23.url,
    speaker: "narrator",
    action: "Màn hình đỏ rực cảnh báo",
    text: "Cảnh báo nguy hiểm: ứng dụng này có thể đọc tin nhắn và điều khiển thiết bị của bạn. N khựng lại, tỉnh ra.",
    motion: "push",
    next: "s23b",
  },
  s23b: {
    id: "s23b",
    image: s23,
    video: v23.url,
    speaker: "N",
    text: "Ủa cán bộ, máy tôi đang báo ứng dụng lạ, cần quét vi-rút ạ. Tôi chưa cài đâu.",
    motion: "kenburns",
    next: "s24",
  },
  s24: {
    id: "s24",
    image: s24,
    video: v24.url,
    speaker: "K",
    action: "Kịch bản gãy — kẻ lừa đảo lộ bản chất khi mất quyền kiểm soát",
    text: "Anh có cài không thì bảo?! Thích đi tù không?!",
    motion: "kenburns",
    mood: "danger",
    next: "s25",
  },
  s25: {
    id: "s25",
    image: s25,
    video: v25.url,
    speaker: "N",
    action: "Bình tĩnh phản đòn",
    text: "Tôi đã ghi âm cuộc gọi này và sẽ trình báo cơ quan chức năng ngay bây giờ.",
    motion: "kenburns",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "C",
      title: "KẾT THÚC C — THOÁT HIỂM PHÚT CHÓT",
      lesson:
        "Cảnh báo bảo mật của điện thoại là bạn của bạn. Khi kẻ gian chửi bới, đe doạ — đó là lúc chúng đã lộ mặt. Hãy ghi âm, chụp màn hình và trình báo.",
    },
  },

  /* ===== 1B — THOÁT NGAY TỪ ĐẦU ===== */
  s26: {
    id: "s26",
    image: s26,
    video: v26.url,
    audio: a26.url,
    speaker: "N",
    action: "Giọng bình tĩnh, không sợ hãi",
    text: "Công an làm việc thì mời giấy về địa phương, chứ không làm việc qua điện thoại. Tôi cúp máy đây.",
    motion: "kenburns",
    mood: "safe",
    next: "s26b",
  },
  s26b: {
    id: "s26b",
    image: s26,
    video: v26.url,
    speaker: "narrator",
    action: "Cuộc gọi đã kết thúc — 01:12",
    text: "K hoảng sợ, cúp máy và biến mất. Bạn không mất một đồng nào.",
    motion: "kenburns",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "A",
      title: "KẾT THÚC A — THOÁT HIỂM SỚM",
      lesson:
        "Cơ quan tố tụng không bao giờ làm việc, doạ bắt hay yêu cầu chuyển tiền qua điện thoại. Nghi ngờ là cúp máy — đó là cái kết đẹp nhất.",
    },
  },
};

export const FILM_START = "s02";
