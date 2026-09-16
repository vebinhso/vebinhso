// Tri thức nhận diện ảnh giả — rút gọn từ 2 bộ dữ liệu của dự án Vệ Binh Số:
// - "ảnh_AI" (300 kịch bản ảnh do AI tạo, nhãn anh_ai_gia_mao)
// - "ảnh_pts" (300 kịch bản ảnh chỉnh sửa Photoshop, nhãn anh_chinh_sua_photoshop)
// Mỗi nhóm giữ lại các dấu hiệu thị giác/kỹ thuật xuất hiện nhiều nhất và cách kiểm chứng.

export type ForensicCategory = {
  id: string;
  desc: string;
  visual: string[];
  tech: string[];
  verify: string;
};

export const FORENSIC_TAXONOMY: { ai: ForensicCategory[]; edit: ForensicCategory[] } = {
  "ai": [
    {
      "id": "gia_mao_nguoi_noi_tieng",
      "desc": "Ảnh AI ghép mặt người nổi tiếng (hư cấu) đang quảng cáo/xác nhận điều gì đó chưa từng xảy ra",
      "visual": [
        "Ánh sáng và bóng đổ không nhất quán giữa các vật thể trong cùng một ảnh",
        "Nền ảnh mờ nhòe bất thường quanh chủ thể chính, ranh giới cắt ghép không tự nhiên",
        "Trang sức, khuyên tai không đối xứng hai bên hoặc biến mất/xuất hiện lạ giữa các chi tiết"
      ],
      "tech": [
        "Tài khoản đăng ảnh mới lập, không có lịch sử đăng bài minh bạch",
        "Không tìm thấy ảnh gốc qua tìm kiếm ảnh ngược (Google Lens/TinEye)"
      ],
      "verify": "Sử dụng công cụ phát hiện ảnh AI chuyên dụng (như Hive Moderation, AI or Not) để phân tích thêm."
    },
    {
      "id": "gia_mao_giay_to_van_ban",
      "desc": "Ảnh chụp giấy tờ/văn bản/biên lai do AI tạo ra để làm bằng chứng giả",
      "visual": [
        "Nền ảnh mờ nhòe bất thường quanh chủ thể chính, ranh giới cắt ghép không tự nhiên",
        "Tai, răng, hoặc mắt hai bên khuôn mặt không đối xứng/không nhất quán",
        "Chữ viết trong ảnh (biển hiệu, nhãn mác, văn bản) bị méo, sai chính tả vô nghĩa"
      ],
      "tech": [
        "Không có watermark xác thực nguồn gốc (C2PA/Content Credentials) từ các nền tảng tạo ảnh AI uy tín",
        "Tài khoản đăng ảnh mới lập, không có lịch sử đăng bài minh bạch"
      ],
      "verify": "Sử dụng công cụ phát hiện ảnh AI chuyên dụng (như Hive Moderation, AI or Not) để phân tích thêm."
    },
    {
      "id": "gia_mao_hien_truong_tin_tuc",
      "desc": "Ảnh AI dựng cảnh thiên tai/tai nạn/biểu tình để câu tương tác hoặc gây hoang mang",
      "visual": [
        "Ánh sáng và bóng đổ không nhất quán giữa các vật thể trong cùng một ảnh",
        "Tai, răng, hoặc mắt hai bên khuôn mặt không đối xứng/không nhất quán",
        "Phản chiếu trong gương/kính/mắt kính không khớp với vật thể xung quanh"
      ],
      "tech": [
        "Không có bài báo/nguồn tin chính thống nào khác đăng tải hình ảnh tương tự về cùng sự kiện",
        "Ảnh được đăng kèm tiêu đề giật gân, kêu gọi chia sẻ gấp thay vì trích dẫn nguồn xác thực"
      ],
      "verify": "Kiểm tra xem ảnh có kèm nhãn Content Credentials (C2PA) hoặc watermark AI (như SynthID) hay không."
    },
    {
      "id": "gia_mao_san_pham_quang_cao",
      "desc": "Ảnh sản phẩm AI dựng đẹp bất thường, không giống hàng thật khi nhận được",
      "visual": [
        "Nền ảnh mờ nhòe bất thường quanh chủ thể chính, ranh giới cắt ghép không tự nhiên",
        "Chữ viết trong ảnh (biển hiệu, nhãn mác, văn bản) bị méo, sai chính tả vô nghĩa",
        "Trang sức, khuyên tai không đối xứng hai bên hoặc biến mất/xuất hiện lạ giữa các chi tiết"
      ],
      "tech": [
        "Không có bài báo/nguồn tin chính thống nào khác đăng tải hình ảnh tương tự về cùng sự kiện",
        "Không có watermark xác thực nguồn gốc (C2PA/Content Credentials) từ các nền tảng tạo ảnh AI uy tín"
      ],
      "verify": "Phóng to ảnh để kiểm tra chi tiết nhỏ: tay, tai, chữ viết, hoạ tiết lặp lại."
    },
    {
      "id": "gia_mao_bang_chung_ca_nhan",
      "desc": "Ảnh AI dựng cảnh đời tư giả để tạo lòng tin trong lừa đảo tình cảm/đầu tư",
      "visual": [
        "Nền ảnh mờ nhòe bất thường quanh chủ thể chính, ranh giới cắt ghép không tự nhiên",
        "Hoạ tiết nền (gạch, rèm, thảm) lặp lại bất thường hoặc bị 'chảy' ở các cạnh",
        "Phản chiếu trong gương/kính/mắt kính không khớp với vật thể xung quanh"
      ],
      "tech": [
        "Ảnh được đăng kèm tiêu đề giật gân, kêu gọi chia sẻ gấp thay vì trích dẫn nguồn xác thực",
        "Thiếu metadata EXIF (thông tin máy ảnh, thời gian, GPS) hoặc metadata bị chỉnh sửa bất thường"
      ],
      "verify": "Phóng to ảnh để kiểm tra chi tiết nhỏ: tay, tai, chữ viết, hoạ tiết lặp lại."
    },
    {
      "id": "gia_mao_khoa_hoc_y_te",
      "desc": "Ảnh AI dựng minh họa khoa học/y tế giả để tăng độ tin cậy cho tin giả sức khỏe",
      "visual": [
        "Ánh sáng và bóng đổ không nhất quán giữa các vật thể trong cùng một ảnh",
        "Tai, răng, hoặc mắt hai bên khuôn mặt không đối xứng/không nhất quán",
        "Kết cấu da/tóc quá mịn, thiếu chi tiết tự nhiên (lỗ chân lông, sợi tóc rối)"
      ],
      "tech": [
        "Ảnh được đăng kèm tiêu đề giật gân, kêu gọi chia sẻ gấp thay vì trích dẫn nguồn xác thực",
        "Thiếu metadata EXIF (thông tin máy ảnh, thời gian, GPS) hoặc metadata bị chỉnh sửa bất thường"
      ],
      "verify": "Sử dụng công cụ phát hiện ảnh AI chuyên dụng (như Hive Moderation, AI or Not) để phân tích thêm."
    },
    {
      "id": "gia_mao_thien_nhien_dong_vat",
      "desc": "Ảnh AI dựng động vật/hiện tượng thiên nhiên kỳ lạ để câu tương tác/lan truyền",
      "visual": [
        "Tai, răng, hoặc mắt hai bên khuôn mặt không đối xứng/không nhất quán",
        "Ánh sáng và bóng đổ không nhất quán giữa các vật thể trong cùng một ảnh",
        "Phản chiếu trong gương/kính/mắt kính không khớp với vật thể xung quanh"
      ],
      "tech": [
        "Tài khoản đăng ảnh mới lập, không có lịch sử đăng bài minh bạch",
        "Không có watermark xác thực nguồn gốc (C2PA/Content Credentials) từ các nền tảng tạo ảnh AI uy tín"
      ],
      "verify": "Sử dụng công cụ phát hiện ảnh AI chuyên dụng (như Hive Moderation, AI or Not) để phân tích thêm."
    },
    {
      "id": "gia_mao_bat_dong_san",
      "desc": "Ảnh AI dựng bất động sản để lừa đặt cọc thuê/mua nhà không có thật",
      "visual": [
        "Nền ảnh mờ nhòe bất thường quanh chủ thể chính, ranh giới cắt ghép không tự nhiên",
        "Phản chiếu trong gương/kính/mắt kính không khớp với vật thể xung quanh",
        "Bàn tay/ngón tay có số lượng bất thường hoặc hình dạng méo mó"
      ],
      "tech": [
        "Ảnh được đăng kèm tiêu đề giật gân, kêu gọi chia sẻ gấp thay vì trích dẫn nguồn xác thực",
        "Không có watermark xác thực nguồn gốc (C2PA/Content Credentials) từ các nền tảng tạo ảnh AI uy tín"
      ],
      "verify": "Kiểm tra xem ảnh có kèm nhãn Content Credentials (C2PA) hoặc watermark AI (như SynthID) hay không."
    },
    {
      "id": "gia_mao_su_kien_lich_su",
      "desc": "Ảnh AI dựng lại sự kiện lịch sử/hiện tại chưa từng xảy ra để lan truyền thông tin sai lệch",
      "visual": [
        "Ánh sáng và bóng đổ không nhất quán giữa các vật thể trong cùng một ảnh",
        "Phản chiếu trong gương/kính/mắt kính không khớp với vật thể xung quanh",
        "Nền ảnh mờ nhòe bất thường quanh chủ thể chính, ranh giới cắt ghép không tự nhiên"
      ],
      "tech": [
        "Tài khoản đăng ảnh mới lập, không có lịch sử đăng bài minh bạch",
        "Ảnh được đăng kèm tiêu đề giật gân, kêu gọi chia sẻ gấp thay vì trích dẫn nguồn xác thực"
      ],
      "verify": "Kiểm tra xem ảnh có kèm nhãn Content Credentials (C2PA) hoặc watermark AI (như SynthID) hay không."
    },
    {
      "id": "gia_mao_ma_qr_poster",
      "desc": "Ảnh AI dựng poster khuyến mãi/thông báo chính thức kèm mã QR dẫn tới link lừa đảo",
      "visual": [
        "Kết cấu da/tóc quá mịn, thiếu chi tiết tự nhiên (lỗ chân lông, sợi tóc rối)",
        "Phối cảnh/tỷ lệ không gian sai logic vật lý (vật ở xa lại to hơn vật ở gần)",
        "Nền ảnh mờ nhòe bất thường quanh chủ thể chính, ranh giới cắt ghép không tự nhiên"
      ],
      "tech": [
        "Ảnh được đăng kèm tiêu đề giật gân, kêu gọi chia sẻ gấp thay vì trích dẫn nguồn xác thực",
        "Tài khoản đăng ảnh mới lập, không có lịch sử đăng bài minh bạch"
      ],
      "verify": "Kiểm tra xem ảnh có kèm nhãn Content Credentials (C2PA) hoặc watermark AI (như SynthID) hay không."
    },
    {
      "id": "gia_mao_hien_truong_camera",
      "desc": "Ảnh AI dựng giống ảnh chụp từ camera an ninh/điện thoại để làm 'bằng chứng' giả",
      "visual": [
        "Tai, răng, hoặc mắt hai bên khuôn mặt không đối xứng/không nhất quán",
        "Chữ viết trong ảnh (biển hiệu, nhãn mác, văn bản) bị méo, sai chính tả vô nghĩa",
        "Kết cấu da/tóc quá mịn, thiếu chi tiết tự nhiên (lỗ chân lông, sợi tóc rối)"
      ],
      "tech": [
        "Ảnh được đăng kèm tiêu đề giật gân, kêu gọi chia sẻ gấp thay vì trích dẫn nguồn xác thực",
        "Thiếu metadata EXIF (thông tin máy ảnh, thời gian, GPS) hoặc metadata bị chỉnh sửa bất thường"
      ],
      "verify": "Phóng to ảnh để kiểm tra chi tiết nhỏ: tay, tai, chữ viết, hoạ tiết lặp lại."
    }
  ],
  "edit": [
    {
      "id": "chinh_sua_gia_ca_nhan_mac",
      "desc": "Sửa giá/nhãn mác sản phẩm trong ảnh để lừa đảo mua bán",
      "visual": [
        "Màu sắc/tông màu (color temperature) của vùng chỉnh sửa lệch so với phần ảnh gốc",
        "Tỉ lệ giữa các vật thể/con người trong ảnh không khớp logic phối cảnh thực tế",
        "Font chữ, cỡ chữ trên văn bản bị sửa không khớp hoàn toàn với font gốc của tài liệu/biển hiệu"
      ],
      "tech": [
        "Tìm kiếm ảnh ngược (Google Lens/TinEye) phát hiện phiên bản gốc chưa chỉnh sửa của ảnh đang lan truyền",
        "Phân tích ELA (Error Level Analysis) cho thấy vùng bị chỉnh sửa có mức nén JPEG khác biệt bất thường"
      ],
      "verify": "Dùng công cụ tìm kiếm ảnh ngược để tìm phiên bản gốc, so sánh từng chi tiết với ảnh đang lan truyền."
    },
    {
      "id": "ghep_nguoi_vao_su_kien",
      "desc": "Ghép một người vào bối cảnh/sự kiện mà họ không thực sự có mặt",
      "visual": [
        "Vùng bị chỉnh sửa có hạt nhiễu (noise) khác biệt rõ so với phần ảnh còn lại",
        "Font chữ, cỡ chữ trên văn bản bị sửa không khớp hoàn toàn với font gốc của tài liệu/biển hiệu",
        "Đường thẳng/hoa văn (gạch nền, viền bàn, đường kẻ hóa đơn) bị lệch, gãy khúc tại vị trí chỉnh sửa"
      ],
      "tech": [
        "Phân tích ELA (Error Level Analysis) cho thấy vùng bị chỉnh sửa có mức nén JPEG khác biệt bất thường",
        "Không có nguồn xác thực nào khác (báo chí, tài khoản chính chủ) đăng cùng phiên bản ảnh này"
      ],
      "verify": "Dùng công cụ tìm kiếm ảnh ngược để tìm phiên bản gốc, so sánh từng chi tiết với ảnh đang lan truyền."
    },
    {
      "id": "xoa_them_vat_the",
      "desc": "Xóa hoặc thêm vật thể trong ảnh để thay đổi ý nghĩa/nội dung câu chuyện",
      "visual": [
        "Font chữ, cỡ chữ trên văn bản bị sửa không khớp hoàn toàn với font gốc của tài liệu/biển hiệu",
        "Chi tiết nhỏ bị lặp lại y hệt nhau (dấu hiệu dùng công cụ Clone Stamp/Healing Brush)",
        "Màu sắc/tông màu (color temperature) của vùng chỉnh sửa lệch so với phần ảnh gốc"
      ],
      "tech": [
        "Không thể liên hệ/xác minh trực tiếp với người/tổ chức được cho là chủ nhân bức ảnh gốc",
        "Phân tích ELA (Error Level Analysis) cho thấy vùng bị chỉnh sửa có mức nén JPEG khác biệt bất thường"
      ],
      "verify": "Liên hệ trực tiếp với người/tổ chức liên quan trong ảnh để xác minh tính xác thực trước khi tin hoặc chia sẻ."
    },
    {
      "id": "chinh_sua_chung_tu_giay_to",
      "desc": "Chỉnh sửa số liệu/thông tin trên ảnh chụp giấy tờ, hóa đơn, chứng từ",
      "visual": [
        "Tỉ lệ giữa các vật thể/con người trong ảnh không khớp logic phối cảnh thực tế",
        "Đường thẳng/hoa văn (gạch nền, viền bàn, đường kẻ hóa đơn) bị lệch, gãy khúc tại vị trí chỉnh sửa",
        "Số liệu/con số có khoảng cách ký tự không đều, kiểu chữ hơi khác biệt so với phần chữ in gốc"
      ],
      "tech": [
        "Không có nguồn xác thực nào khác (báo chí, tài khoản chính chủ) đăng cùng phiên bản ảnh này",
        "Không thể liên hệ/xác minh trực tiếp với người/tổ chức được cho là chủ nhân bức ảnh gốc"
      ],
      "verify": "Kiểm tra metadata ảnh (nếu còn) để xem phần mềm chỉnh sửa cuối cùng và thời gian chỉnh sửa."
    },
    {
      "id": "ghep_anh_truoc_sau_gia",
      "desc": "Ghép ảnh 'trước - sau' giả để quảng cáo sai sự thật về hiệu quả sản phẩm/dịch vụ",
      "visual": [
        "Chi tiết nhỏ bị lặp lại y hệt nhau (dấu hiệu dùng công cụ Clone Stamp/Healing Brush)",
        "Font chữ, cỡ chữ trên văn bản bị sửa không khớp hoàn toàn với font gốc của tài liệu/biển hiệu",
        "Đường thẳng/hoa văn (gạch nền, viền bàn, đường kẻ hóa đơn) bị lệch, gãy khúc tại vị trí chỉnh sửa"
      ],
      "tech": [
        "Không thể liên hệ/xác minh trực tiếp với người/tổ chức được cho là chủ nhân bức ảnh gốc",
        "Metadata EXIF cho thấy ảnh đã qua phần mềm chỉnh sửa (Photoshop, GIMP, Snapseed...) sau thời điểm chụp gốc"
      ],
      "verify": "Đối chiếu số liệu trong ảnh (giá tiền, số dư, điểm số...) với nguồn chính thức độc lập (ứng dụng ngân hàng, cổng thông tin trường học...)."
    },
    {
      "id": "chinh_sua_bien_so_thoi_gian",
      "desc": "Sửa biển số xe, mốc thời gian, hoặc thông tin định vị trên ảnh để đổ lỗi/vu khống sai đối tượng",
      "visual": [
        "Đường thẳng/hoa văn (gạch nền, viền bàn, đường kẻ hóa đơn) bị lệch, gãy khúc tại vị trí chỉnh sửa",
        "Font chữ, cỡ chữ trên văn bản bị sửa không khớp hoàn toàn với font gốc của tài liệu/biển hiệu",
        "Chi tiết nhỏ bị lặp lại y hệt nhau (dấu hiệu dùng công cụ Clone Stamp/Healing Brush)"
      ],
      "tech": [
        "Tìm kiếm ảnh ngược (Google Lens/TinEye) phát hiện phiên bản gốc chưa chỉnh sửa của ảnh đang lan truyền",
        "Không có nguồn xác thực nào khác (báo chí, tài khoản chính chủ) đăng cùng phiên bản ảnh này"
      ],
      "verify": "Đối chiếu số liệu trong ảnh (giá tiền, số dư, điểm số...) với nguồn chính thức độc lập (ứng dụng ngân hàng, cổng thông tin trường học...)."
    },
    {
      "id": "ghep_sai_boi_canh_khong_gian",
      "desc": "Ghép chủ thể vào một bối cảnh địa lý/không gian khác để đánh lừa về địa điểm thực tế",
      "visual": [
        "Chi tiết nhỏ bị lặp lại y hệt nhau (dấu hiệu dùng công cụ Clone Stamp/Healing Brush)",
        "Độ phân giải/độ nét giữa vùng ghép và phần còn lại của ảnh không đồng nhất",
        "Hướng bóng đổ của vật thể ghép không khớp với hướng ánh sáng chung của ảnh"
      ],
      "tech": [
        "Không có nguồn xác thực nào khác (báo chí, tài khoản chính chủ) đăng cùng phiên bản ảnh này",
        "Phân tích ELA (Error Level Analysis) cho thấy vùng bị chỉnh sửa có mức nén JPEG khác biệt bất thường"
      ],
      "verify": "Đối chiếu số liệu trong ảnh (giá tiền, số dư, điểm số...) với nguồn chính thức độc lập (ứng dụng ngân hàng, cổng thông tin trường học...)."
    },
    {
      "id": "chinh_sua_anh_chup_man_hinh",
      "desc": "Chỉnh sửa ảnh chụp màn hình (số dư, tin nhắn, đơn hàng, thông báo hệ thống) để tạo lòng tin giả",
      "visual": [
        "Độ phân giải/độ nét giữa vùng ghép và phần còn lại của ảnh không đồng nhất",
        "Font chữ, cỡ chữ trên văn bản bị sửa không khớp hoàn toàn với font gốc của tài liệu/biển hiệu",
        "Tỉ lệ giữa các vật thể/con người trong ảnh không khớp logic phối cảnh thực tế"
      ],
      "tech": [
        "Phân tích ELA (Error Level Analysis) cho thấy vùng bị chỉnh sửa có mức nén JPEG khác biệt bất thường",
        "Không có nguồn xác thực nào khác (báo chí, tài khoản chính chủ) đăng cùng phiên bản ảnh này"
      ],
      "verify": "Liên hệ trực tiếp với người/tổ chức liên quan trong ảnh để xác minh tính xác thực trước khi tin hoặc chia sẻ."
    },
    {
      "id": "chinh_sua_bang_diem_bang_cap",
      "desc": "Chỉnh sửa ảnh chụp bảng điểm, bằng cấp, chứng chỉ để khai gian hồ sơ",
      "visual": [
        "Đường viền quanh vật thể ghép có quầng sáng/mờ bất thường (dấu hiệu cắt-dán)",
        "Số liệu/con số có khoảng cách ký tự không đều, kiểu chữ hơi khác biệt so với phần chữ in gốc",
        "Đường thẳng/hoa văn (gạch nền, viền bàn, đường kẻ hóa đơn) bị lệch, gãy khúc tại vị trí chỉnh sửa"
      ],
      "tech": [
        "Không có nguồn xác thực nào khác (báo chí, tài khoản chính chủ) đăng cùng phiên bản ảnh này",
        "Metadata EXIF cho thấy ảnh đã qua phần mềm chỉnh sửa (Photoshop, GIMP, Snapseed...) sau thời điểm chụp gốc"
      ],
      "verify": "Phóng to vùng nghi ngờ để kiểm tra viền, độ nét, ánh sáng - vùng chỉnh sửa thường lộ dấu vết khi zoom kỹ."
    },
    {
      "id": "ghep_hien_truong_gia",
      "desc": "Ghép/chỉnh sửa ảnh hiện trường tai nạn, thiên tai, sự kiện để câu tương tác hoặc gây hoang mang",
      "visual": [
        "Tỉ lệ giữa các vật thể/con người trong ảnh không khớp logic phối cảnh thực tế",
        "Vùng bị chỉnh sửa có hạt nhiễu (noise) khác biệt rõ so với phần ảnh còn lại",
        "Đường thẳng/hoa văn (gạch nền, viền bàn, đường kẻ hóa đơn) bị lệch, gãy khúc tại vị trí chỉnh sửa"
      ],
      "tech": [
        "Không có nguồn xác thực nào khác (báo chí, tài khoản chính chủ) đăng cùng phiên bản ảnh này",
        "Tìm kiếm ảnh ngược (Google Lens/TinEye) phát hiện phiên bản gốc chưa chỉnh sửa của ảnh đang lan truyền"
      ],
      "verify": "Dùng công cụ phân tích ảnh pháp y trực tuyến (như FotoForensics - Error Level Analysis) để kiểm tra vùng bị nén JPEG khác thường."
    }
  ]
};

export const AI_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  [...FORENSIC_TAXONOMY.ai, ...FORENSIC_TAXONOMY.edit].map((c) => [c.id, c.desc]),
);

const fmt = (list: ForensicCategory[]) =>
  list
    .map(
      (c) =>
        `- ${c.id}: ${c.desc}\n  Dấu hiệu nhìn thấy: ${c.visual.join(" | ")}\n  Dấu hiệu kỹ thuật: ${c.tech.join(" | ")}\n  Kiểm chứng: ${c.verify}`,
    )
    .join("\n");

/** Khối kiến thức chèn vào system prompt khi phân tích ảnh. */
export const FORENSIC_PROMPT_BLOCK = `BỘ TIÊU CHÍ NỘI BỘ (rút từ 600 kịch bản đã gán nhãn).
A. Nhóm ẢNH DO AI TẠO (ai_category):
${fmt(FORENSIC_TAXONOMY.ai)}

B. Nhóm ẢNH CHỈNH SỬA THỦ CÔNG / PHOTOSHOP (edit_category):
${fmt(FORENSIC_TAXONOMY.edit)}

Hai nhóm này ĐỘC LẬP: một ảnh có thể vừa do AI tạo vừa bị chỉnh sửa, hoặc chỉ thuộc một nhóm, hoặc là ảnh thật (dùng "khong_ro" khi không khớp nhóm nào).`;
