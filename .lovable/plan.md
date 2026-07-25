
# Phòng đấu (Duel Room)

Thêm chức năng đấu câu hỏi 1vs1 khi hai người cùng online trong cùng một căn nhà (chủ nhà + khách, hoặc hai khách). Người thắng +30đ, người thua −30đ.

## Trải nghiệm người chơi

1. Khi đang trong nhà (map nhà mình hoặc `/visit/:ownerId`) và có người khác cũng online trong cùng nhà đó, HUD hiện nút **"⚔️ Mời đấu"** kế bên avatar/tên của họ.
2. Bấm → gửi lời mời. Người kia nhận toast/dialog: *"@X mời bạn vào phòng đấu"* với 2 nút **Đồng ý / Từ chối** (tự huỷ sau 20s).
3. Đồng ý → cả hai vào modal **Phòng đấu**. Người mời là **chủ phòng**, chọn 1 trong các chủ đề (6 miền × 2 mục — chỉ hiện chủ đề có ≥10 câu hỏi active trong bank).
4. Bấm **Bắt đầu** → server bốc 10 câu hỏi ngẫu nhiên của chủ đề đó, đếm ngược 3-2-1.
5. Mỗi câu hiện đồng thời cho cả hai, có thanh đếm 10s. Ai bấm trả lời trước và đúng → được 1 điểm cho câu đó. Sai không bị trừ điểm câu; hết 10s không ai đúng → hoà câu đó.
6. Sau 10 câu → công bố kết quả: điểm cả hai + thắng/thua/hoà. Server ghi kết quả và điều chỉnh tiền (+30 / −30, hoà 0).
7. Toast lưu "💰 +30đ" hoặc "💸 −30đ" cho từng bên.

## Kiến trúc kỹ thuật

**Realtime**: Dùng Supabase channel `house-duel:<ownerId>` (broadcast). Sự kiện:
- `invite` `{fromId, fromName, duelId}`
- `invite_response` `{duelId, accept, toId}`
- `duel_start` `{duelId, topic, questionIds[]}` (do server phát trả về sau khi chủ phòng bấm Bắt đầu)
- `answer` `{duelId, qIndex, userId, ms}` (client broadcast — chỉ dùng để hiện "đối thủ đã trả lời")

Ground truth thắng/thua & payout xử lý ở **server function**, không dựa vào client broadcast.

**Bảng mới `duels`**:
- `id uuid pk`, `host_id`, `guest_id`, `house_owner`, `topic_category` ('digital'|'history'), `topic_domain` (int 1–6, nullable), `question_ids uuid[]`, `status` ('pending'|'active'|'finished'|'cancelled'), `host_score int`, `guest_score int`, `winner_id uuid null`, `created_at`, `finished_at`.
- Bảng `duel_answers` `(duel_id, q_index, user_id, selected int, is_correct bool, ms int, created_at)` — dùng để chấm điểm & chống gian lận.
- RLS: chỉ host/guest xem/ghi được row của mình. GRANT authenticated + service_role.

**Server functions** (`src/lib/duels.functions.ts`):
- `createDuel({guestId, ownerId})` — validate cùng nhà (kiểm tra `presence.in_house_owner` của cả hai == ownerId), tạo row `pending`.
- `startDuel({duelId, category, domain})` — chỉ host, bốc 10 questionIds từ `questions_bank` (filter category/domain, active, `answer_index` hoặc `correct_indexes` hợp lệ), chuyển `active`, trả về câu hỏi (không kèm đáp án).
- `submitAnswer({duelId, qIndex, selected, ms})` — chấm bằng RPC `grade_answer`, ghi `duel_answers` (unique `(duel_id, q_index, user_id)`).
- `finishDuel({duelId})` — gọi khi client báo xong 10 câu (idempotent). Server tính lại điểm từ `duel_answers` (đúng nhất, ai đúng trước tính điểm), set `winner_id`, cập nhật `game_state.net_worth` (+30/−30, không cho âm quá 0), trả về snapshot kết quả.

**UI**:
- `src/components/DuelInvite.tsx` — dialog nhận lời mời (dùng cho cả game.tsx và visit.$ownerId.tsx).
- `src/components/DuelRoom.tsx` — modal fullscreen chứa: chọn chủ đề (host) / chờ (guest), countdown, câu hỏi + đáp án, thanh điểm 2 bên, màn kết quả.
- Hook `useHouseDuelChannel(ownerId)` — quản lý channel, expose `sendInvite`, `respondInvite`, sự kiện đến.

**Wiring**:
- Trong `src/routes/game.tsx` và `src/routes/visit.$ownerId.tsx`: mount `useHouseDuelChannel` với `ownerId` tương ứng, render `DuelInvite` + `DuelRoom` khi có state.
- HUD hiện nút "⚔️ Mời đấu @username" khi phát hiện người khác trong cùng nhà (lấy từ danh sách `presence` của những friend có `in_house_owner === ownerId`).

## Ràng buộc & bảo mật

- Server luôn xác minh cả hai user đều có `presence.in_house_owner = ownerId` khi tạo/bắt đầu duel.
- Không trả `answer_index`/`correct_indexes` cho client; client gọi `submitAnswer` để chấm.
- `finishDuel` idempotent: nếu đã `finished` chỉ trả kết quả, không trả tiền lần 2.
- Payout dùng cùng cột `net_worth` như hệ thống hiện tại; chú thích rõ trong bảng để admin kiểm tra.
- Chủ đề chỉ liệt kê những nhóm có ≥10 câu active → tránh duel không đủ câu.

## Các bước triển khai

1. Migration: tạo `duels`, `duel_answers`, enable realtime cho channel (broadcast không cần publication), GRANT + RLS.
2. Server functions `duels.functions.ts` (create/start/submit/finish + listTopics).
3. Hook `useHouseDuelChannel` + components `DuelInvite`, `DuelRoom`.
4. Cắm vào `game.tsx` và `visit.$ownerId.tsx`, thêm nút "⚔️ Mời đấu" ở HUD khi có bạn cùng nhà.
5. Kiểm tra: mở 2 tab (2 tài khoản), vào cùng 1 nhà, mời → đấu → xác nhận payout +30/−30 trên `game_state`.
