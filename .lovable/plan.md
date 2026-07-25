
## Mục tiêu

1. Bỏ trang `/friends-map` khỏi luồng "Rời nhà" — nút này quay về `/game` (nhà mình).
2. Tên chủ căn nhà (khi đang thăm) hiển thị to, nổi bật hơn.
3. 4 chế độ quyền riêng tư nhà: **Công khai / Bạn bè / Tùy chỉnh (whitelist) / Đóng cửa**.
4. Khi có người vào nhà bạn: hiện toast `<tên người chơi> đang tham quan` cho chủ nhà.
5. Real-time co-op: khách và chủ (nếu online cùng lúc) đều thấy avatar nhau di chuyển trong cùng ngôi nhà; mỗi người điều khiển nhân vật riêng.
6. Khách được phép co-build: có thanh công cụ xây bên phải trong nhà bạn (chỉ khi chủ bật), đặt/xoá đồ áp vào state nhà chủ; **tiền và vật liệu trừ vào tài khoản của khách**.

## Thay đổi chính

### Database (một migration)
- `profiles`: đổi kiểu `house_privacy` cho phép `'public' | 'friends' | 'custom' | 'closed'` (giữ cột text hiện có, chỉ mở rộng giá trị hợp lệ ở app-level; policy `can_visit_house` cập nhật).
- `profiles.house_allow_list uuid[]` — whitelist cho chế độ `custom`.
- `profiles.coop_build boolean default false` — chủ nhà bật/tắt cho khách xây.
- `has_role`-style helper: cập nhật `can_visit_house(owner uuid)` xử lý `custom` (kiểm tra `auth.uid()` nằm trong `house_allow_list`) và `closed` (luôn false trừ chủ).
- RLS `placed_items` / `walls` / `roofs` / `floors`: thêm policy INSERT/DELETE cho khách khi `owner.coop_build = true` và `can_visit_house(owner)`.
- Bật realtime cho `placed_items`, `walls`, `roofs`, `floors`, `presence` (nếu chưa).

### Server functions (`src/lib/friend-houses.functions.ts`)
- `updateHouseSettings` nhận thêm `privacy: 'closed'`, `allow_list: string[]`, `coop_build: boolean`.
- `listFriendsForWhitelist` — trả danh sách bạn bè (id, username, avatar) để checkbox.
- `coopUpsertItem` / `coopDeleteItem` / `coopUpsertWall` / … — server fn đặt/xoá đồ trong nhà chủ với auth = khách; trừ tiền/vật liệu từ `game_state` của khách (transaction).

### UI
- **`src/routes/visit.$ownerId.tsx`**:
  - Nút "🚪 Rời nhà" → `navigate({ to: "/game" })`.
  - Header tên chủ: font lớn (`text-2xl md:text-3xl`), có avatar, house_name làm tiêu đề chính.
  - Nếu `coop_build = true`: bật panel công cụ xây (dùng lại `SettingsPanel` phần shop/place) ở góc phải; mọi hành động gọi coop server fn thay vì `saveGame` local.
- **`src/routes/game.tsx`** (Settings nhà):
  - Radio 4 chế độ; khi chọn `custom` mở list checkbox bạn bè.
  - Toggle "Cho phép bạn bè cùng xây".
- **Realtime avatar sync** (`src/lib/coop-presence.ts` mới):
  - Supabase channel `house:<ownerId>` với broadcast `{ userId, x, z, angle, floor }` @ 10Hz.
  - Ai đang trong nhà (kể cả chủ ở `/game`) subscribe kênh của chủ nhà và render `RemoteCharacter` cho mỗi user_id khác.
  - `GameWorld` nhận `remotePlayers: {id, name, avatar, x, z, angle}[]` và render.
- **Toast "đang tham quan"** cho chủ nhà: subscribe presence realtime, khi có `in_house_owner = mine` mới → toast tên.

## Kỹ thuật

```text
Broadcast pos ──┐         ┌── RemoteCharacter (khách)
                ├─► channel:house:<ownerId>
Broadcast pos ──┘         └── RemoteCharacter (chủ)

Coop edit:  visitor -> coopUpsertItem(ownerId,...) -> RLS check
                    -> INSERT placed_items(user_id=ownerId)
                    -> UPDATE game_state SET money=money-cost WHERE user_id=visitor
                    -> realtime postgres_changes fires -> cả 2 client refetch
```

## Phạm vi ngoài lần này
- Voice chat, gesture emote — bỏ qua.
- Xung đột đặt cùng ô: last-write-wins.

## Xác nhận trước khi build

Kế hoạch này khá lớn (migration + 5-6 server fn mới + realtime channel + UI co-build). Mình sẽ triển khai theo thứ tự: (1) migration + settings 4 chế độ, (2) đổi nút Rời nhà + header to, (3) toast đang tham quan, (4) realtime avatar sync, (5) co-build. OK để bắt đầu chứ?
