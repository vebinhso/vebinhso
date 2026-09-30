# Kế hoạch rà soát tiếng Anh tuyệt đối

## Mục tiêu
- Khi chọn EN, mọi chữ người dùng nhìn thấy bắt buộc là tiếng Anh; không dùng nội dung tiếng Việt làm phương án dự phòng.
- Bao phủ màn tải, điều hướng, trò chơi, cửa hàng, vật phẩm, lớp học, Trung tâm AI, phim nhập vai, hộp thoại và thông báo.

## Thực hiện
1. Lập danh sách toàn bộ chữ tĩnh, chữ ghép động và thông báo phát sinh trên mọi màn hình dùng chung và màn người chơi.
2. Bổ sung tên tiếng Anh cho toàn bộ danh mục cửa hàng, nhóm vật phẩm, vật phẩm trong kho và nhãn xây dựng; chọn nội dung theo VI/EN tại nơi hiển thị.
3. Đồng bộ toàn bộ nút, tiêu đề, hướng dẫn, trạng thái tải/lỗi, thông báo nhanh, lời mời, câu hỏi và kết quả trong game, bản đồ, đấu 1vs1, lớp học, AI và nhập vai.
4. Loại bỏ mọi nhánh dự phòng sang tiếng Việt trong chế độ EN; nếu nội dung động chưa có bản dịch, hiển thị thông báo tiếng Anh phù hợp thay vì lộ tiếng Việt.
5. Chạy kiểm tra tự động tìm ký tự tiếng Việt trong giao diện, sau đó mở các luồng chính ở EN trên máy tính và điện thoại để xác nhận trực quan.

## Chi tiết kỹ thuật
- Giữ dữ liệu tiếng Việt làm bản gốc nhưng thêm trường/ánh xạ tiếng Anh tại lớp dữ liệu dùng chung.
- Không đổi điểm số, tiền, cấp độ, quyền truy cập, luật chơi hoặc nội dung khi ở chế độ VI.
- Mọi thanh tải hoàn tất ở 100% trước khi biến mất.
- Các tiêu đề chia sẻ liên kết vẫn giữ nhận diện thương hiệu VỆ BINH SỐ; nội dung mô tả được viết theo ngôn ngữ phù hợp.