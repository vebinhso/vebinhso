# Kết quả kiểm thử độc lập lần 1 (17/10/2026)

Nguồn: artifact `scam-ai-demo-results (1).zip` do thành viên dự án cung cấp, gồm `metrics.json` và `challenge_metrics.json`.

## Kết quả đã đo

| Chỉ số | Demo holdout | News-inspired challenge |
|---|---:|---:|
| Số mẫu | 10 | 18 |
| Dự đoán đúng | 10 | 14 |
| Accuracy | 100% | 77,78% |
| Recall scam | 100% (5/5) | 87,5% (7/8) |
| Precision scam | 100% | 70% |
| F1 scam | 100% | 77,78% |
| False positive (not_scam bị báo scam) | 0 | 3 |
| False negative (scam bị bỏ sót) | 0 | 1 |

Ma trận nhầm lẫn của challenge, hàng là nhãn thật, cột là nhãn dự đoán, theo thứ tự `not_scam, scam`: `[[7,3],[1,7]]`.

## Nhận xét

- 30% (3/10) tin nhắn bình thường bị cảnh báo nhầm; 12,5% (1/8) tin nhắn lừa đảo bị bỏ sót.
- Mẫu ít và hoàn toàn giả lập; không suy rộng kết quả thành độ chính xác ngoài thực tế.
- Chưa thể xác định **cụ thể tin nào** bị dự đoán sai từ JSON tổng hợp vì artifact không lưu dự đoán theo từng mẫu.
- Không sử dụng challenge set để huấn luyện/tối ưu tham số rồi tiếp tục gọi nó là kiểm thử độc lập. Cần tạo tập kiểm thử mới khi thực hiện vòng cải tiến.
- Trước khi dùng các dataset Drive: kiểm tra nhãn, ẩn danh hóa, trùng lặp và nguồn gốc. Đặc biệt dữ liệu toàn nhãn scam không đủ để huấn luyện bộ phân loại hai lớp.
- Không triển khai mô hình lên AI Centre/Supabase hoặc main khi chưa được đánh giá với tập kiểm thử lớn hơn và được thẩm định.

## Việc tiếp theo

1. Xuất kết quả dự đoán theo **ID mẫu** (không xuất thông tin nhạy cảm) để phân tích lỗi.
2. Bổ sung tập tin nhắn hợp lệ khó phân biệt, đa dạng hơn, và mẫu lừa đảo được biên tập theo nguồn đáng tin cậy.
3. Chia tập dữ liệu theo nguồn/kịch bản để giảm rò rỉ giữa train và test.
4. So sánh mô hình cải tiến với baseline trên **tập đánh giá mới, chưa dùng để điều chỉnh mô hình**.
