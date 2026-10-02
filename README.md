# VỆ BINH SỐ

Nền tảng học **an toàn số** dành cho học sinh khoảng **10–16 tuổi**, kết hợp trò chơi 3D, kịch bản nhập vai và bộ công cụ kiểm tra nội dung nghi ngờ giả mạo / lộ thông tin cá nhân.

- Chạy trực tiếp tại: **https://vebinhso.vn** (bản publish: `https://vebinhso.lovable.app`)
- Giao diện song ngữ **Việt / Anh**, người dùng chọn ngôn ngữ ngay trên màn hình.
- Toàn bộ nội dung dưới đây được tổng hợp từ mã nguồn thật của dự án.

---

## Tính năng chính

### Hai thế giới 3D
| Thế giới | Đường dẫn | Nội dung |
| --- | --- | --- |
| Nhà / Phố Hội An | `/game` | Lô nhà của người chơi, phố cổ Hội An (nhà vàng mái nâu, đèn lồng, cột điện, biển tên đường), sông Hội An với quiz "Đúng cả 7/7 câu = 1 hoa đăng", viết lời ước và thả đèn sen trôi trên sông. |
| Lâu đài Ma thuật | `/magic` | Lâu đài phù thủy gồm 5 phòng, câu hỏi – quyền năng – phần thưởng. |

Ngoài ra còn `friends-map` (bản đồ nhà bạn bè, mỗi bạn một vị trí cố định) và `visit.$ownerId` (vào xem nhà người khác theo quyền: Công khai / Bạn bè / Giới hạn / Khóa cửa).

### Trung tâm kiểm tra nguy hiểm số — 9 công cụ (`/ai`)
Mỗi công cụ là một hàm server riêng trong `src/lib/ai-detect.functions.ts`:

1. Tin tức giả (`analyzeNews`)
2. Ảnh do AI tạo (`analyzeImage`)
3. Video do AI tạo (`analyzeVideo`)
4. Link giả mạo (`analyzeLink`)
5. Email giả mạo (`analyzeEmail`)
6. Văn bản do AI viết (`analyzeText`)
7. Số điện thoại lạ (`analyzePhone`)
8. Lộ thông tin qua ảnh/video (`analyzePrivacyMedia`)
9. Lộ thông tin qua chữ (`analyzePrivacyText`)

Kết quả được **đối chéo hai mô hình** (sai số tối đa 5%) và người chơi đánh giá 👍/👎 cho 7 bài kiểm tra đầu. Phần "Rủi ro lộ thông tin" có thêm công cụ mô phỏng mạng xã hội (`SocialSimulator`).

### 5 bài nhập vai (`/roleplay`)
1. Bài 1 — *Alo, cảnh sát đây!* (`/roleplay/scam-police`)
2. Bài 2 — *Gợi nhớ từ Cá voi xanh* (`/roleplay/ke-giau-mat`)
3. Bài 3 — *Một cú bấm vì bạn* (`/roleplay/mot-cu-bam`)
4. Bài 4 — *Món quà đắt nhất* (`/roleplay/iphone-email`)
5. Bài 5 — *Ba vé liền kề* (`/roleplay/ba-ve-lien-ke`)

Kịch bản dùng hình minh hoạ 2D tỷ lệ 16:9, thoại **tiếng Việt** (TTS), phụ đề **tiếng Anh**, người chơi được quyền chuyển cảnh thủ công. *Bài 6 · Làm việc cùng AI* đã có trong danh sách nhưng chưa mở chơi.*

### Khu lớp học cho giáo viên (`/classroom`)
- Tạo lớp, lấy **mã lớp**, duyệt/từ chối đơn xin vào lớp, xoá học sinh.
- Đăng **thông báo / bài tập** (văn bản, ảnh, tệp), theo dõi bài nộp của học sinh.
- Thống kê câu trả lời của từng học sinh, câu hỏi do giáo viên tự soạn (nhập CSV/JSON).
- Quản lý **sự đồng ý của phụ huynh** (`/phu-huynh/dong-y`) cho việc đính kèm nội dung kiểm tra.

### 6 skill AI quản lý qua trang admin (`/admin`, tab "Skill AI")
`vbs-bao-gia`, `vbs-hinh-anh-ai`, `vbs-video-ai`, `vbs-link-email-gia`, `vbs-van-ban-ai`, `vbs-so-dien-thoai-gia`.

Skill là tệp Markdown có frontmatter, lưu trong bảng `ai_skills`, được ghép vào prompt của 7 bài kiểm tra. Việc ghép nào dùng skill nào nằm ở bảng `ai_check_skill`, nên quản trị viên đổi mà không cần sửa code; bật/tắt có hiệu lực trong vòng 1 phút.

### Các khu khác
Trang chủ `/`, đăng nhập `/login`, tạo & thay đổi nhân vật `/character` (tóc, ngoại hình, áo, quần, giày, phụ kiện), cửa hàng `/shop`, túi đồ `/inventory`, tiện ích `/missions`, quyền năng `/pets`, xếp hạng `/ranking`, trò chuyện `/chat`, sự kiện `/events`, đấu 1vs1 (`DuelRoom`), hướng dẫn `/tutorial`, trang quản trị `/admin`.

---

## Công nghệ

- **Giao diện:** React 19, TanStack Start v1 (`@tanstack/react-start` 1.168.x, `@tanstack/react-router` 1.170.x), TanStack Query 5, shadcn/ui + Radix, Sonner.
- **3D:** Three.js 0.184 với `@react-three/fiber` 9 và `@react-three/drei` 10.
- **Kiểu chữ / kiểu dáng:** Tailwind CSS v4 (cấu hình qua `src/styles.css`, không dùng `tailwind.config.js`).
- **Dữ liệu & tài khoản:** Supabase (`@supabase/supabase-js` 2.x) — bảng, quyền RLS và migration nằm trong `supabase/migrations` (63 tệp).
- **AI:** Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1`), các mô hình đang dùng trong mã:
  - `google/gemini-3.5-flash` — mô hình chính của 9 bài kiểm tra
  - `openai/gpt-5.6-terra` — mô hình đối chéo
  - `google/gemini-3.1-flash-lite` — tạo bài giảng, gợi ý ghi chú
  - `google/gemini-2.5-flash` — phối màu trang phục
  - `google/gemini-3.1-flash-tts-preview` — đọc thoại nhập vai
- **Build & phân phối:** Vite 7, `@cloudflare/vite-plugin` + `wrangler.jsonc` (môi trường Worker, `nodejs_compat`), Nitro.
- **Kiểm thử / chất lượng:** Vitest (`src/lib/*.test.ts`), ESLint, Prettier.
- **Trình quản lý gói:** Bun (`bun.lock`).

---

## Chạy local

Yêu cầu: **Bun** và Git.

```bash
bun install
bun run dev
```

Mở địa chỉ mà terminal in ra (mặc định `http://localhost:5173`; trong môi trường Lovable là cổng 8080).

### Biến môi trường
Tạo tệp `.env` ở thư mục gốc. Các giá trị này do Lovable Cloud cấp cho dự án.

| Biến | Dùng ở | Tác dụng |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | trình duyệt | Địa chỉ backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | trình duyệt | Khoá công khai để truy cập dữ liệu |
| `VITE_SUPABASE_PROJECT_ID` | trình duyệt | Mã dự án |
| `SUPABASE_URL` | server | Địa chỉ backend phía server |
| `SUPABASE_PUBLISHABLE_KEY` | server | Khoá công khai phía server |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Khoá đặc quyền, chỉ dùng trong server function |
| `LOVABLE_API_KEY` | server | Khoá gọi Lovable AI Gateway (thiếu thì tính năng AI báo "AI chưa được cấu hình") |

`VITE_*` được nhúng vào mã trình duyệt, vì vậy **không** đặt dữ liệu bí mật vào các biến này.

### Lệnh hữu ích
```bash
bun run build      # build bản production
bun run build:dev  # build ở chế độ development
bun run preview    # chạy bản đã build
bun run lint       # ESLint
bun run format     # Prettier
bunx vitest run src/lib   # chạy các bài kiểm thử
```

---

## Cấu trúc thư mục

```
src/
  routes/           # mỗi tệp = một trang (file-based routing của TanStack Router)
  lib/              # logic, server function, dữ liệu kịch bản, tiện ích
  components/       # thành phần giao diện dùng chung
  game/             # cảnh 3D, mô hình, catalog vật phẩm, câu hỏi
  integrations/     # client Supabase (sinh tự động, không sửa tay)
  styles.css        # chủ đề màu / font (Tailwind v4)
supabase/migrations/  # lịch sử thay đổi cơ sở dữ liệu
public/             # tệp tĩnh (mô hình .glb, .png…)
```

### `src/routes`
- `__root.tsx` — khung chung: đầu trang, chuyển ngôn ngữ VI/EN, cài đặt, âm thanh, thông báo.
- `index.tsx` — trang chủ (hồ sơ, xu, cấp độ, cửa hàng, xếp hạng, hướng dẫn, khảo sát, lời mời kết bạn).
- `game.tsx`, `magic.tsx` — hai thế giới 3D; `friends-map.tsx`, `visit.$ownerId.tsx` — nhà bạn bè.
- `ai.tsx` — Trung tâm kiểm tra nguy hiểm số; `experience.tsx` — trang Trải nghiệm (Explore) dẫn vào các khu chơi.
- `roleplay.*.tsx` — trang chọn bài và 5 bài nhập vai.
- `classroom.tsx` — khu lớp học; `admin.tsx` — trang quản trị (13 tab: tổng quan, người chơi, quản trị viên, giáo viên, câu hỏi, cấp độ, giá cả, phần thưởng, nội dung, khu vực, vật phẩm map, Skill AI, nhật ký).
- `character.tsx`, `shop.tsx`, `inventory.tsx`, `missions.tsx`, `pets.tsx`, `ranking.tsx`, `chat.tsx`, `events.tsx`, `tutorial.tsx` — các khu còn lại.
- `login.tsx`, `verify.tsx`, `reset-password.tsx`, `auth.callback.tsx`, `phu-huynh.dong-y.tsx` — tài khoản và sự đồng ý phụ huynh.
- `mcp.ts`, `[.]mcp/`, `[.]well-known/`, `[.]lovable.oauth.consent.tsx` — endpoints MCP và OAuth.
- `project-code-guide.tsx` — tài liệu tham khảo mã nguồn ngay trong ứng dụng.

### `src/lib`
- `ai-detect.functions.ts` — 9 bài kiểm tra AI; `ai-feedback.functions.ts` — phản hồi 👍/👎, quyền phụ huynh; `ai-signals.ts` — chuẩn hoá tên miền / đầu số.
- `ai-skills.ts`, `ai-skills.server.ts`, `ai-skills-admin.ts` — nạp, cắt ghép và quản lý skill.
- `tts.functions.ts` (đọc thoại), `ai-lesson.functions.ts` + `ai-lesson.server.ts` (bài giảng), `ai-note.functions.ts` (ghi chú), `ai.functions.ts` (phối màu trang phục).
- `duels.functions.ts`, `friend-houses.functions.ts` — đấu 1vs1 và nhà bạn bè.
- `teacher.ts`, `classroom-posts.ts`, `class-annotations.ts` — lớp học, bài đăng, chú thích.
- `film-*.ts` — lời thoại và dữ liệu 5 kịch bản; `caption-engine.ts` — phụ đề; `roleplay-rewards.ts` — thưởng.
- `character.ts`, `hair.ts`, `clothes.ts`, `accessories.ts`, `appearance.ts`, `paint-mix.ts` — nhân vật và phối màu.
- `game.ts`, `powers.ts`, `worldPickups.ts`, `world-toggles.ts` — luật chơi, quyền năng, vật phẩm rơi trên map.
- `locale.ts`, `roleplay-ui-en.ts`, `strict-english.generated.ts` — tiếng Việt/Anh; `session.ts`, `auth.ts`, `claims.ts` — phiên và vai trò.
- `*.test.ts` — bài kiểm thử (Vitest).

Quy ước: tệp `*.functions.ts` là hàm server gọi từ giao diện; tệp `*.server.ts` chỉ chạy phía server.

### `src/components`
- Bộ chọn nhân vật: `HairPicker`, `AccessoryPicker`, `AppearancePicker`, `ClothesPicker` (+ SVG 2D tương ứng).
- Lớp học & nội dung: `ClassroomPanel`, `RichTextEditor`, `AnnotatedImagePanel`, `AiMaterialPanel`, `FinalLessonQuiz`, `FilmSummaryBoard`.
- AI: `CheckFeedback`, `SkillFeedbackBlocks`, `SocialSimulator`, `SkillsPanel`.
- Nhà cửa: `HouseAccessSettings`, `DuelRoom`, `DuelController`.
- Chung: `GameLayout`, `SettingsPanel`, `LanguageToggle`, `SavedToast`, `RouteLoading`, `LoadingPercent`, `StrictEnglishGuard`, và thư mục `ui/` (thành phần shadcn).

### `supabase/migrations`
63 tệp SQL theo mốc thời gian, mô tả từng lần thay đổi cấu trúc dữ liệu: tài khoản & vai trò, tiến trình chơi, vật phẩm & giá, câu hỏi, lớp học và bài nộp, `ai_skills` / `ai_check_skill` / `ai_skill_versions`, `ai_check_feedback`, `ai_signal_domains`, `ai_signal_phone_prefixes`, `parent_consents`.

---

## Ghi chú khi đóng góp
- `src/integrations/supabase/*`, `src/routeTree.gen.ts` và `.env` được sinh tự động — không sửa tay.
- Các quyết định kiến trúc quan trọng được ghi ở `AGENTS.md`; danh sách việc đang làm ở `roadmap.md`.
