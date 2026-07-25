
# Phòng thi đấu 1vs1 — bản nâng cấp

## Luồng người dùng

1. Trong nhà (của mình hoặc bạn), bấm biểu tượng ⚔️ → mở bảng "Chọn đối thủ".
2. Chủ phòng chọn 1 người có mặt trong nhà và bấm "Mời". Không auto vào phòng — chỉ hiện màn hình chờ "Đang chờ đối thủ phản hồi…".
3. Khách nhận popup lời mời (đồng ý / từ chối, tự huỷ sau 20s).
4. Khi khách đồng ý → cả 2 cùng vào phòng đấu.
5. Chủ phòng chọn 1 trong 7 chủ đề cố định:
   - Năng lực số · Miền 1 → Miền 6 (6 chủ đề)
   - Lịch sử – Văn hoá (1 chủ đề)
   Chủ đề bị mờ nếu ngân hàng không đủ 10 câu; ghi rõ "còn thiếu N câu".
6. Đếm ngược 3-2-1 rồi vào 10 câu × 10 giây.
7. Mỗi câu: 2 người thấy cùng lúc; **người bấm đúng đầu tiên** được điểm và +tiền, người còn lại −tiền và mất lượt câu đó. Nếu người bấm đầu tiên sai → đối thủ vẫn còn cơ hội trong thời gian còn lại. Hết giờ mà không ai đúng → hoà câu đó.
8. Sau khi câu đóng: hiện đáp án đúng, ai được/mất tiền, đợi 1.5s, tự sang câu mới.
9. Hết 10 câu: tổng kết Thắng/Hoà/Thua + tổng tiền chênh lệch.

## Giao diện phòng đấu

- Nền phòng đấu phong cách "arena" (gradient tím-xanh, sàn cỏ), 2 avatar/nhân vật đối diện nhau, tên + số điểm trên đầu mỗi bên.
- Nhân vật dùng đúng ngoại hình đang mặc trong game (đọc từ `character_outfit`) — không dùng ảnh mẫu.
- Trên cùng: đồng hồ đếm ngược, số câu (VD "Câu 4/10"), chủ đề.
- Câu hỏi + 4 đáp án dạng nút to ở giữa; ảnh minh hoạ (nếu có).
- Hiệu ứng nhẹ khi ghi điểm: nhân vật thắng nhảy 1 nhịp + tia sáng; người thua rung.

## Cơ chế tính tiền

- Payout mỗi câu = giá trị **"Phần thưởng đấu"** cấu hình trong trang admin (`admin_config` key `duel_payout`, mặc định 30đ). Bỏ hằng số cứng.
- Người đúng đầu tiên: +payout. Đối thủ: −payout (không xuống dưới 0). Câu hoà: không đổi.
- Tổng kết cộng dồn từ từng câu, hiển thị đồng bộ cho cả 2 bên.

## Chi tiết kỹ thuật

- **DB / cấu hình**
  - Không đổi schema `duels`/`duel_answers`.
  - Thêm khoá `duel_payout` vào bảng `admin_config` (số nguyên, mặc định 30). Trang admin (tab "Phần thưởng") thêm ô nhập.

- **Realtime đồng bộ câu**
  - Dùng Supabase Broadcast channel `duel:<duelId>` cho 2 sự kiện:
    - `question_locked { qIndex, winnerUserId | null, correctIndexes }` — phát khi server ghi nhận người đầu tiên đúng hoặc hết giờ.
    - `round_advance { qIndex }` — phát sau 1.5s để đồng bộ chuyển câu.
  - Server function `submitDuelAnswer` trả thêm `firstCorrectAt` từ DB (query MIN(ms) WHERE is_correct); client dùng làm nguồn sự thật, phát broadcast khi đúng.
  - Không polling nữa; huỷ interval 1.2s hiện có.

- **Server functions (`src/lib/duels.functions.ts`)**
  - `listDuelTopics`: luôn trả 7 mục cố định (6 miền digital + 1 history), kèm `count` và `enough: count >= 10`.
  - `startDuel`: nếu là "history" thì bỏ điều kiện domain, chọn ngẫu nhiên 10 câu enabled thuộc `category='history'`. Giữ nguyên phần shuffle & lưu `question_ids`.
  - Thêm `resolveRound({duelId, qIndex})`: server chốt câu (winner theo MIN(ms) trong bảng `duel_answers`), cập nhật `host_score`/`guest_score` và trả về `{winnerUserId, correctIndexes}`. Được gọi khi có người đúng đầu tiên hoặc hết giờ.
  - `finishDuel`: giữ nguyên; đọc `duel_payout` từ `admin_config` thay cho hằng số.

- **Client (`src/components/DuelRoom.tsx`, `DuelController.tsx`)**
  - `DuelController`: khi mời, KHÔNG gọi `announceStart` ngay. Chờ khách phản hồi qua broadcast `duel_response`; chỉ khi accept mới cùng `setActiveDuelId`.
  - `DuelRoom`: viết lại layout theo "arena" ở trên, subscribe realtime channel, dùng snapshot server để render điểm; điểm cục bộ chỉ hiển thị tức thời rồi bị snapshot đè.
  - Hiển thị nhân vật: tái sử dụng `PetModels`/`Models` avatar tĩnh 2D (nếu có sẵn) hoặc render `<CharacterBadge outfit={...}/>` mới bao gồm màu tóc/áo/mũ.

- **Trang admin**
  - Tab "Phần thưởng": ô "Phần thưởng phòng đấu (đ/câu)" với nút Lưu — cập nhật `admin_config.duel_payout`.

## Phạm vi không thay đổi

- Không đổi cách vào/ra nhà, presence, hay quyền riêng tư.
- Không đổi logic câu hỏi ngoài phòng đấu (map, kiếm tiền, boom).
- Không đổi giá tiền các vật phẩm khác.
