# Bản song ngữ Việt–Anh cho VỆ BINH SỐ

## Mục tiêu
- Thêm nút **VI / EN** luôn dễ thấy, ghi nhớ lựa chọn trên thiết bị và áp dụng ngay trên toàn bộ ứng dụng.
- Giữ tiếng Việt làm mặc định để không làm thay đổi trải nghiệm hiện tại.
- Khi chọn English, toàn bộ giao diện, câu hỏi, đáp án, thông báo, nội dung lớp học hệ thống và phim tình huống chuyển đồng bộ sang tiếng Anh tự nhiên, đúng ngữ pháp.
- Giữ nguyên hình/video của phim; bản English dùng phụ đề, lựa chọn, bảng kết quả và lồng tiếng AI tiếng Anh.

## Phạm vi triển khai

### 1. Nền tảng ngôn ngữ dùng chung
- Tạo bộ quản lý ngôn ngữ `vi | en`, lưu lựa chọn lâu dài và đồng bộ giữa các tab.
- Thêm nút VI / EN cạnh nút cài đặt, dùng được trên máy tính và điện thoại.
- Cập nhật thuộc tính ngôn ngữ của trang, định dạng ngày/giờ/số, thông báo lỗi, trạng thái tải và nội dung hỗ trợ theo ngôn ngữ đang chọn.
- Chia bản dịch theo khu vực để dễ bảo trì: chung, tài khoản, game, cửa hàng, bạn bè, lớp học, quản trị, AI, đấu 1vs1 và nhập vai.
- Có cơ chế dự phòng rõ ràng: nội dung chưa có English sẽ dùng bản Việt, không để trống hoặc làm hỏng màn hình.

### 2. Chuyển ngữ toàn bộ giao diện
- Dịch và rà soát tất cả trang công khai và trang người chơi: trang chủ, đăng nhập/xác minh/đổi mật khẩu, trải nghiệm, chọn bản đồ, nhà, lâu đài, nhân vật, thú cưng, cửa hàng, kho đồ, nhiệm vụ, xếp hạng, sự kiện, trò chuyện và bản đồ bạn bè.
- Dịch lớp học và toàn bộ chức năng giáo viên/học sinh: lớp, bài đăng, học liệu, nộp bài, câu hỏi, cảnh báo bài đã sửa và trình soạn nội dung.
- Dịch Trung tâm AI, các loại kết quả kiểm tra, dấu hiệu, cảnh báo và hướng dẫn an toàn.
- Dịch trang quản trị, cấu hình phần thưởng, vật phẩm, câu hỏi và trạng thái hệ thống.
- Dịch HUD, hướng dẫn điều khiển, hộp thoại, toast, lỗi và các nhãn dựng trong cảnh 3D.
- Bổ sung tiêu đề/mô tả chia sẻ riêng cho từng trang nội dung; không dùng tiêu đề chung chung.

### 3. Ngân hàng câu hỏi song ngữ
- Mở rộng mỗi câu hỏi với `text_en` và `choices_en`; giữ nguyên `correct_indexes`, ảnh, phần thưởng, phân loại và thứ tự đáp án để bản dịch không làm lệch đáp án đúng.
- Cập nhật mọi luồng đọc câu hỏi: bản đồ nhà, lâu đài, bom, phòng đấu 1vs1 và câu hỏi lớp học chọn đúng ngôn ngữ hiện tại.
- Cập nhật trang giáo viên và quản trị để nhập/sửa cả tiếng Việt lẫn tiếng Anh cạnh nhau; kiểm tra đủ số lựa chọn, số lượng hai bản khớp nhau và đáp án đúng vẫn trỏ cùng vị trí.
- Mở rộng nhập CSV/JSON để nhận cột tiếng Anh, đồng thời vẫn đọc được tệp cũ chỉ có tiếng Việt.
- Dịch và lưu bản tiếng Anh cho toàn bộ câu hỏi hiện có theo lô; sau đó kiểm tra tự động các lỗi thiếu bản dịch, trùng/lệch lựa chọn, đáp án ngoài phạm vi và câu tiếng Anh bất thường.
- Câu hỏi mới thiếu English vẫn lưu được, nhưng được đánh dấu rõ cho giáo viên/quản trị bổ sung trước khi dùng ở chế độ English.

### 4. Phim tình huống và lồng tiếng English
- Tách nội dung ngôn ngữ khỏi dữ liệu hình/video cho cả 5 phim hiện có: tiêu đề, tên người nói, mô tả cảnh, thoại, lựa chọn, kết thúc, bài học, ghi chú và mọi lớp chữ dựng trên màn hình.
- Viết bản dịch English theo văn phong hội thoại tự nhiên, nhất quán tên nhân vật, thuật ngữ an toàn số và quan hệ nguyên nhân–kết quả giữa các nhánh.
- Giữ file lồng tiếng thu sẵn cho bản Việt. Khi chọn English, bỏ qua audio Việt và phát giọng AI English theo từng nhân vật; cache theo `ngôn ngữ + phim + cảnh` để không phát nhầm giọng.
- Chuyển phần lồng tiếng sang mô hình mặc định `google/gemini-3.1-flash-tts-preview`, gọi an toàn từ máy chủ, truyền chỉ dẫn giọng English riêng cho người dẫn chuyện và từng nhân vật.
- Đồng bộ phụ đề English theo tiến độ audio; nếu dịch vụ giọng đọc không dùng được, chuyển sang giọng English của thiết bị và vẫn giữ phụ đề/nhịp chuyển cảnh.
- Giữ nguyên video theo lựa chọn của bạn; các lớp chữ do ứng dụng dựng sẽ chuyển sang English. Chữ đã nằm sẵn trong khung hình/video chỉ được che và thay khi có vùng phủ tương ứng, không tạo lại video.

### 5. Kiểm tra chất lượng
- Kiểm tra tự động đủ khóa bản dịch, không còn chuỗi giao diện tiếng Việt lọt vào chế độ English, và không có câu hỏi/đáp án bị lệch.
- Rà ngữ pháp thủ công các màn quan trọng và toàn bộ nhánh phim; ưu tiên câu ngắn, tự nhiên, phù hợp học sinh.
- Chạy thử hai ngôn ngữ trên máy tính và điện thoại cho các luồng: đăng nhập → chơi câu hỏi, giáo viên sửa câu, đấu 1vs1, Trung tâm AI và toàn bộ 5 phim.
- Gọi thử lồng tiếng English thật, kiểm tra phản hồi, phát âm, phụ đề, chuyển cảnh và cách hiển thị lỗi theo đúng trạng thái dịch vụ.

## Chi tiết kỹ thuật
- Dùng một `LanguageProvider` phía trình duyệt với khóa lưu trữ ổn định; không đọc bộ nhớ trình duyệt khi render ban đầu để tránh nhấp nháy/hydration mismatch.
- Dùng từ điển TypeScript có kiểu dữ liệu thay vì rải điều kiện `locale` trong từng nút; nội dung lớn của phim đặt trong các bảng dịch theo ID cảnh.
- Migration chỉ thêm cột song ngữ vào `questions_bank`, cấp quyền đúng theo chính sách hiện tại và không làm lộ cột đáp án.
- TTS dùng endpoint máy chủ dạng streaming, khóa bí mật không xuất hiện trong trình duyệt; lỗi 400/401/402/403/404 dừng đúng cách, chỉ 429/5xx được thử lại có giới hạn.
- Ghi quyết định kiến trúc song ngữ vào tài liệu kỹ thuật của dự án để các tính năng sau tiếp tục tuân theo cùng một cấu trúc.
