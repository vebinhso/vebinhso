# Bản đồ bạn bè & tham quan nhà

Tính năng lớn, đụng vào DB + realtime + 3D scene. Chia làm 4 mốc để dễ kiểm tra từng bước.

## 1. Dữ liệu & quyền riêng tư (migration)

Thêm cột / bảng mới:

- `profiles`:
  - `map_x float`, `map_y float` — toạ độ nhà trên bản đồ (mặc định random 1 lần).
  - `house_privacy text` — `public | friends | private` (mặc định `friends`).
  - `house_name text` — tên căn nhà hiển thị dưới icon (nếu null → dùng username).
- `presence` (bảng mới): `user_id PK`, `is_online bool`, `in_house_owner uuid null`, `last_seen timestamptz`.
  - Cập nhật qua Realtime + heartbeat 30s (tận dụng `startSessionTracker` sẵn có).
- RPC `get_friend_houses()` (SECURITY DEFINER):
  - Trả về danh sách nhà của các user có `friends.status='accepted'` với `auth.uid()`.
  - Kèm `username, avatar_url, map_x, map_y, house_privacy, house_name, is_online, in_house_owner`.
- RPC `can_visit_house(owner uuid)`:
  - `true` nếu `public`, hoặc `friends` + đã kết bạn, hoặc chính chủ.
  - `false` nếu `private` hoặc không đủ quyền.
- RLS: cho `authenticated` SELECT các cột public của `profiles` (username, avatar, map coords, privacy, house_name) — vẫn giấu email.
- GRANT chuẩn cho bảng `presence` (owner-only INSERT/UPDATE, SELECT cho authenticated để bạn bè thấy trạng thái).

## 2. Server functions

Tạo `src/lib/friend-houses.functions.ts` (dùng `requireSupabaseAuth`):

- `listFriendHouses()` → gọi RPC `get_friend_houses`.
- `getVisitableHouse({ ownerId })` → check `can_visit_house`; nếu OK trả về snapshot chỉ đọc: outfit, floors, walls, roofs, placed_items, sign labels của chủ nhà. Nếu không → throw lỗi "Nơi ở riêng tư".
- `updateHousePrivacy({ privacy, house_name?, map_x?, map_y? })` — cập nhật `profiles`.
- `setPresenceInHouse({ ownerId | null })` — set/clear `in_house_owner`.

## 3. Bản đồ bạn bè (UI mới `/friends-map`)

Route mới `src/routes/friends-map.tsx`:

- Canvas 2D (SVG hoặc div absolute positioning) rộng ~2000x1200, có pan/zoom bằng chuột & pinch trên mobile.
- Render mỗi nhà bạn bè = icon 🏠 + avatar tròn + tên + chấm trạng thái 🟢/⚪.
- Hover / tap → popup nhỏ: avatar, tên, online, đang ở trong nhà (nếu có), nút **🏠 Vào nhà** hoặc **🔒 Nơi ở riêng tư** (disabled).
- Chống chồng: chạy layout đơn giản (jitter theo hash user_id) khi 2 nhà quá gần.
- Animation `animate-in fade-in slide-in-from-bottom-2` khi icon xuất hiện.
- Nút **⚙️ Cài đặt nhà của tôi** mở modal chọn privacy (Public / Friends / Private) + đổi `house_name` + kéo icon nhà mình để đổi vị trí.
- Realtime: subscribe kênh `presence-map` → khi có `is_online` / `in_house_owner` đổi thì refetch chỉ 1 hàng.

Thêm entry point vào trang chủ + trong menu game: nút "🗺️ BẢN ĐỒ BẠN BÈ".

## 4. Chế độ tham quan nhà bạn (read-only)

Trong `src/routes/game.tsx`:

- Thêm search param `visit=<ownerId>`. Nếu có:
  - Gọi `getVisitableHouse({ ownerId })`; lỗi → toast "Căn nhà này hiện không mở cho bạn tham quan." rồi `navigate` về `/friends-map`.
  - Load snapshot vào state riêng (không đè `useGame`); disable mọi mutation (mua, đặt, xoá, di chuyển, xoay, đổi vật liệu).
  - HUD hiển thị: avatar + tên chủ nhà, "Đang tham quan", nút **🚪 Rời nhà** (quay lại `/friends-map`).
  - Gọi `setPresenceInHouse({ ownerId })` khi vào, clear khi rời (cả unmount + `beforeunload`).
- `GameWorld` nhận thêm prop `readOnly` để bỏ tất cả click-to-edit + edit panel.
- Hiển thị các visitor khác cùng chủ nhà: dùng Realtime `presence` channel `house:<ownerId>` (chỉ danh sách, chưa render 3D vị trí — tiết kiệm phạm vi giai đoạn 1).
- Chat trong nhà: dùng lại `messages` bảng sẵn có, filter theo `to_user = ownerId` như "phòng khách" (giai đoạn 2, chưa làm nếu vượt phạm vi).

## 5. NGOÀI phạm vi lần này (làm sau)

- Đồng bộ vị trí 3D theo thời gian thực của visitor bên trong nhà (multiplayer thật).
- Chat riêng theo phòng nhà.
- Chỉnh sửa nội thất khi được chủ nhà cấp quyền.

## Chi tiết kỹ thuật

- Realtime hiện tại chỉ bật cho `messages`. Migration sẽ `ALTER PUBLICATION supabase_realtime ADD TABLE presence, profiles` (chỉ các cột an toàn — vì Realtime phát full row, nên tạo bảng phụ `profiles_public` view hoặc chỉ dùng `presence` cho realtime; sẽ dùng `presence` để tránh leak email).
- Không dùng WebSocket riêng; Supabase Realtime đủ dùng.
- Toạ độ nhà mặc định: hash `user_id` → toạ độ ổn định trong khung [80..1920]×[80..1120] để user chưa set vị trí vẫn có chỗ hiện lên.
- Tất cả server fn dùng `requireSupabaseAuth` → RLS bảo vệ; không có endpoint public.

## Thứ tự thực thi

1. Migration (bảng + cột + RPC + RLS + realtime publication).
2. Server functions + refactor `friends.ts` để expose danh sách accepted.
3. Route `/friends-map` (bản đồ + popup + modal cài đặt).
4. Chế độ `?visit=` trong `/game` (read-only) + nút "Rời nhà".
5. Cắm entry vào trang chủ + menu game.
6. Test end-to-end: 2 tài khoản kết bạn → thấy nhau trên map → thăm nhà theo từng chế độ privacy.

## Cảnh báo

- Đây là feature ~10 file mới/sửa, ảnh hưởng game route lớn nhất. Sau khi làm xong, cần test lại flow xây nhà cũ không bị regression.
- Chi phí Realtime tăng do thêm `presence` channel — sẽ scope hẹp (chỉ user + bạn bè, không phát toàn cầu).
