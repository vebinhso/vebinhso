import poster from "@/assets/film3/clean/m02.jpg";
import m03 from "@/assets/film3/clean/m03.jpg";
import m04 from "@/assets/film3/clean/m04.jpg";
import m06 from "@/assets/film3/clean/m06.jpg";
import m07 from "@/assets/film3/clean/m07.jpg";
import m08 from "@/assets/film3/clean/m08.jpg";
import m09 from "@/assets/film3/clean/m09.jpg";
import m10 from "@/assets/film3/clean/m10.jpg";
import m11 from "@/assets/film3/clean/m11.jpg";
import m13 from "@/assets/film3/clean/m13.jpg";
import m14 from "@/assets/film3/clean/m14.jpg";
import m15 from "@/assets/film3/clean/m15.jpg";
import m16 from "@/assets/film3/clean/m16.jpg";
import m17 from "@/assets/film3/clean/m17.jpg";
import m18 from "@/assets/film3/clean/m18.jpg";
import m20 from "@/assets/film3/clean/m20.jpg";
import m21 from "@/assets/film3/clean/m21.jpg";
import m22 from "@/assets/film3/clean/m22.jpg";
import m23 from "@/assets/film3/clean/m23.jpg";
import m24 from "@/assets/film3/clean/m24.jpg";
import m25 from "@/assets/film3/clean/m25.jpg";

import vm02 from "@/assets/film3/video/m02.mp4.asset.json";
import vm03 from "@/assets/film3/video/m03.mp4.asset.json";
import vm04 from "@/assets/film3/video/m04.mp4.asset.json";
import vm06 from "@/assets/film3/video/m06.mp4.asset.json";
import vm07 from "@/assets/film3/video/m07.mp4.asset.json";
import vm08 from "@/assets/film3/video/m08.mp4.asset.json";
import vm09 from "@/assets/film3/video/m09.mp4.asset.json";
import vm10 from "@/assets/film3/video/m10.mp4.asset.json";
import vm11 from "@/assets/film3/video/m11.mp4.asset.json";
import vm13 from "@/assets/film3/video/m13.mp4.asset.json";
import vm14 from "@/assets/film3/video/m14.mp4.asset.json";
import vm15 from "@/assets/film3/video/m15.mp4.asset.json";
import vm16 from "@/assets/film3/video/m16.mp4.asset.json";
import vm17 from "@/assets/film3/video/m17.mp4.asset.json";
import vm18 from "@/assets/film3/video/m18.mp4.asset.json";
import vm20 from "@/assets/film3/video/m20.mp4.asset.json";
import vm21 from "@/assets/film3/video/m21.mp4.asset.json";
import vm22 from "@/assets/film3/video/m22.mp4.asset.json";
import vm23 from "@/assets/film3/video/m23.mp4.asset.json";
import vm24 from "@/assets/film3/video/m24.mp4.asset.json";
import vm25 from "@/assets/film3/video/m25.mp4.asset.json";

export type Speaker = "A" | "M" | "narrator";

export type Choice = {
  label: string;
  next: string;
  tone?: "safe" | "risky" | "neutral";
};

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
  next?: string;
  choices?: Choice[];
  ending?: {
    kind: "safe" | "loss";
    code: string;
    title: string;
    lesson: string;
  };
};

export const SPEAKER_META: Record<
  Speaker,
  { name: string; color: string; voice: string; instructions: string; speed: number; pitch: number; rate: number }
> = {
  A: {
    name: "Admin — Kẻ Giấu Mặt",
    color: "text-red-400",
    voice: "ash",
    instructions:
      "Nam 35–50 tuổi, giọng bình tĩnh, nghiêm, kiểm soát cảm xúc tốt và mang tính thao túng. Nói NHANH, chính xác, ra lệnh thay vì gợi ý, dùng chiêu gây áp lực, tỏ ra sốt ruột khi bị hỏi lại, không bao giờ xin lỗi, luôn đẩy nhịp hội thoại đi nhanh. Ấn tượng: kẻ giả danh cán bộ nhà nước. Không hét lên.",
    speed: 1.1,
    pitch: 0.78,
    rate: 1.1,
  },
  M: {
    name: "M",
    color: "text-sky-300",
    voice: "coral",
    instructions:
      "Nữ 18–30 tuổi, giọng nhẹ nhàng, thân thiện, tươi vui và lễ phép. Tốc độ vừa phải, hội thoại tự nhiên, dùng từ lịch sự. Diễn biến cảm xúc: vui vẻ → ngạc nhiên → bối rối → lo lắng → sợ hãi; khi hồi hộp thì nhịp thở nhanh hơn và đôi lúc lặp lại câu hỏi. Không bao giờ nghe kịch tính hoá.",
    speed: 1,
    pitch: 1.15,
    rate: 1,
  },
  narrator: {
    name: "Người dẫn chuyện",
    color: "text-amber-300",
    voice: "sage",
    instructions:
      "Giọng trung tính 25–35 tuổi, điềm tĩnh, ấm, chuyên nghiệp, phát âm rõ ràng, đáng tin cậy theo phong cách phim tài liệu (National Geographic). Tốc độ vừa phải, chuyển ý mượt mà, nhấn nhá đúng chi tiết quan trọng. Khách quan, không diễn quá, không hoảng loạn, không la hét.",
    speed: 1,
    pitch: 1,
    rate: 1,
  },

};

export const FILM_TITLE = "THỬ THÁCH KẺ GIẤU MẶT";
export const FILM_POSTER = poster;
export const FILM_SUMMARY_IMAGE = m25;

export const FILM_NOTES = [
  "Lời mời cho cảm giác được công nhận rất dễ biến thành chiếc bẫy kiểm soát.",
  "Không đụng vào điện thoại, tài khoản hay quyền riêng tư của người khác dù bị xúi giục.",
  "Khi bị đe doạ trên mạng: dừng lại, lưu bằng chứng, chặn liên lạc và báo ngay cho người lớn đáng tin cậy.",
  "Giữ im lặng để tự chịu một mình chỉ làm kẻ xấu mạnh hơn; tìm hỗ trợ sớm mới là cách bảo vệ bản thân và bạn bè.",
];

export const FILM: Record<string, FilmNode> = {
  // S02 — Mở đầu: M một mình trong phòng
  m02: {
    id: "m02",
    image: poster,
    video: vm02.url,
    speaker: "narrator",
    action: "Đêm muộn — căn phòng chỉ còn ánh đèn bàn và màn hình điện thoại",
    text: "M, 15 tuổi, học sinh lớp 9. Một ngày ở trường vừa trôi qua, và như mọi ngày, em vẫn thấy mình lạc lõng giữa đám đông. Chiếc điện thoại là nơi duy nhất em thấy mình được lắng nghe.",
    motion: "kenburns",
    mood: "neutral",
    next: "m03",
  },
  // S03 — Lời mời lạ + S04 lời rủ rê của Admin
  m03: {
    id: "m03",
    image: m03,
    video: vm03.url,
    speaker: "A",
    action: "Một lời mời từ nhóm chat lạ bật lên trên màn hình",
    text: "Chào M. Nhóm bọn anh đang tìm người đủ bản lĩnh cho Thử thách 7 ngày. Bảy nhiệm vụ, bảy ngày, có thưởng. Em được chọn, không phải ai cũng được mời đâu.",
    motion: "push",
    mood: "danger",
    next: "m04",
  },
  // S05 — M do dự rồi bấm đồng ý
  m04: {
    id: "m04",
    image: m04,
    video: vm04.url,
    speaker: "M",
    action: "M háo hức nhìn màn hình rồi bấm “Tham gia”",
    text: "Ơ, nhiệm vụ dễ dàng thế à? Phải thử thôi! Chỉ là mấy thử thách nhỏ thôi, chắc không sao đâu.",
    motion: "kenburns",
    mood: "neutral",
    next: "m06",
  },
  // S06/S07 — Những nhiệm vụ đầu tiên, cái bẫy bắt đầu
  m06: {
    id: "m06",
    image: m06,
    video: vm06.url,
    speaker: "A",
    action: "Nhiệm vụ ngày thứ nhất đến thứ ba",
    text: "Nhiệm vụ một: gửi anh ảnh thẻ học sinh. Nhiệm vụ hai: chụp màn hình danh bạ. Nhiệm vụ ba: không kể chuyện này với bất kỳ ai. Im lặng và nghe lời, rồi cả trường sẽ phải nhớ tới em.",
    motion: "push",
    mood: "danger",
    next: "m07",
  },
  // S08 — Cái bẫy siết lại
  m07: {
    id: "m07",
    image: m07,
    video: vm07.url,
    speaker: "narrator",
    action: "Cái bẫy bắt đầu siết lại",
    text: "Mỗi nhiệm vụ hoàn thành, M lại trao đi một phần thông tin của chính mình. Sự háo hức ban đầu đổi thành cảm giác bị theo dõi: kẻ giấu mặt giờ đã biết em học lớp nào, chơi với ai, sợ điều gì.",
    motion: "shake",
    mood: "danger",
    next: "m08",
  },
  // S09 — Nhiệm vụ ngày thứ sáu: xâm phạm điện thoại bạn
  m08: {
    id: "m08",
    image: m08,
    video: vm08.url,
    speaker: "A",
    action: "Nhiệm vụ ngày thứ sáu — ngay tại lớp học",
    text: "Ngày mai, giờ ra chơi, mở điện thoại của N và chụp lại tin nhắn trong đó. Chỉ ba mươi giây. Em muốn ở lại nhóm hay muốn anh gửi mọi thứ em đã đưa anh cho cả lớp xem?",
    motion: "push",
    mood: "danger",
    choices: [
      { label: "A. Lén làm theo vì sợ bị lộ và bị loại khỏi nhóm", next: "m09", tone: "risky" },
      { label: "B. Dừng lại — đây là xâm phạm quyền riêng tư của bạn", next: "m20", tone: "safe" },
    ],
  },
  // S10 — Khoảnh khắc bước qua ranh giới
  m09: {
    id: "m09",
    image: m09,
    video: vm09.url,
    speaker: "M",
    action: "Giờ ra chơi, lớp vắng người, tay M đưa về phía bàn của N",
    text: "Chỉ một lần này thôi... mình xin lỗi N. Nếu không làm, họ sẽ tung hết mọi thứ về mình.",
    motion: "kenburns",
    mood: "danger",
    next: "m10",
  },
  // S11 — Cầm điện thoại người khác trong tay
  m10: {
    id: "m10",
    image: m10,
    video: vm10.url,
    speaker: "narrator",
    action: "Chiếc điện thoại của N nằm trong tay M",
    text: "Chỉ một giây nghe lời, M đã bước từ nạn nhân sang người xâm phạm quyền riêng tư của bạn mình. Trên mạng, kẻ thao túng luôn bắt đầu bằng một việc rất nhỏ — để lần sau em không còn lý do từ chối.",
    motion: "push",
    mood: "danger",
    next: "m11",
  },
  // S12/S13 — Phần thưởng giả và nhiệm vụ cuối
  m11: {
    id: "m11",
    image: m11,
    video: vm11.url,
    speaker: "A",
    action: "Phần thưởng hứa hẹn không bao giờ tới, và nhiệm vụ thứ bảy xuất hiện",
    text: "Giỏi lắm. Nhưng thưởng thì để ngày mai — nhiệm vụ cuối cùng đã sẵn sàng. Lùi lại bây giờ thì ảnh, danh bạ và cả đoạn em lấy điện thoại của N sẽ được gửi cho cả trường.",
    motion: "kenburns",
    mood: "danger",
    choices: [
      { label: "A. Nói thật với mẹ và thầy cô trước khi quá muộn", next: "m13", tone: "safe" },
      { label: "B. Giấu kín, một mình chịu đựng thêm một ngày nữa", next: "m16", tone: "risky" },
    ],
  },
  // S13/S14 — Tin nhắn đe doạ dồn dập lúc nửa đêm
  m13: {
    id: "m13",
    image: m13,
    video: vm13.url,
    speaker: "A",
    action: "Hàng loạt tin nhắn đe doạ đổ về lúc nửa đêm",
    text: "Em định mách người lớn à? Cứ thử xem. Người bị cả trường cười là em, không phải anh.",
    motion: "shake",
    mood: "danger",
    next: "m14",
  },
  // S15 — M quyết định nói ra sự thật
  m14: {
    id: "m14",
    image: m14,
    video: vm14.url,
    speaker: "M",
    action: "M run rẩy đưa điện thoại cho mẹ xem, mẹ nắm lấy tay em",
    text: "Mẹ ơi... con làm sai một chuyện, và con đang bị người ta doạ. Con sợ lắm, nhưng con không muốn chuyện này làm hại thêm ai nữa.",
    motion: "freeze",
    mood: "safe",
    next: "m21",
  },
  // S16 — Giấu kín nỗi sợ
  m16: {
    id: "m16",
    image: m16,
    video: vm16.url,
    speaker: "M",
    action: "M ngồi thu mình trong góc phòng tối",
    text: "Mình không nói được đâu. Nói ra thì ai cũng biết mình đã làm gì... Chịu thêm một ngày nữa thôi, rồi họ sẽ tha cho mình.",
    motion: "kenburns",
    mood: "danger",
    next: "m17",
  },
  // S17 — Đếm ngược tâm lý
  m17: {
    id: "m17",
    image: m17,
    video: vm17.url,
    speaker: "A",
    action: "Kẻ giấu mặt ép hạn chót",
    text: "Còn sáu tiếng. Không làm theo thì đúng bảy giờ sáng mai, mọi thứ về em sẽ nằm trên trang của cả trường. Đừng bắt anh nhắc lại.",
    motion: "shake",
    mood: "danger",
    next: "m15",
  },
  // S18 — Hạn chót đếm ngược
  m15: {
    id: "m15",
    image: m15,
    video: vm15.url,
    speaker: "narrator",
    action: "Vòng đếm ngược đỏ rực trên điện thoại giữa căn phòng tối",
    text: "Những lời đe doạ chồng lên nhau suốt đêm. M nhìn con số đếm ngược và thấy mình càng lúc càng nhỏ bé — đúng như điều kẻ giấu mặt muốn.",
    motion: "push",
    mood: "danger",
    next: "m18",
  },
  // S19 — Khủng hoảng: kết thúc D
  m18: {
    id: "m18",
    image: m18,
    video: vm18.url,
    speaker: "narrator",
    action: "Trời gần sáng, M co mình một mình trong góc phòng",
    text: "Áp lực, xấu hổ và sợ hãi bóp nghẹt M. Không một ai biết, không một ai đứng cạnh em. Khi chọn im lặng, em đã tự nhốt mình trong chiếc bẫy do kẻ khác dựng sẵn.",
    motion: "freeze",
    mood: "danger",
    ending: {
      kind: "loss",
      code: "D",
      title: "KẾT THÚC D — BỊ NHỐT TRONG NỖI SỢ",
      lesson: "Kẻ xấu mạnh nhất khi nạn nhân im lặng. Đừng tự chịu đựng một mình khi bị đe doạ hay thao túng trên mạng.",
    },
  },
  // S20 — M tỉnh ngộ
  m20: {
    id: "m20",
    image: m20,
    video: vm20.url,
    speaker: "M",
    action: "M dừng tay lại giữa lớp học",
    text: "Không. Đây không phải thử thách, đây là bắt mình hại bạn. Một nhóm coi mình là người của họ thì không bao giờ bắt mình làm chuyện này.",
    motion: "kenburns",
    mood: "safe",
    choices: [
      { label: "A. Chụp lại bằng chứng, chặn nhóm và báo cho người lớn", next: "m21", tone: "safe" },
      { label: "B. Tự xoá hết tin nhắn rồi cố quên đi", next: "m17", tone: "risky" },
    ],
  },
  // S21 — Người lớn vào cuộc
  m21: {
    id: "m21",
    image: m21,
    video: vm21.url,
    speaker: "narrator",
    action: "Mẹ và thầy cô cùng ngồi xuống bên M",
    text: "M đưa điện thoại cho mẹ và thầy chủ nhiệm. Không một lời trách mắng — chỉ có người lớn lắng nghe và cùng em xử lý. Nỗi sợ đêm qua bỗng nhỏ lại.",
    motion: "kenburns",
    mood: "safe",
    next: "m22",
  },
  // S22 — Lưu bằng chứng, chặn và báo cáo
  m22: {
    id: "m22",
    image: m22,
    video: vm22.url,
    speaker: "narrator",
    action: "Chụp màn hình, lưu bằng chứng, chặn và trình báo",
    text: "Toàn bộ tin nhắn được chụp lại làm bằng chứng, nhóm chat bị báo cáo và chặn, nhà trường thông báo cho cơ quan chức năng. M không còn một mình, và N cũng được bảo vệ kịp thời.",
    motion: "push",
    mood: "safe",
    next: "m23",
  },
  // S23 — Sinh hoạt toàn trường
  m23: {
    id: "m23",
    image: m23,
    video: vm23.url,
    speaker: "narrator",
    action: "Buổi sinh hoạt toàn trường về an toàn mạng",
    text: "Vài ngày sau, nhà trường tổ chức buổi sinh hoạt về an toàn trên không gian mạng. Câu chuyện của M trở thành lời nhắc cho mọi học sinh: không có thử thách nào đáng để đánh đổi sự an toàn của mình và của bạn.",
    motion: "kenburns",
    mood: "safe",
    next: "m24",
  },
  // S24 — M chia sẻ trước toàn trường
  m24: {
    id: "m24",
    image: m24,
    video: vm24.url,
    speaker: "M",
    action: "M cầm micro đứng trước toàn trường",
    text: "Em từng nghĩ nói ra là yếu đuối, nên em im lặng suốt sáu ngày. Nhưng chính lúc em nói với mẹ, em mới thật sự thoát khỏi nỗi sợ. Nếu các bạn đang bị ai đó ép buộc, xin đừng chịu một mình.",
    motion: "freeze",
    mood: "safe",
    next: "m25",
  },
  // S25 — Kết thúc A
  m25: {
    id: "m25",
    image: m25,
    video: vm25.url,
    speaker: "narrator",
    action: "Một khởi đầu mới trên sân trường",
    text: "M bước ra sân trường cùng bạn bè, nhẹ nhõm và tự tin hơn. Em đã học được điều quan trọng nhất: biết dừng lại đúng lúc và biết lên tiếng, đó mới là bản lĩnh thật sự trên không gian mạng.",
    motion: "kenburns",
    mood: "safe",
    ending: {
      kind: "safe",
      code: "A",
      title: "KẾT THÚC A — DỪNG LẠI ĐÚNG LÚC",
      lesson: "Chặn liên lạc, lưu bằng chứng và báo ngay cho người lớn là cách an toàn nhất khi gặp thử thách thao túng, đe doạ trên mạng.",
    },
  },
};

export const FILM_START = "m02";
