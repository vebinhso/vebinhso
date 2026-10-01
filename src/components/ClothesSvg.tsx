import type { Bottom, Top } from "@/lib/clothes";

/** Mẫu hoa văn dùng chung (đặt 1 lần trong <svg>). */
export function ClothesDefs({ top, bottom, uid }: { top?: Top; bottom?: Bottom; uid: string }) {
  return (
    <defs>
      {top && <pattern id={`ts-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill={top.color} /><rect width="6" height="3" fill={top.color2} /></pattern>}
      {top && <pattern id={`tf-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill={top.color} /><circle cx="3" cy="3" r="1.4" fill={top.color2} /><circle cx="8" cy="8" r="1" fill={top.color2} /></pattern>}
      {top && <pattern id={`tp-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill={top.color} /><rect width="8" height="2" y="3" fill={top.color2} opacity="0.55" /><rect width="2" height="8" x="3" fill={top.color2} opacity="0.55" /></pattern>}
      {bottom && <pattern id={`bp-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill={bottom.color} /><rect width="8" height="2" y="3" fill={bottom.color2} opacity="0.55" /><rect width="2" height="8" x="3" fill={bottom.color2} opacity="0.55" /></pattern>}
      {bottom && <pattern id={`bs-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill={bottom.color} /><rect width="5" height="2.5" fill={bottom.color2} /></pattern>}
    </defs>
  );
}

export function topFill(t: Top, uid: string) {
  return t.pattern === "stripes" ? `url(#ts-${uid})` : t.pattern === "floral" ? `url(#tf-${uid})` : t.pattern === "plaid" ? `url(#tp-${uid})` : t.color;
}
export function bottomFill(b: Bottom, uid: string) {
  return b.pattern === "plaid" ? `url(#bp-${uid})` : b.pattern === "stripes" ? `url(#bs-${uid})` : b.color;
}

/** Hình trang trí trên ngực áo (tâm ngực 40,74). */
export function TopEmblem({ t }: { t: Top }) {
  const c = t.color2;
  switch (t.pattern) {
    case "star": return <path d="M40 68 l1.8 4 4.2 .4 -3.2 2.8 1 4.2 -3.8 -2.2 -3.8 2.2 1 -4.2 -3.2 -2.8 4.2 -.4 Z" fill={c} />;
    case "heart": return <path d="M40 78 l-4.5 -4.5 a2.6 2.6 0 0 1 4.5 -3 a2.6 2.6 0 0 1 4.5 3 Z" fill={c} />;
    case "cat": return <g fill={c}><circle cx="40" cy="75" r="5" /><path d="M35.5 72 L36 67 L39 70.5 Z M44.5 72 L44 67 L41 70.5 Z" /></g>;
    case "bow": return <g fill={c}><path d="M40 66 L35 63 L35 69 Z M40 66 L45 63 L45 69 Z" /><path d="M39 66 L41 66 L42 76 L40 78 L38 76 Z" /></g>;
    case "number": return <text x="40" y="79" textAnchor="middle" fontSize="10" fontWeight="900" fill={c}>99</text>;
    case "trim": return <path d="M34 61 L40 74 L46 61" stroke={c} strokeWidth="3" fill="none" />;
    case "ranger": return <g><path d="M30 62 L40 80 L50 62 Z" fill={c} /><rect x="27" y="94" width="26" height="4" fill={c} /><rect x="37" y="94" width="6" height="4" fill="#9ca3af" /></g>;
    case "collar": return <g><path d="M33 60 L40 68 L47 60 L44 58 L40 62 L36 58 Z" fill={c} /><rect x="39" y="68" width="2" height="10" fill={c} opacity="0.6" /></g>;
    case "zip": return <g><path d="M33 60 L40 66 L47 60 L44 58 L40 61 L36 58 Z" fill={c} /><rect x="39" y="66" width="2" height="32" fill={c} /></g>;
    default: return null;
  }
}

/** Mũ bảo hiểm siêu nhân, che tóc. */
export function RangerHelmet({ color }: { color: string }) {
  return (
    <g>
      <path d="M21 42 Q21 22 40 22 Q59 22 59 42 L58 58 Q40 64 22 58 Z" fill={color} />
      <path d="M26 40 Q40 36 54 40 L52 50 Q46 47 40 52 Q34 47 28 50 Z" fill="#111" />
      <path d="M33 56 Q40 60 47 56 L46 59 Q40 62 34 59 Z" fill="#e5e7eb" />
    </g>
  );
}
