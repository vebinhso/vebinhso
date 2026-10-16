-- Extend the six existing runtime skills with defensive signals from open-source
-- reporting. This is additive and idempotent: it does not replace existing skill text.
-- The existing ai_skills update trigger increments the version when content changes.

UPDATE public.ai_skills
SET content = content || E'\n\n## Dấu hiệu bổ sung từ phân tích nguồn mở\n- Xem xét cả hành vi và ngữ cảnh, không kết luận chỉ từ một từ khóa, đuôi tên miền hoặc lỗi chính tả.\n- Các dấu hiệu cần kiểm tra gồm yêu cầu gấp bất thường, đòi OTP/mật khẩu/mã khôi phục, yêu cầu chuyển tiền hoặc cài tệp, chuyển hướng qua nhiều trang, giả mạo thương hiệu và yêu cầu tắt biện pháp bảo vệ.\n- Ưu tiên kiểm tra qua ứng dụng, website hoặc số liên hệ chính thức được tìm độc lập; không dùng thông tin liên hệ do chính nội dung đáng ngờ cung cấp.\n- Nếu bằng chứng chưa đủ, trả về mức chưa xác định/cần kiểm tra thêm; nêu rõ dấu hiệu quan sát được và không khẳng định chắc chắn.\n- Tên miền từng bị báo cáo có thể đã đổi chủ hoặc được sửa chữa; danh sách chặn cần có ngày cập nhật, nguồn và cơ chế xem xét lại.\n- Không coi nội dung do AI tạo là mặc nhiên độc hại, cũng không coi văn phong tự nhiên là bằng chứng an toàn.\n'
WHERE key = 'vbs-bao-gia'
  AND position('## Dấu hiệu bổ sung từ phân tích nguồn mở' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Dấu hiệu bổ sung từ phân tích nguồn mở\n- Tách riêng câu hỏi ảnh có do AI tạo hay không và câu hỏi ảnh có gây hiểu lầm/nguy hiểm hay không. Hai kết luận không đồng nghĩa.\n- Kiểm tra tính nhất quán của chữ, logo, bóng đổ, phối cảnh, viền ghép và nguồn ảnh; mỗi dấu hiệu đơn lẻ đều có thể xuất hiện ở ảnh thật hoặc ảnh nén.\n- Không khẳng định ảnh giả chỉ vì có lỗi hình ảnh; nêu mức độ không chắc chắn và đề xuất tìm ảnh gốc hoặc nguồn đăng ban đầu.\n- Với ảnh chụp màn hình bằng chứng, kiểm tra ngữ cảnh và nguồn độc lập trước khi chia sẻ; che thông tin cá nhân trong ví dụ minh họa.\n'
WHERE key = 'vbs-hinh-anh-ai'
  AND position('## Dấu hiệu bổ sung từ phân tích nguồn mở' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Dấu hiệu bổ sung từ phân tích nguồn mở\n- Phân biệt video do AI tạo, video bị chỉnh sửa/cắt ghép và video thật nhưng được mô tả sai ngữ cảnh.\n- Kiểm tra nguồn đăng đầu tiên, thời điểm, bối cảnh, âm thanh/hình ảnh không đồng bộ và các bản đăng độc lập; không dựa vào một lỗi hình ảnh để kết luận.\n- Video có người nổi tiếng hoặc người thân yêu cầu chuyển tiền, cung cấp mã xác thực hay giữ bí mật cần được xác minh qua kênh liên hệ khác.\n- Nếu không thể xác minh nguồn gốc, ghi rõ giới hạn và khuyên người dùng không chia sẻ như sự thật đã xác nhận.\n'
WHERE key = 'vbs-video-ai'
  AND position('## Dấu hiệu bổ sung từ phân tích nguồn mở' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Dấu hiệu bổ sung từ phân tích nguồn mở\n- Không chấm rủi ro chỉ dựa vào đuôi miền (.top, .xyz, .cc...) hoặc việc thiếu HTTPS; đó chỉ là tín hiệu phụ, không phải bằng chứng độc hại.\n- Kiểm tra lỗi chính tả trong tên thương hiệu, ký tự thay thế, tên miền phụ gây nhầm lẫn, chuyển hướng, URL rút gọn, tên miền/IP bất thường và lời mời tải tệp.\n- Cân nhắc cả tín hiệu an toàn: tên miền chính thức được xác minh độc lập, ngữ cảnh phù hợp và không có yêu cầu nhạy cảm bất thường.\n- Danh sách chặn cần lưu nguồn, thời điểm kiểm tra và trạng thái xác minh; tránh đưa toàn bộ danh sách thô vào prompt. Tra cứu danh sách nên thực hiện ở lớp dữ liệu riêng.\n- Không mở link đáng ngờ để kiểm tra bằng trình duyệt cá nhân; khuyên người dùng xác minh qua kênh chính thức.\n'
WHERE key = 'vbs-link-email-gia'
  AND position('## Dấu hiệu bổ sung từ phân tích nguồn mở' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Dấu hiệu bổ sung từ phân tích nguồn mở\n- Đánh giá ý định và yêu cầu của tin nhắn, không suy đoán người viết là AI chỉ từ văn phong trơn tru hoặc lặp lại.\n- Cảnh giác với yêu cầu khẩn cấp, giữ bí mật, nhận thưởng, việc làm/đầu tư lợi nhuận chắc chắn, mượn tiền, xin OTP/mật khẩu, gửi giấy tờ hoặc bấm liên kết lạ.\n- Tài khoản quen biết cũng có thể bị chiếm quyền; xác minh yêu cầu bất thường bằng cuộc gọi/kênh khác đã biết trước.\n- Tin nhắn có thể hợp pháp dù có lỗi chính tả hoặc ngắn gọn; giải thích từng dấu hiệu và giữ mức chưa xác định khi thiếu ngữ cảnh.\n'
WHERE key = 'vbs-van-ban-ai'
  AND position('## Dấu hiệu bổ sung từ phân tích nguồn mở' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Dấu hiệu bổ sung từ phân tích nguồn mở\n- Không kết luận số điện thoại lừa đảo chỉ dựa trên đầu số, khu vực hoặc việc không nhận diện được người gọi.\n- Đánh giá hành vi trong cuộc gọi/tin nhắn: mạo danh công an/ngân hàng/đơn vị giao hàng, đòi chuyển tiền, OTP, cài ứng dụng điều khiển từ xa hoặc giữ bí mật.\n- Hiển thị số gọi đến có thể bị giả mạo; gọi lại bằng số công khai trên website/ứng dụng chính thức thay vì số do người gọi cung cấp.\n- Chỉ lưu tín hiệu tổng hợp cần thiết; không đưa số điện thoại cá nhân, nội dung cuộc gọi riêng tư hoặc dữ liệu định danh vào tập huấn luyện nếu chưa có cơ sở pháp lý và biện pháp bảo vệ phù hợp.\n'
WHERE key = 'vbs-so-dien-thoai-gia'
  AND position('## Dấu hiệu bổ sung từ phân tích nguồn mở' in content) = 0;
