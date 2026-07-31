import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Số dòng hiển thị khi ở chế độ thu gọn */
  clamp?: number;
  className?: string;
  /** Class cho nút "Xem thêm / Thu gọn" */
  toggleClassName?: string;
};

/**
 * Đoạn mô tả có thể thu gọn: nếu nội dung dài hơn số dòng cho phép
 * sẽ hiện chữ "Xem thêm", bấm lần nữa để "Thu gọn".
 */
export function ExpandableText({ children, clamp = 3, className = "", toggleClassName = "" }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollHeight - el.clientHeight > 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, expanded]);

  return (
    <div className="w-full">
      <p
        ref={ref}
        className={className}
        style={
          expanded
            ? undefined
            : { display: "-webkit-box", WebkitLineClamp: clamp, WebkitBoxOrient: "vertical", overflow: "hidden" }
        }
      >
        {children}
      </p>
      {(overflowing || expanded) && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setExpanded((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          className={`inline-block mt-1 cursor-pointer underline underline-offset-2 font-black ${toggleClassName}`}
        >
          {expanded ? "Thu gọn ▲" : "Xem thêm ▾"}
        </span>
      )}
    </div>
  );
}
