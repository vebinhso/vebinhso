// Tri thức phát hiện tin nhắn lừa đảo — rút gọn từ bộ dữ liệu 300 tin nhắn lừa đảo tiếng Việt
// (scam_message_dataset) do dự án Vệ Binh Số cung cấp, bổ sung các biến thể trên mạng xã hội
// hiện nay (đặc biệt là Threads) mà bộ dữ liệu gốc chưa bao phủ.

export type ScamMessageCategory = {
  id: string;
  label: string;
  n: number;
  platforms: string[];
  examples: string[];
  flags: string[];
};

export const SCAM_MESSAGE_DATASET: {
  categories: ScamMessageCategory[];
  topFlags: string[];
  platforms: string[];
} = {
  "categories": [
    {
      "id": "nhom_tai_lieu_hoc_tap_gia",
      "label": "Nhóm tài liệu/đề thi học tập giả",
      "n": 20,
      "platforms": [
        "Instagram",
        "Messenger",
        "Zalo"
      ],
      "examples": [
        "Chào Bùi Thanh Trúc, mình thấy bạn cùng lớp ôn Đại học với mình. Mình có tài liệu + đề thi thử độc quyền, vào nhóm lấy free nè: https://congan-xacminh",
        "Trần Bảo Ngọc ơi, bạn đang ôn thi SAT đúng không? Mình cũng đang ôn nè, có nhóm hay post đề thi thật sớm lắm, mình join được nên chia sẻ cho bạn: http"
      ],
      "flags": [
        "Yêu cầu cung cấp OTP, mật khẩu, thông tin thẻ ngân hàng qua tin nhắn/link",
        "Người lạ/tài khoản mới kết bạn nhưng xưng hô thân mật như đã quen biết",
        "Gửi kèm link lạ, rút gọn hoặc tên miền không chính thức, yêu cầu bấm vào ngay"
      ]
    },
    {
      "id": "gia_danh_nguoi_quen_muon_tien",
      "label": "Giả danh người quen mượn tiền",
      "n": 20,
      "platforms": [
        "Messenger",
        "SMS/Điện thoại",
        "Zalo"
      ],
      "examples": [
        "Chị/anh ơi, em là con/cháu, điện thoại em hư rồi xài số bạn nhắn tạm. Em đang cần gấp 10.000.000đ đóng viện phí, chị/anh chuyển giúp em vào 688507987 ",
        "Alo Bùi Thanh Trúc, mình Hải Đăng đây, đổi số mới nè. Mình đang cần gấp 5.000.000đ chuyển khoản giúp mình vào STK 102792500 - NH BIDV, mai mình gửi lạ"
      ],
      "flags": [
        "Người lạ/tài khoản mới kết bạn nhưng xưng hô thân mật như đã quen biết",
        "Tạo áp lực thời gian, yêu cầu phản hồi/chuyển khoản gấp",
        "Cam kết lợi nhuận/thu nhập cao bất thường so với thực tế thị trường"
      ]
    },
    {
      "id": "tuyen_ctv_nhiem_vu_online",
      "label": "Tuyển cộng tác viên làm nhiệm vụ online",
      "n": 20,
      "platforms": [
        "Zalo",
        "Telegram",
        "Messenger"
      ],
      "examples": [
        "Chào bạn, shop mình đang tuyển CTV làm nhiệm vụ tăng đơn cho shop trên Shopee/Tiki, hoa hồng 10-20%/đơn, làm tại nhà, rảnh giờ nào làm giờ đó. Quan tâ",
        "Tuyển dụng gấp: Việc nhẹ lương cao, chỉ cần thao tác trên điện thoại 2-3 tiếng/ngày, thu nhập 500.000đ/ngày. Chi tiết xem tại: https://shopee-uudai-bj"
      ],
      "flags": [
        "Nền tảng đã tự động gắn cảnh báo 'người lạ' hoặc 'nghi ngờ lừa đảo'",
        "Không có thông tin xác thực về danh tính, tổ chức, địa chỉ liên hệ cụ thể",
        "Gửi kèm link lạ, rút gọn hoặc tên miền không chính thức, yêu cầu bấm vào ngay"
      ]
    },
    {
      "id": "gia_ngan_hang_otp",
      "label": "Giả ngân hàng đòi OTP / xác minh",
      "n": 20,
      "platforms": [
        "Zalo",
        "SMS/Điện thoại"
      ],
      "examples": [
        "Tài khoản của bạn có giao dịch bất thường 5.000.000đ lúc 23:45 tối qua. Nếu không phải bạn thực hiện, vui lòng gọi ngay hotline 0569262721 hoặc xác mi",
        "Tài khoản của bạn có giao dịch bất thường 500.000đ lúc 10:20 sáng nay. Nếu không phải bạn thực hiện, vui lòng gọi ngay hotline 0783827493 hoặc xác min"
      ],
      "flags": [
        "Yêu cầu cung cấp OTP, mật khẩu, thông tin thẻ ngân hàng qua tin nhắn/link",
        "Nền tảng đã tự động gắn cảnh báo 'người lạ' hoặc 'nghi ngờ lừa đảo'",
        "Lỗi chính tả, cách hành văn thiếu tự nhiên, không giống văn phong người quen thật"
      ]
    },
    {
      "id": "gia_cong_an_toa_an",
      "label": "Giả công an – toà án – viện kiểm sát",
      "n": 20,
      "platforms": [
        "SMS/Điện thoại",
        "Zalo"
      ],
      "examples": [
        "Số điện thoại của bạn liên quan đến đường dây rửa tiền đang bị điều tra. Vui lòng hợp tác cung cấp thông tin tài khoản tại https://shopee-uudai-8izj3v",
        "[Tòa án] Bạn có một lệnh triệu tập liên quan đến vụ việc dân sự. Xem chi tiết và phản hồi trước 24h tại: https://congan-xacminh-ibf1o60b98.info"
      ],
      "flags": [
        "Mạo danh người thân/cơ quan chức năng nhưng không xác minh được qua kênh chính thức",
        "Yêu cầu chuyển khoản trước khi nhận được lợi ích thực tế (cọc, phí, phần thưởng)",
        "Nền tảng đã tự động gắn cảnh báo 'người lạ' hoặc 'nghi ngờ lừa đảo'"
      ]
    },
    {
      "id": "romance_scam_tinh_cam",
      "label": "Lừa tình cảm (romance scam)",
      "n": 20,
      "platforms": [
        "Instagram",
        "Messenger",
        "Telegram"
      ],
      "examples": [
        "Chào em, anh là phi công/kỹ sư đang công tác nước ngoài, tình cờ thấy profile em nên muốn làm quen. Mình nói chuyện thêm trên Whatsapp/Telegram nhé: h",
        "Chào em, anh là phi công/kỹ sư đang công tác nước ngoài, tình cờ thấy profile em nên muốn làm quen. Mình nói chuyện thêm trên Whatsapp/Telegram nhé: h"
      ],
      "flags": [
        "Gửi kèm link lạ, rút gọn hoặc tên miền không chính thức, yêu cầu bấm vào ngay",
        "Nền tảng đã tự động gắn cảnh báo 'người lạ' hoặc 'nghi ngờ lừa đảo'",
        "Mạo danh người thân/cơ quan chức năng nhưng không xác minh được qua kênh chính thức"
      ]
    },
    {
      "id": "dau_tu_tai_chinh_nhom_chat",
      "label": "Nhóm chat đầu tư tài chính – tiền số",
      "n": 20,
      "platforms": [
        "Messenger",
        "Telegram",
        "Zalo"
      ],
      "examples": [
        "Nhóm đầu tư của tụi mình vừa chốt lời 10.000.000đ trong tuần này, còn vài suất cho người mới, vào nhóm xem hướng dẫn: https://vn-ebank-support-rc47bra",
        "Nhóm đầu tư của tụi mình vừa chốt lời 1.000.000đ trong tuần này, còn vài suất cho người mới, vào nhóm xem hướng dẫn: https://t.me/pwdtcdytwn"
      ],
      "flags": [
        "Cam kết lợi nhuận/thu nhập cao bất thường so với thực tế thị trường",
        "Lỗi chính tả, cách hành văn thiếu tự nhiên, không giống văn phong người quen thật",
        "Người lạ/tài khoản mới kết bạn nhưng xưng hô thân mật như đã quen biết"
      ]
    },
    {
      "id": "gia_shipper_giao_hang",
      "label": "Giả shipper – đơn hàng",
      "n": 20,
      "platforms": [
        "SMS/Điện thoại",
        "Zalo"
      ],
      "examples": [
        "[Giao hàng] Kiện hàng của bạn không giao được do sai địa chỉ, vui lòng xác nhận lại thông tin tại https://vn-ebank-support-7jakyhg6xp.net trước 18h hô",
        "[Giao hàng] Kiện hàng của bạn không giao được do sai địa chỉ, vui lòng xác nhận lại thông tin tại https://congan-xacminh-07pnd5ccur.info trước 18h hôm"
      ],
      "flags": [
        "Mạo danh người thân/cơ quan chức năng nhưng không xác minh được qua kênh chính thức",
        "Yêu cầu chuyển khoản trước khi nhận được lợi ích thực tế (cọc, phí, phần thưởng)",
        "Lỗi chính tả, cách hành văn thiếu tự nhiên, không giống văn phong người quen thật"
      ]
    },
    {
      "id": "gia_nguoi_noi_tieng",
      "label": "Giả người nổi tiếng / KOL tặng quà",
      "n": 20,
      "platforms": [
        "Instagram",
        "Messenger"
      ],
      "examples": [
        "streamer Gia Bảo (nhân vật hư cấu) đang tổ chức minigame tri ân fan, phần thưởng 2.000.000đ, chỉ cần xác nhận thông tin chuyển khoản phí vận chuyển tạ",
        "diễn viên Minh Khôi (nhân vật hư cấu) đang tổ chức minigame tri ân fan, phần thưởng 1.000.000đ, chỉ cần xác nhận thông tin chuyển khoản phí vận chuyển"
      ],
      "flags": [
        "Cam kết lợi nhuận/thu nhập cao bất thường so với thực tế thị trường",
        "Người lạ/tài khoản mới kết bạn nhưng xưng hô thân mật như đã quen biết",
        "Mạo danh người thân/cơ quan chức năng nhưng không xác minh được qua kênh chính thức"
      ]
    },
    {
      "id": "tuyen_dung_freelance_gia",
      "label": "Tuyển dụng freelance giả",
      "n": 20,
      "platforms": [
        "Messenger",
        "Zalo",
        "Telegram"
      ],
      "examples": [
        "Công ty mình đang cần tuyển nhân viên nhập liệu tại nhà, lương 2.000.000đ/tháng, không cần kinh nghiệm. Nộp hồ sơ và đóng phí đồng phục 100.000đ qua 8",
        "Tuyển CTV đánh giá sản phẩm trên sàn TMĐT, hoa hồng 15%/đơn, đơn đầu tiên công ty ứng trước, bạn chỉ cần nạp 300.000đ để kích hoạt tài khoản CTV tại h"
      ],
      "flags": [
        "Nền tảng đã tự động gắn cảnh báo 'người lạ' hoặc 'nghi ngờ lừa đảo'",
        "Cam kết lợi nhuận/thu nhập cao bất thường so với thực tế thị trường",
        "Yêu cầu cung cấp OTP, mật khẩu, thông tin thẻ ngân hàng qua tin nhắn/link"
      ]
    },
    {
      "id": "gia_nhan_vien_vien_thong",
      "label": "Giả nhân viên viễn thông – nhà mạng",
      "n": 20,
      "platforms": [
        "SMS/Điện thoại"
      ],
      "examples": [
        "Thuê bao của quý khách sắp bị khóa do chưa chuẩn hóa thông tin thuê bao theo quy định. Vui lòng cập nhật tại https://congan-xacminh-3ml9d527ei.info tr",
        "Thuê bao của quý khách sắp bị khóa do chưa chuẩn hóa thông tin thuê bao theo quy định. Vui lòng cập nhật tại https://shopee-uudai-2cwb19mand.vip trước"
      ],
      "flags": [
        "Không có thông tin xác thực về danh tính, tổ chức, địa chỉ liên hệ cụ thể",
        "Tạo áp lực thời gian, yêu cầu phản hồi/chuyển khoản gấp",
        "Gửi kèm link lạ, rút gọn hoặc tên miền không chính thức, yêu cầu bấm vào ngay"
      ]
    },
    {
      "id": "deepfake_video_call",
      "label": "Gọi video deepfake khuôn mặt người quen",
      "n": 20,
      "platforms": [
        "Zalo",
        "Messenger"
      ],
      "examples": [
        "(Mô tả kịch bản) Đối tượng giả giọng/giả hình người thân qua cuộc gọi video ngắn, hình ảnh giật lag, chỉ nói vài câu rồi ngắt máy với lý do 'sóng yếu'",
        "(Mô tả kịch bản) Đối tượng giả giọng/giả hình người thân qua cuộc gọi video ngắn, hình ảnh giật lag, chỉ nói vài câu rồi ngắt máy với lý do 'sóng yếu'"
      ],
      "flags": [
        "Không có thông tin xác thực về danh tính, tổ chức, địa chỉ liên hệ cụ thể",
        "Mạo danh người thân/cơ quan chức năng nhưng không xác minh được qua kênh chính thức",
        "Cam kết lợi nhuận/thu nhập cao bất thường so với thực tế thị trường"
      ]
    },
    {
      "id": "cho_thue_dat_phong_gia",
      "label": "Cho thuê nhà / đặt phòng giả",
      "n": 20,
      "platforms": [
        "Instagram",
        "Zalo",
        "Messenger"
      ],
      "examples": [
        "Căn hộ view đẹp giá tốt 5.000.000đ, chủ nhà đang ở xa nên bạn chuyển cọc 500.000đ vào 541279084 - NH ACB là mình gửi chìa khóa/hợp đồng qua bưu điện",
        "Phòng mình còn trống, giá 1.000.000đ/tháng, bạn đặt cọc 200.000đ qua 917320794 - NH TCB để mình giữ phòng, hôm nay có 3 người hỏi rồi nên bạn cọc sớm "
      ],
      "flags": [
        "Không có thông tin xác thực về danh tính, tổ chức, địa chỉ liên hệ cụ thể",
        "Cam kết lợi nhuận/thu nhập cao bất thường so với thực tế thị trường",
        "Người lạ/tài khoản mới kết bạn nhưng xưng hô thân mật như đã quen biết"
      ]
    },
    {
      "id": "trung_thuong_qua_tin_nhan",
      "label": "Trúng thưởng qua tin nhắn",
      "n": 20,
      "platforms": [
        "Zalo",
        "SMS/Điện thoại",
        "Messenger"
      ],
      "examples": [
        "Chúc mừng số điện thoại của bạn trúng thưởng 1.000.000đ từ chương trình tri ân khách hàng. Vui lòng liên hệ 0511588162 hoặc truy cập https://t.me/lmwd",
        "Chúc mừng số điện thoại của bạn trúng thưởng 2.000.000đ từ chương trình tri ân khách hàng. Vui lòng liên hệ 0779247826 hoặc truy cập https://zalo.me/g"
      ],
      "flags": [
        "Yêu cầu cung cấp OTP, mật khẩu, thông tin thẻ ngân hàng qua tin nhắn/link",
        "Yêu cầu chuyển khoản trước khi nhận được lợi ích thực tế (cọc, phí, phần thưởng)",
        "Gửi kèm link lạ, rút gọn hoặc tên miền không chính thức, yêu cầu bấm vào ngay"
      ]
    },
    {
      "id": "gia_admin_sieu_thi_dien_tu",
      "label": "Giả admin sàn / siêu thị điện máy",
      "n": 20,
      "platforms": [
        "Zalo",
        "Messenger"
      ],
      "examples": [
        "Đơn hàng #310694 của bạn trên sàn TMĐT đã bị lỗi hệ thống, số tiền 2.000.000đ sẽ được hoàn về ví, vui lòng xác nhận thông tin tại https://bit.ly/6ednp",
        "Đơn hàng #566942 của bạn trên sàn TMĐT đã bị lỗi hệ thống, số tiền 1.000.000đ sẽ được hoàn về ví, vui lòng xác nhận thông tin tại https://t.me/ou9yccf"
      ],
      "flags": [
        "Cam kết lợi nhuận/thu nhập cao bất thường so với thực tế thị trường",
        "Nền tảng đã tự động gắn cảnh báo 'người lạ' hoặc 'nghi ngờ lừa đảo'",
        "Mạo danh người thân/cơ quan chức năng nhưng không xác minh được qua kênh chính thức"
      ]
    }
  ],
  "topFlags": [
    "Yêu cầu cung cấp OTP, mật khẩu, thông tin thẻ ngân hàng qua tin nhắn/link",
    "Người lạ/tài khoản mới kết bạn nhưng xưng hô thân mật như đã quen biết",
    "Nền tảng đã tự động gắn cảnh báo 'người lạ' hoặc 'nghi ngờ lừa đảo'",
    "Cam kết lợi nhuận/thu nhập cao bất thường so với thực tế thị trường",
    "Gửi kèm link lạ, rút gọn hoặc tên miền không chính thức, yêu cầu bấm vào ngay",
    "Không có thông tin xác thực về danh tính, tổ chức, địa chỉ liên hệ cụ thể",
    "Mạo danh người thân/cơ quan chức năng nhưng không xác minh được qua kênh chính thức",
    "Lỗi chính tả, cách hành văn thiếu tự nhiên, không giống văn phong người quen thật",
    "Tạo áp lực thời gian, yêu cầu phản hồi/chuyển khoản gấp",
    "Yêu cầu chuyển khoản trước khi nhận được lợi ích thực tế (cọc, phí, phần thưởng)"
  ],
  "platforms": [
    "Zalo",
    "Messenger",
    "SMS/Điện thoại",
    "Instagram",
    "Telegram"
  ]
};

export const SCAM_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SCAM_MESSAGE_DATASET.categories.map((c) => [c.id, c.label]),
);

/** Đặc thù từng nền tảng mạng xã hội, cập nhật thêm Threads/TikTok/Facebook. */
export const PLATFORM_NOTES = `ĐẶC THÙ THEO NỀN TẢNG:
- Threads: tài khoản mới lập, ít bài, nhiều follower ảo; bình luận "inbox em chỉ cách kiếm tiền", "drop link đi em gửi tài liệu"; kéo người đọc sang Telegram/Zalo rồi mới lừa; giả tài khoản người nổi tiếng hoặc trang tin để đăng "cơ hội đầu tư"; reply dây chuyền nhiều tài khoản cùng khen một dịch vụ; link rút gọn trong bio thay vì trong bài.
- Facebook/Messenger: tài khoản nhân bản (clone) của bạn bè, nhắn mượn tiền; bình luận giả trang thương hiệu dưới bài khiếu nại; "nhận quà tri ân" từ fanpage giả.
- Zalo: giả ngân hàng/công an/viễn thông, gọi video deepfake ngắn rồi cúp, nhóm chat đầu tư.
- Instagram: giả KOL tặng quà, nhóm tài liệu học tập, tin nhắn hẹn hò.
- TikTok: bình luận và tin nhắn mời "nhiệm vụ tăng đơn", livestream bán vé/khoá học ảo.
- Telegram: nhóm "làm nhiệm vụ", bot giả sàn giao dịch, quản trị viên giả.
- SMS/Điện thoại: brandname giả, đầu số lạ, đường link chứa tên thương hiệu nhưng đuôi lạ (.top .vip .info).`;

/** Khối kiến thức chèn vào system prompt khi phân tích tin nhắn. */
export const SCAM_MESSAGE_PROMPT_BLOCK = `BỘ KỊCH BẢN TIN NHẮN LỪA ĐẢO ĐÃ GÁN NHÃN (300 mẫu tiếng Việt, 15 nhóm):
${SCAM_MESSAGE_DATASET.categories
  .map(
    (c) =>
      `- ${c.id} (${c.label}) — hay gặp trên ${c.platforms.join(", ")}\n  ví dụ: ${c.examples.join(" // ")}\n  dấu hiệu: ${c.flags.join(" | ")}`,
  )
  .join("\n")}

DẤU HIỆU PHỔ BIẾN NHẤT (theo tần suất):
${SCAM_MESSAGE_DATASET.topFlags.map((f, i) => `${i + 1}. ${f}`).join("\n")}

${PLATFORM_NOTES}

LƯU Ý QUAN TRỌNG: nhiều tin nhắn lừa đảo được viết rất tự nhiên như người thật (chính tả đúng, xưng hô thân mật). Vì vậy KHÔNG được kết luận an toàn chỉ vì văn phong giống người thật — phải chấm riêng nguy cơ lừa đảo dựa trên ý đồ (đòi tiền, đòi OTP, dụ link, hứa lợi nhuận, gấp gáp).
Nếu tin nhắn khớp một nhóm, trả đúng id nhóm; không khớp thì dùng "khong_ro".`;
