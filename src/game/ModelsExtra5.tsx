// Vật liệu: cột La Mã, các kiểu cửa ra vào, cửa sổ, rèm — dựng procedural theo ảnh tham chiếu.
import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { useWorldToggles } from "@/lib/world-toggles";

function M({ c, m = 0.05, r = 0.55 }: { c: string; m?: number; r?: number }) {
  return <meshStandardMaterial color={c} metalness={m} roughness={r} />;
}
function Glass({ tint = "#cfe6f2", o = 0.35 }: { tint?: string; o?: number }) {
  return <meshStandardMaterial color={tint} metalness={0.4} roughness={0.05} transparent opacity={o} />;
}

function useOpen(placedId?: string) {
  const t = useWorldToggles();
  return t.doorsOpen || (placedId ? !!t.openDoorIds?.includes(placedId) : false);
}

/** Lá cửa xoay quanh bản lề mép trái; con được dựng với tâm lá cửa ở gốc toạ độ. */
function Leaf({ w, open, side = 1, children }: { w: number; open: boolean; side?: 1 | -1; children: React.ReactNode }) {
  return (
    <group position={[-side * w / 2, 0, 0]} rotation-y={open ? -side * Math.PI / 2 : 0}>
      <group position={[side * w / 2, 0, 0]}>{children}</group>
    </group>
  );
}

function Lever({ x, y, z = 0.07, color = "#c9a24a" }: { x: number; y: number; z?: number; color?: string }) {
  return (
    <group position={[x, y, z]}>
      <mesh><boxGeometry args={[0.05, 0.22, 0.015]} /><M c={color} m={0.9} r={0.2} /></mesh>
      <mesh position={[-0.07, 0.04, 0.03]}><boxGeometry args={[0.16, 0.025, 0.025]} /><M c={color} m={0.9} r={0.2} /></mesh>
    </group>
  );
}

function Panel({ w, h, y, color, z = 0.06 }: { w: number; h: number; y: number; color: string; z?: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, z]}><boxGeometry args={[w, h, 0.02]} /><M c={color} r={0.5} /></mesh>
      <mesh position={[0, 0, z + 0.015]}><boxGeometry args={[w - 0.1, h - 0.1, 0.015]} /><M c={color} r={0.45} /></mesh>
    </group>
  );
}

/** Lưới song kính */
function Muntins({ w, h, cols, rows, y, color, z = 0.04 }: { w: number; h: number; cols: number; rows: number; y: number; color: string; z?: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh><boxGeometry args={[w, h, 0.02]} /><Glass /></mesh>
      {Array.from({ length: cols - 1 }, (_, i) => <mesh key={"c" + i} position={[-w / 2 + (w / cols) * (i + 1), 0, z]}><boxGeometry args={[0.035, h, 0.04]} /><M c={color} /></mesh>)}
      {Array.from({ length: rows - 1 }, (_, i) => <mesh key={"r" + i} position={[0, -h / 2 + (h / rows) * (i + 1), z]}><boxGeometry args={[w, 0.035, 0.04]} /><M c={color} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={s} position={[0, 0, s * z]}><boxGeometry args={[w + 0.04, h + 0.04, 0.005]} /><meshStandardMaterial color={color} transparent opacity={0} /></mesh>)}
    </group>
  );
}

/** 1. Cột La Mã trắng (đầu cột xoắn ốc, thân rãnh) */
export function RomanColumn() {
  const fluted = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const N = 20, R = 0.3;
    const shape = new THREE.Shape();
    for (let i = 0; i <= N * 8; i++) {
      const a = (i / (N * 8)) * Math.PI * 2;
      const r = R - 0.025 * Math.max(0, Math.sin(a * N));
      const p = new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
      pts.push(p);
      if (i === 0) shape.moveTo(p.x, p.y); else shape.lineTo(p.x, p.y);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 3.0, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const white = "#f1f1ef";
  return (
    <group>
      <mesh position={[0, 0.08, 0]} castShadow><boxGeometry args={[0.9, 0.16, 0.9]} /><M c={white} r={0.6} /></mesh>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.38, 0.42, 0.12, 40]} /><M c={white} r={0.6} /></mesh>
      <mesh position={[0, 0.32, 0]}><torusGeometry args={[0.34, 0.04, 12, 40]} /><M c={white} r={0.6} /></mesh>
      <mesh geometry={fluted} position={[0, 0.34, 0]} castShadow><M c={white} r={0.55} /></mesh>
      <mesh position={[0, 3.38, 0]}><torusGeometry args={[0.31, 0.035, 12, 40]} /><M c={white} r={0.6} /></mesh>
      {/* đầu cột lá acanthus */}
      <mesh position={[0, 3.55, 0]}><cylinderGeometry args={[0.42, 0.32, 0.3, 24]} /><M c="#e9e9e6" r={0.7} /></mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <mesh key={i} position={[Math.sin(a) * 0.36, 3.55, Math.cos(a) * 0.36]} rotation={[0.35 * Math.cos(a), 0, -0.35 * Math.sin(a)]}><sphereGeometry args={[0.09, 10, 8]} /><M c={white} r={0.6} /></mesh>;
      })}
      {/* xoắn ốc 4 góc */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.42, 3.72, z * 0.42]} rotation-y={Math.atan2(x, z)}><torusGeometry args={[0.08, 0.035, 10, 20]} /><M c={white} r={0.55} /></mesh>
      ))}
      <mesh position={[0, 3.82, 0]} castShadow><boxGeometry args={[1.0, 0.14, 1.0]} /><M c={white} r={0.55} /></mesh>
    </group>
  );
}

/** Khung bao cửa + nẹp trang trí */
function Casing({ w, h, color, classic = false }: { w: number; h: number; color: string; classic?: boolean }) {
  return (
    <group>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (w / 2 + 0.06), h / 2, 0]} castShadow><boxGeometry args={[0.12, h, 0.3]} /><M c={color} r={0.5} /></mesh>)}
      <mesh position={[0, h + 0.06, 0]}><boxGeometry args={[w + 0.24, 0.12, 0.3]} /><M c={color} r={0.5} /></mesh>
      {classic && <>
        <mesh position={[0, h + 0.2, 0.02]}><boxGeometry args={[w + 0.5, 0.16, 0.36]} /><M c={color} r={0.45} /></mesh>
        <mesh position={[0, h + 0.32, 0.02]}><boxGeometry args={[w + 0.6, 0.08, 0.42]} /><M c={color} r={0.45} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * (w / 2 + 0.1), h / 2, 0.12]}><boxGeometry args={[0.16, h, 0.08]} /><M c={color} r={0.45} /></mesh>)}
      </>}
    </group>
  );
}

/** 2. Cửa gỗ cổ điển ô kính 8 ô */
export function DoorWoodGlass({ placedId }: { placedId?: string }) {
  const open = useOpen(placedId), W = 1.2, H = 3, wood = "#a8621f";
  return (
    <group>
      <Casing w={W} h={H} color="#94541a" classic />
      <Leaf w={W} open={open}>
        <mesh position={[0, H / 2, 0]} castShadow><boxGeometry args={[W, H, 0.1]} /><M c={wood} r={0.45} /></mesh>
        <group position={[0, 0, 0.06]}><Muntins w={0.7} h={1.55} cols={2} rows={4} y={1.95} color="#7a4512" /></group>
        <group position={[0, 0, -0.06]}><Muntins w={0.7} h={1.55} cols={2} rows={4} y={1.95} color="#7a4512" z={-0.04} /></group>
        <Panel w={0.75} h={0.6} y={0.55} color="#9a5a1c" />
        <Lever x={-0.45} y={1.3} />
      </Leaf>
    </group>
  );
}

/** 3. Cửa gỗ sồi tân cổ điển 1 tấm */
export function DoorOakClassic({ placedId }: { placedId?: string }) {
  const open = useOpen(placedId), W = 1.2, H = 3, wood = "#e3c27d";
  return (
    <group>
      <Casing w={W} h={H} color="#d8b56f" classic />
      <Leaf w={W} open={open}>
        <mesh position={[0, H / 2, 0]} castShadow><boxGeometry args={[W, H, 0.1]} /><M c={wood} r={0.5} /></mesh>
        <Panel w={0.85} h={2.5} y={1.55} color="#dcb873" />
        <Lever x={-0.45} y={1.3} color="#5e4a2c" />
      </Leaf>
    </group>
  );
}

/** 4. Cửa đôi kiểu Pháp trắng, kính 10 ô */
export function DoorFrenchWhite({ placedId }: { placedId?: string }) {
  const open = useOpen(placedId), W = 2, H = 3, white = "#f4f5f6";
  const half = W / 2;
  const LeafBody = () => (
    <>
      <mesh position={[0, H / 2, 0]} castShadow><boxGeometry args={[half - 0.02, H, 0.08]} /><M c={white} r={0.4} /></mesh>
      <group position={[0, 0, 0.05]}><Muntins w={half - 0.3} h={H - 0.45} cols={2} rows={5} y={H / 2} color={white} /></group>
      <group position={[0, 0, -0.05]}><Muntins w={half - 0.3} h={H - 0.45} cols={2} rows={5} y={H / 2} color={white} z={-0.04} /></group>
    </>
  );
  return (
    <group>
      <Casing w={W} h={H} color="#e9eaec" />
      <group position={[-half / 2, 0, 0]}>
        <Leaf w={half} open={open} side={1}><LeafBody /><Lever x={0.38} y={1.4} color="#9aa0a6" /></Leaf>
      </group>
      <group position={[half / 2, 0, 0]}>
        <Leaf w={half} open={open} side={-1}><LeafBody /><Lever x={-0.38} y={1.4} color="#9aa0a6" /></Leaf>
      </group>
    </group>
  );
}

/** 5. Cửa trắng 2 ô panel */
export function DoorWhitePanel({ placedId }: { placedId?: string }) {
  const open = useOpen(placedId), W = 1.1, H = 3, white = "#f2f3f4";
  return (
    <group>
      <Casing w={W} h={H} color="#e8e9eb" />
      <Leaf w={W} open={open}>
        <mesh position={[0, H / 2, 0]} castShadow><boxGeometry args={[W, H, 0.1]} /><M c={white} r={0.45} /></mesh>
        <Panel w={0.75} h={1.25} y={2.1} color="#ececee" />
        <Panel w={0.75} h={1.0} y={0.7} color="#ececee" />
        {[0.4, 1.5, 2.6].map((y) => <mesh key={y} position={[-W / 2 + 0.02, y, 0.055]}><boxGeometry args={[0.04, 0.12, 0.02]} /><M c="#555" m={0.8} r={0.3} /></mesh>)}
        <Lever x={-0.42} y={1.35} color="#3c3d40" />
      </Leaf>
    </group>
  );
}

/** 6. Cửa kính khung nhôm đen */
export function DoorBlackGlass({ placedId }: { placedId?: string }) {
  const open = useOpen(placedId), W = 1.1, H = 3, black = "#1d1e20";
  return (
    <group>
      <Casing w={W} h={H} color={black} />
      <Leaf w={W} open={open}>
        {[-1, 1].map((s) => <mesh key={s} position={[s * (W / 2 - 0.05), H / 2, 0]} castShadow><boxGeometry args={[0.1, H, 0.1]} /><M c={black} m={0.6} r={0.35} /></mesh>)}
        {[0.06, H - 0.06].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[W, 0.12, 0.1]} /><M c={black} m={0.6} r={0.35} /></mesh>)}
        <mesh position={[0, H / 2, 0]}><boxGeometry args={[W - 0.2, H - 0.24, 0.02]} /><Glass tint="#9fb3bd" o={0.4} /></mesh>
        <mesh position={[-W / 2 + 0.18, 1.4, 0.08]}><boxGeometry args={[0.025, 0.4, 0.025]} /><M c="#c7cacd" m={0.9} r={0.2} /></mesh>
      </Leaf>
    </group>
  );
}

/** 7. Cửa sổ gỗ bật (3 cánh hất trên + 6 ô cố định) */
export function WindowAwningWood() {
  const W = 2, H = 1.5, wood = "#a88b5f";
  const fixedH = H * 0.62;
  return (
    <group>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (W / 2 - 0.03), H / 2, 0]}><boxGeometry args={[0.06, H, 0.1]} /><M c={wood} r={0.7} /></mesh>)}
      {[0.03, fixedH, H - 0.03].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[W, 0.06, 0.1]} /><M c={wood} r={0.7} /></mesh>)}
      <group position={[0, 0, 0]}><Muntins w={W - 0.1} h={fixedH - 0.06} cols={3} rows={2} y={fixedH / 2} color={wood} /></group>
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[i * (W / 3), H - 0.03, 0]} rotation-x={-0.5}>
          <group position={[0, -(H - fixedH) / 2, 0]}>
            <mesh><boxGeometry args={[W / 3 - 0.06, H - fixedH - 0.06, 0.02]} /><Glass tint="#556066" o={0.55} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[s * (W / 6 - 0.05), 0, 0]}><boxGeometry args={[0.04, H - fixedH - 0.04, 0.05]} /><M c={wood} r={0.7} /></mesh>)}
            {[-1, 1].map((s) => <mesh key={s} position={[0, s * ((H - fixedH) / 2 - 0.04), 0]}><boxGeometry args={[W / 3 - 0.06, 0.04, 0.05]} /><M c={wood} r={0.7} /></mesh>)}
          </group>
        </group>
      ))}
    </group>
  );
}

/** 8. Cửa sổ trắng 2 cánh mở quay (song kính) */
export function WindowCasementWhite() {
  const W = 2, H = 1.5, white = "#f3f4f5";
  return (
    <group>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (W / 2 - 0.04), H / 2, 0]}><boxGeometry args={[0.08, H, 0.12]} /><M c={white} r={0.4} /></mesh>)}
      {[0.04, H - 0.04].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[W, 0.08, 0.12]} /><M c={white} r={0.4} /></mesh>)}
      <mesh position={[0, 0.0, 0.1]}><boxGeometry args={[W + 0.1, 0.05, 0.25]} /><M c={white} r={0.4} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 2 - 0.08), 0, 0.02]} rotation-y={s * 0.35}>
          <group position={[-s * (W / 4 - 0.04), H / 2, 0]}>
            <RoundedBox args={[W / 2 - 0.1, H - 0.16, 0.06]} radius={0.01}><Glass o={0.3} /></RoundedBox>
            {[-1, 1].map((k) => <mesh key={"v" + k} position={[k * (W / 4 - 0.08), 0, 0]}><boxGeometry args={[0.06, H - 0.16, 0.07]} /><M c={white} r={0.4} /></mesh>)}
            {[-1, 1].map((k) => <mesh key={"h" + k} position={[0, k * (H / 2 - 0.11), 0]}><boxGeometry args={[W / 2 - 0.1, 0.06, 0.07]} /><M c={white} r={0.4} /></mesh>)}
            <mesh><boxGeometry args={[0.03, H - 0.2, 0.06]} /><M c={white} r={0.4} /></mesh>
            {[-0.2, 0.2].map((y) => <mesh key={y} position={[0, y * 2, 0]}><boxGeometry args={[W / 2 - 0.12, 0.03, 0.06]} /><M c={white} r={0.4} /></mesh>)}
          </group>
        </group>
      ))}
    </group>
  );
}

/** Rèm xếp ly — vải gợn sóng */
function Drape({ w, h, x = 0, color }: { w: number; h: number; x?: number; color: string }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, Math.max(24, Math.round(w * 40)), 8);
    const p = g.attributes.position as THREE.BufferAttribute;
    const folds = Math.max(4, Math.round(w * 9));
    for (let i = 0; i < p.count; i++) {
      const u = (p.getX(i) + w / 2) / w, v = (p.getY(i) + h / 2) / h;
      p.setZ(i, Math.sin(u * folds * Math.PI * 2) * (0.05 + 0.02 * (1 - v)));
    }
    g.computeVertexNormals();
    return g;
  }, [w, h]);
  return <mesh geometry={geo} position={[x, h / 2 + 0.05, 0.08]} castShadow><meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} /></mesh>;
}

function Rod({ w, y }: { w: number; y: number }) {
  return (
    <group position={[0, y, 0.08]}>
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, w, 14]} /><M c="#c9a24a" m={0.9} r={0.25} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * w / 2, 0, 0]}><sphereGeometry args={[0.045, 14, 10]} /><M c="#c9a24a" m={0.9} r={0.25} /></mesh>)}
    </group>
  );
}

/** 9. Rèm xếp ly xám (đóng) */
export function CurtainGrayClosed() {
  const W = 2.4, H = 3.6;
  return (<group><Rod w={W + 0.2} y={H + 0.12} /><Drape w={W} h={H} color="#77797c" /></group>);
}

/** 10. Rèm xếp ly xám vén 2 bên */
export function CurtainGrayOpen() {
  const W = 2.4, H = 3.6, pw = 0.45;
  return (
    <group>
      <Rod w={W + 0.2} y={H + 0.12} />
      <Drape w={pw} h={H} x={-W / 2 + pw / 2} color="#77797c" />
      <Drape w={pw} h={H} x={W / 2 - pw / 2} color="#77797c" />
    </group>
  );
}
