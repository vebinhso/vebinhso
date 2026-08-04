import bg from "@/assets/film5/l18-bg.jpg";
import { FinalLessonQuiz } from "@/components/FinalLessonQuiz";

export function FilmSummaryBoard({
  onRestart,
  onBack,
  poster,
  lessonId = "default",
}: {
  onRestart: () => void;
  onBack: () => void;
  poster?: string;
  lessonId?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <img
        src={poster || bg}
        alt=""
        width={1920}
        height={1080}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2px]"
      />
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background/90" />
      <div className="relative h-full overflow-y-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-xl sm:text-3xl font-black tracking-wide text-center">📋 TỔNG KẾT</h2>

          <section className="rounded-2xl border-2 border-destructive/60 bg-background/70 backdrop-blur p-4">
            <h3 className="text-base sm:text-lg font-black text-destructive mb-2">🚩 4 DẤU HIỆU EMAIL LỪA ĐẢO</h3>
            <ol className="space-y-1.5 text-xs sm:text-sm font-bold list-decimal pl-5">
              <li>
                Bạn trúng thưởng <b>một cuộc thi chưa từng tham gia</b>.
              </li>
              <li>
                Có <b>hạn chót gấp gáp</b>: “trong 24h”, “còn 10 phút”.
              </li>
              <li>
                Địa chỉ sau dấu <b>@</b> không phải tên miền chính thức.{" "}
                <code className="rounded bg-muted px-1">gmail-free-service.com</code> ≠{" "}
                <code className="rounded bg-muted px-1">gmail.com</code>
              </li>
              <li>
                Đòi <b>mật khẩu</b> hoặc <b>OTP</b> để “xác nhận”. Không ai cần mật khẩu của bạn để tặng quà.
              </li>
            </ol>
          </section>

          <section className="rounded-2xl border-2 border-amber-400/60 bg-background/70 backdrop-blur p-4">
            <h3 className="text-base sm:text-lg font-black text-amber-400 mb-2">🆘 NẾU ĐÃ LỠ NHẬP</h3>
            <ol className="space-y-1.5 text-xs sm:text-sm font-bold list-decimal pl-5">
              <li>
                Đổi mật khẩu <b>email trước</b>, rồi tới các tài khoản khác — trên <b>thiết bị khác</b>.
              </li>
              <li>Bật xác thực 2 lớp.</li>
              <li>Báo bạn bè ngay qua kênh khác.</li>
              <li>Nói với bố mẹ. Bị lừa không đáng xấu hổ — giấu mới nguy hiểm.</li>
            </ol>
          </section>

          <section className="rounded-2xl border-2 border-primary/60 bg-background/70 backdrop-blur p-4 text-xs sm:text-sm font-bold">
            <b className="text-primary">BÁO CÁO:</b> nút “Báo cáo thư rác” trong Gmail ·{" "}
            <a
              href="https://canhbao.khonggianmang.vn"
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              canhbao.khonggianmang.vn
            </a>
          </section>

          <FinalLessonQuiz lessonId={lessonId} />


          <div className="flex flex-wrap gap-2 justify-center pb-6">
            <button onClick={onRestart} className="rounded-xl px-5 py-3 font-black text-sm bg-primary text-primary-foreground">
              ▶ CHƠI LẠI
            </button>
            <button onClick={onBack} className="rounded-xl px-5 py-3 font-black text-sm bg-muted">
              ▶ XEM NHÁNH KHÁC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilmSummaryBoard;
