// Tri thức cảnh báo số điện thoại lừa đảo — rút gọn từ bộ dữ liệu 300 kịch bản
// (scam_phone_number_dataset_v2) do dự án Vệ Binh Số cung cấp.
// Lưu ý: số trong bộ dữ liệu đã được che một phần, chỉ dùng làm mẫu nhận diện,
// không phải danh sách thuê bao có thật; cũng không thể suy ra loại máy từ số.

export type ScamPhoneCategory = {
  id: string;
  label: string;
  n: number;
  script: string;
  numberTypes: string[];
  flags: string[];
};

export const SCAM_PHONE_DATASET: {
  categories: ScamPhoneCategory[];
  topFlags: string[];
  tips: string[];
  riskyCountries: string[];
} = {
  "categories": [
    {
      "id": "gia_cong_an_toa_an",
      "label": "Giả danh công an – toà án – viện kiểm sát",
      "n": 43,
      "script": "Tự xưng là cán bộ điều tra, thông báo số điện thoại/CCCD liên quan đến vụ án, yêu cầu giữ bí mật và làm theo hướng dẫn để 'chứng minh vô tội', gây sức ép tâm lý để nạn nhân chuyển tiền hoặc cung cấp OTP.",
      "numberTypes": [
        "Số cố định giả mạo cơ quan/tổ chức (che một phần)",
        "Số di động (che một phần, minh họa đầu số nhà mạng)"
      ],
      "flags": [
        "Số hiển thị bắt đầu bằng dấu (+) hoặc 00 nhưng hai số tiếp theo KHÔNG phải 84 (mã Việt Nam)",
        "Nội dung cuộc gọi không khớp với dịch vụ mà người nhận thực sự đang sử dụng",
        "Số điện thoại gọi đến không trùng với số hotline chính thức in trên thẻ/website/hóa đơn",
        "Yêu cầu gọi lại hoặc nhắn tin đến một số khác để 'biết thêm chi tiết'"
      ]
    },
    {
      "id": "gia_ngan_hang",
      "label": "Giả tổng đài ngân hàng",
      "n": 43,
      "script": "Thông báo tài khoản/thẻ có giao dịch bất thường hoặc sắp bị khóa, yêu cầu đọc mã OTP hoặc truy cập link để 'xác minh', thực chất nhằm chiếm quyền truy cập tài khoản.",
      "numberTypes": [
        "Số cố định giả mạo cơ quan/tổ chức (che một phần)",
        "Số di động (che một phần, minh họa đầu số nhà mạng)"
      ],
      "flags": [
        "Số điện thoại gọi đến không trùng với số hotline chính thức in trên thẻ/website/hóa đơn",
        "Cuộc gọi/tin nhắn chỉ đổ chuông 1-2 giây rồi tắt máy (dạng 'nháy máy')",
        "Yêu cầu gọi lại hoặc nhắn tin đến một số khác để 'biết thêm chi tiết'",
        "Nội dung cuộc gọi không khớp với dịch vụ mà người nhận thực sự đang sử dụng"
      ]
    },
    {
      "id": "gia_nha_mang",
      "label": "Giả nhân viên nhà mạng",
      "n": 43,
      "script": "Thông báo thuê bao sắp bị khóa do chưa chuẩn hóa thông tin, yêu cầu bấm phím hoặc cung cấp thông tin cá nhân để 'xác thực lại'.",
      "numberTypes": [
        "Số di động (che một phần, minh họa đầu số nhà mạng)",
        "Số cố định giả mạo cơ quan/tổ chức (che một phần)"
      ],
      "flags": [
        "Số hiển thị bắt đầu bằng dấu (+) hoặc 00 nhưng hai số tiếp theo KHÔNG phải 84 (mã Việt Nam)",
        "Giọng nói robot/thu âm sẵn, không cho phép hỏi lại hoặc phản hồi tự nhiên",
        "Cuộc gọi/tin nhắn chỉ đổ chuông 1-2 giây rồi tắt máy (dạng 'nháy máy')",
        "Yêu cầu giữ bí mật cuộc gọi, không được kể cho người thân"
      ]
    },
    {
      "id": "gia_buu_dien_giao_hang",
      "label": "Giả bưu điện – đơn vị giao hàng",
      "n": 43,
      "script": "Thông báo có bưu kiện/quà tặng đang chờ nhưng phát sinh phí, yêu cầu chuyển khoản trước để nhận hàng.",
      "numberTypes": [
        "Số di động (che một phần, minh họa đầu số nhà mạng)",
        "Số cố định giả mạo cơ quan/tổ chức (che một phần)"
      ],
      "flags": [
        "Tự xưng cơ quan chức năng nhưng làm việc qua điện thoại thay vì giấy mời/trực tiếp theo đúng quy trình pháp luật",
        "Giọng nói robot/thu âm sẵn, không cho phép hỏi lại hoặc phản hồi tự nhiên",
        "Yêu cầu giữ bí mật cuộc gọi, không được kể cho người thân",
        "Cuộc gọi/tin nhắn chỉ đổ chuông 1-2 giây rồi tắt máy (dạng 'nháy máy')"
      ]
    },
    {
      "id": "nhay_may_quoc_te",
      "label": "Nháy máy quốc tế bẫy gọi lại",
      "n": 43,
      "script": "Nháy máy 1-2 hồi chuông rồi tắt, kích thích sự tò mò khiến người nhận gọi lại (thường phát sinh cước quốc tế cao hoặc mở đầu cho kịch bản lừa đảo tiếp theo).",
      "numberTypes": [
        "Quốc tế (đầu số từng bị cảnh báo công khai)"
      ],
      "flags": [
        "Yêu cầu gọi lại hoặc nhắn tin đến một số khác để 'biết thêm chi tiết'",
        "Giọng nói robot/thu âm sẵn, không cho phép hỏi lại hoặc phản hồi tự nhiên",
        "Cuộc gọi/tin nhắn chỉ đổ chuông 1-2 giây rồi tắt máy (dạng 'nháy máy')",
        "Nội dung cuộc gọi không khớp với dịch vụ mà người nhận thực sự đang sử dụng"
      ]
    },
    {
      "id": "dau_so_dich_vu_gia_cao",
      "label": "Đầu số dịch vụ tính cước cao",
      "n": 43,
      "script": "Thông báo trúng thưởng/quà tặng, dẫn dụ gọi vào hoặc nhắn tin đến đầu số dịch vụ giá cao để phát sinh cước phí lớn.",
      "numberTypes": [
        "Đầu số dịch vụ giá cao trong nước",
        "Quốc tế (đầu số từng bị cảnh báo công khai)"
      ],
      "flags": [
        "Yêu cầu gọi lại hoặc nhắn tin đến một số khác để 'biết thêm chi tiết'",
        "Cuộc gọi/tin nhắn chỉ đổ chuông 1-2 giây rồi tắt máy (dạng 'nháy máy')",
        "Yêu cầu giữ bí mật cuộc gọi, không được kể cho người thân",
        "Tự xưng cơ quan chức năng nhưng làm việc qua điện thoại thay vì giấy mời/trực tiếp theo đúng quy trình pháp luật"
      ]
    },
    {
      "id": "gia_thue_vien_thong",
      "label": "Giả cơ quan thuế – viễn thông",
      "n": 42,
      "script": "Tự xưng thu hồi nợ cước điện thoại/internet, đe dọa cắt dịch vụ hoặc kiện tụng để ép nạn nhân chuyển khoản ngay.",
      "numberTypes": [
        "Số di động (che một phần, minh họa đầu số nhà mạng)",
        "Số cố định giả mạo cơ quan/tổ chức (che một phần)"
      ],
      "flags": [
        "Cuộc gọi/tin nhắn chỉ đổ chuông 1-2 giây rồi tắt máy (dạng 'nháy máy')",
        "Yêu cầu gọi lại hoặc nhắn tin đến một số khác để 'biết thêm chi tiết'",
        "Giọng nói robot/thu âm sẵn, không cho phép hỏi lại hoặc phản hồi tự nhiên",
        "Yêu cầu giữ bí mật cuộc gọi, không được kể cho người thân"
      ]
    }
  ],
  "topFlags": [
    "Cuộc gọi/tin nhắn chỉ đổ chuông 1-2 giây rồi tắt máy (dạng 'nháy máy')",
    "Yêu cầu gọi lại hoặc nhắn tin đến một số khác để 'biết thêm chi tiết'",
    "Giọng nói robot/thu âm sẵn, không cho phép hỏi lại hoặc phản hồi tự nhiên",
    "Số điện thoại gọi đến không trùng với số hotline chính thức in trên thẻ/website/hóa đơn",
    "Tự xưng cơ quan chức năng nhưng làm việc qua điện thoại thay vì giấy mời/trực tiếp theo đúng quy trình pháp luật",
    "Số hiển thị bắt đầu bằng dấu (+) hoặc 00 nhưng hai số tiếp theo KHÔNG phải 84 (mã Việt Nam)",
    "Nội dung cuộc gọi không khớp với dịch vụ mà người nhận thực sự đang sử dụng",
    "Yêu cầu giữ bí mật cuộc gọi, không được kể cho người thân",
    "Tạo áp lực tâm lý, hối thúc hành động ngay trong thời gian ngắn",
    "Yêu cầu đọc mã OTP hoặc thông tin thẻ ngân hàng qua điện thoại",
    "Caller ID hiển thị tên/số quen thuộc nhưng có thể đã bị giả mạo (spoofing) qua công nghệ VOIP"
  ],
  "tips": [
    "Cơ quan công an, viện kiểm sát, tòa án làm việc bằng giấy mời/thông báo chính thức, không làm việc qua điện thoại và không yêu cầu chuyển tiền.",
    "Caller ID có thể bị giả mạo (spoofing) - số hiển thị đúng KHÔNG đồng nghĩa cuộc gọi là thật; hãy xác minh qua kênh độc lập khác.",
    "Không bấm phím theo hướng dẫn của cuộc gọi lạ, đặc biệt là các phím dẫn đến việc cung cấp thông tin cá nhân.",
    "Không gọi lại các số nháy máy quốc tế lạ nếu không chắc chắn đó là người quen.",
    "Không cung cấp mã OTP, mật khẩu, số CVV cho bất kỳ ai qua điện thoại trong mọi trường hợp.",
    "Có thể phản ánh số điện thoại nghi ngờ lừa đảo qua tổng đài 156/5656 của Bộ TT&TT hoặc trình báo công an địa phương.",
    "Luôn gọi lại qua số hotline chính thức in trên thẻ ngân hàng/website chính thức, không dùng số vừa gọi đến."
  ],
  "riskyCountries": [
    "Belarus",
    "Somalia",
    "Latvia",
    "Serbia",
    "Tanzania",
    "Tunisia",
    "Sierra Leone",
    "Liberia",
    "Litva (Vilnius)",
    "Đảo Ascension",
    "Valparaiso (Chile)",
    "Guinea"
  ]
};

export const SCAM_PHONE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SCAM_PHONE_DATASET.categories.map((c) => [c.id, c.label]),
);

export const SCAM_PHONE_PROMPT_BLOCK = `BỘ KỊCH BẢN SỐ ĐIỆN THOẠI LỪA ĐẢO (300 mẫu, 7 nhóm, đối chiếu quy hoạch kho số VN):
${SCAM_PHONE_DATASET.categories
  .map(
    (c) =>
      `- ${c.id} (${c.label}) — dạng số: ${c.numberTypes.join("; ")}\n  kịch bản: ${c.script}\n  dấu hiệu: ${c.flags.join(" | ")}`,
  )
  .join("\n")}

DẤU HIỆU CẢNH BÁO PHỔ BIẾN NHẤT:
${SCAM_PHONE_DATASET.topFlags.map((f, i) => `${i + 1}. ${f}`).join("\n")}

ĐẦU SỐ QUỐC TẾ TỪNG BỊ CẢNH BÁO NHÁY MÁY (theo thông cáo nhà mạng): ${SCAM_PHONE_DATASET.riskyCountries.join(", ")}.

CÁCH TỰ XÁC MINH NÊN NHẮC NGƯỜI DÙNG:
${SCAM_PHONE_DATASET.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}

GIỚI HẠN BẮT BUỘC TÔN TRỌNG:
- Không có cơ sở dữ liệu tra cứu chủ thuê bao hay danh sách "đã có người bị lừa từ số này"; tuyệt đối KHÔNG bịa ra số liệu tố cáo, tên người sở hữu hay địa chỉ nhà.
- Số di động Việt Nam chỉ cho biết NHÀ MẠNG, không gắn tỉnh/thành. Số cố định cho biết tỉnh/thành theo mã vùng. Số +84 hiển thị nhưng gọi qua Internet vẫn có thể bị giả mạo (spoofing).
- Không thể biết người gọi dùng máy gì; nếu người dùng hỏi, phải nói rõ là không suy ra được từ số điện thoại.
- Khi cần biết số đã bị tố cáo hay chưa, hướng dẫn phản ánh/tra cứu qua tổng đài 156 hoặc 5656 của Bộ TT&TT và trình báo công an địa phương.`;
