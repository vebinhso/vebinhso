// Tri thức phát hiện email lừa đảo — rút gọn từ bộ dữ liệu 250 email phishing tiếng Việt
// (phishing_email_dataset) do dự án Vệ Binh Số cung cấp: 12 nhóm kịch bản, tiêu đề mẫu,
// dạng tên miền người gửi giả mạo và các dấu hiệu cảnh báo phổ biến nhất.

export type PhishingCategory = {
  id: string;
  label: string;
  n: number;
  subjects: string[];
  domains: string[];
  flags: string[];
};

export const PHISHING_DATASET: { categories: PhishingCategory[]; topFlags: string[] } = {
  "categories": [
    {
      "id": "banking",
      "label": "Giả danh ngân hàng",
      "n": 21,
      "subjects": [
        "[Khẩn] Tài khoản của bạn đã bị tạm khóa - Xác minh ngay",
        "Yêu cầu cập nhật thông tin KYC trước 24h",
        "Giao dịch 15.000.000đ đang chờ xác nhận của bạn"
      ],
      "domains": [
        "shopee-uudai.vip",
        "netflix-billing-update.net",
        "ghtk-xacnhan.top"
      ],
      "flags": [
        "Yêu cầu chuyển khoản/đặt cọc trước khi nhận lợi ích",
        "Không có thông tin liên hệ xác thực hoặc mã số đơn hàng/khách hàng cụ thể",
        "Giả danh cấp trên/người quen để tạo lòng tin, yêu cầu giữ bí mật"
      ]
    },
    {
      "id": "delivery",
      "label": "Giả danh đơn vị giao hàng",
      "n": 21,
      "subjects": [
        "[Thông báo] Bạn cần thanh toán phí phát sinh 15.000đ để nhận hàng",
        "Đơn hàng của bạn không giao được - Vui lòng xác nhận địa chỉ",
        "Kiện hàng đang bị giữ tại kho, xác nhận thông tin để tiếp tục giao"
      ],
      "domains": [
        "secure-verify-account.com",
        "binance-kyc-verify.io",
        "netflix-billing-update.net"
      ],
      "flags": [
        "Lỗi chính tả, ngữ pháp hoặc trình bày thiếu chuyên nghiệp",
        "Đường link rút gọn hoặc tên miền lạ, không phải trang chính thức",
        "Yêu cầu chuyển khoản/đặt cọc trước khi nhận lợi ích"
      ]
    },
    {
      "id": "ecommerce",
      "label": "Giả danh sàn thương mại điện tử",
      "n": 21,
      "subjects": [
        "Bạn có 1 voucher 500.000đ sắp hết hạn, nhấn để nhận",
        "Đơn hàng #148458 đã bị hủy - Hoàn tiền cần xác minh tài khoản",
        "Tài khoản Shopee của bạn có dấu hiệu vi phạm, xác minh ngay"
      ],
      "domains": [
        "secure-verify-account.com",
        "microsoft-alert-login.com",
        "appleid-support.info"
      ],
      "flags": [
        "Đường link rút gọn hoặc tên miền lạ, không phải trang chính thức",
        "Lỗi chính tả, ngữ pháp hoặc trình bày thiếu chuyên nghiệp",
        "Tạo cảm giác gấp gáp, đe dọa hậu quả (khóa/hủy tài khoản) nếu không phản hồi ngay"
      ]
    },
    {
      "id": "tech",
      "label": "Giả danh hãng công nghệ / bảo mật tài khoản",
      "n": 21,
      "subjects": [
        "Ai đó vừa đăng nhập Apple ID của bạn từ thiết bị lạ",
        "Trang Facebook của bạn đã bị báo cáo vi phạm bản quyền",
        "Tài khoản Google của bạn vi phạm điều khoản, xác minh danh tính"
      ],
      "domains": [
        "ghtk-xacnhan.top",
        "shopee-uudai.vip",
        "thongbaotrungthuong.xyz"
      ],
      "flags": [
        "Tạo cảm giác gấp gáp, đe dọa hậu quả (khóa/hủy tài khoản) nếu không phản hồi ngay",
        "Yêu cầu chuyển khoản/đặt cọc trước khi nhận lợi ích",
        "Đường link rút gọn hoặc tên miền lạ, không phải trang chính thức"
      ]
    },
    {
      "id": "tax",
      "label": "Giả danh cơ quan thuế – nhà nước",
      "n": 21,
      "subjects": [
        "Thông báo hoàn thuế thu nhập cá nhân 2.450.000đ",
        "[Khẩn] Yêu cầu bổ sung hồ sơ thuế trước ngày quy định"
      ],
      "domains": [
        "microsoft-alert-login.com",
        "ghtk-xacnhan.top",
        "vn-ebank-confirm.net"
      ],
      "flags": [
        "Lời hứa phần thưởng quá hấp dẫn so với thực tế (trúng thưởng lớn không rõ lý do)",
        "Lỗi chính tả, ngữ pháp hoặc trình bày thiếu chuyên nghiệp",
        "Yêu cầu chuyển khoản/đặt cọc trước khi nhận lợi ích"
      ]
    },
    {
      "id": "prize",
      "label": "Thông báo trúng thưởng – quà tặng",
      "n": 21,
      "subjects": [
        "Bạn là 1 trong 10 khách hàng may mắn nhận iPhone 17 Pro Max",
        "Thông báo trúng giải đặc biệt chương trình tri ân khách hàng",
        "CHÚC MỪNG! Bạn đã trúng thưởng 50.000.000đ"
      ],
      "domains": [
        "vn-ebank-confirm.net",
        "secure-verify-account.com",
        "binance-kyc-verify.io"
      ],
      "flags": [
        "Lỗi chính tả, ngữ pháp hoặc trình bày thiếu chuyên nghiệp",
        "Lời hứa phần thưởng quá hấp dẫn so với thực tế (trúng thưởng lớn không rõ lý do)",
        "Địa chỉ email/link không khớp tên miền chính thức của thương hiệu"
      ]
    },
    {
      "id": "crypto",
      "label": "Đầu tư tiền số – sàn giao dịch",
      "n": 21,
      "subjects": [
        "Cảnh báo: Phát hiện rút tiền bất thường từ ví của bạn",
        "Cơ hội đầu tư sinh lời 30%/tháng - Chỉ còn 24h đăng ký",
        "Tài khoản giao dịch của bạn cần xác minh lại KYC"
      ],
      "domains": [
        "ghtk-xacnhan.top",
        "vn-ebank-confirm.net",
        "binance-kyc-verify.io"
      ],
      "flags": [
        "Yêu cầu cung cấp thông tin nhạy cảm (mật khẩu, CCCD, số tài khoản, OTP)",
        "Tạo cảm giác gấp gáp, đe dọa hậu quả (khóa/hủy tài khoản) nếu không phản hồi ngay",
        "Đường link rút gọn hoặc tên miền lạ, không phải trang chính thức"
      ]
    },
    {
      "id": "job",
      "label": "Tuyển dụng – việc nhẹ lương cao",
      "n": 21,
      "subjects": [
        "Thư mời phỏng vấn & yêu cầu đặt cọc đồng phục",
        "Chúc mừng bạn đã được chọn vào vòng phỏng vấn cuối",
        "Cơ hội việc làm tại nhà, lương 500k/ngày - Đăng ký ngay"
      ],
      "domains": [
        "netflix-billing-update.net",
        "shopee-uudai.vip",
        "secure-verify-account.com"
      ],
      "flags": [
        "Tạo cảm giác gấp gáp, đe dọa hậu quả (khóa/hủy tài khoản) nếu không phản hồi ngay",
        "Địa chỉ email/link không khớp tên miền chính thức của thương hiệu",
        "Yêu cầu cung cấp thông tin nhạy cảm (mật khẩu, CCCD, số tài khoản, OTP)"
      ]
    },
    {
      "id": "streaming",
      "label": "Giả danh dịch vụ xem phim / nghe nhạc",
      "n": 21,
      "subjects": [
        "Thanh toán Netflix của bạn bị từ chối - Cập nhật thẻ ngay",
        "Tài khoản Spotify Premium sắp bị đình chỉ"
      ],
      "domains": [
        "microsoft-alert-login.com",
        "thongbaotrungthuong.xyz",
        "appleid-support.info"
      ],
      "flags": [
        "Địa chỉ email/link không khớp tên miền chính thức của thương hiệu",
        "Yêu cầu chuyển khoản/đặt cọc trước khi nhận lợi ích",
        "Không có thông tin liên hệ xác thực hoặc mã số đơn hàng/khách hàng cụ thể"
      ]
    },
    {
      "id": "charity",
      "label": "Kêu gọi từ thiện giả",
      "n": 21,
      "subjects": [
        "Chung tay ủng hộ trẻ em vùng cao - Mọi đóng góp đều quý giá",
        "Kêu gọi quyên góp khẩn cấp cho nạn nhân lũ lụt"
      ],
      "domains": [
        "binance-kyc-verify.io",
        "thongbaotrungthuong.xyz",
        "microsoft-alert-login.com"
      ],
      "flags": [
        "Yêu cầu chuyển khoản/đặt cọc trước khi nhận lợi ích",
        "Lời hứa phần thưởng quá hấp dẫn so với thực tế (trúng thưởng lớn không rõ lý do)",
        "Tạo cảm giác gấp gáp, đe dọa hậu quả (khóa/hủy tài khoản) nếu không phản hồi ngay"
      ]
    },
    {
      "id": "boss",
      "label": "Giả danh sếp / người quen (BEC)",
      "n": 20,
      "subjects": [
        "Cần bạn xử lý gấp một việc, đang họp không tiện gọi",
        "Chuyển khoản gấp cho đối tác, sếp sẽ hoàn lại sau"
      ],
      "domains": [
        "thongbaotrungthuong.xyz",
        "binance-kyc-verify.io",
        "hoanthue-online.vn.co"
      ],
      "flags": [
        "Lỗi chính tả, ngữ pháp hoặc trình bày thiếu chuyên nghiệp",
        "Không có thông tin liên hệ xác thực hoặc mã số đơn hàng/khách hàng cụ thể",
        "Yêu cầu cung cấp thông tin nhạy cảm (mật khẩu, CCCD, số tài khoản, OTP)"
      ]
    },
    {
      "id": "utility",
      "label": "Giả danh điện – nước – viễn thông",
      "n": 20,
      "subjects": [
        "Hóa đơn nước tháng 9 của bạn đã quá hạn thanh toán",
        "Thông báo cắt điện do chưa thanh toán hóa đơn tháng này"
      ],
      "domains": [
        "hoanthue-online.vn.co",
        "thongbaotrungthuong.xyz",
        "microsoft-alert-login.com"
      ],
      "flags": [
        "Yêu cầu chuyển khoản/đặt cọc trước khi nhận lợi ích",
        "Yêu cầu cung cấp thông tin nhạy cảm (mật khẩu, CCCD, số tài khoản, OTP)",
        "Địa chỉ email/link không khớp tên miền chính thức của thương hiệu"
      ]
    }
  ],
  "topFlags": [
    "Yêu cầu chuyển khoản/đặt cọc trước khi nhận lợi ích",
    "Lỗi chính tả, ngữ pháp hoặc trình bày thiếu chuyên nghiệp",
    "Tạo cảm giác gấp gáp, đe dọa hậu quả (khóa/hủy tài khoản) nếu không phản hồi ngay",
    "Đường link rút gọn hoặc tên miền lạ, không phải trang chính thức",
    "Yêu cầu cung cấp thông tin nhạy cảm (mật khẩu, CCCD, số tài khoản, OTP)",
    "Lời hứa phần thưởng quá hấp dẫn so với thực tế (trúng thưởng lớn không rõ lý do)",
    "Không có thông tin liên hệ xác thực hoặc mã số đơn hàng/khách hàng cụ thể",
    "Địa chỉ email/link không khớp tên miền chính thức của thương hiệu",
    "Giả danh cấp trên/người quen để tạo lòng tin, yêu cầu giữ bí mật",
    "Yêu cầu quét mã QR hoặc nhấp link thay vì đăng nhập trực tiếp qua ứng dụng chính thức"
  ]
};

export const PHISHING_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PHISHING_DATASET.categories.map((c) => [c.id, c.label]),
);

/** Khối kiến thức chèn vào system prompt khi phân tích email. */
export const PHISHING_PROMPT_BLOCK = `BỘ KỊCH BẢN LỪA ĐẢO QUA EMAIL ĐÃ GÁN NHÃN (250 mẫu tiếng Việt, 12 nhóm):
${PHISHING_DATASET.categories
  .map(
    (c) =>
      `- ${c.id} (${c.label}): tiêu đề hay gặp: ${c.subjects.join(" / ")}\n  tên miền giả hay dùng: ${c.domains.join(", ")}\n  dấu hiệu chính: ${c.flags.join(" | ")}`,
  )
  .join("\n")}

DẤU HIỆU CẢNH BÁO PHỔ BIẾN NHẤT (xếp theo tần suất trong bộ dữ liệu):
${PHISHING_DATASET.topFlags.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Khi email khớp một nhóm, hãy gọi đúng id nhóm đó; nếu không khớp nhóm nào dùng "khong_ro".`;
