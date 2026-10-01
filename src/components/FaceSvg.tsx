import type { ExpressionId } from "@/lib/appearance";

const K = "#111";
const line = { stroke: K, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const };
const happyEye = (x: number) => <path d={`M${x - 2.5} 45 Q${x} 41.5 ${x + 2.5} 45`} {...line} />;
const dot = (x: number) => <circle cx={x} cy={44} r={2} fill={K} />;
const flat = (x: number) => <path d={`M${x - 2.5} 44 L${x + 2.5} 44`} {...line} />;
const xEye = (x: number, dir: 1 | -1) => <path d={`M${x - 2 * dir} 42 L${x + 2 * dir} 44 L${x - 2 * dir} 46`} {...line} />;
const heart = (x: number) => <path d={`M${x} 47 l-3 -3 a1.7 1.7 0 0 1 3 -2 a1.7 1.7 0 0 1 3 2 Z`} fill="#ef4444" />;
const openMouth = <path d="M33 51 Q40 51 47 51 Q46 58 40 58 Q34 58 33 51 Z" fill="#7f1d1d" />;

/** Mắt + miệng theo cảm xúc (đầu tâm 40,42). */
export function FaceSvg({ e }: { e: ExpressionId }) {
  switch (e) {
    case "laugh": return <g>{happyEye(34)}{happyEye(46)}{openMouth}<path d="M34 51.5 L46 51.5 L45 53 L35 53 Z" fill="#fff" /></g>;
    case "wink": return <g>{dot(34)}{happyEye(46)}<path d="M35 52 Q40 55 45 52" {...line} /></g>;
    case "tongue": return <g>{happyEye(34)}{happyEye(46)}<path d="M34 51 Q40 56 46 51" {...line} /><path d="M40 53.5 Q43 53 43 57 Q41 59 39.5 56 Z" fill="#f87171" /></g>;
    case "blush": return <g>{happyEye(34)}{happyEye(46)}<circle cx="29" cy="49" r="2.5" fill="#fca5a5" /><circle cx="51" cy="49" r="2.5" fill="#fca5a5" /><path d="M34 51 Q40 57 46 51 Z" fill="#fff" stroke={K} strokeWidth="1" /></g>;
    case "smirk": return <g><path d="M31.5 43 L36.5 43" {...line} /><path d="M43.5 43 L48.5 43" {...line} />{dot(35)}{dot(47)}<path d="M35 53 Q42 55 46 51" {...line} /></g>;
    case "neutral": return <g>{flat(34)}{flat(46)}<path d="M35 53 L45 53" {...line} /></g>;
    case "love": return <g>{heart(34)}{heart(46)}<ellipse cx="40" cy="54" rx="2.5" ry="3" fill="#7f1d1d" /></g>;
    case "tears": return <g>{xEye(34, 1)}{xEye(46, -1)}{openMouth}<path d="M27 47 q-2 3 0 4 q2 -1 0 -4 Z M53 47 q-2 3 0 4 q2 -1 0 -4 Z" fill="#38bdf8" /></g>;
    case "sad": return <g>{dot(34)}{dot(46)}<path d="M34 55 Q40 50 46 55" {...line} /></g>;
    case "upset": return <g>{xEye(34, 1)}{xEye(46, -1)}<path d="M34 55 Q40 50 46 55" {...line} /></g>;
    case "grin": return <g>{dot(34)}{dot(46)}<rect x="33" y="50" width="14" height="6" rx="2" fill="#fff" stroke={K} strokeWidth="1" /><path d="M33 53 L47 53 M37.5 50 L37.5 56 M42.5 50 L42.5 56" stroke={K} strokeWidth="0.6" /></g>;
    default: return <g>{dot(34)}{dot(46)}<path d="M34 52 Q40 56 46 52" {...line} /></g>;
  }
}
