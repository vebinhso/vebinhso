import s01 from "@/assets/film4/clean/s01.jpg";
import s02 from "@/assets/film4/clean/s02.jpg";
import s03 from "@/assets/film4/clean/s03.jpg";
import s04 from "@/assets/film4/clean/s04.jpg";
import s04choice from "@/assets/film4/clean/s04-choice.jpg";
import s05 from "@/assets/film4/clean/s05.jpg";
import s06 from "@/assets/film4/clean/s06.jpg";
import s07 from "@/assets/film4/clean/s07.jpg";
import s08 from "@/assets/film4/clean/s08.jpg";
import s09 from "@/assets/film4/clean/s09.jpg";
import s10 from "@/assets/film4/clean/s10.jpg";
import s11 from "@/assets/film4/clean/s11.jpg";
import s12 from "@/assets/film4/clean/s12.jpg";
import s13 from "@/assets/film4/clean/s13.jpg";
import s14 from "@/assets/film4/clean/s14.jpg";
import s15 from "@/assets/film4/clean/s15.jpg";
import s16 from "@/assets/film4/clean/s16.jpg";
import safeCheck from "@/assets/film4/clean/safe-check-link.jpg";
import safeWarn from "@/assets/film4/clean/safe-warning-post.jpg";
import safeDelete from "@/assets/film4/clean/safe-delete-message.jpg";
import a2s17 from "@/assets/film4/clean/a2-s17.jpg";
import a2s18 from "@/assets/film4/clean/a2-s18.jpg";
import a2s19 from "@/assets/film4/clean/a2-s19.jpg";

import vs01 from "@/assets/film4/video/b02.mp4.asset.json";
import vs02 from "@/assets/film4/video/b03.mp4.asset.json";
import vs03 from "@/assets/film4/video/b04.mp4.asset.json";
import vs04 from "@/assets/film4/video/b05.mp4.asset.json";
import vs05 from "@/assets/film4/video/b06.mp4.asset.json";
import vs06 from "@/assets/film4/video/b07.mp4.asset.json";
import vs07 from "@/assets/film4/video/b08.mp4.asset.json";
import vs08 from "@/assets/film4/video/b09.mp4.asset.json";
import vs09 from "@/assets/film4/video/b10.mp4.asset.json";
import vs10 from "@/assets/film4/video/b11.mp4.asset.json";
import vs11 from "@/assets/film4/video/b12.mp4.asset.json";
import vs12 from "@/assets/film4/video/b13.mp4.asset.json";
import vs13 from "@/assets/film4/video/b14.mp4.asset.json";
import vs14 from "@/assets/film4/video/b15.mp4.asset.json";
import vs15 from "@/assets/film4/video/b16.mp4.asset.json";
import vs16 from "@/assets/film4/video/b17.mp4.asset.json";
import vSafeCheck from "@/assets/film4/video/safe-check-link.mp4.asset.json";
import vSafeWarn from "@/assets/film4/video/safe-warning-post.mp4.asset.json";
import vSafeDelete from "@/assets/film4/video/safe-delete-message.mp4.asset.json";

export type Speaker = "narrator" | "B" | "H" | "T" | "X";
export type Choice = { label: string; next: string; tone?: "safe" | "risky" | "neutral" };
export type Motion = "kenburns" | "push" | "shake" | "freeze";
export type FilmNode = {
  id: string;
  image: string;
  video?: string;
  speaker: Speaker;
  action?: string;
  text: string;
  motion?: Motion;
  mood?: "danger" | "safe" | "neutral";
  linkOverlay?: boolean;
  voteOverlay?: boolean;
  loginOverlay?: boolean;
  typingOverlay?: boolean;
  successOverlay?: boolean;
  listOverlay?: boolean;
  notifOverlay?: boolean;
  lostOverlay?: boolean;
  timeLimitSec?: number;
  choiceImage?: string;
  next?: string;
  choices?: Choice[];
  ending?: { kind: "safe" | "loss"; code: string; title: string; lesson: string };
};

export const SPEAKER_META: Record<Speaker, { name: string; color: string; voice: string; instructions: string; speed: number; pitch: number; rate: number }> = {
  narrator: { name: "Người dẫn chuyện", color: "text-amber-300", voice: "sage", instructions: "Giọng trung tính 25–35 tuổi, điềm tĩnh, ấm, chuyên nghiệp, phát âm rõ ràng, đáng tin cậy theo phong cách phim tài liệu. Tốc độ vừa phải, chuyển ý mượt mà, nhấn đúng chi tiết quan trọng.", speed: 1, pitch: 1, rate: 1 },
  B: { name: "Bảo", color: "text-sky-300", voice: "echo", instructions: "Nam học sinh 15–16 tuổi, giọng trẻ, trong, thân thiện. Cảm xúc chuyển từ quan tâm, vội vàng sang nghi ngờ, bối rối rồi quyết đoán.", speed: 1, pitch: 1.08, rate: 1 },
  H: { name: "Hà", color: "text-pink-300", voice: "coral", instructions: "Nữ học sinh 15–16 tuổi, giọng nhẹ, tự nhiên, về sau hốt hoảng vì bị mất tài khoản.", speed: 1, pitch: 1.18, rate: 1.02 },
  T: { name: "Tuấn", color: "text-emerald-300", voice: "alloy", instructions: "Nam học sinh 15–16 tuổi, giọng chắc, tỉnh táo, thẳng thắn khi cảnh báo bạn.", speed: 1.05, pitch: 0.98, rate: 1.05 },
  X: { name: "Kẻ gian", color: "text-red-400", voice: "ash", instructions: "Giọng nam trưởng thành, lạnh, trầm, ngắn gọn, tính toán và thao túng.", speed: 1, pitch: 0.75, rate: 1 },
};

export const FILM_TITLE = "MỘT CÚ BẤM VÌ BẠN";
export const FILM_POSTER = s01;
export const FILM_SUMMARY_IMAGE = s02;
export const FILM_NOTES = [
  "Tin nhắn đến từ nick bạn bè vẫn có thể do kẻ gian đang chiếm tài khoản gửi.",
  "Không đăng nhập qua đường link lạ; luôn soi kỹ tên miền và dấu hiệu bảo mật.",
  "Phải xác minh qua một kênh khác như gọi điện hoặc gặp trực tiếp.",
  "Phát hiện bẫy thì cảnh báo ngay để ngăn người tiếp theo trở thành nạn nhân.",
];

const quizChoices: Choice[] = [
  { label: "A. Bấm link vì tin nhắn dùng đúng giọng văn của Hà", next: "quizWrong", tone: "risky" },
  { label: "B. Hỏi lại ngay trong chính tài khoản Messenger đó", next: "quizWrong", tone: "risky" },
  { label: "C. Không bấm nhưng giữ im lặng để tránh phiền", next: "quizWrong", tone: "neutral" },
  { label: "D. Không bấm; gọi điện hoặc gặp Hà qua kênh khác để xác minh rồi cảnh báo mọi người", next: "quizCorrect", tone: "safe" },
];

export const FILM: Record<string, FilmNode> = {
  s01: { id: "s01", image: s01, video: vs01.url, speaker: "narrator", action: "21:40 — phòng riêng của Bảo", text: "Hai mươi mốt giờ bốn mươi. Bảo, học sinh lớp 10, đang lướt Messenger sau giờ học bài.", motion: "kenburns", mood: "neutral", next: "s02" },
  s02: { id: "s02", image: s02, video: vs02.url, speaker: "H", action: "Tin nhắn mới từ nick Hà", text: "Bảo ơi, cứu tớ với! Tớ đang lọt Top 5 cuộc thi Mẫu Ảnh Học Sinh Tài Năng. Hôm nay đóng cổng bình chọn rồi, Bảo vào link này vote giúp tớ nhé!", motion: "push", mood: "danger", next: "s03" },
  s03: { id: "s03", image: s03, video: vs03.url, speaker: "narrator", action: "Ngón tay dừng trên đường link", text: "Tin nhắn dùng đúng kiểu nói quen thuộc của Hà nên Bảo có xu hướng tin ngay. Nhưng tên miền kết thúc bằng chấm top và không có biểu tượng ổ khoá.", motion: "push", mood: "danger", linkOverlay: true, next: "s04" },
  s04: { id: "s04", image: s04, video: vs04.url, speaker: "B", action: "Bảo phân vân", text: "Hà nhắn đúng giọng văn thường ngày, lại đang cần gấp. Nhưng lâu rồi Hà không nhắn cho mình...", motion: "push", mood: "danger", choiceImage: s04choice, choices: [
    { label: "A. Tin đúng là Hà, bấm link vote giúp ngay", next: "s05", tone: "risky" },
    { label: "B. Dừng lại, kiểm tra link và xác minh qua kênh khác", next: "b01", tone: "safe" },
  ] },

  s05: { id: "s05", image: s05, video: vs05.url, speaker: "narrator", action: "Nhánh 1.1 — Bảo bấm link", text: "Trang web hồng rực mở ra với hình ảnh của Hà, đồng hồ đếm ngược và nút bình chọn phát sáng. Mọi thứ được thiết kế để Bảo hành động thật nhanh.", motion: "push", mood: "danger", voteOverlay: true, next: "s06" },
  s06: { id: "s06", image: s06, video: vs06.url, speaker: "narrator", action: "Hộp đăng nhập giả hiện lên", text: "Trang web yêu cầu đăng nhập Facebook hoặc Zalo để xác minh. Dòng chữ Facebook chỉ là phần đầu; tên miền thật vẫn là một địa chỉ lạ.", motion: "push", mood: "danger", loginOverlay: true, next: "s07" },
  s07: { id: "s07", image: s07, video: vs07.url, speaker: "narrator", action: "Bảo nhập mật khẩu", text: "Giao diện giống hệt trang thật. Bảo gõ email rồi mật khẩu. Chỉ bốn giây, thông tin đăng nhập đã rơi vào tay kẻ gian.", motion: "push", mood: "danger", typingOverlay: true, next: "s08" },
  s08: { id: "s08", image: s08, video: vs08.url, speaker: "narrator", action: "Trang web báo thành công", text: "Bảo thấy thông báo bình chọn thành công, mỉm cười và đi ngủ. Cậu tin rằng mình vừa giúp một người bạn.", motion: "kenburns", mood: "neutral", successOverlay: true, next: "s09" },
  s09: { id: "s09", image: s09, video: vs09.url, speaker: "narrator", action: "Phía bên kia màn hình", text: "Trong căn phòng tối, kẻ gian nhận được tài khoản mới. Bảo không phải mục tiêu riêng biệt; cậu chỉ là một dòng mới trong danh sách nạn nhân.", motion: "push", mood: "danger", listOverlay: true, next: "s10" },
  s10: { id: "s10", image: s10, video: vs10.url, speaker: "narrator", action: "Bảo bật dậy giữa đêm", text: "Điện thoại đầy cuộc gọi nhỡ và tin nhắn. Nick của Bảo đang gửi link lạ, mượn tiền khắp nhóm lớp.", motion: "shake", mood: "danger", notifOverlay: true, next: "s11" },
  s11: { id: "s11", image: s11, video: vs11.url, speaker: "T", action: "Tuấn gọi điện cảnh báo", text: "Bảo ơi! Nick mày bị hack rồi. Nó đang gửi link và mượn tiền khắp lớp mình kìa!", motion: "shake", mood: "danger", next: "s11b" },
  s11b: { id: "s11b", image: s11, video: vs11.url, speaker: "B", action: "Bảo chết lặng", text: "Hả? Tớ có nhắn cho ai đâu! Tớ chỉ vừa vote giúp Hà thôi mà!", motion: "shake", mood: "danger", next: "s12" },
  s12: { id: "s12", image: s12, video: vs12.url, speaker: "narrator", action: "Tài khoản đã bị chiếm", text: "Kẻ gian đã đổi mật khẩu, email khôi phục và bật xác thực hai lớp của chúng. Tài khoản sáu năm của Bảo mất trong mười lăm phút.", motion: "push", mood: "danger", lostOverlay: true, next: "s13" },
  s13: { id: "s13", image: s13, video: vs13.url, speaker: "narrator", action: "Quyết định số 2", text: "Nick của Bảo đang đi lừa cả lớp. Bảo phải làm gì ngay lúc này?", motion: "kenburns", mood: "danger", choices: [
    { label: "A1. Gọi điện, báo nhóm lớp và nói với bố mẹ ngay", next: "s14", tone: "safe" },
    { label: "A2. Xấu hổ, giữ im lặng và tự khôi phục tài khoản", next: "a2s17", tone: "risky" },
  ] },
  s14: { id: "s14", image: s14, video: vs14.url, speaker: "B", action: "Bảo cảnh báo nhóm lớp", text: "Mọi người ơi, nick Facebook của tớ vừa bị hack. Tuyệt đối đừng bấm link và đừng chuyển tiền cho nick đó!", motion: "push", mood: "safe", next: "s15" },
  s15: { id: "s15", image: s15, video: vs15.url, speaker: "narrator", action: "Nhờ người lớn hỗ trợ", text: "Bảo kể hết với bố mẹ. Hai bố con báo cáo tài khoản bị hack, yêu cầu khoá tài khoản và xác minh danh tính.", motion: "push", mood: "safe", next: "s16" },
  s16: { id: "s16", image: s16, video: vs16.url, speaker: "narrator", action: "Cảnh báo đã đến kịp lúc", text: "Không ai trong lớp sập bẫy. Tài khoản của Bảo đang được khôi phục, còn mọi người cảm ơn cậu vì đã báo sớm.", motion: "kenburns", mood: "safe", next: "quizA1" },
  a2s17: { id: "a2s17", image: a2s17, speaker: "narrator", action: "Bảo tự xoay xở trong im lặng", text: "Bảo bấm quên mật khẩu hết lần này đến lần khác. Mỗi phút trôi qua, nick giả vẫn tiếp tục nhắn cho bạn bè.", motion: "push", mood: "danger", next: "a2s18" },
  a2s18: { id: "a2s18", image: a2s18, speaker: "narrator", action: "Khôi phục thất bại", text: "Email và số điện thoại khôi phục đều đã bị thay đổi. Bảo không thể tự lấy lại tài khoản, nhưng vẫn không dám lên tiếng.", motion: "push", mood: "danger", next: "a2s19" },
  a2s19: { id: "a2s19", image: a2s19, speaker: "narrator", action: "Hậu quả lan sang người khác", text: "Trong lúc Bảo im lặng, một bạn cùng lớp tin lời nick giả và chuyển hai triệu đồng cho kẻ gian.", motion: "freeze", mood: "danger", next: "quizA2" },

  b01: { id: "b01", image: safeCheck, video: vSafeCheck.url, speaker: "narrator", action: "Nhánh 1.2 — Bảo soi kỹ đường link", text: "Bảo phóng to đường link. Tên miền lạ, không có ổ khoá và tệp đính kèm không rõ nguồn gốc. Cậu quyết định không tải xuống, không đăng nhập.", motion: "push", mood: "safe", next: "b02" },
  b02: { id: "b02", image: safeCheck, video: vSafeCheck.url, speaker: "B", action: "Bảo suy nghĩ", text: "Nick này viết đúng giọng của Hà thật. Nhưng nếu tài khoản đã bị chiếm thì kẻ gian cũng có thể đọc tin cũ và bắt chước cách nói.", motion: "push", mood: "neutral", next: "b03" },
  b03: { id: "b03", image: safeCheck, video: vSafeCheck.url, speaker: "narrator", action: "Quyết định số 2 của nhánh an toàn", text: "Bảo sẽ xác minh thế nào?", motion: "kenburns", mood: "neutral", choices: [
    { label: "B1. Gọi trực tiếp cho Hà bằng số điện thoại", next: "b04", tone: "safe" },
    { label: "B2. Hỏi lại ngay trong chính Messenger của Hà", next: "b10", tone: "risky" },
    { label: "B3. Không bấm nhưng im lặng bỏ qua", next: "b20", tone: "neutral" },
  ] },
  b04: { id: "b04", image: s11, video: vs11.url, speaker: "H", action: "Bảo gọi qua kênh khác", text: "Bảo hả? Tớ có nhắn gì đâu! Nick của tớ bị mất từ chiều rồi. Cậu đừng bấm link đó nhé!", motion: "push", mood: "safe", next: "b05" },
  b05: { id: "b05", image: safeWarn, video: vSafeWarn.url, speaker: "B", action: "Bảo đăng cảnh báo", text: "Mọi người ơi, nick của Hà đang bị kẻ gian chiếm. Nếu nhận link bình chọn thì tuyệt đối đừng bấm và đừng đăng nhập!", motion: "push", mood: "safe", next: "b06" },
  b06: { id: "b06", image: safeDelete, video: vSafeDelete.url, speaker: "narrator", action: "Bảo xoá tin nhắn lừa đảo", text: "Sau khi chụp lại bằng chứng và báo cáo, Bảo xoá tin nhắn độc hại. Hà được hỗ trợ khoá nick, cả lớp không ai mắc bẫy.", motion: "kenburns", mood: "safe", next: "quizB1" },
  b10: { id: "b10", image: s02, video: vs02.url, speaker: "X", action: "Kẻ gian trả lời bằng đúng giọng Hà", text: "Tớ đây mà, Hà nè. Link của ban tổ chức đó, an toàn tuyệt đối. Bảo bấm nhanh giúp tớ với!", motion: "push", mood: "danger", next: "b11" },
  b11: { id: "b11", image: safeCheck, video: vSafeCheck.url, speaker: "narrator", action: "Cùng một kênh không phải là xác minh", text: "Người trả lời vẫn là kẻ đang giữ tài khoản. Xác minh ngay trong kênh đã bị chiếm không chứng minh được danh tính.", motion: "push", mood: "danger", choices: [
    { label: "Gọi điện cho Hà để kiểm tra lần nữa", next: "b04", tone: "safe" },
    { label: "Tin lời trả lời và bấm link", next: "s05", tone: "risky" },
  ] },
  b20: { id: "b20", image: safeDelete, video: vSafeDelete.url, speaker: "narrator", action: "Bảo bỏ qua nhưng không cảnh báo", text: "Bảo giữ được tài khoản của mình, nhưng chiếc bẫy vẫn tiếp tục được gửi đi. Sáng hôm sau, hai bạn khác đã đăng nhập vào trang giả.", motion: "freeze", mood: "danger", next: "quizB3" },

  quizA1: { id: "quizA1", image: s16, speaker: "narrator", action: "Bài tập trắc nghiệm", text: "Cách xử lý nào là an toàn nhất khi nhận link từ tài khoản của bạn bè?", motion: "freeze", mood: "neutral", choices: quizChoices.map((c) => ({ ...c, next: c.next === "quizCorrect" ? "endA1" : "quizWrongA1" })) },
  quizA2: { id: "quizA2", image: a2s19, speaker: "narrator", action: "Bài tập trắc nghiệm", text: "Cách xử lý nào là an toàn nhất khi nhận link từ tài khoản của bạn bè?", motion: "freeze", mood: "neutral", choices: quizChoices.map((c) => ({ ...c, next: c.next === "quizCorrect" ? "endA2" : "quizWrongA2" })) },
  quizB1: { id: "quizB1", image: safeWarn, video: vSafeWarn.url, speaker: "narrator", action: "Bài tập trắc nghiệm", text: "Cách xử lý nào là an toàn nhất khi nhận link từ tài khoản của bạn bè?", motion: "freeze", mood: "neutral", choices: quizChoices.map((c) => ({ ...c, next: c.next === "quizCorrect" ? "endB1" : "quizWrongB1" })) },
  quizB3: { id: "quizB3", image: safeDelete, video: vSafeDelete.url, speaker: "narrator", action: "Bài tập trắc nghiệm", text: "Cách xử lý nào là an toàn nhất khi nhận link từ tài khoản của bạn bè?", motion: "freeze", mood: "neutral", choices: quizChoices.map((c) => ({ ...c, next: c.next === "quizCorrect" ? "endB3" : "quizWrongB3" })) },
  quizWrongA1: { id: "quizWrongA1", image: s13, speaker: "narrator", text: "Chưa đúng. Tin nhắn đúng giọng văn vẫn có thể do kẻ chiếm nick gửi. Hãy thử lại: đáp án an toàn phải xác minh qua một kênh khác.", mood: "danger", next: "quizA1" },
  quizWrongA2: { id: "quizWrongA2", image: s13, speaker: "narrator", text: "Chưa đúng. Giữ im lặng hoặc hỏi lại trong nick đã bị chiếm đều không đủ an toàn. Hãy thử lại.", mood: "danger", next: "quizA2" },
  quizWrongB1: { id: "quizWrongB1", image: safeCheck, video: vSafeCheck.url, speaker: "narrator", text: "Chưa đúng. Đáp án D không phải hành động thừa; đó là cách xác minh danh tính qua kênh khác. Hãy thử lại.", mood: "danger", next: "quizB1" },
  quizWrongB3: { id: "quizWrongB3", image: safeCheck, video: vSafeCheck.url, speaker: "narrator", text: "Chưa đúng. Chỉ tự bảo vệ mình là chưa đủ; cần cảnh báo để ngăn người khác mắc bẫy. Hãy thử lại.", mood: "danger", next: "quizB3" },

  endA1: { id: "endA1", image: s16, video: vs16.url, speaker: "narrator", text: "Bảo cảnh báo kịp thời, nhờ người lớn hỗ trợ và không ai trong lớp bị lừa.", mood: "safe", ending: { kind: "safe", code: "A1", title: "KẾT THÚC A1 — DÁM LÊN TIẾNG", lesson: "Cảnh báo nhanh giúp chặn thiệt hại lan rộng. Khi có sự cố, hãy nói với người lớn và những người có thể hỗ trợ." } },
  endA2: { id: "endA2", image: a2s19, speaker: "narrator", text: "Bảo im lặng vì xấu hổ; một bạn mất tiền và tài khoản của cậu càng khó khôi phục.", mood: "danger", ending: { kind: "loss", code: "A2", title: "KẾT THÚC A2 — CÁI GIÁ CỦA IM LẶNG", lesson: "Sai lầm có thể xảy ra với bất kỳ ai. Giấu sự cố chỉ cho kẻ gian thêm thời gian gây hại." } },
  endB1: { id: "endB1", image: safeWarn, video: vSafeWarn.url, speaker: "narrator", text: "Bảo xác minh qua cuộc gọi, giúp Hà báo khoá nick và cảnh báo cả lớp trước khi có ai mắc bẫy.", mood: "safe", ending: { kind: "safe", code: "B1", title: "KẾT THÚC B1 — MỘT CUỘC GỌI ĐÚNG LÚC", lesson: "Đây là kết thúc tốt nhất. Luôn xác minh qua một kênh khác, ngay cả khi tin nhắn đúng giọng văn của người quen." } },
  endB3: { id: "endB3", image: safeDelete, video: vSafeDelete.url, speaker: "narrator", text: "Bảo an toàn, nhưng vì không cảnh báo nên chiếc bẫy đã tiếp tục làm hại hai bạn khác.", mood: "danger", ending: { kind: "loss", code: "B3", title: "KẾT THÚC B3 — AN TOÀN MỘT MÌNH", lesson: "Phát hiện bẫy mà im lặng thì cái bẫy vẫn còn đó. Hãy báo cáo và cảnh báo cộng đồng." } },
};

export const FILM_START = "s01";
