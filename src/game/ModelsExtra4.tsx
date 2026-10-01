// Đồ phòng bếp: tủ lạnh, bồn rửa, bộ bàn ăn — dựng procedural theo ảnh tham chiếu.
import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";

function M({ c, m = 0.1, r = 0.5 }: { c: string; m?: number; r?: number }) {
  return <meshStandardMaterial color={c} metalness={m} roughness={r} />;
}

function brushedTex(base: string, streak: string) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.strokeStyle = streak; g.globalAlpha = Math.random() * 0.12;
    const y = Math.random() * 256; g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + (Math.random() - 0.5) * 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function Feet({ w, d }: { w: number; d: number }) {
  return <>{[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
    <mesh key={i} position={[x * (w / 2 - 0.08), 0.03, z * (d / 2 - 0.08)]}><cylinderGeometry args={[0.04, 0.05, 0.06, 12]} /><M c="#666" m={0.7} r={0.3} /></mesh>
  ))}</>;
}

/** 1. Tủ lạnh 4 cửa đen nhám, viền đồng */
export function FridgeFrenchBlack() {
  const W = 1.6, D = 1.1, H = 3.2, split = 1.35, door = "#26272a";
  return (
    <group>
      <Feet w={W} d={D} />
      <mesh position={[0, H / 2 + 0.06, -0.03]} castShadow><boxGeometry args={[W, H, D - 0.06]} /><M c="#1b1b1d" r={0.55} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <RoundedBox args={[W / 2 - 0.015, H - split - 0.04, 0.07]} radius={0.015} position={[s * W / 4, split + 0.08 + (H - split) / 2, D / 2 - 0.02]} castShadow><M c={door} m={0.25} r={0.38} /></RoundedBox>
          <RoundedBox args={[W / 2 - 0.015, split - 0.06, 0.07]} radius={0.015} position={[s * W / 4, 0.06 + split / 2 - 0.02, D / 2 - 0.02]} castShadow><M c={door} m={0.25} r={0.38} /></RoundedBox>
          <mesh position={[s * W / 4, split + 0.02, D / 2 + 0.02]}><boxGeometry args={[W / 2 - 0.2, 0.05, 0.03]} /><M c="#111" r={0.6} /></mesh>
        </group>
      ))}
      <mesh position={[0, split + 0.065, D / 2 + 0.015]}><boxGeometry args={[W, 0.018, 0.02]} /><M c="#c89a6a" m={0.8} r={0.25} /></mesh>
    </group>
  );
}

/** 2. Tủ lạnh side-by-side xám đen có bảng điều khiển */
export function FridgeSideBySide() {
  const W = 1.8, D = 1.1, H = 3.4;
  const tex = useMemo(() => brushedTex("#3a3634", "#7a7470"), []);
  return (
    <group>
      <Feet w={W} d={D} />
      <mesh position={[0, H / 2 + 0.06, -0.03]} castShadow><boxGeometry args={[W, H, D - 0.06]} /><M c="#2a2826" r={0.5} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <RoundedBox args={[W / 2 - 0.015, H - 0.02, 0.07]} radius={0.012} position={[s * W / 4, H / 2 + 0.06, D / 2 - 0.02]} castShadow>
            <meshStandardMaterial map={tex} color="#d8d2cc" metalness={0.45} roughness={0.35} />
          </RoundedBox>
          <mesh position={[s * 0.03, H / 2 + 0.2, D / 2 + 0.03]}><boxGeometry args={[0.035, H * 0.75, 0.04]} /><M c="#8a8682" m={0.8} r={0.25} /></mesh>
        </group>
      ))}
      {/* bảng điều khiển */}
      <mesh position={[-0.2, H - 0.7, D / 2 + 0.017]}><planeGeometry args={[0.18, 0.5]} /><M c="#0c0c0d" r={0.15} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[-0.2, H - 0.55 - i * 0.12, D / 2 + 0.019]}><planeGeometry args={[0.08, 0.03]} /><meshStandardMaterial color="#cfe8ff" emissive="#9fd0ff" emissiveIntensity={0.6} /></mesh>)}
    </group>
  );
}

/** 3. Tủ lạnh inox ngăn đá dưới, có vòi lấy nước */
export function FridgeStainlessDispenser() {
  const W = 1.3, D = 1.1, H = 3.0, split = 1.1;
  const tex = useMemo(() => brushedTex("#a9acb0", "#ffffff"), []);
  return (
    <group>
      <Feet w={W} d={D} />
      <mesh position={[0, H / 2 + 0.06, -0.03]} castShadow><boxGeometry args={[W, H, D - 0.06]} /><meshStandardMaterial map={tex} color="#c6c8cb" metalness={0.6} roughness={0.35} /></mesh>
      <RoundedBox args={[W, H - split - 0.04, 0.07]} radius={0.012} position={[0, split + 0.08 + (H - split) / 2, D / 2 - 0.02]} castShadow><meshStandardMaterial map={tex} color="#d4d6d9" metalness={0.6} roughness={0.3} /></RoundedBox>
      <RoundedBox args={[W, split - 0.06, 0.07]} radius={0.012} position={[0, 0.04 + split / 2, D / 2 - 0.02]} castShadow><meshStandardMaterial map={tex} color="#d4d6d9" metalness={0.6} roughness={0.3} /></RoundedBox>
      <mesh position={[0, split + 0.03, D / 2 + 0.03]}><boxGeometry args={[W - 0.06, 0.06, 0.04]} /><M c="#8d9095" m={0.8} r={0.3} /></mesh>
      <mesh position={[-W / 2 + 0.06, split + 0.9, D / 2 + 0.05]}><boxGeometry args={[0.035, 0.75, 0.04]} /><M c="#9a9da2" m={0.85} r={0.2} /></mesh>
      {/* màn hình */}
      <mesh position={[0.15, H - 0.45, D / 2 + 0.017]}><planeGeometry args={[0.13, 0.5]} /><M c="#0b0b0c" r={0.15} /></mesh>
      <mesh position={[0.15, H - 0.38, D / 2 + 0.019]}><planeGeometry args={[0.07, 0.05]} /><meshStandardMaterial color="#ddeeff" emissive="#bfe0ff" emissiveIntensity={0.7} /></mesh>
      {/* hộc vòi nước */}
      <mesh position={[0.15, H - 1.1, D / 2 + 0.017]}><planeGeometry args={[0.3, 0.4]} /><M c="#aeb1b5" m={0.7} r={0.3} /></mesh>
      <mesh position={[0.15, H - 0.94, D / 2 + 0.02]}><planeGeometry args={[0.3, 0.08]} /><M c="#111" r={0.2} /></mesh>
      <mesh position={[0.15, H - 1.25, D / 2 + 0.01]}><boxGeometry args={[0.24, 0.02, 0.06]} /><M c="#555" m={0.6} r={0.3} /></mesh>
    </group>
  );
}

/** 4. Tủ lạnh mini đen bóng 1 cửa */
export function FridgeMiniBlack() {
  const W = 0.9, D = 0.9, H = 1.6;
  return (
    <group>
      <Feet w={W} d={D} />
      <mesh position={[0, H / 2 + 0.06, -0.03]} castShadow><boxGeometry args={[W, H, D - 0.06]} /><M c="#141414" r={0.4} /></mesh>
      <RoundedBox args={[W, H - 0.02, 0.06]} radius={0.01} position={[0, H / 2 + 0.06, D / 2 - 0.02]} castShadow><M c="#050505" m={0.3} r={0.08} /></RoundedBox>
      <mesh position={[0.25, H - 0.15, D / 2 + 0.012]}><planeGeometry args={[0.2, 0.22]} /><M c="#e9eef5" r={0.6} /></mesh>
      <mesh position={[0.38, 0.35, D / 2 + 0.03]}><boxGeometry args={[0.03, 0.1, 0.03]} /><M c="#888" m={0.6} r={0.3} /></mesh>
    </group>
  );
}

/** 5. Tủ lạnh mini kem bo tròn, tay nắm vàng */
export function FridgeCuteCream() {
  const W = 1.0, D = 0.9, cream = "#d9d4cf", gold = "#d4a24c";
  return (
    <group>
      <RoundedBox args={[W, 1.2, D]} radius={0.14} smoothness={5} position={[0, 0.6, 0]} castShadow><M c={cream} r={0.45} /></RoundedBox>
      <RoundedBox args={[W, 0.85, D]} radius={0.14} smoothness={5} position={[0, 1.65, 0]} castShadow><M c={cream} r={0.45} /></RoundedBox>
      <RoundedBox args={[W - 0.12, 1.05, 0.12]} radius={0.08} position={[0, 0.6, D / 2]}><M c="#e3dfdb" r={0.4} /></RoundedBox>
      <RoundedBox args={[W - 0.12, 0.72, 0.12]} radius={0.08} position={[0, 1.65, D / 2]}><M c="#e3dfdb" r={0.4} /></RoundedBox>
      {[0.8, 1.55].map((y) => (
        <group key={y} position={[-0.25, y, D / 2 + 0.09]}>
          <mesh><capsuleGeometry args={[0.03, 0.2, 6, 12]} /><M c={gold} m={0.7} r={0.3} /></mesh>
          {[-0.12, 0.12].map((dy) => <mesh key={dy} position={[0, dy, -0.03]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, 0.06, 10]} /><M c={gold} m={0.7} r={0.3} /></mesh>)}
        </group>
      ))}
    </group>
  );
}

/** Tủ đế bếp dùng chung cho bồn rửa */
function BaseCabinet({ w, d, top = "#2b2b2b" }: { w: number; d: number; top?: string }) {
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[w, 0.9, d]} /><M c="#e9e4dc" r={0.6} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * w / 4, 0.47, d / 2 + 0.005]}><planeGeometry args={[w / 2 - 0.05, 0.78]} /><M c="#f3efe8" r={0.5} /></mesh>
          <mesh position={[s * 0.08, 0.7, d / 2 + 0.03]}><boxGeometry args={[0.02, 0.18, 0.02]} /><M c="#888" m={0.8} r={0.3} /></mesh>
        </group>
      ))}
      <mesh position={[0, 0.92, 0]}><boxGeometry args={[w + 0.04, 0.04, d + 0.04]} /><M c={top} r={0.35} /></mesh>
    </group>
  );
}

function Basin({ w, d, depth, x = 0, z = 0, color = "#b9bcc0", m = 0.85, rack = true }: { w: number; d: number; depth: number; x?: number; z?: number; color?: string; m?: number; rack?: boolean }) {
  const y = 0.945 - depth / 2;
  return (
    <group position={[x, 0, z]}>
      {/* thành trong */}
      <mesh position={[0, y, 0]}><boxGeometry args={[w, depth, d]} /><meshStandardMaterial color={color} metalness={m} roughness={0.25} side={THREE.BackSide} /></mesh>
      <mesh position={[0, 0.945 - depth + 0.003, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.04, 20]} /><M c="#555" m={0.8} r={0.3} /></mesh>
      {rack && Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.06 + i * ((w - 0.12) / 6), 0.945 - depth + 0.03, 0]}><boxGeometry args={[0.008, 0.008, d - 0.08]} /><M c="#ddd" m={0.8} r={0.2} /></mesh>
      ))}
    </group>
  );
}

function SinkRim({ w, d, holes, color = "#c9ccd0", m = 0.85 }: { w: number; d: number; holes: { x: number; z: number; w: number; d: number }[]; color?: string; m?: number }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2); s.lineTo(-w / 2, -d / 2);
    holes.forEach((h) => { const p = new THREE.Path(); p.moveTo(h.x - h.w / 2, h.z - h.d / 2); p.lineTo(h.x + h.w / 2, h.z - h.d / 2); p.lineTo(h.x + h.w / 2, h.z + h.d / 2); p.lineTo(h.x - h.w / 2, h.z + h.d / 2); p.lineTo(h.x - h.w / 2, h.z - h.d / 2); s.holes.push(p); });
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g;
  }, [w, d, holes]);
  return <mesh geometry={geo} position={[0, 0.94, 0]}><meshStandardMaterial color={color} metalness={m} roughness={0.25} /></mesh>;
}

function Faucet({ x = 0, z = -0.38, color = "#c8cbcf", h = 0.55, reach = 0.25 }: { x?: number; z?: number; color?: string; h?: number; reach?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h * 0.85, 0), new THREE.Vector3(0, h, reach * 0.5), new THREE.Vector3(0, h * 0.8, reach),
  ]), [h, reach]);
  return (
    <group position={[x, 0.965, z]}>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.045, 0.05, 0.06, 20]} /><M c={color} m={0.9} r={0.18} /></mesh>
      <mesh><tubeGeometry args={[curve, 32, 0.022, 12, false]} /><M c={color} m={0.9} r={0.18} /></mesh>
      <mesh position={[0.06, 0.18, 0]} rotation-z={-0.4}><cylinderGeometry args={[0.012, 0.012, 0.12, 10]} /><M c={color} m={0.9} r={0.18} /></mesh>
    </group>
  );
}

/** 6. Bồn rửa inox 1 hố lớn */
export function SinkSingleSteel() {
  const W = 2, D = 1;
  const holes = useMemo(() => [{ x: 0, z: 0.05, w: 1.5, d: 0.6 }], []);
  return (
    <group>
      <BaseCabinet w={W} d={D} />
      <SinkRim w={1.7} d={0.85} holes={holes} />
      <Basin w={1.5} d={0.6} depth={0.32} z={0.05} />
      <Faucet x={0} z={-0.32} h={0.5} reach={0.28} />
    </group>
  );
}

/** 7. Bồn rửa inox 2 hố */
export function SinkDoubleSteel() {
  const W = 2, D = 1;
  const holes = useMemo(() => [{ x: -0.4, z: 0.05, w: 0.72, d: 0.6 }, { x: 0.4, z: 0.05, w: 0.72, d: 0.6 }], []);
  return (
    <group>
      <BaseCabinet w={W} d={D} />
      <SinkRim w={1.8} d={0.85} holes={holes} />
      <Basin w={0.72} d={0.6} depth={0.3} x={-0.4} z={0.05} />
      <Basin w={0.72} d={0.6} depth={0.3} x={0.4} z={0.05} />
      <Faucet x={0} z={-0.32} h={0.55} reach={0.3} />
    </group>
  );
}

/** 8. Bồn rửa đen đa năng (thác nước, rổ lọc, thớt gỗ) */
export function SinkBlackSmart() {
  const W = 2.4, D = 1, black = "#2a2b2d";
  const holes = useMemo(() => [{ x: 0.1, z: 0.07, w: 1.9, d: 0.62 }], []);
  return (
    <group>
      <BaseCabinet w={W} d={D} top="#1d1d1f" />
      <SinkRim w={2.2} d={0.88} holes={holes} color={black} m={0.5} />
      <Basin w={1.9} d={0.62} depth={0.3} x={0.1} z={0.07} color="#2e2f31" m={0.5} rack={false} />
      {/* vách chia + rổ lọc */}
      <mesh position={[-0.35, 0.8, 0.07]}><boxGeometry args={[0.02, 0.28, 0.62]} /><M c={black} m={0.5} r={0.3} /></mesh>
      <mesh position={[0.35, 0.9, 0.07]}><boxGeometry args={[0.55, 0.02, 0.55]} /><M c="#3a3b3e" m={0.5} r={0.4} /></mesh>
      {Array.from({ length: 30 }, (_, i) => <mesh key={i} position={[0.15 + (i % 6) * 0.08, 0.912, -0.12 + Math.floor(i / 6) * 0.09]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.012, 8]} /><M c="#111" /></mesh>)}
      {/* nắp xả tím */}
      <mesh position={[-0.55, 0.648, 0.07]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.03, 0.06, 24]} /><meshStandardMaterial color="#8a3cff" emissive="#6a1fd6" emissiveIntensity={0.5} /></mesh>
      {/* thớt gỗ */}
      <mesh position={[0.85, 1.05, 0.07]} rotation-z={0.25}><boxGeometry args={[0.05, 0.4, 0.6]} /><M c="#7a2e22" r={0.6} /></mesh>
      {/* máy rửa ly */}
      <mesh position={[-0.95, 0.99, -0.25]}><cylinderGeometry args={[0.12, 0.12, 0.08, 24]} /><M c="#111" m={0.5} r={0.3} /></mesh>
      {/* núm vàng + bình xà phòng */}
      <mesh position={[0.6, 1.0, -0.36]}><cylinderGeometry args={[0.045, 0.045, 0.07, 20]} /><M c="#d4b06a" m={0.9} r={0.2} /></mesh>
      <mesh position={[0.95, 1.02, -0.36]}><cylinderGeometry args={[0.025, 0.03, 0.1, 12]} /><M c="#111" r={0.3} /></mesh>
      {/* dải thác nước */}
      <mesh position={[0.25, 0.955, -0.27]}><boxGeometry args={[0.7, 0.02, 0.08]} /><M c="#141414" m={0.4} r={0.3} /></mesh>
      <Faucet x={0.05} z={-0.36} color="#5b5d61" h={0.75} reach={0.32} />
      <Faucet x={-0.55} z={-0.36} color="#5b5d61" h={0.45} reach={0.15} />
    </group>
  );
}

/** 9. Bộ bàn ăn tròn gỗ sồi + 4 ghế song tiện */
export function OakDiningSet() {
  const wood = "#d8b27a", dark = "#c79d62";
  const Chair = ({ a }: { a: number }) => (
    <group rotation-y={a} position={[Math.sin(a) * 1.15, 0, Math.cos(a) * 1.15]}>
      <group rotation-y={Math.PI}>
        <RoundedBox args={[0.6, 0.06, 0.55]} radius={0.02} position={[0, 0.6, 0]} castShadow><M c={wood} r={0.55} /></RoundedBox>
        {[[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.3, z]} rotation={[z * 0.15, 0, -x * 0.15]}><cylinderGeometry args={[0.022, 0.028, 0.6, 10]} /><M c={dark} r={0.55} /></mesh>
        ))}
        {[-0.24, -0.12, 0, 0.12, 0.24].map((x) => <mesh key={x} position={[x, 0.95, -0.26]}><cylinderGeometry args={[0.012, 0.012, 0.68, 8]} /><M c={wood} r={0.55} /></mesh>)}
        <RoundedBox args={[0.62, 0.07, 0.05]} radius={0.02} position={[0, 1.3, -0.26]}><M c={wood} r={0.55} /></RoundedBox>
      </group>
    </group>
  );
  return (
    <group>
      <mesh position={[0, 1.02, 0]} castShadow><cylinderGeometry args={[0.8, 0.78, 0.06, 48]} /><M c={wood} r={0.5} /></mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = i * Math.PI / 2 + Math.PI / 4;
        return <mesh key={i} position={[Math.sin(a) * 0.45, 0.5, Math.cos(a) * 0.45]} rotation={[Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12]}><cylinderGeometry args={[0.035, 0.04, 1.0, 12]} /><M c={dark} r={0.55} /></mesh>;
      })}
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, 0.3, 0]} rotation-y={i * Math.PI * 2 / 3}><boxGeometry args={[0.03, 0.03, 0.9]} /><M c={dark} /></mesh>)}
      {/* lọ hoa + đèn nến */}
      <mesh position={[0.15, 1.18, 0]}><sphereGeometry args={[0.1, 20, 16]} /><meshStandardMaterial color="#b0702a" transparent opacity={0.75} roughness={0.1} /></mesh>
      {[-0.03, 0, 0.03].map((x, i) => <mesh key={i} position={[0.15 + x, 1.45, 0]} rotation-z={x * 4}><cylinderGeometry args={[0.004, 0.004, 0.4, 5]} /><M c="#c9a46a" /></mesh>)}
      <mesh position={[-0.15, 1.13, 0.05]}><icosahedronGeometry args={[0.08, 0]} /><meshStandardMaterial color="#222" wireframe /></mesh>
      {[0, 1, 2, 3].map((i) => <Chair key={i} a={i * Math.PI / 2 + Math.PI / 4} />)}
    </group>
  );
}
