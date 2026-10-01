import type { HairStyleId } from "@/lib/hair";

/** Tóc dạng SVG, khớp đầu tròn tâm (40,42) bán kính 18 trong viewBox 80x160. */
export function HairBack({ style, color }: { style: HairStyleId; color: string }) {
  switch (style) {
    case "bob":
      return <path d="M20 40 Q20 20 40 20 Q60 20 60 40 L61 60 Q52 63 50 56 L30 56 Q28 63 19 60 Z" fill={color} />;
    case "longstraight":
    case "sidebang":
      return <path d="M20 40 Q20 20 40 20 Q60 20 60 40 L62 92 L50 90 L50 56 L30 56 L30 90 L18 92 Z" fill={color} />;
    case "longwavy":
      return <path d="M20 40 Q20 20 40 20 Q60 20 60 40 Q64 52 59 62 Q65 74 60 86 L50 88 L50 56 L30 56 L30 88 L20 86 Q15 74 21 62 Q16 52 20 40 Z" fill={color} />;
    case "longcurly":
      return (
        <g fill={color}>
          <path d="M20 40 Q20 20 40 20 Q60 20 60 40 L60 56 L20 56 Z" />
          {[50, 60, 70, 80].map((y) => (
            <g key={y}><circle cx="21" cy={y} r="6" /><circle cx="59" cy={y} r="6" /></g>
          ))}
        </g>
      );
    case "pigtails":
      return (
        <g fill={color}>
          <circle cx="16" cy="46" r="7" /><circle cx="13" cy="54" r="7" /><circle cx="17" cy="62" r="7" />
          <circle cx="64" cy="46" r="7" /><circle cx="67" cy="54" r="7" /><circle cx="63" cy="62" r="7" />
          <circle cx="20" cy="42" r="3.2" fill="#ef4135" stroke="#8e241e" strokeWidth=".7" />
          <circle cx="60" cy="42" r="3.2" fill="#ef4135" stroke="#8e241e" strokeWidth=".7" />
          <circle cx="19" cy="41" r=".8" fill="#fff" /><circle cx="59" cy="41" r=".8" fill="#fff" />
        </g>
      );
    default:
      return null;
  }
}

export function HairFront({ style, color }: { style: HairStyleId; color: string }) {
  const cap = "M21 42 Q20 20 40 20 Q60 20 59 42 Q53 32 40 31 Q27 32 21 42 Z";
  switch (style) {
    case "short":
      return <path d={cap} fill={color} />;
    case "spiky":
      return <path d="M21 40 L22 26 L27 30 L30 18 L35 26 L40 14 L45 26 L50 18 L53 30 L58 26 L59 40 Q52 30 40 30 Q28 30 21 40 Z" fill={color} />;
    case "sidesweep":
      return <path d="M21 42 Q20 21 40 21 Q60 21 59 40 Q50 32 44 40 Q34 34 21 42 Z" fill={color} />;
    case "pompadour":
      return <path d="M21 40 Q18 16 40 12 Q62 14 59 40 Q52 28 40 28 Q28 30 21 40 Z" fill={color} />;
    case "curlyshort":
      return (
        <g fill={color}>
          <path d={cap} />
          {[24, 31, 38, 45, 52, 57].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 22 : 26} r="5" />)}
        </g>
      );
    case "bun":
      return (
        <g fill={color}>
          <path d="M21 40 Q21 21 40 21 Q59 21 59 40 Q55 28 40 27 Q25 28 21 40 Z" />
          <circle cx="40" cy="16" r="7" />
        </g>
      );
    case "twinbuns":
      return (
        <g fill={color}>
          <path d={cap} />
          <circle cx="22" cy="25" r="8" /><circle cx="58" cy="25" r="8" />
        </g>
      );
    case "bob":
    case "longstraight":
    case "longwavy":
    case "longcurly":
    case "pigtails":
      return <path d="M21 42 Q20 20 40 20 Q60 20 59 42 Q55 33 51 31 L50 42 L45 31 L43 42 L38 31 L35 42 L31 31 L27 42 L25 34 Q23 37 21 42 Z" fill={color} />;
    case "sidebang":
      return <path d="M21 42 Q21 21 40 21 Q59 21 59 42 Q54 30 42 30 Q34 38 24 52 Z" fill={color} />;
  }
}
