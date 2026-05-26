# Trang Admin Quản Lý Game

## Tổng quan
Xây dựng một trang admin riêng tại `/admin` với nhiều tab quản lý. Chỉ 8 email được phép truy cập (hard-coded allowlist). Dữ liệu hiện đang lưu trong `localStorage` per-account (xem `src/lib/game.ts`, `src/lib/auth.ts`), nên admin sẽ:
- Đọc/ghi cấu hình toàn cục qua localStorage key chung (`vebinhso_admin_config`)
- Đọc danh sách tài khoản local (đã có sẵn ở `getAccounts()`)
- Cho phép chỉnh thông số game (giá, phần thưởng, level threshold, câu hỏi) → các route player sẽ đọc config này thay vì hằng số cứng

## Cấu trúc trang `/admin`
Sidebar dọc với các mục:

1. **Dashboard** — thống kê tổng quan
   - Tổng người chơi, đang online hôm nay
   - Tổng câu trả lời, tỉ lệ đúng TB
   - Thời gian online TB/ngày
   - Biểu đồ phân bố theo level + theo map (Recharts)

2. **Người chơi** — bảng tài khoản
   - Tìm kiếm theo username/email/ID
   - Xem chi tiết: level, 💰, 🏠, số câu đúng, streak, inventory
   - Hành động: khóa/mở, reset mật khẩu (random + show), tặng tiền, sửa số liệu
   - Hiển thị ID cứng (#1, #2, ...) đã có sẵn

3. **Admin** — quản lý quyền admin
   - Hiển thị 8 email mặc định
   - Thêm/xóa admin (lưu vào config)

4. **Câu hỏi** — thư viện câu hỏi
   - Liệt kê toàn bộ câu hỏi từ `src/game/questions.ts` (đã chuyển sang config động)
   - Thêm câu hỏi: text + 4 lựa chọn + đáp án + reward + (tùy chọn) URL hình ảnh đáp án
   - Sửa/Xóa từng câu
   - Import từ Google Sheets (paste URL → fetch CSV public)
   - Export ra JSON

5. **Cấp độ (Levels)** — chỉnh ngưỡng netWorth & câu hỏi cho từng cấp

6. **Giá cả** — quản lý giá shop (vật liệu, đồ nội thất, quyền năng, pet)
   - Bật/tắt hiển thị từng item ở shop

7. **Phần thưởng** — daily reward + sự kiện
   - Cấu hình phần thưởng đăng nhập hằng ngày
   - Bật/tắt sự kiện (thời tiết, festival)

8. **Nội dung người dùng** — duyệt tên nhà, ảnh nhà, xử lý báo cáo

9. **Phân bố map** — capacity từng map, cảnh báo quá tải

10. **Log hệ thống** — lịch sử admin actions

## Thay đổi kỹ thuật

### File mới
- `src/lib/admin.ts` — allowlist email, helper `isAdmin()`, load/save admin config
- `src/lib/adminConfig.ts` — schema cho config động (questions, prices, rewards, levels, flags) + default values
- `src/lib/adminStats.ts` — đọc toàn bộ localStorage game state, tính thống kê
- `src/routes/admin.tsx` — đổi thành layout với sidebar + outlet **HOẶC** giữ trang đơn với tabs (Tabs component)
- `src/components/admin/*` — các panel: Dashboard, Players, Questions, Prices, Rewards, Levels, AdminUsers, Content, MapBalance, Logs

### File sửa
- `src/routes/login.tsx` / nav: thêm nút "Admin" khi user thuộc allowlist
- `src/game/questions.ts`: đổi `QUESTIONS` thành getter đọc từ adminConfig (fallback default)
- `src/lib/game.ts`: `LEVEL_MIN_NETWORTH` / `LEVEL_MIN_QUESTIONS` đọc từ adminConfig
- `src/game/catalog.ts`: giá đọc từ adminConfig override
- `src/components/GameLayout.tsx`: thêm link Admin trong menu nếu `isAdmin()`

### Bảo mật
- Frontend-only check (vì hệ thống auth hiện là localStorage). `requireAdmin()` redirect `/` nếu email không thuộc allowlist.
- Lưu ý cho user: đây là phòng thủ client-side; sẽ cần Lovable Cloud + RLS để bảo mật thực sự sau này.

## Phạm vi lần này
Đây là phạm vi LỚN. Tôi sẽ build trong 1 lượt với cấu trúc đầy đủ nhưng một số panel sẽ ở mức MVP (giao diện + đọc/ghi config cơ bản), ưu tiên:
- Dashboard ✅ đầy đủ với chart
- Người chơi ✅ đầy đủ CRUD
- Admin ✅ allowlist + thêm/xóa
- Câu hỏi ✅ CRUD + import Google Sheet CSV
- Giá cả ✅ chỉnh + toggle
- Cấp độ ✅ chỉnh ngưỡng
- Phần thưởng ✅ chỉnh daily
- Nội dung / Map balance / Logs: khung UI, dữ liệu mẫu

Sau khi xong, bạn có thể yêu cầu hoàn thiện sâu từng phần.
