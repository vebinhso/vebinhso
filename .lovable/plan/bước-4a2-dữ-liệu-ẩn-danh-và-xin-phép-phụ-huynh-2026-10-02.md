# Bước 4a2: dữ liệu ẩn danh và xin phép phụ huynh

## Mục tiêu
- Thu thống kê ẩn danh cho tên miền và đầu số điện thoại, không lưu tài khoản cùng dữ liệu tín hiệu.
- Cho học sinh ngoài lớp tạo liên kết xin phép phụ huynh; nội dung đính kèm vẫn cần đồng ý riêng ở từng lần gửi.
- Đổi tên tiếng Anh của “Trung tâm AI” thành “Security check”; tiếng Việt giữ nguyên.

## Thực hiện
1. Thêm các bảng, quyền truy cập, chính sách bảo mật và hàm cộng dồn/rút đồng ý theo đúng tài liệu.
2. Chuẩn hóa tên miền, đầu số và mức rủi ro; ghi lượt kiểm tra và đánh giá nhưng bỏ qua bộ đề đánh giá nội bộ.
3. Thêm quy trình tạo, xem, đồng ý, từ chối và rút lại liên kết phụ huynh; token gốc không được lưu trong cơ sở dữ liệu.
4. Tạo trang công khai tiếng Việt, dễ đọc trên điện thoại, dùng email `vebinhso.org@gmail.com`.
5. Thêm nút xin phép, sao chép/chia sẻ liên kết và trạng thái chờ vào phần phản hồi của học sinh.
6. Thêm bảng thống kê ẩn danh và số nguồn đồng ý trong mục quản trị Skill AI, gồm sắp xếp và tải CSV.
7. Đổi toàn bộ tên hiển thị tiếng Anh liên quan từ “AI Center/Centre” sang “Security check”.
8. Bổ sung kiểm thử cho chuẩn hóa dữ liệu, quyền truy cập và các luồng chính; kiểm tra giao diện máy tính và điện thoại.

## Chi tiết kỹ thuật
- Mọi bảng mới có GRANT, RLS và chính sách trong cùng migration.
- Các hàm cộng dồn chỉ chạy phía máy chủ; người dùng thường không thể gọi trực tiếp.
- Trang công khai chỉ nhận token đã băm để tra cứu; phản hồi đồng ý chỉ hợp lệ trước khi hết hạn 7 ngày.
- Khi rút đồng ý, xóa quyền ở cả liên kết và lớp, đồng thời xóa nội dung học sinh đã đính kèm trước đó.
