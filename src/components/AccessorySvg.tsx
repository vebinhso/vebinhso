import type { AccessoryId } from "@/lib/accessories";

/** Vẽ trên nền nhân vật SVG (đầu tâm 40,42 r18; thân từ y=60; tay trái 19,105). */
export function AccessorySvg({ id, hair }: { id: AccessoryId; hair: string }) {
  switch (id) {
    case "beard_mustache":
      return <path d="M32 50 Q36 47 40 49 Q44 47 48 50 Q44 52 40 50.5 Q36 52 32 50 Z" fill={hair} />;
    case "beard_goatee":
      return <g fill={hair}><path d="M33 50 Q40 47 47 50 L46 51.5 Q40 49.5 34 51.5 Z" /><path d="M35 55 Q40 54 45 55 Q44 61 40 62 Q36 61 35 55 Z" /></g>;
    case "beard_full":
      return <path d="M22 42 Q23 56 30 59 Q40 64 50 59 Q57 56 58 42 Q56 50 50 53 Q40 56 30 53 Q24 50 22 42 Z M33 50 Q40 47 47 50 L46 51.5 Q40 49.5 34 51.5 Z" fill={hair} />;
    case "beard_chinstrap":
      return <path d="M22 42 Q23 57 40 60 Q57 57 58 42 Q56 54 40 57 Q24 54 22 42 Z" fill={hair} />;
    case "beard_horseshoe":
      return <path d="M33 50 Q40 47 47 50 L47 60 L45 60 L45 52 Q40 50 35 52 L35 60 L33 60 Z" fill={hair} />;
    case "beard_long":
      return <path d="M24 46 Q26 56 32 58 Q34 76 40 82 Q46 76 48 58 Q54 56 56 46 Q50 54 40 55 Q30 54 24 46 Z" fill="#e5e7eb" />;
    case "head_keffiyeh":
      return (
        <g>
          <path d="M19 44 Q19 20 40 20 Q61 20 61 44 L64 78 L56 76 L56 44 Q40 30 24 44 L24 76 L16 78 Z" fill="#f4f4f5" stroke="#d4d4d8" />
          <rect x="21" y="27" width="38" height="3" rx="1.5" fill="#111" />
          <rect x="21" y="31.5" width="38" height="3" rx="1.5" fill="#111" />
        </g>
      );
    case "head_hijab":
      return <path d="M20 44 Q20 21 40 21 Q60 21 60 44 Q60 58 52 62 L62 70 L18 70 L28 62 Q20 58 20 44 Z M26 44 Q26 60 40 61 Q54 60 54 44 Q54 30 40 29 Q26 30 26 44 Z" fill="#a1a1aa" fillRule="evenodd" />;
    case "neck_layered":
      return (
        <g fill="none" stroke="#d4d4d8" strokeWidth="1">
          <path d="M30 61 Q40 70 50 61" /><path d="M28 61 Q40 78 52 61" />
          <circle cx="40" cy="69.5" r="1.4" fill="#fff" /><circle cx="40" cy="73.5" r="1.6" fill="#fff" />
        </g>
      );
    case "wrist_bangle":
      return <rect x="13.5" y="98" width="11" height="2.5" rx="1.2" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="0.4" />;
    case "finger_heart":
      return <g><circle cx="62" cy="106" r="2" fill="none" stroke="#e4e4e7" strokeWidth="1" /><path d="M62 103 l-1.6 -1.6 a1 1 0 0 1 1.6 -1.2 a1 1 0 0 1 1.6 1.2 Z" fill="#bfdbfe" /></g>;
  }
}
