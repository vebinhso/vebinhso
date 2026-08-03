import { useState } from "react";

type Opt = { key: "A" | "B" | "C" | "D"; text: string; feedback: string };

const OPTIONS: Opt[] = [
  {
    key: "A",
    text: "Bấm vào link để kiểm tra giao diện, nếu trang web yêu cầu nhập mật khẩu hoặc mã OTP thì mới tắt đi.",
    feedback: "Chưa đúng. Chỉ cần bấm vào link lạ là máy đã có thể dính mã độc — đừng thử.",
  },
  {
    key: "B",
    text: "Điền thông tin cá nhân (họ tên, địa chỉ) để nhận thưởng, chỉ cần không nhập thông tin thẻ ngân hàng là an toàn.",
    feedback: "Chưa đúng. Họ tên, địa chỉ, số điện thoại cũng là dữ liệu quý để kẻ gian lừa tiếp.",
  },
  {
    key: "C",
    text: "Nhắn tin hỏi lại địa chỉ email đó để yêu cầu người gửi cung cấp giấy tờ/bằng chứng trúng thưởng trước khi bấm link.",
    feedback: "Chưa đúng. Trả lời tức là xác nhận hòm thư của em đang hoạt động — em sẽ bị nhắm tới nhiều hơn.",
  },
  {
    key: "D",
    text: "Kiểm tra kỹ địa chỉ email gửi đến, tuyệt đối không bấm vào link lạ, phớt lờ/báo cáo thư rác và cảnh báo cho mọi người xung quanh.",
    feedback: "Chính xác! Kiểm tra người gửi → không bấm link → báo cáo thư rác → cảnh báo bạn bè.",
  },
];

const CORRECT = "D";

export function FinalLessonQuiz() {
  const [picked, setPicked] = useState<string | null>(null);
  const chosen = OPTIONS.find((o) => o.key === picked);

  return (
    <div className="rounded-2xl border-2 border-primary/50 bg-background/70 p-3 sm:p-4 mb-3">
      <h3 className="text-sm sm:text-base font-black text-primary mb-2">🎯 BÀI HỌC CUỐI CÙNG</h3>
      <p className="text-xs font-bold opacity-80 mb-2">
        Khi nhận được một email báo trúng thưởng, em nên làm gì?
      </p>
      <div className="grid gap-2 max-h-[34vh] overflow-y-auto pr-1">
        {OPTIONS.map((o) => {
          const isPicked = picked === o.key;
          const isCorrect = o.key === CORRECT;
          const state =
            picked === null
              ? "border-border bg-muted/30 hover:bg-muted/60"
              : isCorrect
                ? "border-emerald-400 bg-emerald-500/20"
                : isPicked
                  ? "border-destructive bg-destructive/20"
                  : "border-border bg-muted/20 opacity-60";
          return (
            <button
              key={o.key}
              onClick={() => setPicked(o.key)}
              disabled={picked !== null}
              className={`flex gap-2 items-start text-left rounded-xl border-2 p-2.5 transition-colors ${state}`}
            >
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-black">
                {o.key}
              </span>
              <span className="text-[11px] sm:text-xs font-bold leading-snug">{o.text}</span>
              {picked !== null && isCorrect && <span className="ml-auto">✅</span>}
              {picked !== null && isPicked && !isCorrect && <span className="ml-auto">❌</span>}
            </button>
          );
        })}
      </div>

      {chosen && (
        <p className="mt-2 text-[11px] sm:text-xs font-bold rounded-xl p-2.5 bg-muted/50">
          {picked === CORRECT ? "🎉 " : "💡 "}
          {chosen.feedback}
          {picked !== CORRECT && (
            <>
              {" "}
              Đáp án đúng là <b>D</b>.
            </>
          )}
        </p>
      )}

      <p className="mt-2 text-[11px] sm:text-xs font-black rounded-xl p-2.5 border-2 border-amber-400/60 bg-amber-400/15">
        🛡️ GHI NHỚ QUAN TRỌNG! Hãy luôn tỉnh táo – Kiểm tra kỹ – Không bấm link lạ – Bảo vệ bản thân và giúp đỡ mọi
        người!
      </p>
    </div>
  );
}

export default FinalLessonQuiz;
