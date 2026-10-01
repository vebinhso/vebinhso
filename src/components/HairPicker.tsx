import { useState } from "react";
import { useLocale } from "@/lib/locale";
import { loadGame, saveGame } from "@/lib/game";
import {
  HAIR_STYLES, HAIR_COLORS, HAIR_CHANGE_COST, HAIR_DYE_COST, type HairStyleId,
} from "@/lib/hair";
import { randomQuestion, gradeAnswer, reportAnswerResult, type Question } from "@/game/questions";
import { QuestionView } from "@/game/QuestionView";
import { HairBack, HairFront } from "./HairSvg";

type Props = {
  currentStyle: HairStyleId;
  hasChosen: boolean;
  currentColor: string;
  previewStyle: HairStyleId;
  previewColor: string;
  onPreview: (style: HairStyleId, color: string) => void;
  onApplyStyle: (style: HairStyleId) => void;
  onApplyColor: (color: string) => void;
};

export function HairPicker(p: Props) {
  const en = useLocale() === "en";
  const [money, setMoney] = useState(() => loadGame().money);
  const [msg, setMsg] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);

  const styleChanged = p.previewStyle !== p.currentStyle || !p.hasChosen;
  const colorChanged = p.previewColor.toLowerCase() !== p.currentColor.toLowerCase();

  const spend = (cost: number) => {
    const g = loadGame();
    if (g.money < cost) {
      setMsg(en ? `Not enough coins (need ${cost}).` : `Không đủ xu (cần ${cost} xu).`);
      return false;
    }
    saveGame({ ...g, money: g.money - cost });
    setMoney(g.money - cost);
    return true;
  };

  const applyFree = () => { p.onApplyStyle(p.previewStyle); setMsg(en ? "Hairstyle saved for free!" : "Đã chọn kiểu tóc miễn phí!"); };
  const applyCoins = () => {
    if (!spend(HAIR_CHANGE_COST)) return;
    p.onApplyStyle(p.previewStyle);
    setMsg(en ? "New hairstyle applied!" : "Đã đổi kiểu tóc!");
  };
  const startQuiz = () => { setMsg(null); setQuiz(randomQuestion()); };
  const answerQuiz = async (picked: number[]) => {
    if (!quiz || busy) return;
    setBusy(true);
    try {
      const r = await gradeAnswer(quiz, picked[0] ?? 0);
      reportAnswerResult(quiz, r.isCorrect);
      if (r.isCorrect) {
        p.onApplyStyle(p.previewStyle);
        setMsg(en ? "Correct! New hairstyle applied." : "Đúng rồi! Đã đổi kiểu tóc.");
        setQuiz(null);
      } else {
        setMsg(en ? "Wrong answer — try another question or pay coins." : "Sai rồi — thử câu khác hoặc trả xu nhé.");
        setQuiz(null);
      }
    } catch {
      setMsg(en ? "Could not check the answer. Try again." : "Không chấm được câu trả lời, thử lại nhé.");
    } finally { setBusy(false); }
  };
  const applyDye = () => {
    if (!spend(HAIR_DYE_COST)) return;
    p.onApplyColor(p.previewColor);
    setMsg(en ? "Hair dyed!" : "Đã nhuộm tóc!");
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="text-xs font-bold text-muted-foreground">
        {en ? `Your coins: ${money}` : `Xu của bạn: ${money}`}
      </div>

      <div>
        <div className="text-sm font-black mb-2">{en ? "Hairstyle" : "Kiểu tóc"}</div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {HAIR_STYLES.map((s) => {
            const active = s.id === p.previewStyle;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setQuiz(null); p.onPreview(s.id, p.previewColor); }}
                className={`rounded-xl border-2 p-1 bg-white/70 text-[11px] font-bold ${active ? "border-primary" : "border-black/10"}`}
              >
                <svg viewBox="12 6 56 60" className="w-full h-14">
                  <HairBack style={s.id} color={p.previewColor} />
                  <circle cx="40" cy="42" r="18" fill="#fde68a" />
                  <HairFront style={s.id} color={p.previewColor} />
                </svg>
                {en ? s.en : s.vi}
                {s.id === p.currentStyle && p.hasChosen && <div className="text-[10px] text-primary">{en ? "Current" : "Đang dùng"}</div>}
              </button>
            );
          })}
        </div>
        {styleChanged && !quiz && (
          <div className="flex flex-wrap gap-2 mt-2">
            {!p.hasChosen ? (
              <button type="button" onClick={applyFree} className="toy-button toy-button-primary !text-sm py-2 px-4">
                {en ? "Choose (first time free)" : "Chọn (lần đầu miễn phí)"}
              </button>
            ) : (
              <>
                <button type="button" onClick={applyCoins} className="toy-button toy-button-primary !text-sm py-2 px-4">
                  {en ? `Change for ${HAIR_CHANGE_COST} coins` : `Đổi với ${HAIR_CHANGE_COST} xu`}
                </button>
                <button type="button" onClick={startQuiz} className="toy-button !text-sm py-2 px-4">
                  {en ? "Answer 1 question" : "Trả lời 1 câu hỏi"}
                </button>
              </>
            )}
          </div>
        )}
        {quiz && (
          <div className="mt-3 rounded-xl border-2 border-black/10 bg-white/80 p-3">
            <QuestionView question={quiz} onAnswer={answerQuiz} disabled={busy} compact />
            <button type="button" onClick={() => setQuiz(null)} className="mt-2 text-xs font-bold underline">
              {en ? "Cancel" : "Hủy"}
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="text-sm font-black mb-2">
          {en ? `Hair dye (${HAIR_DYE_COST} coins each time)` : `Nhuộm tóc (${HAIR_DYE_COST} xu mỗi lần)`}
        </div>
        <div className="flex flex-wrap gap-2">
          {HAIR_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={en ? c.en : c.vi}
              aria-label={en ? c.en : c.vi}
              onClick={() => p.onPreview(p.previewStyle, c.hex)}
              className={`w-9 h-9 rounded-full border-4 ${c.hex.toLowerCase() === p.previewColor.toLowerCase() ? "border-primary" : "border-white"}`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
        {colorChanged && (
          <div className="flex flex-wrap gap-2 mt-2">
            <button type="button" onClick={applyDye} className="toy-button toy-button-primary !text-sm py-2 px-4">
              {en ? `Dye for ${HAIR_DYE_COST} coins` : `Nhuộm với ${HAIR_DYE_COST} xu`}
            </button>
            <button type="button" onClick={() => p.onPreview(p.previewStyle, p.currentColor)} className="toy-button !text-sm py-2 px-4">
              {en ? "Keep current color" : "Giữ màu cũ"}
            </button>
          </div>
        )}
      </div>

      {msg && <div className="text-sm font-bold">{msg}</div>}
    </div>
  );
}
