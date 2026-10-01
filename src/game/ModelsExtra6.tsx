// Đồ phòng bếp (đợt 2): loa full, bếp gas, bàn ăn, tủ mát, tủ gỗ — procedural theo ảnh tham chiếu.
import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";

function M({ c, m = 0.1, r = 0.5 }: { c: string; m?: number; r?: number }) {
  return <meshStandardMaterial color={c} metalness={m} roughness={r} />;
}

function grilleTex() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0c0c0d"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 10) for (let x = 0; x < 256; x += 10) {
    g.fillStyle = "#2a2a2c"; g.beginPath(); g.arc(x + ((y / 10) % 2) * 5, y, 3.2, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3);
  return t;
}

function woodTex(base: string, line: string) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = line; g.globalAlpha = 0.08 + Math.random() * 0.12; g.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * 256; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x / 40 + i) * 3);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Loa full sân khấu đen, lưới tổ ong */
export function SpeakerFullBlack() {
  const tex = useMemo(grilleTex, []);
  const W = 0.9, D = 0.85, H = 1.5;
  return (
    <group>
      <RoundedBox args={[W, H, D]} radius={0.04} position={[0, H / 2, 0]} castShadow><M c="#151516" r={0.85} /></RoundedBox>
      <mesh position={[0, H / 2, D / 2 + 0.005]}><planeGeometry args={[W - 0.06, H - 0.06]} /><meshStandardMaterial map={tex} metalness={0.4} roughness={0.6} /></mesh>
      <mesh position={[0, H * 0.45, D / 2 + 0.012]}><planeGeometry args={[0.1, 0.12]} /><M c="#c9c9c9" m={0.6} r={0.3} /></mesh>
      <mesh position={[0, H * 0.45, D / 2 + 0.014]}><planeGeometry args={[0.05, 0.06]} /><M c="#c0262d" /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 + 0.002), H * 0.7, 0]} rotation-y={s * Math.PI / 2}><planeGeometry args={[0.18, 0.1]} /><M c="#050505" /></mesh>
      ))}
    </group>
  );
}

/** Bếp gas âm kính đen 2 vùng lửa xanh */
export function GasStoveGlass() {
  const W = 1.5, D = 0.8;
  return (
    <group>
      <RoundedBox args={[W, 0.06, D]} radius={0.02} position={[0, 0.03, 0]} castShadow><meshStandardMaterial color="#08090b" metalness={0.3} roughness={0.08} /></RoundedBox>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * W * 0.27, 0.06, -0.05]}>
          <mesh><cylinderGeometry args={[0.22, 0.24, 0.03, 32]} /><M c="#9aa0a6" m={0.9} r={0.25} /></mesh>
          <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.12, 0.12, 0.03, 24]} /><M c="#222" m={0.6} /></mesh>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <mesh key={i} position={[Math.cos(a) * 0.13, 0.08, Math.sin(a) * 0.13]}><coneGeometry args={[0.025, 0.09, 8]} /><meshStandardMaterial color="#2f7bff" emissive="#1e5bff" emissiveIntensity={2} transparent opacity={0.85} /></mesh>;
          })}
          <mesh position={[0, 0.09, 0]}><coneGeometry args={[0.05, 0.12, 12]} /><meshStandardMaterial color="#4f9bff" emissive="#2a6bff" emissiveIntensity={2} transparent opacity={0.8} /></mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, 0.06, 0]} rotation-y={i * Math.PI / 4}><boxGeometry args={[0.46, 0.02, 0.025]} /><M c="#111" m={0.5} /></mesh>
          ))}
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1, 0.09, D / 2 - 0.13]}><cylinderGeometry args={[0.045, 0.05, 0.06, 20]} /><M c="#cfd3d6" m={0.9} r={0.2} /></mesh>
      ))}
      <mesh position={[0, 0.061, 0.02]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.16, 0.06]} /><meshStandardMaterial color="#5ab0ff" emissive="#2a80ff" emissiveIntensity={0.8} /></mesh>
      <mesh position={[0, 0.062, -0.12]}><sphereGeometry args={[0.015, 10, 10]} /><meshStandardMaterial color="#ff2a2a" emissive="#ff0000" emissiveIntensity={1.5} /></mesh>
    </group>
  );
}

function SpindleChair({ wood, seat }: { wood: string; seat: string }) {
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.2, 0.25, z * 0.2]} castShadow><cylinderGeometry args={[0.025, 0.02, 0.5, 10]} /><M c={wood} r={0.45} /></mesh>
      ))}
      <RoundedBox args={[0.5, 0.06, 0.5]} radius={0.02} position={[0, 0.52, 0]}><M c={wood} r={0.45} /></RoundedBox>
      <RoundedBox args={[0.44, 0.05, 0.44]} radius={0.02} position={[0, 0.57, 0.01]}><M c={seat} r={0.8} /></RoundedBox>
      {[-0.18, -0.06, 0.06, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.85, -0.22]} castShadow><cylinderGeometry args={[0.018, 0.018, 0.55, 8]} /><M c={wood} r={0.45} /></mesh>
      ))}
      <mesh position={[0, 1.14, -0.22]} rotation-z={Math.PI / 2}><torusGeometry args={[0.22, 0.03, 10, 24, Math.PI]} /><M c={wood} r={0.4} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.2, 1.12, -0.22]}><torusGeometry args={[0.05, 0.02, 8, 16]} /><M c={wood} r={0.4} /></mesh>
      ))}
    </group>
  );
}

/** Bộ bàn ăn vuông gỗ sáng 4 ghế đệm cam */
export function SquareDiningSet() {
  const top = useMemo(() => woodTex("#e3c48c", "#a7804a"), []);
  const wood = "#d9a85c";
  return (
    <group>
      <RoundedBox args={[1.3, 0.07, 1.3]} radius={0.02} position={[0, 1.02, 0]} castShadow><meshStandardMaterial map={top} roughness={0.45} /></RoundedBox>
      <mesh position={[0, 0.95, 0]}><boxGeometry args={[1.18, 0.1, 1.18]} /><M c="#7a4a2a" r={0.5} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.55, 0.47, z * 0.55]} castShadow><boxGeometry args={[0.08, 0.95, 0.08]} /><M c="#6b3d22" r={0.5} /></mesh>
      ))}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return <group key={i} position={[Math.sin(a) * 1.0, 0, Math.cos(a) * 1.0]} rotation-y={a + Math.PI}><SpindleChair wood={wood} seat="#c4612c" /></group>;
      })}
    </group>
  );
}

function SlatChair({ wood, seat }: { wood: string; seat: string }) {
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.21, z < 0 ? 0.6 : 0.26, z * 0.21]} castShadow><boxGeometry args={[0.05, z < 0 ? 1.2 : 0.52, 0.05]} /><M c={wood} r={0.5} /></mesh>
      ))}
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.42, 0.03, 0.03]} /><M c={wood} /></mesh>
      <RoundedBox args={[0.5, 0.08, 0.48]} radius={0.03} position={[0, 0.55, 0]}><M c={seat} r={0.9} /></RoundedBox>
      <mesh position={[0, 1.15, -0.21]}><boxGeometry args={[0.46, 0.07, 0.04]} /><M c={wood} r={0.5} /></mesh>
      {[-0.15, -0.05, 0.05, 0.15].map((x) => (
        <mesh key={x} position={[x, 0.87, -0.21]}><boxGeometry args={[0.035, 0.5, 0.025]} /><M c={wood} r={0.5} /></mesh>
      ))}
    </group>
  );
}

/** Bộ bàn ăn tròn gỗ nâu 4 ghế lưng nan */
export function RoundSlatDiningSet() {
  const top = useMemo(() => woodTex("#b9824a", "#7a4f26"), []);
  const wood = "#9c6a38";
  return (
    <group>
      <mesh position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.7, 0.7, 0.06, 48]} /><meshStandardMaterial map={top} roughness={0.4} /></mesh>
      <mesh position={[0, 0.93, 0]}><cylinderGeometry args={[0.6, 0.6, 0.08, 40]} /><M c={wood} /></mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return <mesh key={i} position={[Math.sin(a) * 0.42, 0.46, Math.cos(a) * 0.42]} castShadow><boxGeometry args={[0.07, 0.92, 0.07]} /><M c={wood} /></mesh>;
      })}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return <group key={i} position={[Math.sin(a) * 0.95, 0, Math.cos(a) * 0.95]} rotation-y={a + Math.PI}><SlatChair wood={wood} seat="#cdb79a" /></group>;
      })}
    </group>
  );
}

/** Tủ mát trưng bày 3 cánh kính inox */
export function DisplayCooler3Door() {
  const W = 2.4, D = 1.0, H = 3.2, base = 0.55;
  return (
    <group>
      <mesh position={[0, H / 2, 0]} castShadow><boxGeometry args={[W, H, D]} /><M c="#c9cccf" m={0.7} r={0.35} /></mesh>
      <mesh position={[0, H - 0.18, D / 2 + 0.01]}><boxGeometry args={[W * 0.6, 0.12, 0.02]} /><M c="#2b2d30" r={0.3} /></mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.09 + i * 0.16, D / 2 + 0.01]}><boxGeometry args={[W - 0.1, 0.03, 0.02]} /><M c="#9da1a5" m={0.6} /></mesh>
      ))}
      <mesh position={[0, (H - 0.35 + base) / 2, D / 2 - 0.25]}><boxGeometry args={[W - 0.12, H - 0.4 - base, 0.4]} /><M c="#e9ecef" r={0.6} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, base + 0.2 + i * 0.55, D / 2 - 0.25]}><boxGeometry args={[W - 0.16, 0.02, 0.6]} /><M c="#8d9196" m={0.8} r={0.3} /></mesh>
      ))}
      {[-1, 0, 1].map((s) => (
        <group key={s} position={[s * W / 3, (H - 0.35 + base) / 2, D / 2 + 0.02]}>
          <mesh><boxGeometry args={[W / 3 - 0.03, H - 0.4 - base, 0.04]} /><meshStandardMaterial color="#cfe4ee" transparent opacity={0.22} metalness={0.2} roughness={0.05} /></mesh>
          {[-1, 1].map((e) => <mesh key={e} position={[e * (W / 6 - 0.03), 0, 0.01]}><boxGeometry args={[0.04, H - 0.4 - base, 0.05]} /><M c="#b7bbbf" m={0.8} r={0.3} /></mesh>)}
          <mesh position={[W / 6 - 0.1, 0.2, 0.05]}><boxGeometry args={[0.03, 0.4, 0.03]} /><M c="#ddd" m={0.9} r={0.2} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Tủ gỗ bếp 2 cánh, ngăn kéo */
export function WoodenKitchenCabinet() {
  const tex = useMemo(() => woodTex("#a86a3a", "#5e3517"), []);
  const W = 1.4, D = 0.7, H = 1.9;
  return (
    <group>
      <mesh position={[0, H / 2 + 0.08, 0]} castShadow><boxGeometry args={[W, H, D]} /><meshStandardMaterial map={tex} roughness={0.55} /></mesh>
      <mesh position={[0, H + 0.12, 0]}><boxGeometry args={[W + 0.08, 0.06, D + 0.06]} /><meshStandardMaterial map={tex} roughness={0.5} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * W / 4, 1.25, D / 2 + 0.015]}><boxGeometry args={[W / 2 - 0.08, 1.1, 0.03]} /><meshStandardMaterial map={tex} color="#c58a55" roughness={0.5} /></mesh>
          <mesh position={[s * W / 4, 1.25, D / 2 + 0.035]}><boxGeometry args={[W / 2 - 0.24, 0.9, 0.02]} /><meshStandardMaterial map={tex} color="#b27947" roughness={0.5} /></mesh>
          <mesh position={[s * 0.07, 1.2, D / 2 + 0.07]}><sphereGeometry args={[0.03, 12, 12]} /><M c="#c9a14a" m={0.9} r={0.25} /></mesh>
        </group>
      ))}
      {[0, 1].map((i) => (
        <group key={i} position={[0, 0.3 + i * 0.3, D / 2 + 0.015]}>
          <mesh><boxGeometry args={[W - 0.1, 0.25, 0.03]} /><meshStandardMaterial map={tex} color="#c58a55" roughness={0.5} /></mesh>
          <mesh position={[0, 0, 0.03]}><boxGeometry args={[0.25, 0.03, 0.03]} /><M c="#c9a14a" m={0.9} r={0.25} /></mesh>
        </group>
      ))}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * (W / 2 - 0.06), 0.04, z * (D / 2 - 0.06)]}><boxGeometry args={[0.07, 0.08, 0.07]} /><M c="#5a3417" /></mesh>
      ))}
    </group>
  );
}
