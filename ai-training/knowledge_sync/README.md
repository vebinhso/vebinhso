# Đồng bộ tri thức lừa đảo – thử nghiệm

Workflow chạy hàng ngày vào khoảng 02:17 UTC hoặc khi kích hoạt thủ công trên nhánh thử nghiệm. Nguồn RSS trong `sources.json` là **cấu hình dự kiến, cần kiểm tra khả năng truy cập và điều khoản sử dụng**.

Bộ lọc chỉ thu thập tiêu đề/tóm tắt ngắn có từ khóa về lừa đảo từ tên miền tin tức đã cho phép. Nó loại link ngoài nguồn, chuẩn hóa, khử trùng lặp và che email/số điện thoại/dãy số trong văn bản. **Đây không phải công cụ xác minh tính đúng đắn của bài báo hoặc phân loại nhãn train.** Dữ liệu đầu ra luôn mang trạng thái `candidate_unverified`.

Kết quả ở artifact `scam-knowledge-candidates` trong GitHub Actions, không tự đẩy lên Supabase, không tự sửa Skill và không triển khai web. Lý do: nội dung tin tức chưa xác minh và có thể chứa thông tin nhạy cảm, không được đưa thẳng vào AI cho học sinh.

GitHub Actions schedule của GitHub chỉ chạy từ nhánh mặc định theo quy định của GitHub; vì workflow chỉ tồn tại trên nhánh thử nghiệm nên **lịch tự chạy hàng ngày chưa được kích hoạt**. Chạy thử bằng sự kiện push lên nhánh thử nghiệm; khi đủ điều kiện, cần phê duyệt riêng kế hoạch production.

Nếu tất cả RSS lỗi, job sẽ báo thất bại thay vì nói rằng đã cập nhật thành công. Không có khóa Supabase hoặc quyền ghi vào DB trong workflow này.

Cần làm tiếp trước khi bật tự động cập nhật thực tế: xác thực feed, thiết lập nguồn chính thống và độ tin cậy, kiểm tra ngày đăng, loại dữ liệu cá nhân toàn diện hơn, chống prompt injection, lưu dấu vết nguồn, tạo lớp kiểm duyệt trước khi kích hoạt Skill, và kiểm thử hồi quy AI Centre.
