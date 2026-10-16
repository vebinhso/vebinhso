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


-- Defensive guidance synthesized from reviewed Vietnamese public-interest reporting.
-- This remains runtime skill/prompt knowledge, not model-weight training.
UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản lừa đảo theo nguồn báo chí Việt Nam\n- Với quảng cáo combo du lịch/vé/phòng giá thấp bất thường, kiểm tra chéo giá trên website chính thức; xác minh trực tiếp với hãng bay/khách sạn xem mã đặt chỗ đã được thanh toán hay chỉ là giữ chỗ.\n- Cảnh giác với thúc ép chuyển tiền ngay, lời hứa chỉ còn một suất, yêu cầu chuyển vào tài khoản cá nhân, mã đặt chỗ không chứng minh đã thanh toán, hoặc yêu cầu trả thêm phí xác minh để hoàn tất giao dịch.\n- Tích xanh, nhiều lượt theo dõi, bình luận khen và ảnh chuyên nghiệp không tự chứng minh trang bán hàng là chính chủ; kiểm tra lịch sử/độ minh bạch và kênh liên hệ độc lập.\n- Nếu người bán nói hoàn tiền/đơn hàng gặp lỗi, không bấm link lạ, cài ứng dụng ngoài nguồn chính thức, đăng nhập ngân hàng từ link họ gửi hoặc cung cấp OTP/mật khẩu. Tự mở ứng dụng chính thức để kiểm tra trạng thái đơn hàng.\n- Nếu đã chuyển tiền hoặc lộ thông tin, liên hệ ngân hàng qua kênh chính thức ngay, lưu bằng chứng và báo người lớn đáng tin cậy/cơ quan chức năng phù hợp.\n'
WHERE key = 'vbs-bao-gia'
  AND position('## Kịch bản lừa đảo theo nguồn báo chí Việt Nam' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản lừa đảo theo nguồn báo chí Việt Nam\n- Với bài đăng bán combo du lịch, vé hoặc phòng nghỉ, xem xét đồng thời giá, cách thanh toán, sự thúc ép, tính xác thực của tài khoản và khả năng xác minh đặt chỗ; một dấu hiệu riêng lẻ không đủ để kết luận.\n- Với thông báo hoàn tiền/đơn hàng, xác định liệu người gửi có yêu cầu mở link, cung cấp OTP, thông tin đăng nhập, thông tin thẻ hay cài ứng dụng lạ không. Đây là các dấu hiệu rủi ro cao cần nêu rõ.\n- Với quan hệ tình cảm mới quen trên mạng, cảnh giác khi đối phương thúc đẩy thân mật quá nhanh rồi xin tiền, mời đầu tư, viện cớ phí/thuế để rút tiền hoặc yêu cầu giữ bí mật. Không chuyển tiền hay gửi ảnh/clip riêng tư cho người chưa xác minh.\n- Tài khoản quen biết có thể bị chiếm quyền; xác minh yêu cầu bất thường qua kênh khác đã biết trước. Không suy luận người thật/giả chỉ từ văn phong.\n'
WHERE key = 'vbs-van-ban-ai'
  AND position('## Kịch bản lừa đảo theo nguồn báo chí Việt Nam' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản lừa đảo theo nguồn báo chí Việt Nam\n- Lừa đảo tình cảm có thể dùng ảnh đại diện giả hoặc video/giọng nói deepfake để tạo lòng tin. Không dùng một lỗi hình ảnh hay một bài kiểm tra đơn giản làm bằng chứng chắc chắn; ưu tiên xác minh danh tính qua kênh độc lập và người đáng tin cậy.\n- Nếu người quen/người yêu trên mạng xuất hiện qua video và yêu cầu chuyển tiền khẩn cấp, đầu tư, trả phí/thuế để rút tiền hoặc giữ bí mật, hãy dừng giao dịch và xác minh qua số/kênh đã biết trước.\n- Video trông chân thực vẫn có thể bị giả mạo; công cụ phát hiện deepfake cũng có thể sai. Đưa ra kết luận có mức độ tin cậy, giải thích giới hạn và khuyên không chuyển tiền chỉ dựa trên cuộc gọi video.\n'
WHERE key = 'vbs-video-ai'
  AND position('## Kịch bản lừa đảo theo nguồn báo chí Việt Nam' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản lừa đảo theo nguồn báo chí Việt Nam\n- Website/fanpage bán combo du lịch có thể dùng tên gần giống thương hiệu thật, dấu xác minh giả, bình luận tạo dựng hoặc mã đặt chỗ chưa thanh toán. Xác minh bằng cách tự tìm website/số điện thoại chính thức, không dùng thông tin liên hệ trong quảng cáo đáng ngờ.\n- Với tin nhắn giả mạo hoàn tiền/đơn hàng, kiểm tra tên miền chính xác và đích chuyển hướng; không mở link lạ, tải ứng dụng không rõ nguồn hoặc nhập thông tin ngân hàng/OTP. Mở ứng dụng chính thức bằng cách tự nhập địa chỉ hoặc dùng ứng dụng đã cài.\n- Không kết luận link độc hại chỉ từ đuôi tên miền hoặc HTTPS; đánh giá nhiều tín hiệu và nêu mức chưa xác định nếu chưa kiểm chứng.\n'
WHERE key = 'vbs-link-email-gia'
  AND position('## Kịch bản lừa đảo theo nguồn báo chí Việt Nam' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản lừa đảo theo nguồn báo chí Việt Nam\n- Kẻ giả danh hãng bay, resort, sàn thương mại điện tử hoặc đơn vị giao hàng có thể yêu cầu chuyển khoản, trả thêm phí xác minh/thuế, bấm link, cài ứng dụng hoặc đọc OTP để nhận vé/hoàn tiền. Khuyên người dùng tự kiểm tra trên ứng dụng/website chính thức.\n- Kẻ lừa tình có thể xây dựng lòng tin trong thời gian dài rồi yêu cầu vay tiền, đầu tư hoặc trả phí để rút tiền; lợi nhuận hiển thị trên nền tảng không chứng minh khoản đầu tư là thật.\n- Không gắn nhãn lừa đảo chỉ từ lời nói ngọt ngào, lỗi chính tả hoặc một tín hiệu riêng lẻ. Phân tích hành vi yêu cầu, bối cảnh, bằng chứng và mức độ không chắc chắn.\n'
WHERE key = 'vbs-so-dien-thoai-gia'
  AND position('## Kịch bản lừa đảo theo nguồn báo chí Việt Nam' in content) = 0;

UPDATE public.ai_skills
SET content = content || E'\n\n## Kịch bản lừa đảo theo nguồn báo chí Việt Nam\n- Khi có cuộc gọi video yêu cầu chuyển tiền, đầu tư, trả phí khẩn cấp hoặc cung cấp OTP, hãy xác minh qua số điện thoại/kênh chính thức đã tự tìm. Caller ID và khuôn mặt trên video đều có thể bị giả mạo.\n- Không yêu cầu người dùng thực hiện bài kiểm tra deepfake như bằng chứng chắc chắn; bộ phát hiện có thể sai và kẻ gian có thể vượt qua. Dùng nhiều nguồn xác minh độc lập.\n- Không kết luận số điện thoại lừa đảo chỉ dựa trên đầu số; tập trung vào hành vi mạo danh, yêu cầu bảo mật và bằng chứng kiểm chứng được.\n'
WHERE key = 'vbs-hinh-anh-ai'
  AND position('## Kịch bản lừa đảo theo nguồn báo chí Việt Nam' in content) = 0;
