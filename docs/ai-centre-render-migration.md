# Trung tâm AI — chuyển sang Render (bản thử nghiệm)

## Cấu hình mục tiêu

- `LOVABLE_AI_ENABLED=false`: cờ tắt các lời gọi AI Gateway Lovable trong Trung tâm AI (chỉ áp dụng sau khi mã server thực sự đọc cờ này).
- `AI_CENTRE_V3_ENABLED=false`: không mở giao diện mới cho người dùng cho đến khi kiểm thử thành công.
- Backend thử nghiệm: `vebinhso-ai-v2-experiment`; production: `vebinhso-ai-v2`.

## Dữ liệu đầu vào (chưa xác thực chất lượng)

Google Drive: https://drive.google.com/drive/folders/1B9tEzyCQ7f7tLU92kp4irqjVJhQbsM24?usp=sharing

Nhóm: tin nhắn giả, email giả, số điện thoại giả, tin tức giả, ảnh AI, ảnh chỉnh sửa. Các file CSV/JSON có thể trùng nội dung; phải khử trùng, ẩn danh và phân chia train/test trước khi nạp.

## Điều kiện triển khai

1. Kiểm kê toàn bộ lời gọi `callGatewayVerified` trong `src/lib/ai-detect.functions.ts` và các thành phần phụ thuộc.
2. Xây dựng API Render cho từng loại kiểm tra, trả đúng schema UI hiện hành; không dùng một classifier văn bản để kết luận ảnh, video hoặc tin tức.
3. Xác thực từ máy chủ, không đưa `SCAM_API_TOKEN` vào trình duyệt.
4. Test CORS, 401/422/429, dữ liệu không xác định, dữ liệu bình thường và nguy cơ lừa đảo.
5. Chỉ bật `AI_CENTRE_V3_ENABLED=true` sau khi có bằng chứng kiểm thử, sau đó tắt Gateway Lovable ở các chức năng đã thay thế.

**Lưu ý:** Tệp này là kế hoạch và cờ cấu hình dự kiến, không phải bằng chứng đã triển khai hoặc đã tắt Lovable trên website.
