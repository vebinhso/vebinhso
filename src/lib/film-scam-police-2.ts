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
  m02: {
    id: "m02",
    image: poster,
    video: vm02.url,
    speaker: "narrator",
    action: "Đêm muộn — căn phòng chỉ còn ánh đèn và màn hình điện thoại",
    text: "M ngồi một mình trong phòng. Một ngày ở trường vừa trôi qua, cậu vẫn thấy mình lạc lõng như mọi khi.",
    motion: "kenburns",
    mood: "neutral",
    next: "m03",
  },
  m03: {
    id: "m03",
    image: m03,
    video: vm03.url,
    speaker: "narrator",
    action: "Một lời mời lạ bật lên trên màn hình",
    text: "Một nhóm chat tên lạ gửi lời mời tham gia Thử thách 7 ngày. Phần thưởng nghe thật hấp dẫn: tiền, sự chú ý và cảm giác mình quan trọng.",
    motion: "push",
    mood: "danger",
    next: "m04",
  },
  m04: {
    id: "m04",
    image: m04,
    video: vm04.url,
    speaker: "M",
    action: "M nhìn màn hình, vừa tò mò vừa bối rối",
    text: "Chỉ là một thử thách nhỏ thôi mà... tham gia một chút chắc không sao đâu nhỉ?",
    motion: "kenburns",
    mood: "neutral",
    next: "m06",
  },
  m06: {
    id: "m06",
    image: m06,
    video: vm06.url,
    speaker: "A",
    action: "Tin nhắn đầu tiên từ kẻ giấu mặt",
    text: "Chỉ vài nhiệm vụ nhỏ thôi. Im lặng, nghe lời, rồi mọi người sẽ phải nhớ tới cậu.",
    motion: "push",
    mood: "danger",
    next: "m07",
  },
  m07: {
    id: "m07",
    image: m07,
    video: vm07.url,
    speaker: "narrator",
    action: "Cái bẫy bắt đầu siết lại",
    text: "Càng nghe theo, M càng bị kéo sâu hơn. Sự háo hức lúc đầu biến thành cảm giác bị theo dõi và bị điều khiển.",
    motion: "shake",
    mood: "danger",
    next: "m08",
  },
  m08: {
    id: "m08",
    image: m08,
    video: vm08.url,
    speaker: "A",
    action: "Nệm vụ ngày thứ sáu — ngay tại trường học",
    text: "Ngày mai, hãy chạm vào điện thoại của N khi không ai để ý. Đây là lúc chứng minh cậu thuộc về nhóm này.",
    motion: "push",
    mood: "danger",
    choices: [
      { label: "A. Lén làm theo vì sợ bị loại khỏi nhóm", next: "m09", tone: "risky" },
      { label: "B. Dừng lại, nhận ra đây là việc sai trái", next: "m20", tone: "safe" },
    ],
  },
  m09: {
    id: "m09",
    image: m09,
    video: vm09.url,
    speaker: "narrator",
    action: "Khoảnh khắc bước qua ranh giới",
    text: "M đưa tay về phía điện thoại của N. Cậu biết rõ đây không còn là trò đùa nữa, nhưng nỗi sợ bị khinh thường vẫn đẩy cậu tiến lên.",
    motion: "kenburns",
    mood: "danger",
    next: "m10",
  },
  m10: {
    id: "m10",
    image: m10,
    video: vm10.url,
    speaker: "narrator",
    action: "Giữ điện thoại người khác trong tay",
    text: "Ngay khi cầm chiếc điện thoại ấy, tay M run lên. Chỉ một giây nghe lời cũng đủ để biến cậu thành người xâm phạm quyền riêng tư của bạn mình.",
    motion: "push",
    mood: "danger",
    next: "m11",
  },
  m11: {
    id: "m11",
    image: m11,
    video: vm11.url,
    speaker: "A",
    action: "Phần thưởng giả và nhiệm vụ cuối cùng",
    text: "Tốt lắm. Ngày mai là nhiệm vụ cuối. Nếu lùi lại bây giờ, mọi bí mật của cậu sẽ bị tung ra hết.",
    motion: "kenburns",
    mood: "danger",
    choices: [
      { label: "A. Thú nhận với người lớn trước khi quá muộn", next: "m13", tone: "safe" },
      { label: "B. Giấu kín và tiếp tục chịu áp lực một mình", next: "m16", tone: "risky" },
    ],
  },
  m13: {
    id: "m13",
    image: m13,
    video: vm13.url,
    speaker: "A",
    action: "Tin nhắn đe doạ dồn dập",
    text: "Admin gửi thêm lời đe doạ cuối cùng, nhưng lần này M không còn chỉ biết hoảng loạn. Cậu hiểu rằng im lặng chỉ khiến kẻ xấu lấn tới.",
    motion: "shake",
    mood: "danger",
    next: "m14",
  },
  m14: {
    id: "m14",
    image: m14,
    video: vm14.url,
    speaker: "M",
    action: "Khoảnh khắc quyết định nói ra sự thật",
    text: "Con sợ thật... nhưng con không muốn chuyện này làm hại thêm ai nữa.",
    motion: "freeze",
    mood: "safe",
    next: "m21",
  },
  m16: {
    id: "m16",
    image: m16,
    video: vm16.url,
    speaker: "narrator",
    action: "Giấu kín nỗi sợ",
    text: "M ôm lấy chính mình và cố chịu đựng trong im lặng. Càng giấu, cậu càng đơn độc và càng dễ bị điều khiển.",
    motion: "kenburns",
    mood: "danger",
    next: "m17",
  },
  m17: {
    id: "m17",
    image: m17,
    video: vm17.url,
    speaker: "A",
    action: "Đếm ngược tâm lý",
    text: "Chỉ còn ít giờ nữa thôi. Nếu không làm theo, mọi thứ sẽ bị tung ra trước khi cậu kịp giải thích với bất kỳ ai.",
    motion: "shake",
    mood: "danger",
    next: "m15",
  },
  m15: {
    id: "m15",
    image: m15,
    video: vm15.url,
    speaker: "narrator",
    action: "Hạn chót đếm ngược trên màn hình",
    text: "Những lời đe doạ chồng chất lên nhau. M nhìn đồng hồ đếm ngược và thấy mình càng lúc càng nhỏ bé trước kẻ giấu mặt.",
    motion: "push",
    mood: "danger",
    next: "m18",
  },
  m18: {
    id: "m18",
    image: m18,
    video: vm18.url,
    speaker: "narrator",
    action: "Khủng hoảng bùng lên",
    text: "Áp lực, xấu hổ và sợ hãi bóp nghẹt M. Khi không tìm người hỗ trợ, cậu đã tự nhốt mình trong chiếc bẫy do kẻ khác dựng sẵn.",
    motion: "freeze",
    mood: "danger",
    ending: {
      kind: "loss",
      code: "D",
      title: "KẾT THÚC D — BỊ NHỐT TRONG NỖI SỢ",
      lesson: "Kẻ xấu mạnh nhất khi nạn nhân im lặng. Đừng tự chịu đựng một mình khi bị đe doạ hay thao túng trên mạng.",
    },
  },
  m20: {
    id: "m20",
    image: m20,
    video: vm20.url,
    speaker: "narrator",
    action: "M tỉnh ngộ",
    text: "M khựng lại. Cậu nhận ra nhóm này không hề cho mình giá trị nào cả — nó chỉ biến sự cô đơn của cậu thành công cụ để ép cậu làm điều sai.",
    motion: "kenburns",
    mood: "safe",
    choices: [
      { label: "A. Chặn nhóm, lưu bằng chứng và báo cho người lớn", next: "m21", tone: "safe" },
      { label: "B. Tự xoá tin nhắn rồi cố quên đi", next: "m17", tone: "risky" },
    ],
  },
  m21: {
    id: "m21",
    image: m21,
    video: vm21.url,
    speaker: "narrator",
    action: "Người lớn đáng tin cậy vào cuộc",
    text: "M đưa điện thoại cho mẹ và thầy cô. Khi có người lớn đồng hành, nỗi sợ lập tức nhỏ lại và mọi việc bắt đầu sáng ra.",
    motion: "kenburns",
    mood: "safe",
    next: "m22",
  },
  m22: {
    id: "m22",
    image: m22,
    video: vm22.url,
    speaker: "narrator",
    action: "Lưu bằng chứng và xử lý tận gốc",
    text: "Các bằng chứng được lưu lại, nhóm chat bị truy vết và chặn. M không còn một mình, còn N cũng được bảo vệ kịp thời.",
    motion: "push",
    mood: "safe",
    next: "m23",
  },
  m23: {
    id: "m23",
    image: m23,
    video: vm23.url,
    speaker: "narrator",
    action: "Sinh hoạt toàn trường về an toàn mạng",
    text: "Nhà trường tổ chức buổi sinh hoạt về an toàn mạng. Câu chuyện của M trở thành lời nhắc cho tất cả học sinh: đừng im lặng khi bị đe doạ.",
    motion: "kenburns",
    mood: "safe",
    next: "m24",
  },
  m24: {
    id: "m24",
    image: m24,
    video: vm24.url,
    speaker: "M",
    action: "M đứng trước toàn trường",
    text: "Con từng nghĩ nói ra là yếu đuối. Nhưng chính lúc con nói ra, con mới thật sự thoát khỏi nỗi sợ.",
    motion: "freeze",
    mood: "safe",
    next: "m25",
  },
  m25: {
    id: "m25",
    image: m25,
    video: vm25.url,
    speaker: "narrator",
    action: "Một khởi đầu mới",
    text: "M bước ra sân trường cùng bạn bè, nhẹ nhõm và tự tin hơn. Cậu đã học được cách tự bảo vệ mình và bảo vệ người khác trên không gian mạng.",
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
