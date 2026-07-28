import s1 from "@/assets/film/s1-peaceful.jpg";
import s2 from "@/assets/film/s2-call.jpg";
import s3 from "@/assets/film/s3-scammer.jpg";
import s4 from "@/assets/film/s4-locked.jpg";
import s5 from "@/assets/film/s5-warrant.jpg";
import s6 from "@/assets/film/s6-transfer.jpg";
import s7 from "@/assets/film/s7-hacked.jpg";
import s8 from "@/assets/film/s8-collapse.jpg";
import s9 from "@/assets/film/s9-bank.jpg";
import s10 from "@/assets/film/s10-fear.jpg";
import s11 from "@/assets/film/s11-warning.jpg";

export type Speaker = "K" | "N" | "narrator";

export type Choice = {
  label: string;
  next: string;
  tone?: "safe" | "risky" | "neutral";
};

export type FilmNode = {
  id: string;
  image: string;
  speaker: Speaker;
  /** Small stage direction shown above the subtitle */
  action?: string;
  text: string;
  next?: string;
  choices?: Choice[];
  ending?: {
    kind: "safe" | "loss";
    title: string;
    lesson: string;
  };
};

export const SPEAKER_META: Record<Speaker, { name: string; color: string; voice: string }> = {
  K: { name: "K — Kẻ giả danh công an", color: "text-red-400", voice: "onyx" },
  N: { name: "N — Nạn nhân", color: "text-sky-300", voice: "alloy" },
  narrator: { name: "Người dẫn chuyện", color: "text-amber-300", voice: "sage" },
};

export const FILM_TITLE = "Giả danh Công an — Cú điện thoại lúc chiều tà";

export const FILM: Record<string, FilmNode> = {
  intro: {
    id: "intro",
    image: s1,
    speaker: "narrator",
    action: "Buổi chiều yên bình",
    text: "Một buổi chiều bình thường. N ngồi làm việc bên cửa sổ, chẳng hề biết rằng chỉ vài phút nữa thôi, một cuộc gọi sẽ đảo lộn tất cả.",
    next: "ring",
  },
  ring: {
    id: "ring",
    image: s2,
    speaker: "narrator",
    action: "Điện thoại reo dồn dập — Số lạ",
    text: "Màn hình sáng lên: 'SỐ LẠ'. Chuông reo dồn dập, không chịu tắt. Bạn sẽ làm gì?",
    choices: [
      { label: "📞 Nghe máy", next: "k1", tone: "risky" },
      { label: "🚫 Không nghe, chặn số", next: "end_block", tone: "safe" },
    ],
  },
  end_block: {
    id: "end_block",
    image: s1,
    speaker: "narrator",
    text: "Bạn để cuộc gọi tự tắt và chặn số lạ. Không có câu chuyện nào xảy ra cả — và đó chính là cái kết đẹp nhất.",
    ending: {
      kind: "safe",
      title: "AN TOÀN — Không nghe máy",
      lesson: "Với số lạ tự xưng cơ quan chức năng: không nghe, hoặc nghe rồi cúp máy và gọi lại tổng đài chính thức. Không có cơ quan nào làm việc qua điện thoại.",
    },
  },
  k1: {
    id: "k1",
    image: s3,
    speaker: "K",
    action: "Giọng đanh thép, chuyên nghiệp",
    text: "Xin chào anh N, tôi là K, cảnh sát địa phương. Theo cơ quan cảnh sát chúng tôi điều tra thì chúng tôi phát hiện ra rằng anh có liên quan đến đường dây buôn bán chất cấm. Chúng tôi yêu cầu anh N hợp tác để điều tra và làm rõ.",
    next: "n1",
  },
  n1: {
    id: "n1",
    image: s2,
    speaker: "N",
    action: "Ngỡ ngàng, tay run nhẹ",
    text: "Ủa là sao cán bộ? Tôi đâu có làm gì mà liên quan đến chất cấm. Tôi sống lành mạnh lắm, thuốc lá còn không sử dụng cơ mà.",
    next: "k2",
  },
  k2: {
    id: "k2",
    image: s3,
    speaker: "K",
    action: "Hạ giọng, đe doạ",
    text: "Chúng tôi không cần biết. Chúng tôi cũng đã nắm hết thông tin cá nhân của anh rồi. Yêu cầu anh nghiêm túc chấp hành. Nếu không thì gia đình anh sẽ bị liên luỵ.",
    next: "n2",
  },
  n2: {
    id: "n2",
    image: s10,
    speaker: "N",
    action: "Mồ hôi vã ra, giọng mếu máo",
    text: "Cán bộ ơi có nhầm lẫn gì rồi! Tôi cả đời chưa bước chân vào đồn công an. Bây giờ tôi phải làm gì đây? Hiện tại tôi không ở Việt Nam, làm sao lên phường được...",
    next: "k3",
  },
  k3: {
    id: "k3",
    image: s3,
    speaker: "K",
    action: "Chiêu cô lập nạn nhân",
    text: "Anh không cần lên phường. Chúng tôi chỉ yêu cầu anh vào phòng riêng, khoá cửa lại, không để ai thấy và nghe được cuộc nói chuyện này.",
    choices: [
      { label: "🔒 Làm theo: vào phòng, khoá cửa", next: "n3", tone: "risky" },
      { label: "📢 Mở loa ngoài, gọi người thân vào nghe cùng", next: "end_family", tone: "safe" },
    ],
  },
  end_family: {
    id: "end_family",
    image: s4,
    speaker: "narrator",
    text: "Bạn bật loa ngoài. Mẹ bạn nghe được và hỏi ngay: 'Công an nào lại làm việc qua điện thoại?'. Đầu dây bên kia lúng túng vài giây rồi cúp máy. Kịch bản lừa đảo sụp đổ.",
    ending: {
      kind: "safe",
      title: "AN TOÀN — Phá thế cô lập",
      lesson: "Yêu cầu 'khoá cửa, không cho ai biết' là dấu hiệu lừa đảo 100%. Cứ mở loa ngoài và hỏi người thân — kẻ gian sợ nhất người thứ ba.",
    },
  },
  n3: {
    id: "n3",
    image: s10,
    speaker: "N",
    action: "Vội vàng chốt cửa phòng ngủ",
    text: "Vâng vâng, tôi vào phòng rồi. Cán bộ bảo gì tôi làm nấy, xin đừng bắt tôi!",
    next: "k4",
  },
  k4: {
    id: "k4",
    image: s3,
    speaker: "K",
    text: "Sau khi chúng tôi điều tra kỹ lại thì anh chỉ cần đóng cho chúng tôi án phạt, mọi chuyện sẽ yên ổn hết.",
    next: "n4",
  },
  n4: {
    id: "n4",
    image: s10,
    speaker: "N",
    text: "Tôi phải đóng bao nhiêu tiền hả cán bộ? Cán bộ muốn bao nhiêu tôi cũng đóng, để chứng minh tôi vô tội.",
    next: "k5",
  },
  k5: {
    id: "k5",
    image: s3,
    speaker: "K",
    action: "Buông câu chốt",
    text: "Anh chỉ cần đóng cho chúng tôi 600 triệu đồng, chúng tôi sẽ xoá sạch tội của anh.",
    choices: [
      { label: "🧠 Bình tĩnh hỏi lại: 'Công an giờ làm việc qua điện thoại hả?'", next: "b1_n5", tone: "safe" },
      { label: "💳 Xin trả góp vì không đủ tiền", next: "b2_n8", tone: "neutral" },
      { label: "🏦 Hoảng loạn, chuyển ngay 300 triệu", next: "b3_transfer", tone: "risky" },
    ],
  },

  /* ===== Nhánh 1.1 — phản ứng tỉnh táo ===== */
  b1_n5: {
    id: "b1_n5",
    image: s10,
    speaker: "N",
    action: "Ngập ngừng rồi lấy lại bình tĩnh",
    text: "Dạ cán bộ cho tôi hỏi, công an bây giờ chuyển đổi số hết rồi hả cán bộ? Hiện đại ghê á cán bộ.",
    next: "b1_k6",
  },
  b1_k6: {
    id: "b1_k6",
    image: s3,
    speaker: "K",
    action: "Gắt lên để chữa thẹn",
    text: "Thái độ này là chống đối người thi hành công vụ nhé!",
    next: "b1_n6",
  },
  b1_n6: {
    id: "b1_n6",
    image: s10,
    speaker: "N",
    text: "Dạ em xin lỗi cán bộ. Nhưng mà em không xài Zalo cán bộ ơi. Cán bộ có xài Instagram hay Threads không ạ, tại em toàn xài mấy nền tảng đó không à.",
    next: "b1_k7",
  },
  b1_k7: {
    id: "b1_k7",
    image: s3,
    speaker: "K",
    text: "Tôi yêu cầu anh nghiêm túc, không cợt nhả để chúng tôi còn làm việc!",
    next: "b1_n7",
  },
  b1_n7: {
    id: "b1_n7",
    image: s10,
    speaker: "N",
    text: "Em vẫn nghiêm túc mà cán bộ. Mà tại em không có Zalo, điện thoại em hết tiền nữa...",
    next: "b1_hangup",
  },
  b1_hangup: {
    id: "b1_hangup",
    image: s3,
    speaker: "narrator",
    action: "Tút... tút... tút...",
    text: "K cúp máy. Vài phút sau, một tấm ảnh 'LỆNH BẮT TẠM GIAM' đóng dấu đỏ chót, có đúng tên bạn, được gửi tới.",
    next: "warrant",
  },
  warrant: {
    id: "warrant",
    image: s5,
    speaker: "K",
    action: "Gửi giấy tờ giả",
    text: "Đây là giấy án phạt của anh, đã được chúng tôi đóng dấu đỏ. Yêu cầu anh nghe theo hướng dẫn để được giảm án. Nếu không, chúng tôi buộc phải mạnh tay.",
    choices: [
      { label: "😰 Sợ quá, tiếp tục nghe theo", next: "b2_n8", tone: "risky" },
      { label: "🔍 Phóng to xem: dấu đỏ mờ, sai chính tả → báo công an phường", next: "end_fake_doc", tone: "safe" },
    ],
  },
  end_fake_doc: {
    id: "end_fake_doc",
    image: s5,
    speaker: "narrator",
    text: "Bạn phóng to tấm ảnh: con dấu bị méo, font chữ lệch, sai chính tả. Bạn chụp màn hình, mang ra công an phường trình báo. Kẻ gian mất trắng con mồi.",
    ending: {
      kind: "safe",
      title: "AN TOÀN — Vạch trần giấy tờ giả",
      lesson: "Không cơ quan tố tụng nào gửi lệnh bắt qua Zalo/ảnh chụp. Mọi giấy tờ thật đều được trao trực tiếp, có biên nhận, tại trụ sở.",
    },
  },

  /* ===== Nhánh 1.2 — xin trả góp ===== */
  b2_n8: {
    id: "b2_n8",
    image: s9,
    speaker: "N",
    text: "Cán bộ ơi, bây giờ tôi không đủ tiền để chuyển ngay thì sao ạ? Tôi còn đang dành dụm mua Macbook nữa. Cán bộ làm vậy không sợ tôi hết tiền hả?",
    next: "b2_k9",
  },
  b2_k9: {
    id: "b2_k9",
    image: s3,
    speaker: "K",
    action: "Đóng vai vị cứu tinh, siết chặt hơn",
    text: "Chúng tôi không cần biết. Anh hãy chuyển tiền ngay lập tức. Nếu không thì mọi thông tin cá nhân của anh sẽ bị lan truyền, gia đình anh sẽ bị liên luỵ.",
    next: "b2_n9",
  },
  b2_n9: {
    id: "b2_n9",
    image: s10,
    speaker: "N",
    action: "Cảm động giả tạo",
    text: "Nhưng mà giờ tôi không có tiền... cán bộ có nhận trả góp không ạ?",
    next: "b2_hangup",
  },
  b2_hangup: {
    id: "b2_hangup",
    image: s10,
    speaker: "narrator",
    action: "K cúp máy...",
    text: "Im lặng. Rồi K gọi lại, giọng gấp gáp hơn, ép bạn phải hành động ngay trong 10 phút.",
    choices: [
      { label: "🏦 Vay mượn và chuyển 300 triệu", next: "b3_transfer", tone: "risky" },
      { label: "🛑 Dừng lại, gọi 113 / ra công an phường kiểm tra", next: "end_verify", tone: "safe" },
    ],
  },
  end_verify: {
    id: "end_verify",
    image: s1,
    speaker: "narrator",
    text: "Bạn cúp máy và tự mình gọi tới công an phường. Câu trả lời: 'Không có vụ nào như vậy, đó là lừa đảo'. Tài khoản của bạn vẫn nguyên vẹn.",
    ending: {
      kind: "safe",
      title: "AN TOÀN — Xác minh trước khi chuyển tiền",
      lesson: "Quy tắc vàng: DỪNG – KIỂM TRA – GỌI LẠI bằng số chính thức. Kẻ lừa đảo luôn ép bạn quyết định gấp để bạn không kịp suy nghĩ.",
    },
  },

  /* ===== Nhánh 2.1 — đã chuyển tiền ===== */
  b3_transfer: {
    id: "b3_transfer",
    image: s9,
    speaker: "N",
    action: "Tay run rẩy mở app ngân hàng",
    text: "Tôi... tôi chuyển đủ 300 triệu vào số tài khoản mà cán bộ gửi rồi ạ! Cán bộ kiểm tra giúp tôi với!",
    next: "b3_k10",
  },
  b3_k10: {
    id: "b3_k10",
    image: s3,
    speaker: "K",
    action: "Mắt sáng rực, tiếp tục 'vắt chanh'",
    text: "Alo! Anh làm cái gì thế này?! Cú pháp chuyển tiền sai một ký tự nên hệ thống bảo mật đã treo khoản 300 triệu đó! Bây giờ anh phải chuyển thêm 300 triệu nữa đúng cú pháp để giải phóng cả hai khoản. Không chuyển là mất trắng số tiền cũ đấy!",
    next: "b3_n10",
  },
  b3_n10: {
    id: "b3_n10",
    image: s9,
    speaker: "N",
    action: "Hoảng loạn gấp đôi",
    text: "Trời ơi sao lại thế! Mất 300 triệu thì tôi chết mất... Để tôi đi vay mượn họ hàng chuyển tiếp ạ!",
    next: "b4_link",
  },

  /* ===== Nhánh 3.1 — app giả mạo ===== */
  b4_link: {
    id: "b4_link",
    image: s11,
    speaker: "K",
    action: "Gửi một đường link lạ",
    text: "Bây giờ để không mất phí chuyển tiền và bảo mật thông tin, anh truy cập đường link này để tải ứng dụng 'Bảo mật Công an' về máy. Mở app lên và nhập thông tin tài khoản ngân hàng vào đó để máy chủ tự quét.",
    choices: [
      { label: "📥 Cài ứng dụng và cấp quyền", next: "b4_install", tone: "risky" },
      { label: "⚠️ Máy báo cảnh báo nguy hiểm — từ chối cài", next: "b5_refuse", tone: "safe" },
    ],
  },
  b4_install: {
    id: "b4_install",
    image: s11,
    speaker: "N",
    text: "Tôi tải xong rồi cán bộ. Nó hiện thông báo đòi quyền 'Trợ năng' với 'Đọc tin nhắn SMS', tôi bấm Đồng ý hết rồi nhé.",
    next: "b4_k11",
  },
  b4_k11: {
    id: "b4_k11",
    image: s3,
    speaker: "K",
    action: "Âm thầm thao tác trên máy tính",
    text: "Tốt lắm. Giữ nguyên màn hình đó trong 15 phút để hệ thống quét nhé!",
    next: "b4_drain",
  },
  b4_drain: {
    id: "b4_drain",
    image: s7,
    speaker: "narrator",
    action: "15 phút sau...",
    text: "Màn hình điện thoại tối đen. Ở đầu bên kia, K tự mở app ngân hàng, tự đọc mã OTP trong SMS và rút sạch tiền cùng hạn mức thẻ tín dụng sang tài khoản rác.",
    next: "b4_end",
  },
  b4_end: {
    id: "b4_end",
    image: s8,
    speaker: "N",
    action: "Máy sáng lại, tin nhắn báo trừ hết tiền",
    text: "Cán bộ ơi, sao tài khoản tôi về 0 đồng rồi??? Cán bộ ơi??? ... Đầu dây bên kia đã chặn liên lạc và biến mất.",
    ending: {
      kind: "loss",
      title: "MẤT SẠCH TÀI SẢN",
      lesson: "Không bao giờ cài app ngoài kho ứng dụng chính thức, đặc biệt là file .apk lạ. Quyền 'Trợ năng' + 'Đọc SMS' = trao chìa khoá tài khoản ngân hàng cho kẻ gian.",
    },
  },
  b5_refuse: {
    id: "b5_refuse",
    image: s11,
    speaker: "N",
    action: "Điện thoại hiện cảnh báo đỏ",
    text: "Ủa cán bộ ơi, máy tôi sắp hết dung lượng rồi thì sao mà tải. À với lại điện thoại tôi đang báo ứng dụng lạ, cần quét vi-rút ạ.",
    next: "b5_k12",
  },
  b5_k12: {
    id: "b5_k12",
    image: s3,
    speaker: "K",
    action: "Lộ bản chất côn đồ",
    text: "Mày có cài không thì bảo?! Mày thích chống đối công an đúng không? Thích đi tù không?!",
    next: "b5_n12",
  },
  b5_n12: {
    id: "b5_n12",
    image: s10,
    speaker: "N",
    action: "Ngộ ra bản chất lừa đảo",
    text: "Công an gì mà ăn nói hồ đồ vậy? Tôi khỏi chuyển tiền bây giờ à. Công an mà nói với dân như thế, có tin tôi mách lại công an thật không hả?",
    ending: {
      kind: "safe",
      title: "THOÁT BẪY — Cảnh báo bảo mật cứu bạn",
      lesson: "Khi bị đe doạ, chửi bới, ép cài app: đó chắc chắn là lừa đảo. Hãy cúp máy, giữ lại bằng chứng và trình báo cơ quan công an nơi cư trú.",
    },
  },
};

export const FILM_START = "intro";

// ---- Cinematic footage: một số cảnh có video thật thay cho ảnh tĩnh ----
import v1 from "@/assets/film/v1-peaceful.mp4.asset.json";
import v2 from "@/assets/film/v2-call.mp4.asset.json";
import v3 from "@/assets/film/v3-scammer.mp4.asset.json";
import v4 from "@/assets/film/v4-collapse.mp4.asset.json";

/** image src -> video url (phát loop thay ảnh) */
export const VIDEO_FOR_IMAGE: Record<string, string> = {
  [s1]: v1.url,
  [s2]: v2.url,
  [s3]: v3.url,
  [s8]: v4.url,
};
