import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GameLayout } from "@/components/GameLayout";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/tutorial")({
  head: () => ({
    meta: [
      { title: "Hướng dẫn người chơi | VỆ BINH SỐ" },
      { name: "description", content: "Hướng dẫn đầy đủ cách chơi, xây nhà, học tập và khám phá VỆ BINH SỐ." },
      { property: "og:title", content: "Hướng dẫn người chơi | VỆ BINH SỐ" },
      { property: "og:description", content: "Hướng dẫn đầy đủ cách chơi, xây nhà, học tập và khám phá VỆ BINH SỐ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tutorial,
});

type Copy = { vi: string; en: string };
type Section = { title: Copy; icon: string; steps: Array<{ h: Copy; p: Copy }> };

const c = (vi: string, en: string): Copy => ({ vi, en });
const step = (hVi: string, hEn: string, pVi: string, pEn: string) => ({ h: c(hVi, hEn), p: c(pVi, pEn) });

const SECTIONS: Section[] = [
  {
    title: c("Bắt đầu và cài đặt", "Getting started and settings"), icon: "🚀",
    steps: [
      step("Đăng nhập lần đầu", "First sign-in", "Đăng nhập xong, bạn sẽ được đưa đến trang tạo nhân vật nếu tài khoản chưa có trang phục đã lưu. Các lần đăng nhập sau sẽ vào thẳng trang chính.", "After signing in, you will create a character only if the account has no saved outfit. Later sign-ins go straight to the home page."),
      step("Tạo và lưu nhân vật", "Create and save your character", "Chọn ngoại hình, tóc và trang phục rồi bấm Lưu. Hãy lưu trước khi vào bản đồ; diện mạo được gắn với tài khoản để dùng trên thiết bị khác.", "Choose appearance, hair, and clothes, then select Save. Your look is linked to your account for use on other devices."),
      step("Chọn khu vực", "Choose an activity", "Bấm Trải nghiệm để mở Trung tâm kiểm tra nguy hiểm số, hoặc Chơi ngay để chọn Bản đồ nhà, Lâu đài Ma thuật hay Nhập vai tình huống.", "Select Explore to open Security check, or Play now to choose Home Map, Magic Castle, or Interactive Stories."),
      step("Ngôn ngữ, âm thanh và va chạm", "Language, sound, and collision", "Mở ⚙️ để đổi Việt/Anh, bật tắt âm thanh, chỉnh âm lượng và chọn nhân vật bị cản bởi đồ vật hay có thể đi xuyên qua.", "Open ⚙️ to switch Vietnamese/English, adjust sound, and choose whether furniture blocks your character."),
    ],
  },
  {
    title: c("Trang chính", "Home page"), icon: "🏡",
    steps: [
      step("Thông tin tài khoản", "Account status", "Góc trên hiển thị tên, chuỗi ngày hoạt động, số xu, cấp độ và tài sản nhà. Bấm bút chì cạnh tên để đổi tên.", "The top area shows your name, activity streak, coins, level, and home value. Select the pencil beside your name to rename."),
      step("Các lối tắt", "Main shortcuts", "Cửa hàng dùng để mua đồ; Xếp hạng để so thành tích; Tiện ích để nhận nhiệm vụ; Quyền năng để quản lý thẻ; Lớp học để vào lớp của giáo viên.", "Use Shop to buy items, Rankings to compare progress, Tools for missions, Powers for cards, and Classroom for teacher activities."),
      step("Trò chuyện, chụp ảnh và khảo sát", "Chat, screenshots, and survey", "Bạn có thể trò chuyện với bạn bè, chụp lại màn hình trò chơi và mở Khảo sát để gửi góp ý.", "You can chat with friends, capture the game screen, and open the Survey to share feedback."),
    ],
  },
  {
    title: c("Kiếm xu, nhiệm vụ và lên cấp", "Coins, missions, and levels"), icon: "💰",
    steps: [
      step("Trả lời câu hỏi", "Answer questions", "Mở mục kiếm tiền trong bản đồ. Câu đúng tăng xu, tổng câu đúng và chuỗi trả lời; câu sai sẽ đặt lại chuỗi.", "Open the earning activity on the map. Correct answers increase coins, correct-answer total, and streak; a wrong answer resets the streak."),
      step("Xu và chướng ngại trên đường", "Street pickups and hazards", "Đi quanh bản đồ để nhặt xu xuất hiện hằng ngày. Nếu gặp bom, hãy hoàn thành thử thách câu hỏi để vô hiệu hóa.", "Walk around the map to collect daily coins. If you hit a bomb, complete its question challenge to disarm it."),
      step("Tiện ích và phần thưởng", "Tools and rewards", "Mở Tiện ích để xem nhiệm vụ hằng ngày, hằng tuần và phần thưởng theo mốc. Nhận thưởng khi đã đạt điều kiện.", "Open Tools to view daily, weekly, and milestone tasks. Claim rewards after meeting their requirements."),
      step("Lên cấp", "Level up", "Cấp độ dựa trên cả tài sản ròng và tổng số câu đúng. Cấp cao hơn mở quyền xây thêm tầng và nội dung mới.", "Your level depends on both net worth and total correct answers. Higher levels unlock more floors and content."),
    ],
  },
  {
    title: c("Bản đồ nhà Hội An", "Hội An Home Map"), icon: "🗺️",
    steps: [
      step("Màn hình Bản đồ", "Map overview", "Khi vào, bạn nhìn khu phố từ trên cao. Chọn Bản đồ để quay lại toàn cảnh, Sửa nhà để xây, hoặc Xem nhà để đi bộ khám phá.", "You begin with an overhead town view. Choose Map for the overview, Edit to build, or Explore to walk around."),
      step("Điều khiển khám phá", "Explore controls", "Trên máy tính dùng WASD và chuột; trên điện thoại dùng cần điều khiển. Có các góc nhìn Mắt, Tự do, Trên cao, Mặt trước và Toàn cảnh.", "On desktop use WASD and the mouse; on mobile use touch controls. Views include Eye, Free, Top, Front, and Wide."),
      step("Khi nhân vật tự di chuyển", "If movement gets stuck", "Thả các phím WASD, bấm lại vào khung chơi rồi di chuyển tiếp. Khi chuyển tab, bấm chuột phải hoặc nhập chữ, trò chơi tự ngắt lệnh di chuyển cũ.", "Release WASD, select the game area again, and continue. Switching tabs, right-clicking, or typing clears old movement input."),
      step("Chế độ Sửa nhà", "Edit mode", "Khi sửa, các nhà xung quanh được ẩn để dễ thao tác. Chỉ các công cụ xây dựng và vật của nhà bạn được chỉnh sửa.", "Nearby houses are hidden while editing so you can work clearly. Only your home and building tools remain editable."),
    ],
  },
  {
    title: c("Mua đồ và xây nhà", "Shopping and building"), icon: "🧱",
    steps: [
      step("Cửa hàng và kho đồ", "Shop and inventory", "Mua nội thất, cột, gạch, bê tông, mái, sơn và vật trang trí bằng xu. Đồ đã mua xuất hiện trong kho để chọn và đặt.", "Buy furniture, columns, bricks, concrete, roofing, paint, and decorations with coins. Purchased items appear in your inventory."),
      step("Đặt và chỉnh đồ", "Place and edit items", "Chọn vật rồi bấm vị trí muốn đặt. Bấm vào vật đã đặt để xoay, di chuyển hoặc gỡ; dùng Hoàn tác nếu vừa thao tác nhầm.", "Choose an item and select where to place it. Select a placed item to rotate, move, or remove it; use Undo after a mistake."),
      step("Tường, sàn và mái", "Walls, floors, and roofs", "Đặt các cột làm mốc. Nối hai cột để xây tường; chọn bốn góc để làm sàn hoặc mái. Công trình dùng đúng số vật liệu trong kho.", "Place columns as anchors. Join two columns for a wall; select four corners for a floor or roof. Construction consumes inventory materials."),
      step("Xây nhiều tầng", "Build multiple floors", "Phải có sàn đỡ trước khi xây tầng trên. Tầng 1 mở ở cấp 3, tầng 2 ở cấp 10 và tầng 3 ở cấp 18.", "A supporting floor is required before building above. Floor 1 unlocks at level 3, floor 2 at level 10, and floor 3 at level 18."),
      step("Cửa và cửa sổ", "Doors and windows", "Hãy xây tường trước, chọn cửa hoặc cửa sổ rồi bấm trực tiếp lên tường. Vật sẽ tự bám theo góc tường và tạo khoảng mở phù hợp.", "Build a wall first, choose a door or window, then select the wall. It aligns to the wall angle and creates a matching opening."),
      step("Sơn và pha màu", "Paint and mix colors", "Mua xô sơn rồi chọn Đổi màu tường. Mỗi lần đổ tốn 30 xu; đổ màu mới lên màu cũ sẽ pha theo hệ RYB, còn màu trắng giúp làm sáng hoặc đặt lại màu.", "Buy paint buckets and choose Wall color. Each pour costs 30 coins; a new color mixes with the old one using RYB, while white lightens or resets it."),
      step("Biển tên nhà", "Home sign", "Mua và đặt biển tên trước nhà, sau đó bấm vào biển để nhập tên muốn hiển thị.", "Buy and place a sign outside your home, then select it to enter the displayed name."),
    ],
  },
  {
    title: c("Trang trí nâng cao", "Advanced decorating"), icon: "🛋️",
    steps: [
      step("Gắn đồ lên tường", "Attach items to walls", "Chọn vật phù hợp rồi bấm vào tường để gắn. Khi chỉnh vật trên tường, kéo thanh Độ cao để đưa vật gần sàn hoặc gần trần.", "Choose a suitable item and select a wall to attach it. Use the Height slider to move it closer to the floor or ceiling."),
      step("Gắn đồ lên trần", "Attach items to ceilings", "Bật Gắn trần trước khi đặt đèn hoặc vật trang trí cần nằm sát trần; tắt chế độ này để đặt bình thường.", "Turn on Ceiling before placing lights or decorations against the ceiling; turn it off for normal placement."),
      step("Đặt chồng đồ", "Stack items", "Đưa vật đến gần một vật khác rồi mở khung Chỉnh và bấm Đặt lên. Bấm Xuống sàn khi muốn bỏ chồng.", "Move an item near another item, open Edit, and choose Place on. Choose To floor to remove it from the stack."),
    ],
  },
  {
    title: c("Khu phố và nhà bạn bè", "Town and friends' homes"), icon: "🫂",
    steps: [
      step("Kết bạn", "Add friends", "Ở trang chính, tìm đúng tên đăng nhập để gửi lời mời. Lời mời đến có thể được đồng ý hoặc từ chối trong danh sách Bạn bè online.", "Search an exact username on the home page to send a request. Accept or decline incoming requests in Online Friends."),
      step("Nhà trên bản đồ chung", "Homes on the shared map", "Mỗi người bạn giữ một vị trí cố định trên bản đồ của bạn. Nhà chưa xây sẽ hiện thành nhà Hội An mẫu; biển phát sáng phía trên giúp nhận ra chủ nhà.", "Each friend keeps a fixed location on your map. An unbuilt home appears as a default Hội An house, with a glowing owner label above it."),
      step("Tìm và xem nhà", "Find and visit homes", "Mở Bản đồ bạn bè hoặc tìm tài khoản. Bạn có thể bấm biển Nhà của… để xem; nhà công khai cho phép người chơi đã đăng nhập ghé thăm.", "Open Friends Map or search for an account. Select the Home of… sign to visit; public homes allow signed-in players to enter."),
      step("Quyền vào nhà", "Home access", "Mở nút khóa để chọn Công khai, Bạn bè, Giới hạn theo danh sách, hoặc Khóa cửa. Nhớ bấm Lưu sau khi đổi.", "Open the lock control and choose Public, Friends, Limited list, or Lock door. Save after changing access."),
      step("Khung xem nhà riêng", "Private viewing scene", "Khi xem một nhà riêng, các nhà lân cận được ẩn; dây điện, đèn lồng, biển đường và sông vẫn còn để giữ cảnh phố Hội An.", "When viewing one home, nearby houses are hidden while power lines, lanterns, street signs, and the river remain."),
    ],
  },
  {
    title: c("Sông Hội An và hoa đăng", "Hội An river and lanterns"), icon: "🏮",
    steps: [
      step("Nhận hoa đăng", "Earn a lantern", "Đến gần bảng Thử thách hoa đăng ở bờ sông và trả lời đúng cả 7/7 câu để nhận 1 hoa đăng.", "Approach the Lantern challenge board by the river and answer all 7/7 questions correctly to earn one lantern."),
      step("Viết lời ước", "Write a wish", "Vào chế độ Xem nhà, bấm mặt sông và nhập lời ước tối đa 120 ký tự. Có thể để trống rồi bấm Thả hoa đăng.", "Enter Explore mode, select the river, and write a wish of up to 120 characters. You may leave it blank before releasing."),
      step("Xem lời ước", "Read a wish", "Nhân vật sẽ quỳ thả đèn, sau đó đèn trôi chậm trên sông. Bấm vào đèn đã thả để hiện hoặc ẩn lời ước.", "Your character kneels to release the lantern, which drifts slowly. Select a released lantern to show or hide its wish."),
    ],
  },
  {
    title: c("Thi đấu 1vs1", "1v1 challenges"), icon: "⚔️",
    steps: [
      step("Mời bạn đấu", "Invite a friend", "Khi hai người ở cùng khu vực nhà, mở khung thi đấu và gửi lời mời. Người nhận có thể chấp nhận hoặc từ chối.", "When two players are in the same home area, open the challenge panel and send an invite. The other player can accept or decline."),
      step("Chọn trận", "Set up a match", "Chủ phòng chọn chủ đề và số câu. Sau đếm ngược, hai người trả lời cùng bộ câu hỏi trong thời gian giới hạn.", "The host chooses a topic and question count. After the countdown, both players answer the same timed questions."),
      step("Kết quả", "Results", "Điểm và tốc độ quyết định kết quả; màn hình cuối hiển thị tỉ số và phần xu thay đổi.", "Score and speed determine the result; the final screen shows the score and coin change."),
    ],
  },
  {
    title: c("Lâu đài, quyền năng và sự kiện", "Castle, powers, and events"), icon: "🏰",
    steps: [
      step("Mười cánh cửa", "Ten doors", "Trong Lâu đài Ma thuật, đi lần lượt qua 10 cửa, giải câu hỏi và thử thách của từng phòng để mở đường tiếp theo.", "In Magic Castle, pass through ten doors and solve each room's question or challenge to continue."),
      step("Khu vực 2 và boss", "Stage 2 and boss", "Qua hành lang đúng lúc, khám phá bốn phòng, nhặt khiên và dùng nút khiên để đỡ đòn trong trận boss.", "Cross the corridor in time, explore four rooms, collect the shield, and use its button during the boss fight."),
      step("Lưu tiến trình", "Saved progress", "Cửa đã qua, xu và vật phẩm quan trọng được giữ lại khi rời bản đồ để bạn tiếp tục ở lần sau.", "Cleared doors, coins, and important items are saved when you leave so you can continue later."),
      step("Quyền năng và sự kiện", "Powers and events", "Mua, kích hoạt hoặc bán lại thẻ quyền năng; một số thẻ tạo hiệu ứng thời tiết trong bản đồ nhà. Kiểm tra Tiện ích để xem nhiệm vụ và phần thưởng hiện có.", "Buy, activate, or resell power cards; some affect Home Map weather. Check Tools for current missions and rewards."),
    ],
  },
  {
    title: c("Nhập vai tình huống", "Interactive stories"), icon: "🎭",
    steps: [
      step("Chọn kịch bản", "Choose a scenario", "Mỗi thẻ cho biết chủ đề, trạng thái sẵn sàng và thưởng lần đầu. Bấm kịch bản để bắt đầu.", "Each card shows its topic, availability, and first-start reward. Select a scenario to begin."),
      step("Thoại và phụ đề", "Voice and subtitles", "Nhân vật đọc nguyên thoại tiếng Việt ngay khi vào cảnh. Khi giao diện ở chế độ English, bạn vẫn nghe tiếng Việt và đọc phụ đề tiếng Anh.", "Characters speak the original Vietnamese line as a scene begins. In English mode, Vietnamese audio remains with English subtitles."),
      step("Lựa chọn và chuyển cảnh", "Choices and scene control", "Chọn cách xử lý khi câu chuyện đưa ra quyết định. Bạn có thể để phim tự chuyển sau khi đọc hết hoặc bấm Chuyển cảnh để đi tiếp thủ công.", "Choose how to respond at decision points. Let the story advance after speech finishes, or use Skip to next scene manually."),
      step("Kết thúc và chơi lại", "Ending and replay", "Cuối nhánh truyện có bài học và phần ghi nhớ. Bạn có thể chơi lại từ đầu hoặc quay lại thử lựa chọn khác.", "Each ending includes a lesson and takeaways. Replay from the start or go back to try another choice."),
    ],
  },
  {
    title: c("Trung tâm kiểm tra nguy hiểm số", "Security check"), icon: "🛡️",
    steps: [
      step("Kiểm tra thật – giả", "Authenticity checks", "Chọn loại cần kiểm tra: tin tức, ảnh/video, liên kết/email, văn bản hoặc số điện thoại. Dán nội dung hay tải tệp rồi chạy kiểm tra.", "Choose news, image/video, link/email, text, or phone number. Paste content or upload a file, then run the check."),
      step("Đọc kết quả", "Read the result", "Xem tỷ lệ rủi ro, kết luận, lập luận, dấu hiệu và cách tự kiểm chứng. Đây là gợi ý hỗ trợ, không thay thế việc kiểm tra từ nguồn đáng tin cậy.", "Review the risk score, conclusion, reasoning, signals, and verification steps. Results support judgment but do not replace trusted sources."),
      step("Rủi ro lộ thông tin", "Privacy risks", "Dùng công cụ truyền thống hoặc Mô phỏng Mạng xã hội để kiểm tra ảnh, video và bài viết trước khi đăng công khai.", "Use classic tools or the Social media simulator to scan images, videos, and posts before sharing publicly."),
      step("Gửi phản hồi an toàn", "Send safe feedback", "Bấm 👍 hoặc 👎 để đánh giá kết quả. Học sinh chỉ đính kèm nội dung khi có đồng ý phù hợp và tự chọn cho lần gửi; email, số điện thoại và số định danh sẽ được che.", "Use 👍 or 👎 to rate a result. Student attachments require consent and per-submission opt-in; emails, phone numbers, and ID numbers are hidden."),
    ],
  },
  {
    title: c("Lớp học", "Classroom"), icon: "🎓",
    steps: [
      step("Tham gia bằng mã lớp", "Join with a class code", "Bấm Lớp học ở trang chính, nhập đúng mã giáo viên cung cấp và xác nhận. Các lớp đã tham gia sẽ xuất hiện trong danh sách của bạn.", "Select Classroom on the home page, enter the teacher's class code, and confirm. Joined classes appear in your list."),
      step("Thông báo và bài đăng", "Announcements and posts", "Dấu chấm xanh báo có nội dung mới. Mở lớp để xem bài đăng, nội dung định dạng, tệp hoặc liên kết giáo viên chia sẻ.", "A green dot marks new content. Open the class to view formatted posts, files, or links shared by the teacher."),
      step("Câu hỏi và bài tập", "Questions and assignments", "Làm câu hỏi ưu tiên hoặc bài tập của đúng lớp. Nội dung giáo viên tạo được giữ nguyên ngôn ngữ gốc và không tự dịch.", "Complete priority questions or assignments for the correct class. Teacher-created content stays in its original language and is not auto-translated."),
    ],
  },
  {
    title: c("Nhân vật và trang phục", "Character and outfits"), icon: "🎨",
    steps: [
      step("Ngoại hình", "Appearance", "Chỉnh màu da, dáng mặt, cảm xúc, dáng người, kiểu tóc và màu tóc. Lần tạo đầu có các lựa chọn miễn phí theo hướng dẫn trên màn hình.", "Adjust skin tone, face shape, expression, body shape, hairstyle, and hair color. First-time options follow the prices shown on screen."),
      step("Quần áo và phụ kiện", "Clothes and accessories", "Chọn áo, quần hoặc váy, giày và phụ kiện. Món đã mua có thể mặc, tháo và dùng lại mà không phải mua lần nữa.", "Choose tops, trousers or skirts, shoes, and accessories. Purchased items can be worn, removed, and reused without repurchasing."),
      step("Xem và lưu", "Preview and save", "Kéo để xoay nhân vật 3D và xem toàn bộ trang phục. Bấm Lưu để ghi lại tóc, ngoại hình, quần áo, giày và phụ kiện đang chọn vào tài khoản.", "Rotate the 3D character to inspect the outfit. Select Save to store the current hair, appearance, clothes, shoes, and accessories to your account."),
    ],
  },
];

function Tutorial() {
  const en = useLocale() === "en";
  const [open, setOpen] = useState<Set<number>>(new Set([0]));
  const [query, setQuery] = useState("");
  const tr = (copy: Copy) => en ? copy.en : copy.vi;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(en ? "en" : "vi");
    if (!needle) return SECTIONS.map((section, index) => ({ section, index }));
    return SECTIONS.map((section, index) => ({ section, index })).filter(({ section }) =>
      [tr(section.title), ...section.steps.flatMap((item) => [tr(item.h), tr(item.p)])]
        .some((text) => text.toLocaleLowerCase(en ? "en" : "vi").includes(needle)),
    );
  }, [en, query]);

  const allVisibleOpen = filtered.length > 0 && filtered.every(({ index }) => open.has(index));
  const toggleAll = () => setOpen(allVisibleOpen ? new Set() : new Set(filtered.map(({ index }) => index)));

  return (
    <GameLayout showBack>
      <main className="w-full max-w-4xl mx-auto px-3 pb-10 pt-16 sm:px-6 sm:pt-20">
        <section className="glass-card p-4 sm:p-6">
          <header className="mb-5 text-center">
            <BookOpen className="mx-auto mb-2 h-10 w-10 text-primary" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-black">{en ? "PLAYER GUIDE" : "HƯỚNG DẪN NGƯỜI CHƠI"}</h1>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              {en ? "Find everything you need to play, build, learn, and explore." : "Tìm nhanh mọi cách chơi, xây dựng, học tập và khám phá."}
            </p>
          </header>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">{en ? "Search the guide" : "Tìm trong hướng dẫn"}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={en ? "Search: lanterns, building, classroom…" : "Tìm: hoa đăng, xây nhà, lớp học…"}
                className="h-10 w-full rounded-md border-2 border-border bg-background pl-9 pr-10 text-sm font-bold outline-none focus:border-primary"
              />
              {query && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setQuery("")} className="absolute right-0.5 top-0.5" aria-label={en ? "Clear search" : "Xóa tìm kiếm"}>
                  <X aria-hidden="true" />
                </Button>
              )}
            </label>
            <Button type="button" variant="outline" onClick={toggleAll} className="h-10 font-black">
              {allVisibleOpen ? <ChevronsDownUp aria-hidden="true" /> : <ChevronsUpDown aria-hidden="true" />}
              {allVisibleOpen ? (en ? "Collapse all" : "Thu gọn") : (en ? "Expand all" : "Mở tất cả")}
            </Button>
          </div>

          <p className="mb-3 text-xs font-bold text-muted-foreground">
            {en ? `${filtered.length} topics` : `${filtered.length} chủ đề`}
          </p>

          <div className="flex flex-col gap-2">
            {filtered.map(({ section, index }) => {
              const isOpen = open.has(index) || query.trim().length > 0;
              const panelId = `guide-section-${index}`;
              return (
                <article key={tr(section.title)} className="overflow-hidden rounded-md border-2 border-border bg-card">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen((current) => {
                      const next = new Set(current);
                      if (next.has(index)) next.delete(index); else next.add(index);
                      return next;
                    })}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="h-auto min-h-14 w-full justify-between whitespace-normal rounded-none px-3 py-3 text-left hover:bg-muted sm:px-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="text-xl" aria-hidden="true">{section.icon}</span>
                      <span className="font-black">{tr(section.title)}</span>
                    </span>
                    {isOpen ? <ChevronDown className="shrink-0 text-primary" aria-hidden="true" /> : <ChevronRight className="shrink-0 text-primary" aria-hidden="true" />}
                  </Button>
                  {isOpen && (
                    <div id={panelId} className="border-t-2 border-border bg-muted/40 p-3 sm:p-4">
                      <ol className="grid gap-2 md:grid-cols-2">
                        {section.steps.map((item, itemIndex) => (
                          <li key={tr(item.h)} className="rounded-md border border-border bg-background p-3">
                            <h2 className="text-sm font-black text-primary">{itemIndex + 1}. {tr(item.h)}</h2>
                            <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground/80">{tr(item.p)}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="rounded-md border-2 border-dashed border-border p-8 text-center">
              <p className="font-black">{en ? "No matching guide found." : "Không tìm thấy hướng dẫn phù hợp."}</p>
              <Button type="button" variant="link" onClick={() => setQuery("")}>{en ? "Clear search" : "Xóa tìm kiếm"}</Button>
            </div>
          )}

          <footer className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild><Link to="/play">▶ {en ? "PLAY NOW" : "VÀO CHƠI"}</Link></Button>
            <Button asChild variant="outline"><Link to="/">🏡 {en ? "HOME" : "VỀ NHÀ"}</Link></Button>
          </footer>
        </section>
      </main>
    </GameLayout>
  );
}