import type { ExpressionId } from "@/lib/appearance";

const K = "#111";
const line = { stroke: K, strokeWidth: 1.25, fill: "none", strokeLinecap: "round" as const };
const lashes = (x: number, side: -1 | 1) => <g stroke={K} strokeWidth=".8" strokeLinecap="round"><path d={`M${x + side * 4} 40 l${side * 2} -2`} /><path d={`M${x + side * 4.5} 43 l${side * 2.3} -.5`} /></g>;
const openEye = (x: number, look = 0) => <g>{lashes(x, x < 40 ? -1 : 1)}<ellipse cx={x} cy="43.5" rx="5.8" ry="7.4" fill="#fffdf8" stroke={K} strokeWidth="1.2" /><ellipse cx={x + look} cy="44" rx="3.8" ry="5.6" fill="#302a2a" /><ellipse cx={x + look - 1.1} cy="41.4" rx="1.25" ry="1.7" fill="#fff" /><circle cx={x + look + 1.1} cy="46.7" r=".65" fill="#fff" /></g>;
const happyEye = (x: number) => <g><path d={`M${x - 4.6} 44 Q${x} 38.5 ${x + 4.6} 44`} {...line} />{lashes(x, x < 40 ? -1 : 1)}</g>;
const flat = (x: number) => <path d={`M${x - 4} 43.5 Q${x} 42.5 ${x + 4} 43.5`} {...line} />;
const heart = (x: number) => <path d={`M${x} 47 l-4 -4 a2.3 2.3 0 0 1 4 -2.5 a2.3 2.3 0 0 1 4 2.5 Z`} fill="#ef5350" />;
const cheeks = <g fill="#f58f93" opacity=".58"><ellipse cx="27" cy="51" rx="4" ry="2" /><ellipse cx="53" cy="51" rx="4" ry="2" /></g>;
const brows = (sad = false) => <g stroke="#3a2c28" strokeWidth="1" strokeLinecap="round"><path d={sad ? "M29 35 l7 2" : "M29 36 l7 -2"} /><path d={sad ? "M44 37 l7 -2" : "M44 34 l7 2"} /></g>;
const openMouth = <g><path d="M34 53 Q40 51 46 53 Q45 59 40 59 Q35 59 34 53 Z" fill="#6f3035" stroke={K} strokeWidth=".7" /><path d="M36 56 Q40 54 44 56 Q42 58 40 58 Q38 58 36 56 Z" fill="#f58f93" /></g>;

/** Mắt + miệng theo cảm xúc (đầu tâm 40,42). */
export function FaceSvg({ e }: { e: ExpressionId }) {
  switch (e) {
    case "laugh": return <g>{brows()}{happyEye(32.5)}{happyEye(47.5)}{cheeks}{openMouth}</g>;
    case "wink": return <g>{openEye(32.5)}{happyEye(47.5)}{cheeks}<path d="M35 53 Q40 57 45 53" {...line} /></g>;
    case "tongue": return <g>{openEye(32.5)}{openEye(47.5)}{cheeks}<path d="M35 53 Q40 58 45 53" {...line} /><path d="M38 55 Q42 54 43 57 Q40 60 38 57 Z" fill="#f17886" /></g>;
    case "blush": return <g>{openEye(32.5)}{openEye(47.5)}{cheeks}<path d="M36 53 Q40 56 44 53" {...line} /></g>;
    case "smirk": return <g>{openEye(32.5, 1)}{openEye(47.5, 1)}<path d="M35 55 Q42 57 46 52" {...line} /></g>;
    case "neutral": return <g>{openEye(32.5)}{openEye(47.5)}<path d="M37 55 L43 55" {...line} /></g>;
    case "love": return <g>{heart(32.5)}{heart(47.5)}{cheeks}<ellipse cx="40" cy="55" rx="2.8" ry="3.5" fill="#713238" /></g>;
    case "tears": return <g>{happyEye(32.5)}{happyEye(47.5)}{openMouth}<path d="M26 46 q-2 5 1 6 q3 -2 -1 -6 Z M54 46 q-2 5 1 6 q3 -2 -1 -6 Z" fill="#55bde8" /></g>;
    case "sad": return <g>{brows(true)}{openEye(32.5)}{openEye(47.5)}<path d="M35 57 Q40 52 45 57" {...line} /></g>;
    case "upset": return <g>{brows()} {flat(32.5)}{flat(47.5)}<path d="M35 57 Q40 52 45 57" {...line} /></g>;
    case "grin": return <g>{openEye(32.5)}{openEye(47.5)}{cheeks}<rect x="34" y="52" width="12" height="6" rx="3" fill="#fff" stroke={K} strokeWidth=".8" /></g>;
    default: return <g>{brows()}{openEye(32.5)}{openEye(47.5)}{cheeks}<path d="M35 53 Q40 58 45 53" {...line} /></g>;
  }
}
