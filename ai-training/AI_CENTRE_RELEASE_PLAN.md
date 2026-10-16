# Kế hoạch đưa AI phát hiện lừa đảo vào AI Centre (chưa triển khai)

## Kết quả đã xác minh trên dữ liệu được nhóm cung cấp
- 514 bản ghi; 410 train / 104 test, chia theo `mau` không chồng lặp.
- Baseline word TF-IDF + Logistic Regression: 75/104 đúng, TN=35, FP=21, FN=8, TP=40.
- Thử nghiệm char_wb TF-IDF (2,6) + Logistic Regression: 80/104 đúng, TN=35, FP=21, FN=3, TP=45.
- Cả 29 lỗi baseline đều ở độ khó `kho`: giao_hang (14 false positives), dat_lai_mat_khau (7 false positives), hoa_don_gia (8 false negatives).
- Cả 24 lỗi V2 vẫn tập trung ở ba nhóm trên: 14 + 7 + 3.
- **Quan trọng:** đã thử nhiều cấu hình trên chính tập test này. Đây là kết quả khám phá, không phải đánh giá cuối cùng độc lập. Nguồn và nhãn dữ liệu cần được xác minh.

## Thiết kế để học sinh dùng an toàn
1. AI Centre tiếp tục sử dụng luồng kiểm tra hiện có. Không nạp file `.joblib` trực tiếp vào React/browser hoặc Supabase.
2. Nếu muốn dùng mô hình V2, cần một dịch vụ suy luận riêng, có kiểm soát truy cập, giới hạn tốc độ, bảo vệ dữ liệu nhập và không ghi log nội dung nhạy cảm; frontend chỉ gọi API đã được xác thực.
3. Kết quả cần ba mức: `Có dấu hiệu rủi ro`, `Chưa đủ căn cứ`, `Chưa thấy dấu hiệu rõ ràng`. Không gắn nhãn `An toàn tuyệt đối`. Xác suất từ Logistic Regression chưa được hiệu chuẩn, không diễn giải là xác suất lừa đảo thật.
4. Luôn giải thích các dấu hiệu cụ thể có trong tin nhắn, khuyến nghị kiểm tra qua kênh chính thức. Không tự động mở đường dẫn trong tin nhắn, không yêu cầu mật khẩu/OTP.
5. Nếu văn bản chứa thông tin cá nhân, cần xử lý và hạn chế lưu trữ. Cần đánh giá rủi ro quyền riêng tư cho người dùng 10–16 tuổi.
6. Cần thu thập thêm mẫu có nguồn và nhãn được rà soát, đặc biệt thông báo giao hàng, đặt lại mật khẩu, hóa đơn. Tạo một tập đánh giá hoàn toàn mới chưa dùng để chọn mô hình hoặc ngưỡng.
7. Trước khi đưa lên main: kiểm thử API, an toàn dữ liệu, chất lượng phản hồi, tốc độ và cách xử lý khi AI không chắc chắn. Việc triển khai cần phê duyệt riêng.

## Trạng thái
- Mã V2 ở `ai-training/train_candidate_v2.py`, nhánh `experiment/scam-ai-training`.
- Chưa thay đổi AI Centre production, Supabase hoặc main.
