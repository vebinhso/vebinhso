// Vật liệu: cửa sổ (đợt 2) — procedural theo ảnh tham chiếu.
import * as THREE from "three";
import { useMemo } from "react";

function M({ c, m = 0.1, r = 0.45 }: { c: string; m?: number; r?: number }) {
  return <meshStandardMaterial color={c} metalness={m} roughness={r} />;
}
function Glass() {
  return <meshStandardMaterial color="#1c2228" transparent opacity={0.45} metalness={0.5} roughness={0.05} />;
}
function oakTex() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b89670"; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 50; i++) {
    g.strokeStyle = i % 3 ? "#8c6a48" : "#d4b893"; g.globalAlpha = 0.25; g.lineWidth = 1 + Math.random() * 1.5;
    const y = Math.random() * 64; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x / 30 + i) * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sash: khung + kính + song chia ô */
function Sash({ w, h, cols, rows, color, handle }: { w: number; h: number; cols: number; rows: number; color: string; handle?: number }) {
  const f = 0.06;
  return (
    <group>
      <mesh><boxGeometry args={[w - 2 * f, h - 2 * f, 0.015]} /><Glass /></mesh>
      {[-1, 1].map((s) => <mesh key={"v" + s} position={[s * (w / 2 - f / 2), 0, 0]}><boxGeometry args={[f, h, 0.07]} /><M c={color} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={"h" + s} position={[0, s * (h / 2 - f / 2), 0]}><boxGeometry args={[w, f, 0.07]} /><M c={color} /></mesh>)}
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <mesh key={"c" + i} position={[-w / 2 + f + ((i + 1) * (w - 2 * f)) / cols, 0, 0]}><boxGeometry args={[0.025, h - 2 * f, 0.04]} /><M c={color} /></mesh>
      ))}
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <mesh key={"r" + i} position={[0, -h / 2 + f + ((i + 1) * (h - 2 * f)) / rows, 0]}><boxGeometry args={[w - 2 * f, 0.025, 0.04]} /><M c={color} /></mesh>
      ))}
      {handle !== undefined && (
        <mesh position={[handle * (w / 2 - 0.1), 0, 0.05]}><boxGeometry args={[0.03, 0.16, 0.03]} /><M c="#1a1a1a" m={0.5} r={0.3} /></mesh>
      )}
    </group>
  );
}

/** Cửa sổ kiểu Pháp trắng 2 cánh, song chia ô */
export function WindowFrenchTallWhite() {
  const W = 1.6, H = 2.2, white = "#f4f5f6";
  return (
    <group>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (W / 2 - 0.05), H / 2, 0]} castShadow><boxGeometry args={[0.1, H, 0.14]} /><M c={white} /></mesh>)}
      {[0.05, H - 0.05].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[W, 0.1, 0.14]} /><M c={white} /></mesh>)}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 4 - 0.025), H / 2, 0.01]}>
          <Sash w={W / 2 - 0.05} h={H - 0.2} cols={2} rows={2} color={white} handle={-s} />
        </group>
      ))}
    </group>
  );
}

/** Cửa sổ 3 ô khung gỗ sồi, cánh trắng */
export function WindowTripleOakFrame() {
  const tex = useMemo(oakTex, []);
  const W = 2.6, H = 1.8, white = "#eef0f2", fw = 0.14, fd = 0.22;
  const inner = W - 2 * fw;
  return (
    <group>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (W / 2 - fw / 2), H / 2, 0]} castShadow><boxGeometry args={[fw, H, fd]} /><meshStandardMaterial map={tex} roughness={0.6} /></mesh>)}
      {[fw / 2, H - fw / 2].map((y) => <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[W, fw, fd]} /><meshStandardMaterial map={tex} roughness={0.6} /></mesh>)}
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[(i * inner) / 3, H / 2, i === 0 ? 0.03 : -0.02]}>
          <Sash w={inner / 3 + (i === 0 ? 0.02 : 0)} h={H - 2 * fw} cols={2} rows={3} color={white} handle={i === 0 ? -1 : undefined} />
        </group>
      ))}
    </group>
  );
}
