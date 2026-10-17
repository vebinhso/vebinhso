# Triển khai AI V2 (thử nghiệm, chưa bật production)

## Trạng thái
API Python ở `inference_api.py` đã có xác thực Bearer token, kiểm tra đầu vào và giới hạn 30 yêu cầu/phút **trên mỗi tiến trình**. Chưa triển khai máy chủ, chưa có URL HTTPS, chưa kiểm thử end-to-end. Mô hình thử nghiệm có độ chính xác 80/104 trên tập đánh giá đã dùng để chọn mô hình; chưa được đánh giá độc lập trên tập mới.

## Chuẩn bị máy chủ Python
1. Chọn dịch vụ hỗ trợ Python và HTTPS (ví dụ Render hoặc Railway). Dùng repo **private**, không đưa dataset thô hoặc tin nhắn học sinh lên repo công khai.
2. Tạo môi trường Python và cài `pip install -r ai-training/requirements-api.txt`.
3. Cung cấp artifact `candidate_v2.joblib` **được tạo bởi pipeline tin cậy** qua kho lưu trữ riêng / volume bí mật. Không tải artifact pickle/joblib từ nguồn không tin cậy.
4. Đặt biến môi trường trên máy chủ:
   - `SCAM_MODEL_PATH`: đường dẫn tuyệt đối đến file mô hình
   - `SCAM_API_TOKEN`: token ngẫu nhiên dài, giữ bí mật
5. Khởi động từ thư mục `ai-training`: `uvicorn inference_api:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1`.
6. Bật TLS và rate limit bổ sung ở reverse proxy / nền tảng hosting. Giới hạn trong Python chỉ có tác dụng trong một tiến trình và reset khi khởi động lại. Tắt access log có thể chứa dữ liệu nhạy cảm; không log nội dung tin nhắn.

## Kết nối với Vệ Binh Số
Đặt các biến **chỉ trên môi trường server**, không dùng `VITE_`:
- `SCAM_ML_API_URL=https://<ten-mien-tin-cay>/classify`
- `SCAM_ML_API_TOKEN` trùng với token trên máy chủ Python
- `SCAM_ML_ENABLED=true` **chỉ sau khi kiểm thử đầy đủ**

Hàm `checkScamMl` ở `src/lib/scam-ml.server.ts` được gọi từ `analyzeText`; trả về `mlAdvisory` hoặc `null` nếu chưa bật/lỗi. **Giao diện hiện chưa hiển thị `mlAdvisory`.**

## Điều kiện trước khi mở cho học sinh
- Đánh giá quyền riêng tư và thời gian lưu dữ liệu, bảo đảm không lưu văn bản nhạy cảm.
- Kiểm tra SSRF, kiểm soát URL đích phía server, TLS, token, timeout, abuse/rate-limit.
- Chạy tập kiểm thử mới chưa từng dùng để chọn mô hình, gồm email OTP hợp lệ, thông báo giao hàng và đặt lại mật khẩu.
- Kiểm thử tích hợp trực tiếp với website và thông báo rõ mô hình chỉ hỗ trợ nhận diện, không khẳng định an toàn.
- Không tự động merge vào `main` hoặc publish khi chưa được phê duyệt.
