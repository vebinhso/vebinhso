# Tìm tài khoản và xem nhà công khai

## Mục tiêu
- Thêm ô tìm kiếm tài khoản ngay trong trang bản đồ nhà.
- Kết quả hiển thị tên, ảnh đại diện, trạng thái quyền vào nhà và nút **Xem nhà**.
- Chỉ cho phép mở trực tiếp khi nhà ở chế độ **Công khai**; các chế độ khác hiển thị trạng thái khóa rõ ràng.
- Khi xem nhà từ kết quả tìm kiếm, chỉ hiển thị căn nhà được chọn cùng cảnh phố Hội An gồm dây điện, đèn lồng, bảng tên đường và dòng sông; ẩn toàn bộ nhà bạn bè và nhà phố xung quanh.

## Cách thực hiện
1. Tạo chức năng tìm tài khoản đã đăng nhập, giới hạn số kết quả và chỉ trả về các thông tin công khai cần thiết.
2. Thêm thanh tìm kiếm và danh sách kết quả vào trang bản đồ nhà, có trạng thái đang tìm, không tìm thấy và quyền riêng tư.
3. Thêm chế độ xem riêng cho trang tham quan để cảnh 3D vẫn có đường phố, dây điện, đèn lồng, biển đường và sông nhưng không dựng các căn nhà xung quanh.
4. Giữ nguyên kiểm tra quyền ở phía máy chủ trước khi tải dữ liệu căn nhà.
5. Kiểm tra bản tiếng Việt/Anh, trạng thái khóa và lỗi tải.

## Chi tiết kỹ thuật
- Tái sử dụng trang tham quan `/visit/$ownerId` và hàm kiểm tra quyền hiện có.
- Bổ sung cờ hiển thị môi trường vào cảnh Hội An thay vì tạo thêm một bản đồ 3D khác.
- Tìm kiếm theo tên tài khoản/tên hiển thị, không trả về email hoặc dữ liệu riêng tư.
