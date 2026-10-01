// Trộn màu sơn kiểu "đổ màu" (gần với mô hình RYB của hoạ sĩ): đỏ + vàng = cam, xanh dương + vàng = xanh lá...
type HSL = { h: number; s: number; l: number };

function hexToHsl(hex: string): HSL {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(n.slice(0, 2), 16) / 255, g = parseInt(n.slice(2, 4), 16) / 255, b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex({ h, s, l }: HSL): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

const RGB_PTS = [0, 30, 60, 120, 240, 280, 360];
const RYB_PTS = [0, 60, 120, 180, 240, 300, 360];
const interp = (x: number, from: number[], to: number[]) => {
  for (let i = 0; i < from.length - 1; i++) {
    if (x <= from[i + 1]) return to[i] + ((x - from[i]) / (from[i + 1] - from[i])) * (to[i + 1] - to[i]);
  }
  return x;
};

export function isWhite(hex: string) {
  const { l, s } = hexToHsl(hex);
  return l > 0.92 || (l > 0.85 && s < 0.15);
}

export function mixPaint(a: string, b: string): string {
  const A = hexToHsl(a), B = hexToHsl(b);
  // Màu xám/không bão hoà: chỉ pha sáng tối
  if (A.s < 0.12 || B.s < 0.12) {
    const base = A.s >= B.s ? A : B;
    return hslToHex({ h: base.h, s: (A.s + B.s) / 2, l: (A.l + B.l) / 2 });
  }
  const ha = interp(A.h, RGB_PTS, RYB_PTS) * Math.PI / 180;
  const hb = interp(B.h, RGB_PTS, RYB_PTS) * Math.PI / 180;
  let h = Math.atan2(Math.sin(ha) + Math.sin(hb), Math.cos(ha) + Math.cos(hb)) * 180 / Math.PI;
  if (h < 0) h += 360;
  // Hai màu đối nhau (vd. 0° & 180°) → ra nâu xỉn
  const opposite = Math.abs(Math.cos((ha - hb) / 2)) < 0.15;
  const rgbH = interp(h, RYB_PTS, RGB_PTS);
  return hslToHex({ h: rgbH, s: opposite ? 0.3 : Math.max(A.s, B.s), l: opposite ? 0.3 : (A.l + B.l) / 2 });
}

export function colorName(hex: string, en: boolean): string {
  const { h, s, l } = hexToHsl(hex);
  if (l > 0.92) return en ? "white" : "trắng";
  if (l < 0.12) return en ? "black" : "đen";
  if (s < 0.12) return en ? "gray" : "xám";
  const names: [number, string, string][] = [
    [15, "red", "đỏ"], [45, "orange", "cam"], [70, "yellow", "vàng"], [160, "green", "xanh lá"],
    [200, "cyan", "xanh ngọc"], [255, "blue", "xanh dương"], [290, "purple", "tím"], [335, "pink", "hồng"], [360, "red", "đỏ"],
  ];
  if (h >= 15 && h < 45 && l < 0.35) return en ? "brown" : "nâu";
  const n = names.find(([max]) => h < max) ?? names[0];
  return en ? n[1] : n[2];
}
