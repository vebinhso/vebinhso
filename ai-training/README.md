# Thử nghiệm huấn luyện AI phân loại tin nhắn – Vệ Binh Số

Đây là **mô hình thử nghiệm độc lập**, không thay đổi AI Centre, Supabase, website hay nhánh `main`.

## Dữ liệu
`data/messages_demo.csv` chứa **40 câu giả lập** (20 `scam`, 20 `not_scam`), không phải dữ liệu kiểm chứng thực tế. **Không dùng số liệu đánh giá từ bộ dữ liệu này để khẳng định hiệu quả ngoài thực tế.**

Các tệp `src/lib/scam-messages.ts` và `src/lib/phishing-dataset.ts` chứa tri thức, ví dụ và dấu hiệu rủi ro, **không phải tập nhãn âm/dương đầy đủ** để huấn luyện trực tiếp. Một số ví dụ có thể chứa thông tin nhận dạng; không sao chép thẳng vào tập train.

## Cách chạy
GitHub Actions sẽ tự chạy khi có push thay đổi vào nhánh `experiment/scam-ai-training` đối với các tệp trong `ai-training/**` hoặc workflow. Bạn có thể mở tab **Actions**, chọn **Train scam AI (experiment)**, xem log và tải artifact `scam-ai-demo-results`.

## Thuật toán
TF-IDF chuyển văn bản thành đặc trưng số; Logistic Regression học phân loại hai nhãn. Dữ liệu được chia 75% train, 25% test, phân tầng theo nhãn và dùng random_state=42.

## Kết quả
Artifact chứa `scam_text_model.joblib` và `metrics.json` (precision, recall, F1, confusion matrix). Không commit model lên GitHub, không tự động triển khai. Chỉ tải và sử dụng model từ nguồn bạn tin tưởng vì định dạng joblib có thể thực thi mã khi mở.

## Để nghiên cứu nghiêm túc
Thu thập tập dữ liệu có nguồn rõ ràng, ẩn danh hóa, kiểm tra nhãn, loại bỏ trùng lặp/gần trùng giữa train và test, bổ sung các tin nhắn bình thường nhưng có từ khóa đáng ngờ, và dùng một tập kiểm thử độc lập. 

## Kiểm thử bổ sung từ nguồn báo chí (17/10/2026)
- `data/news_inspired_v1.csv`: 8 tin nhắn lừa đảo **viết lại theo mô tả thủ đoạn trên báo**, và 10 tin nhắn bình thường **tự tạo để thử báo nhầm**. Không phải nguyên văn tin nhắn thực tế, không phải dữ liệu đã được chuyên gia thẩm định.
- Mỗi ví dụ lừa đảo có `source_url` dẫn đến bài báo tham khảo; ví dụ bình thường có `source_type=synthetic_control`.
- Các URL trong dữ liệu là URL nguồn báo, **không phải link lừa đảo**; không có số điện thoại, tài khoản ngân hàng hay OTP thật.
- `evaluate_challenge.py` chạy **sau khi train trên 40 mẫu demo**. 18 mẫu mới chỉ dùng để **kiểm thử độc lập**, không được dùng huấn luyện hoặc chọn siêu tham số nếu muốn tiếp tục coi đây là tập kiểm thử.
- GitHub Actions sẽ lưu thêm `challenge_metrics.json` vào artifact `scam-ai-demo-results`.
- Kết quả này chỉ dùng phát hiện điểm yếu ban đầu, **không được báo cáo là độ chính xác thực tế hoặc đưa vào website**. Trước triển khai cần dữ liệu đa dạng, kiểm tra thủ công nhãn, dữ liệu kiểm thử thực tế có sự đồng ý/ẩn danh hóa, đánh giá sai sót và rủi ro.
