// Đồ ngoại thất: chậu cây, bảng hiệu, hòm thư — dựng procedural theo ảnh tham chiếu.
import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";

function M({ c, m = 0.05, r = 0.6 }: { c: string; m?: number; r?: number }) {
  return <meshStandardMaterial color={c} metalness={m} roughness={r} side={THREE.DoubleSide} />;
}

/** Lá hình thuôn (dài L, rộng W), có thể khoét lỗ kiểu monstera. */
function leafGeo(L: number, W: number, split = false, curl = 0.25) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(W * 0.9, L * 0.15, W * 0.75, L * 0.85, 0, L);
  s.bezierCurveTo(-W * 0.75, L * 0.85, -W * 0.9, L * 0.15, 0, 0);
  if (split) {
    for (let i = 0; i < 3; i++) {
      for (const sx of [1, -1]) {
        const h = new THREE.Path();
        const y = L * (0.25 + i * 0.2), x = sx * W * 0.32;
        h.absellipse(x, y, W * 0.11, L * 0.045, 0, Math.PI * 2, false, sx * 0.5);
        s.holes.push(h);
      }
    }
  }
  const g = new THREE.ShapeGeometry(s, 16);
  // uốn cong lá: hai mép cụp xuống, đầu lá rủ
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, -Math.abs(x) * curl * 1.4 - (y / L) * (y / L) * L * curl);
  }
  g.computeVertexNormals();
  return g;
}

function Leaf({ geo, color, pos, yaw, pitch, roll = 0 }: { geo: THREE.BufferGeometry; color: string; pos: [number, number, number]; yaw: number; pitch: number; roll?: number }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <group rotation={[pitch, 0, roll]}>
        <mesh geometry={geo} castShadow><meshStandardMaterial color={color} roughness={0.45} side={THREE.DoubleSide} /></mesh>
        {/* gân lá */}
        <mesh position={[0, 0, 0.004]}><boxGeometry args={[0.012, 0.001, 0.001]} /><M c="#dfe9b8" /></mesh>
      </group>
    </group>
  );
}

function Stem({ from, to, r = 0.018, color = "#5f7d37" }: { from: THREE.Vector3; to: THREE.Vector3; r?: number; color?: string }) {
  const len = from.distanceTo(to);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return <mesh position={mid} quaternion={q}><cylinderGeometry args={[r * 0.7, r, len, 8]} /><M c={color} r={0.5} /></mesh>;
}

function Soil({ y, r }: { y: number; r: number }) {
  return <mesh position={[0, y, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[r, 28]} /><M c="#3b2a1e" r={1} /></mesh>;
}

/** 1. Chậu trầu bà lá xẻ (monstera) – chậu trắng côn */
export function MonsteraPot() {
  const geo = useMemo(() => leafGeo(0.55, 0.48, true, 0.18), []);
  const leaves = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const yaw = (i / 9) * Math.PI * 2 + (i % 2) * 0.4;
    const h = 0.9 + (i % 4) * 0.22;
    const out = 0.25 + (i % 3) * 0.1;
    return { yaw, h, out, pitch: -0.9 - (i % 3) * 0.2 };
  }), []);
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.32, 0.24, 0.5, 40]} /><M c="#f4f4f2" r={0.35} /></mesh>
      <mesh position={[0, 0.5, 0]}><torusGeometry args={[0.315, 0.02, 10, 40]} /><M c="#ffffff" r={0.3} /></mesh>
      <Soil y={0.48} r={0.3} />
      {leaves.map((l, i) => {
        const tip = new THREE.Vector3(Math.sin(l.yaw) * l.out, l.h, Math.cos(l.yaw) * l.out);
        return (
          <group key={i}>
            <Stem from={new THREE.Vector3(0, 0.45, 0)} to={tip} />
            <Leaf geo={geo} color={i % 2 ? "#3f7f3a" : "#5c9a3c"} pos={[tip.x, tip.y, tip.z]} yaw={l.yaw} pitch={l.pitch} />
          </group>
        );
      })}
    </group>
  );
}

/** 2. Chậu chuối cảnh (thiên điểu) – chậu sứ trắng bầu */
export function BirdParadisePot() {
  const geo = useMemo(() => leafGeo(0.75, 0.26, false, 0.12), []);
  const leaves = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    yaw: (i / 8) * Math.PI * 2 + i * 0.3,
    h: 0.75 + (i % 3) * 0.25,
    pitch: -0.25 - (i % 3) * 0.18,
  })), []);
  return (
    <group>
      <mesh position={[0, 0.24, 0]} scale={[1, 0.9, 1]} castShadow>
        <sphereGeometry args={[0.32, 40, 24, 0, Math.PI * 2, Math.PI * 0.18, Math.PI * 0.62]} /><M c="#ecebe8" r={0.25} />
      </mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.18, 0.18, 0.04, 30]} /><M c="#dcdad6" r={0.3} /></mesh>
      <Soil y={0.46} r={0.27} />
      {leaves.map((l, i) => {
        const tip = new THREE.Vector3(Math.sin(l.yaw) * 0.08, l.h, Math.cos(l.yaw) * 0.08);
        return (
          <group key={i}>
            <Stem from={new THREE.Vector3(0, 0.45, 0)} to={tip} r={0.02} color="#557a2f" />
            <Leaf geo={geo} color={i % 2 ? "#2f6b2a" : "#3e8233"} pos={[tip.x, tip.y, tip.z]} yaw={l.yaw} pitch={l.pitch} roll={(i % 2 ? 1 : -1) * 0.25} />
          </group>
        );
      })}
    </group>
  );
}

/** 3. Chậu cây lá xanh – chậu đất nung */
export function TerracottaPlant() {
  const geo = useMemo(() => leafGeo(0.36, 0.3, false, 0.2), []);
  const leaves = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    yaw: (i / 9) * Math.PI * 2,
    h: 0.55 + (i % 3) * 0.13,
    out: 0.12 + (i % 2) * 0.06,
    pitch: i === 0 ? -0.15 : -0.7 - (i % 3) * 0.25,
  })), []);
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.28, 0.21, 0.4, 36]} /><M c="#d98a62" r={0.8} /></mesh>
      <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.31, 0.3, 0.08, 36, 1, true]} /><M c="#e09a72" r={0.8} /></mesh>
      <Soil y={0.43} r={0.28} />
      {leaves.map((l, i) => {
        const tip = new THREE.Vector3(Math.sin(l.yaw) * l.out, l.h, Math.cos(l.yaw) * l.out);
        return (
          <group key={i}>
            <Stem from={new THREE.Vector3(0, 0.4, 0)} to={tip} r={0.016} color="#8fbf5a" />
            <Leaf geo={geo} color={i % 2 ? "#8cc46a" : "#9dd27a"} pos={[tip.x, tip.y, tip.z]} yaw={l.yaw} pitch={l.pitch} />
          </group>
        );
      })}
    </group>
  );
}

const RED = "#d8341f", RIM = "#e9e9e9", POST = "#8d9094";

/** 4. Bảng hiệu hình ngôi nhà – 2 chân cắm */
export function HouseSign() {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.7, 0); s.lineTo(0.7, 0); s.lineTo(0.7, 0.8); s.lineTo(0.85, 0.8); s.lineTo(0.3, 1.3);
    s.lineTo(0.3, 1.5); s.lineTo(0.12, 1.5); s.lineTo(0.12, 1.45); s.lineTo(0, 1.55); s.lineTo(-0.85, 0.8); s.lineTo(-0.7, 0.8); s.lineTo(-0.7, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.03, bevelSegments: 2 });
    g.translate(0, 0, -0.04);
    return g;
  }, []);
  return (
    <group>
      {[-0.4, 0.4].map((x) => <mesh key={x} position={[x, 0.6, -0.06]} castShadow><boxGeometry args={[0.07, 1.2, 0.07]} /><M c={POST} m={0.5} r={0.4} /></mesh>)}
      <mesh geometry={geo} position={[0, 1.0, 0]} castShadow>
        <meshStandardMaterial attach="material-0" color={RED} roughness={0.45} />
        <meshStandardMaterial attach="material-1" color={RIM} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** 5. Biển chỉ hướng mũi tên */
export function ArrowSign() {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.75, 0); s.lineTo(-0.3, 0.38); s.lineTo(-0.3, 0.18); s.lineTo(0.75, 0.24);
    s.lineTo(0.55, 0); s.lineTo(0.75, -0.24); s.lineTo(-0.3, -0.18); s.lineTo(-0.3, -0.38); s.lineTo(-0.75, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.025, bevelSegments: 2 });
    g.translate(0, 0, -0.035);
    return g;
  }, []);
  return (
    <group>
      <mesh position={[0.15, 0.85, -0.06]} castShadow><boxGeometry args={[0.06, 1.7, 0.06]} /><M c={POST} m={0.5} r={0.4} /></mesh>
      <mesh geometry={geo} position={[0, 1.55, 0]} castShadow>
        <meshStandardMaterial attach="material-0" color={RED} roughness={0.45} />
        <meshStandardMaterial attach="material-1" color={RIM} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** 6. Bảng treo dây (khung cột) */
export function HangingSign() {
  const ropeL = useMemo(() => new THREE.Vector3(-0.35, 1.32, 0.05), []);
  const ropeR = useMemo(() => new THREE.Vector3(0.35, 1.32, 0.05), []);
  const top = new THREE.Vector3(0, 1.62, 0.05);
  return (
    <group>
      {[-0.65, 0.65].map((x) => <mesh key={x} position={[x, 0.9, 0]} castShadow><boxGeometry args={[0.07, 1.8, 0.07]} /><M c={POST} m={0.5} r={0.4} /></mesh>)}
      <mesh position={[0, 1.78, 0]}><boxGeometry args={[1.4, 0.06, 0.07]} /><M c={POST} m={0.5} r={0.4} /></mesh>
      <mesh position={[0, 1.7, 0.05]}><cylinderGeometry args={[0.012, 0.012, 0.16, 8]} /><M c="#666" m={0.8} r={0.3} /></mesh>
      <Stem from={top} to={ropeL} r={0.006} color="#9a9a9a" />
      <Stem from={top} to={ropeR} r={0.006} color="#9a9a9a" />
      <group position={[0, 1.0, 0.05]} rotation-x={0.06}>
        <RoundedBox args={[1.0, 0.7, 0.05]} radius={0.04} castShadow><M c={RIM} r={0.5} /></RoundedBox>
        <RoundedBox args={[0.94, 0.64, 0.06]} radius={0.03}><M c={RED} r={0.45} /></RoundedBox>
        {[-0.35, 0.35].map((x) => <mesh key={x} position={[x, 0.27, 0.035]}><sphereGeometry args={[0.018, 10, 8]} /><M c="#f5f5f5" m={0.6} r={0.3} /></mesh>)}
      </group>
    </group>
  );
}

/** 7. Hòm thư cờ cam – kem bo tròn */
export function CreamMailbox() {
  const body = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.28, 0); s.lineTo(0.28, 0); s.lineTo(0.28, 0.3); s.absarc(0, 0.3, 0.28, 0, Math.PI, false); s.lineTo(-0.28, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 24 });
    g.translate(0, 0, -0.4);
    return g;
  }, []);
  const door = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.16, 0); s.lineTo(0.16, 0); s.lineTo(0.16, 0.22); s.absarc(0, 0.22, 0.16, 0, Math.PI, false); s.lineTo(-0.16, 0);
    return new THREE.ShapeGeometry(s, 20);
  }, []);
  const cream = "#e7cba6";
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.2, 0.24, 0.06, 32]} /><M c={cream} r={0.5} /></mesh>
      <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.08, 0.08, 0.7, 24]} /><M c={cream} r={0.5} /></mesh>
      <mesh position={[0, 0.76, 0]}><boxGeometry args={[0.4, 0.04, 0.4]} /><M c="#dcbf98" r={0.55} /></mesh>
      <mesh geometry={body} position={[0, 0.78, 0]} castShadow><M c={cream} r={0.45} /></mesh>
      {/* cửa trước lõm tối */}
      <mesh geometry={door} position={[0, 0.84, 0.445]}><M c="#b8916a" r={0.7} /></mesh>
      {/* cờ cam */}
      <mesh position={[0.33, 1.1, 0.12]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.04, 24]} /><M c="#f47c2c" r={0.4} /></mesh>
      <mesh position={[0.34, 1.32, 0.12]}><boxGeometry args={[0.04, 0.5, 0.06]} /><M c="#f47c2c" r={0.4} /></mesh>
      <mesh position={[0.34, 1.48, 0.0]}><boxGeometry args={[0.04, 0.18, 0.22]} /><M c="#f47c2c" r={0.4} /></mesh>
    </group>
  );
}
