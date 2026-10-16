# Kiểm kê dataset Google Drive – 17/10/2026

Nguồn: thư mục Google Drive do chủ dự án chia sẻ. **Không sao chép dữ liệu thô vào GitHub**.

## Danh sách tệp
14 tệp, 6 chủ đề: ảnh chỉnh sửa (CSV/JSON/MD), ảnh AI (CSV/JSON/MD), email giả (CSV/JSON), số điện thoại giả (CSV/JSON), tin nhắn giả (CSV/JSON), tin tức giả (CSV/JSON).

## Các tệp JSON đã đọc và kiểm tra
- Tin nhắn giả: **300 hàng**, tất cả nhãn `lua_dao`; có `message`, `red_flags`, `category`, `platform`, `difficulty`.
- Email giả: **250 hàng**, tất cả nhãn `phishing`; có `subject`, `body`, `sender_email`, `red_flags`.
- Tin tức giả: **300 hàng**, tất cả nhãn `fake_news`; có `headline`, `body`, `red_flags`.

**Giới hạn khoa học:** Ba tệp này chỉ có nhãn dương, chưa thể dùng riêng để đánh giá tỷ lệ báo nhầm, specificity, hoặc độ chính xác phân loại nhị phân. Cần bổ sung các ví dụ hợp lệ/không lừa đảo có nguồn và nhãn độc lập. Phân chia train/test cần chống trùng lặp và rò rỉ biến thể cùng mẫu.

**Giới hạn an toàn:** Một số ví dụ tin nhắn có tên người, liên kết, số tài khoản hoặc thông tin liên hệ giả lập; không đưa trực tiếp vào kho tri thức công khai, prompt hay git. Cần ẩn danh, kiểm tra quyền sử dụng và chống dữ liệu chứa chỉ dẫn độc hại.

**Giới hạn dữ liệu ảnh:** Tệp MD về ảnh AI/ảnh Photoshop liệt kê *nguồn dataset bên ngoài*, không đồng nghĩa đã có ảnh hoặc nhãn ảnh trong hệ thống. Chưa xác minh giấy phép và quyền sử dụng từng nguồn.

## Hướng tích hợp đề xuất
1. Tạo staging dataset tách khỏi dữ liệu production.
2. Xác thực schema, nhãn, xuất xứ; loại trùng và dữ liệu cá nhân.
3. Bổ sung mẫu âm, xây tập kiểm thử độc lập, báo cáo confusion matrix/precision/recall/F1 và false-positive rate.
4. Chỉ xuất **tri thức đã xác minh** thành Skill phiên bản mới; không tự động ghi bài báo chưa duyệt vào `ai_skills`.
5. Kiểm thử hồi quy AI Centre, bật thử nghiệm có cờ tính năng và cơ chế rollback trước khi merge vào `main`.

Không có thay đổi nào đối với Supabase, Lovable hay website ở bước kiểm kê này.
