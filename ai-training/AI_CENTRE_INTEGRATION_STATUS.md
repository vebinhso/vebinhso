# Tích hợp thử nghiệm AI V2 vào Trung tâm AI

## Trạng thái
Đã thêm `src/lib/scam-ml.server.ts` và kết nối tùy chọn vào `analyzeText` trong `src/lib/ai-detect.functions.ts` trên nhánh `experiment/scam-ai-training`.

**Mặc định tắt:** không có yêu cầu nào gửi đến dịch vụ ML nếu không đặt `SCAM_ML_ENABLED=true`. Khi tắt, `mlAdvisory=null` và kết quả phân tích AI Centre hiện tại không đổi.

## Kích hoạt sau khi đã kiểm thử và duyệt quyền riêng tư
Cần triển khai `ai-training/inference_api.py` trên máy chủ HTTPS tin cậy, nạp mô hình `candidate_v2.joblib` do pipeline của dự án tạo. Đặt bí mật ở môi trường **server** (không phải VITE_*):
- `SCAM_MODEL_PATH`: đường dẫn artifact đã kiểm chứng trên máy chủ Python
- `SCAM_API_TOKEN`: khóa bí mật dài ngẫu nhiên ở máy chủ Python
- `SCAM_ML_API_URL`: URL HTTPS trỏ trực tiếp tới endpoint `/classify`
- `SCAM_ML_API_TOKEN`: cùng khóa bí mật, lưu ở máy chủ website
- `SCAM_ML_ENABLED=true`: chỉ sau khi hoàn tất kiểm tra và có quyết định triển khai

Không đặt token vào frontend, repo hay Supabase public. Không bật khi chưa có đánh giá quyền riêng tư cho tin nhắn học sinh. Endpoint phải có TLS, xác thực, rate limit và không lưu nội dung người dùng. Dịch vụ ML hiện tại chỉ là prototype, chưa có rate limit, nên **chưa đủ điều kiện mở công khai**.

## Giao diện
`analyzeText` có thêm trường `mlAdvisory` (null hoặc `{status,model_version,review_required}`). Chưa sửa UI, nên người dùng hiện không nhìn thấy trường này. Cần thêm UI hiển thị ba mức cảnh báo và thử nghiệm đầy đủ trước khi bật.

## Lưu ý khoa học
Ngưỡng 0.2 và 0.8 chỉ là lựa chọn thận trọng ban đầu, **chưa hiệu chuẩn**. Không được hiểu điểm số là xác suất thực tế. V2 từng đạt 80/104 trên tập test đã dùng trong quá trình chọn mô hình; phải có tập kiểm thử mới trước triển khai.

## Kiểm thử cục bộ đã thực hiện
Với artifact V2 do nhóm cung cấp, API trả HTTP 200 và `uncertain` cho hai câu thử; không có token trả 401, dữ liệu quá ngắn trả 422. Đây là smoke test, chưa phải kiểm thử bảo mật/hiệu năng/tích hợp đầy đủ.

## Chưa thực hiện
- Chưa triển khai dịch vụ HTTPS.
- Chưa chạy test end-to-end website.
- Chưa bật tính năng hoặc cập nhật main, Supabase hay website production.
