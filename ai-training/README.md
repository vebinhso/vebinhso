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
