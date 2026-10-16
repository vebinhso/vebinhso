-- TEST-ONLY fixture for Vietnamese scam-source guidance.
-- Intentionally refuses to run unless the session explicitly sets app.environment=test.
-- Do not apply to production. This updates skill prompt text; it does not fine-tune model weights.

DO $guard$
BEGIN
  IF current_setting('app.environment', true) IS DISTINCT FROM 'test' THEN
    RAISE EXCEPTION 'TEST-ONLY migration blocked: set app.environment=test on the TEST database session before applying';
  END IF;
END
$guard$;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản kiểm tra thử: combo du lịch giá rẻ\n- Đánh giá đồng thời mức giá, áp lực chuyển tiền, tài khoản nhận tiền, tính xác thực của trang và khả năng xác minh đặt chỗ. Một dấu hiệu riêng lẻ không đủ để kết luận lừa đảo.\n- Tự tìm website/số liên hệ chính thức của hãng bay hoặc khách sạn để xác minh mã đặt chỗ và trạng thái thanh toán. Không dùng số/link do trang đáng ngờ cung cấp.\n- Cảnh giác với yêu cầu chuyển khoản gấp vào tài khoản cá nhân, lời hứa chỉ còn một suất và phí xác minh phát sinh.\n'
WHERE key = 'vbs-bao-gia'
  AND position('## Kịch bản kiểm tra thử: combo du lịch giá rẻ' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản kiểm tra thử: tin nhắn hoàn tiền/đơn hàng\n- Cảnh giác khi người gửi giả danh sàn thương mại điện tử hoặc đơn vị giao hàng rồi yêu cầu bấm link, cài ứng dụng lạ, đăng nhập ngân hàng hoặc cung cấp OTP/mật khẩu.\n- Tự mở ứng dụng hoặc website chính thức để kiểm tra đơn hàng; không sử dụng liên kết trong tin nhắn đáng ngờ.\n- Nếu thiếu URL, người gửi hoặc ngữ cảnh, phân loại là chưa đủ bằng chứng và hướng dẫn kiểm tra an toàn; không tự suy diễn.\n'
WHERE key = 'vbs-link-email-gia'
  AND position('## Kịch bản kiểm tra thử: tin nhắn hoàn tiền/đơn hàng' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản kiểm tra thử: lừa đảo tình cảm/đầu tư\n- Dấu hiệu cần xem xét gồm xây dựng lòng tin nhanh, xin tiền, mời đầu tư lợi nhuận chắc chắn, yêu cầu trả thêm thuế/phí để rút tiền hoặc yêu cầu giữ bí mật.\n- Không chuyển tiền hay gửi thông tin/ảnh riêng tư cho người chưa xác minh; xác minh danh tính độc lập và hỏi ý kiến người đáng tin cậy.\n- Không gắn nhãn lừa đảo chỉ vì lời nói tình cảm hoặc văn phong; giải thích các hành vi cụ thể và mức độ chưa chắc chắn.\n'
WHERE key = 'vbs-van-ban-ai'
  AND position('## Kịch bản kiểm tra thử: lừa đảo tình cảm/đầu tư' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản kiểm tra thử: giả mạo bằng deepfake\n- Khuôn mặt/giọng nói trong video có thể bị giả mạo; video chân thực không tự chứng minh danh tính. Công cụ phát hiện cũng có thể sai.\n- Nếu người quen gọi video yêu cầu chuyển tiền gấp, đầu tư, OTP hoặc giữ bí mật, dừng giao dịch và gọi lại bằng số đã biết trước hoặc xác minh qua người đáng tin cậy khác.\n- Nêu rõ giới hạn bằng chứng; không kết luận chỉ dựa trên một lỗi hình ảnh/âm thanh.\n'
WHERE key = 'vbs-video-ai'
  AND position('## Kịch bản kiểm tra thử: giả mạo bằng deepfake' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Nguyên tắc xác minh dùng chung cho kiểm thử\n- Không kết luận chỉ từ dấu tích, lượt theo dõi, đuôi tên miền, HTTPS, lỗi chính tả hoặc một dấu hiệu riêng lẻ.\n- Nêu rõ tín hiệu quan sát được, đề xuất xác minh qua kênh độc lập và giữ trạng thái chưa xác định khi thiếu dữ kiện.\n- Không yêu cầu người dùng cung cấp mật khẩu, OTP, số tài khoản hoặc dữ liệu cá nhân không cần thiết.\n'
WHERE key = 'vbs-hinh-anh-ai'
  AND position('## Nguyên tắc xác minh dùng chung cho kiểm thử' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Nguyên tắc xác minh dùng chung cho kiểm thử\n- Khi có cuộc gọi/tin nhắn mạo danh ngân hàng, cơ quan chức năng, hãng bay hoặc đơn vị giao hàng, tập trung vào hành vi đòi tiền, OTP, cài ứng dụng hoặc giữ bí mật; không kết luận chỉ từ số gọi đến/đầu số.\n- Khuyên người dùng chủ động liên hệ qua số hoặc ứng dụng chính thức tìm độc lập. Nếu đã chuyển tiền/lộ thông tin, liên hệ ngân hàng qua kênh chính thức và nhờ người lớn đáng tin cậy hỗ trợ.\n'
WHERE key = 'vbs-so-dien-thoai-gia'
  AND position('## Nguyên tắc xác minh dùng chung cho kiểm thử' in content) = 0;
