import { useEffect, useState } from "react";
import type { Question } from "./questions";
import { useLocale } from "@/lib/locale";

type Props = {
  question: Question;
  onAnswer: (picked: number[]) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function QuestionView({ question, onAnswer, disabled, compact }: Props) {
  const en = useLocale() === "en";
  const correctSet = question.correctIndexes && question.correctIndexes.length > 0
    ? question.correctIndexes
    : [question.answer];
  const isMulti = (question.correctCount ?? correctSet.length) > 1;
  const optImages = question.optionImages || [];
  const hasOptionImages = optImages.some((u) => u && u.length > 0);

  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    setPicked([]);
  }, [question]);

  const handleClick = (i: number) => {
    if (disabled) return;
    if (isMulti) {
      setPicked((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
      return;
    }
    onAnswer([i]);
  };

  const confirm = () => {
    if (disabled || picked.length === 0) return;
    onAnswer(picked);
  };

  const qSize = compact ? "text-base md:text-lg" : "text-xl md:text-2xl";
  const imgMax = compact ? "max-h-28" : "max-h-40";
  const optImgMax = compact ? "max-h-20" : "max-h-24";
  const optTextSize = compact ? "text-sm md:text-base" : "text-base md:text-lg";
  const optPadY = compact ? "py-2" : "py-3";

  return (
    <div className="w-full">
      {question.isRetry && (
        <div className="flex justify-center mb-2">
          <span className="px-3 py-1 rounded-full bg-amber-100 border-2 border-amber-400 text-amber-800 text-xs md:text-sm font-black">
            🔁 {en ? "Retry question" : "Câu hỏi thử lại"}{(question.retryCount ?? 0) > 1 ? ` (${question.retryCount})` : ""}
          </span>
        </div>
      )}
      <h3 className={`${qSize} font-black mb-3 text-center leading-snug whitespace-normal break-words`}>
        {question.q}
      </h3>
      {question.imageUrl && (
        <div className="flex justify-center mb-3">
          <img
            src={question.imageUrl}
            alt=""
            className={`${imgMax} w-auto rounded-xl object-contain border-2 border-orange-200`}
          />
        </div>
      )}
      <div className={hasOptionImages ? "grid grid-cols-1 md:grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
        {question.options.map((opt, i) => {
          const isPicked = picked.includes(i);
          const baseClass = `rounded-xl border-2 px-3 ${optPadY} text-left flex flex-col items-stretch gap-2 transition-all w-full min-h-[3rem]`;
          const stateClass = isMulti && isPicked
            ? "bg-green-100 border-green-600 ring-2 ring-green-400"
            : "bg-white border-gray-300 hover:border-orange-400 hover:bg-orange-50";
          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={disabled}
              className={`${baseClass} ${stateClass} ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {hasOptionImages && optImages[i] && (
                <img
                  src={optImages[i]}
                  alt=""
                  className={`${optImgMax} w-full object-contain rounded-md bg-gray-50`}
                />
              )}
              <div className={`${optTextSize} font-bold flex items-start gap-2 whitespace-normal break-words text-left`}>
                {isMulti && (
                  <span className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 shrink-0 rounded border-2 text-xs ${isPicked ? "bg-green-600 border-green-700 text-white" : "border-gray-400"}`}>
                    {isPicked ? "✓" : ""}
                  </span>
                )}
                <span className="whitespace-normal break-words">
                  {String.fromCharCode(65 + i)}. {opt}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {isMulti && (
        <button
          onClick={confirm}
          disabled={disabled || picked.length === 0}
          className={`toy-button-green w-full mt-3 ${compact ? "!text-base !py-2" : "!text-lg !py-3"} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          ✓ {en ? "CONFIRM" : "XÁC NHẬN"} ({picked.length})
        </button>
      )}
      {isMulti && !disabled && (
        <p className="text-xs font-bold mt-2 opacity-70 text-center">
          {en ? "Select ALL correct answers, then press Confirm." : "Chọn TẤT CẢ đáp án đúng rồi bấm Xác nhận."}
        </p>
      )}
    </div>
  );
}
