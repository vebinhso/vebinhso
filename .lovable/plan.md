
## Mục tiêu
Chuyển dự án từ lưu trữ localStorage sang Supabase (Lovable Cloud) để dữ liệu đồng bộ giữa các thiết bị, cho phép xếp hạng/admin chính xác và bảo mật bằng RLS.

## 1. Authentication
- Bật **Supabase Auth**: email/password + Google (qua `lovable.auth.signInWithOAuth`).
- Tự động xác nhận email **TẮT** (user phải verify email).
- Xoá flow `verifyRegistration` / `pending accounts` cũ trong `src/lib/auth.ts`.
- Viết lại `src/routes/login.tsx`, `src/routes/verify.tsx` dùng Supabase Auth.
- Thêm `onAuthStateChange` listener ở `__root.tsx` để invalidate cache.
- Lưu ý: **tài khoản cũ trong localStorage sẽ không tự chuyển** — người chơi phải đăng ký lại.

## 2. Schema database

```text
profiles              (user_id PK→auth.users, username unique, display_name, avatar, created_at)
user_roles            (user_id, role app_role enum: admin/moderator/user) — chống privilege escalation
game_state            (user_id PK, money, net_worth, correct_answers, answer_streak,
                       level, bricks, concrete, roof_tiles, roof_tiles_ton,
                       wall_color, owned_palettes jsonb, updated_at)
placed_items          (id, user_id, item_id, x, z, rotation)
walls                 (id, user_id, ax, az, bx, bz, color, value)
roofs                 (id, user_id, ax, az, bx, bz, style, value)
character_outfit      (user_id PK, outfit jsonb)
pets                  (id, user_id, pet_id, name, level, xp, equipped)
friends               (user_id, friend_id, status, created_at)  -- composite PK
messages              (id, from_user, to_user, content, created_at) -- realtime
login_streaks         (user_id PK, total_days, current_streak, last_login_date)
questions_bank        (id, text, choices jsonb, answer_index, image_url, category)
admin_config          (key PK, value jsonb)  -- prices, levels, rewards overrides
```

- **Hàm `has_role(uuid, app_role)`** SECURITY DEFINER để dùng trong RLS (tránh đệ quy).
- **Trigger `handle_new_user`** tự tạo `profiles` + `game_state` rỗng khi signup.
- **Trigger `update_updated_at`** cho mọi bảng có `updated_at`.

## 3. RLS policies
- `profiles`: SELECT cho tất cả authenticated (để xem ranking), UPDATE chỉ chủ sở hữu.
- `game_state`, `placed_items`, `walls`, `roofs`, `character_outfit`, `pets`, `login_streaks`: SELECT cho authenticated (để ranking/leaderboard); INSERT/UPDATE/DELETE chỉ owner. Admin có thể UPDATE tất cả qua `has_role(auth.uid(),'admin')`.
- `friends`, `messages`: chỉ các bên liên quan đọc/ghi.
- `questions_bank`, `admin_config`: SELECT cho tất cả; INSERT/UPDATE/DELETE chỉ admin.
- `user_roles`: SELECT chính mình; INSERT/UPDATE/DELETE chỉ admin.

## 4. Refactor code — đọc/ghi từ DB

| File hiện tại | Thay đổi |
|---|---|
| `src/lib/auth.ts` | Bỏ logic localStorage, dùng `supabase.auth`. Giữ helper `getCurrentUser()` đọc từ session. |
| `src/lib/game.ts` | `loadGame()` / `saveGame()` async, đọc/ghi `game_state` qua server fn. Debounce save (~500ms). |
| `src/lib/character.ts` | `loadOutfit/saveOutfit` async qua `character_outfit`. |
| `src/lib/friends.ts` | Đọc/ghi bảng `friends`. |
| `src/game/questions.ts` | Đọc từ `questions_bank`. |
| `src/lib/admin.ts` | `isAdmin()` qua `has_role`; config qua `admin_config`. |
| `src/routes/ranking.tsx` | Query `profiles + game_state` thay vì duyệt localStorage. |
| `src/routes/chat.tsx` | Realtime channel cho `messages`. |
| Các route GameWorld/magic | Dùng React Query để load state, mutation để save. |

- Server functions trong `src/lib/*.functions.ts`:
  - `getGameState`, `saveGameState`
  - `getLeaderboard`
  - `saveOutfit`, `getOutfit`
  - `listFriends`, `addFriend`, `removeFriend`
  - `adminListPlayers`, `adminUpdatePlayer`, `adminResetPassword` (dùng `supabaseAdmin`)
  - `adminListQuestions`, `adminUpsertQuestion`, `adminDeleteQuestion`
- Wire `attachSupabaseAuth` trong `src/start.ts` nếu chưa có.

## 5. Migration dữ liệu cũ
- Một **banner một lần** ở Home: nếu phát hiện dữ liệu cũ trong localStorage, gợi ý người chơi đăng ký tài khoản mới và **tự động đẩy** game state + outfit + walls + placed items + roofs từ localStorage lên DB sau khi login lần đầu.
- Sau migration thành công → xoá key localStorage để tránh duplicate.

## 6. Admin
- Bảng `user_roles` + seed 8 email allowlist hardcode hiện tại làm admin **sau khi họ signup lần đầu** (qua một edge case trong trigger `handle_new_user`: nếu email ∈ allowlist → INSERT role admin).
- `src/routes/admin.tsx` query qua server fn admin (dùng service role), không truy cập trực tiếp từ client.

## 7. Phạm vi NGOÀI plan này (làm sau)
- Báo cáo vi phạm, log hệ thống chi tiết, thông số sự kiện thời tiết/festival.
- Chuyển 3D state realtime giữa người chơi (multiplayer thật).

## Thứ tự thực thi
1. Tạo migration SQL (bảng + enum + function + trigger + RLS) — chờ user approve.
2. Bật Google OAuth + email auth.
3. Viết server functions + refactor `auth.ts`, `game.ts`, `character.ts`, `friends.ts`.
4. Cập nhật route `login`, `verify`, `ranking`, `chat`, `admin`, GameWorld, magic.
5. Thêm migration banner localStorage → DB.
6. Test toàn bộ flow: signup → play → save → ranking → admin.

## Cảnh báo
- Đây là refactor lớn (~15-20 file). Sau khi migrate, **dữ liệu localStorage cũ trên thiết bị hiện tại vẫn còn** nhưng game sẽ đọc từ DB.
- Mỗi câu trả lời đúng / mỗi lần đặt vật phẩm sẽ tạo 1 request lên DB (có debounce). Cần internet để chơi.
