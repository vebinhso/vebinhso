import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, Cloud, Clouds, Environment, ContactShadows, SoftShadows } from "@react-three/drei";
import { Suspense, type ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getItem, type CatalogItem } from "./catalog";
import { ItemModel } from "./Models";
import type { PlacedItem, WallSegment, RoofSegment } from "@/lib/game";
import { WALL_HEIGHT } from "@/lib/game";

const GRID = 20;
const CELL = 1;
// Đường đi 1 ô bao quanh mảnh đất 20x20 ⇒ (22² − 20²) = 84 ô đường
const PATH = 1;
// Toàn bộ vùng nông thôn: 220×220 = 48,400 grid cells
const WORLD = 220;

type Props = {
  placed: PlacedItem[];
  walls: WallSegment[];
  roofs: RoofSegment[];
  wallColor: string;
  wallMode: boolean;
  wallPickA: string | null;
  roofMode: boolean;
  roofPicks: string[];
  selectedItemId: string | null;
  rotation: number;
  onRotate: () => void;
  onPlace: (x: number, z: number) => void;
  onRemove: (id: string) => void;
  onPillarClick: (placedId: string) => void;
  onWallRemove: (id: string) => void;
  onRoofRemove: (id: string) => void;
};

function Character({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const ref = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Mesh>(null!);
  const armR = useRef<THREE.Mesh>(null!);
  const legL = useRef<THREE.Mesh>(null!);
  const legR = useRef<THREE.Mesh>(null!);
  const keys = useRef<Record<string, boolean>>({});
  const yVel = useRef(0);
  const grounded = useRef(true);
  const walkPhase = useRef(0);
  const { camera } = useThree();

  const [outfit, setOutfit] = useState<any>(null);
  useEffect(() => {
    import("@/lib/character").then((m) => setOutfit(m.loadOutfit() || m.DEFAULT_OUTFIT));
  }, []);
  const o = outfit || { skin: "#fde68a", hair: "#7c2d12", shirt: "#ef4444", pants: "#1e40af", shoes: "#1f2937", accent: "#fcd34d", hat: undefined };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const k = keys.current;
    const speed = 6;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; camDir.normalize();
    const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (k["w"]) move.add(camDir);
    if (k["s"]) move.sub(camDir);
    if (k["d"]) move.add(right);
    if (k["a"]) move.sub(right);
    const moving = move.lengthSq() > 0;
    if (moving) {
      move.normalize().multiplyScalar(speed * dt);
      ref.current.position.x += move.x;
      ref.current.position.z += move.z;
      ref.current.rotation.y = Math.atan2(move.x, move.z);
      walkPhase.current += dt * 10;
    } else {
      walkPhase.current *= 0.8;
    }
    const swing = Math.sin(walkPhase.current) * 0.7;
    if (armL.current) armL.current.rotation.x = swing;
    if (armR.current) armR.current.rotation.x = -swing;
    if (legL.current) legL.current.rotation.x = -swing;
    if (legR.current) legR.current.rotation.x = swing;

    if (k[" "] && grounded.current) { yVel.current = 7; grounded.current = false; }
    yVel.current -= 18 * dt;
    ref.current.position.y += yVel.current * dt;
    if (ref.current.position.y <= 0) { ref.current.position.y = 0; yVel.current = 0; grounded.current = true; }

    const limit = WORLD / 2 - 0.5;
    ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x, -limit, limit);
    ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z, -limit, limit);

    if (controlsRef.current) {
      const t = new THREE.Vector3(ref.current.position.x, ref.current.position.y + 1.0, ref.current.position.z);
      controlsRef.current.target.lerp(t, 0.18);
      controlsRef.current.update();
    }
  });

  // Character: 2 cells tall × 1 cell wide
  return (
    <group ref={ref} position={[0, 0, 0]}>
      <mesh ref={legL} castShadow position={[-0.18, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.7, 0.22]} />
        <meshStandardMaterial color={o.pants} />
      </mesh>
      <mesh ref={legR} castShadow position={[0.18, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.7, 0.22]} />
        <meshStandardMaterial color={o.pants} />
      </mesh>
      <mesh position={[-0.18, 0.05, 0.04]} castShadow>
        <boxGeometry args={[0.28, 0.1, 0.36]} />
        <meshStandardMaterial color={o.shoes} />
      </mesh>
      <mesh position={[0.18, 0.05, 0.04]} castShadow>
        <boxGeometry args={[0.28, 0.1, 0.36]} />
        <meshStandardMaterial color={o.shoes} />
      </mesh>
      <mesh castShadow position={[0, 1.02, 0]}>
        <boxGeometry args={[0.65, 0.65, 0.38]} />
        <meshStandardMaterial color={o.shirt} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[0.68, 0.08, 0.4]} />
        <meshStandardMaterial color={o.accent} />
      </mesh>
      <mesh ref={armL} castShadow position={[-0.42, 1.05, 0]}>
        <boxGeometry args={[0.18, 0.62, 0.22]} />
        <meshStandardMaterial color={o.shirt} />
      </mesh>
      <mesh ref={armR} castShadow position={[0.42, 1.05, 0]}>
        <boxGeometry args={[0.18, 0.62, 0.22]} />
        <meshStandardMaterial color={o.shirt} />
      </mesh>
      <mesh castShadow position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color={o.skin} />
      </mesh>
      <mesh castShadow position={[0, 1.82, -0.03]}>
        <sphereGeometry args={[0.32, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={o.hair} />
      </mesh>
      {o.hat && (
        <mesh castShadow position={[0, 1.98, 0]}>
          <coneGeometry args={[0.34, 0.32, 16]} />
          <meshStandardMaterial color={o.hat} />
        </mesh>
      )}
      <mesh position={[-0.1, 1.68, 0.26]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.1, 1.68, 0.26]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}


function isRoof(id: string) {
  return id === "roof" || id === "roof_ton";
}

function WallMesh({ w, color, highlight, onRemove }: { w: WallSegment; color: string; highlight?: boolean; onRemove: () => void }) {
  const dx = w.bx - w.ax;
  const dz = w.bz - w.az;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const cx = (w.ax + w.bx) / 2;
  const cz = (w.az + w.bz) / 2;
  return (
    <group position={[cx, 0, cz]} rotation={[0, angle, 0]} onContextMenu={(e) => { e.stopPropagation(); onRemove(); }}>
      <mesh castShadow receiveShadow position={[0, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.25, WALL_HEIGHT, len]} />
        <meshStandardMaterial color={highlight ? "#fde047" : (w.color || color)} roughness={0.9} />
      </mesh>
      {/* Top concrete cap */}
      <mesh castShadow position={[0, WALL_HEIGHT + 0.06, 0]}>
        <boxGeometry args={[0.35, 0.12, len]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.8} />
      </mesh>
    </group>
  );
}

function RoofMesh({ r, onRemove }: { r: RoofSegment; onRemove: () => void }) {
  const w = Math.abs(r.bx - r.ax);
  const d = Math.abs(r.bz - r.az);
  const cx = (r.ax + r.bx) / 2;
  const cz = (r.az + r.bz) / 2;
  const color = r.style === "ton" ? "#b91c1c" : "#7f1d1d";
  return (
    <group position={[cx, WALL_HEIGHT, cz]} onContextMenu={(e) => { e.stopPropagation(); onRemove(); }}>
      {/* Sloped pyramid-style roof: a flat slab + a low ridge for visual */}
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
        <meshStandardMaterial color={color} roughness={r.style === "ton" ? 0.4 : 0.85} metalness={r.style === "ton" ? 0.5 : 0.05} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[w + 0.1, 0.2, d * 0.25]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ---------------- Neighborhood (vùng xung quanh mảnh đất) ----------------
// Sinh deterministic dựa trên seed lưới để tạo cảm giác "thành phố nhỏ"
// với nhiều mô hình nhà 3D đủ hình thù + đồng cỏ xanh xen kẽ.
function NeighborHouse({ seed, color, roofColor }: { seed: number; color: string; roofColor: string }) {
  const shape = seed % 4; // 0: box+gable, 1: L-shape, 2: tower, 3: wide bungalow
  const h = 2.2 + ((seed * 13) % 5) * 0.6;
  const w = 2.6 + ((seed * 7) % 4) * 0.7;
  const d = 2.6 + ((seed * 11) % 4) * 0.7;
  return (
    <group>
      {/* thân nhà */}
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* cánh phụ cho L-shape */}
      {shape === 1 && (
        <mesh castShadow receiveShadow position={[w * 0.55, (h * 0.7) / 2, -d * 0.25]}>
          <boxGeometry args={[w * 0.55, h * 0.7, d * 0.55]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      )}
      {/* tháp cho shape 2 */}
      {shape === 2 && (
        <mesh castShadow position={[w * 0.3, h * 0.9, d * 0.3]}>
          <cylinderGeometry args={[0.5, 0.6, h * 0.8, 10]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      )}
      {/* mái ngói */}
      {shape === 3 ? (
        <mesh castShadow position={[0, h + 0.25, 0]}>
          <boxGeometry args={[w + 0.3, 0.5, d + 0.3]} />
          <meshStandardMaterial color={roofColor} roughness={0.7} />
        </mesh>
      ) : (
        <mesh castShadow position={[0, h + 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <coneGeometry args={[Math.max(w, d) * 0.75, 1.1, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.7} />
        </mesh>
      )}
      {/* cửa */}
      <mesh position={[0, 0.55, d / 2 + 0.01]}>
        <boxGeometry args={[0.55, 1.1, 0.05]} />
        <meshStandardMaterial color="#3b2417" />
      </mesh>
      {/* 2 cửa sổ phát sáng nhẹ */}
      <mesh position={[-w / 3, h * 0.55, d / 2 + 0.01]}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#fde68a" emissive="#facc15" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[w / 3, h * 0.55, d / 2 + 0.01]}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#fde68a" emissive="#facc15" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function NeighborTree({ seed }: { seed: number }) {
  const h = 1.2 + ((seed * 3) % 5) * 0.3;
  const leafColors = ["#22c55e", "#16a34a", "#15803d", "#65a30d", "#4d7c0f"];
  const c = leafColors[seed % leafColors.length];
  return (
    <group>
      <mesh castShadow position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, h, 8]} />
        <meshStandardMaterial color="#5b3318" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, h + 0.4, 0]}>
        <sphereGeometry args={[0.7 + (seed % 3) * 0.15, 14, 12]} />
        <meshStandardMaterial color={c} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Neighborhood() {
  // Mảnh trung tâm (mảnh đất người chơi) cần được chừa lại.
  // half mảnh + đường = 11 ô; thêm một dải an toàn nhỏ.
  const innerHalf = (GRID + PATH * 2) / 2 + 1; // ~12
  const worldHalf = WORLD / 2;
  // Khoảng cách giữa các "lô hàng xóm" theo bố cục thành phố nhỏ
  const STEP = 14;
  const palettes = [
    { wall: "#f5e6c8", roof: "#b91c1c" },
    { wall: "#fde68a", roof: "#7f1d1d" },
    { wall: "#fecaca", roof: "#475569" },
    { wall: "#bae6fd", roof: "#0c4a6e" },
    { wall: "#d9f99d", roof: "#365314" },
    { wall: "#fbcfe8", roof: "#831843" },
    { wall: "#e9d5ff", roof: "#4c1d95" },
    { wall: "#fed7aa", roof: "#9a3412" },
    { wall: "#ffffff", roof: "#1f2937" },
  ];
  const houses: ReactNode[] = [];
  const trees: ReactNode[] = [];
  let i = 0;
  for (let gx = -worldHalf + STEP / 2; gx < worldHalf; gx += STEP) {
    for (let gz = -worldHalf + STEP / 2; gz < worldHalf; gz += STEP) {
      // chừa khu vực mảnh đất người chơi
      if (Math.abs(gx) < innerHalf && Math.abs(gz) < innerHalf) continue;
      i++;
      const seed = (Math.floor(gx + 1000) * 73856093) ^ (Math.floor(gz + 1000) * 19349663);
      const s = Math.abs(seed) % 1000;
      const jitterX = ((s % 7) - 3) * 0.6;
      const jitterZ = (((s >> 3) % 7) - 3) * 0.6;
      const rot = ((s >> 6) % 4) * (Math.PI / 2);
      const isHouse = s % 5 !== 0; // ~80% là nhà, 20% là cụm cây/đồng cỏ trống
      if (isHouse) {
        const p = palettes[s % palettes.length];
        houses.push(
          <group key={`h-${gx}-${gz}`} position={[gx + jitterX, 0, gz + jitterZ]} rotation={[0, rot, 0]}>
            <NeighborHouse seed={s} color={p.wall} roofColor={p.roof} />
          </group>
        );
        // thêm 1-2 cây trang trí cạnh nhà
        const tCount = 1 + (s % 2);
        for (let t = 0; t < tCount; t++) {
          const tx = ((s >> (t * 2)) % 5) - 2;
          const tz = ((s >> (t * 2 + 1)) % 5) - 2;
          trees.push(
            <group key={`t-${gx}-${gz}-${t}`} position={[gx + tx * 1.4, 0, gz + tz * 1.4]}>
              <NeighborTree seed={s + t * 17} />
            </group>
          );
        }
      } else {
        // cụm đồng cỏ + vài cây
        for (let t = 0; t < 3; t++) {
          const tx = ((s >> (t * 2)) % 9) - 4;
          const tz = ((s >> (t * 2 + 1)) % 9) - 4;
          trees.push(
            <group key={`gt-${gx}-${gz}-${t}`} position={[gx + tx * 1.2, 0, gz + tz * 1.2]}>
              <NeighborTree seed={s + t * 31} />
            </group>
          );
        }
      }
      if (i > 800) break;
    }
  }
  // Vỉa hè / đường nhỏ chạy quanh khu trung tâm để có cảm giác phố
  return (
    <group>
      {/* Khu vực ngoài mảnh đất phủ cỏ xanh đậm hơn */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <planeGeometry args={[WORLD, WORLD]} />
        <meshStandardMaterial color="#7fb95e" />
      </mesh>
      {/* Vành đai đường nhựa quanh khu phố */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[innerHalf + 0.5, innerHalf + 2.5, 64]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      {houses}
      {trees}
    </group>
  );
}

function PlotAndPlacement({
  placed, walls, roofs, wallColor, wallMode, wallPickA, roofMode, roofPicks,
  selectedItemId, rotation, onPlace, onRemove, onPillarClick, onWallRemove, onRoofRemove,
}: Omit<Props, "onRotate">) {
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  const selected = selectedItemId ? getItem(selectedItemId) : null;
  const half = (GRID * CELL) / 2;
  const buildMode = wallMode || roofMode;

  const rotatedFootprint = (it: CatalogItem) => {
    const swap = rotation % 2 === 1;
    return { w: swap ? it.d : it.w, d: swap ? it.w : it.d };
  };

  const handleMove = (e: any) => {
    if (!selected || buildMode) return;
    const p = e.point as THREE.Vector3;
    const gx = Math.floor(p.x + half);
    const gz = Math.floor(p.z + half);
    setHover({ x: gx, z: gz });
  };
  const handleClick = () => { if (!buildMode && selected && hover) onPlace(hover.x, hover.z); };

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[Math.max(400, WORLD + 80), Math.max(400, WORLD + 80)]} />
        <meshStandardMaterial color="#86c46c" />
      </mesh>
      <Neighborhood />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[GRID + PATH * 2, GRID + PATH * 2]} />
        <meshStandardMaterial color="#b8b0a4" />
      </mesh>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        onPointerMove={handleMove}
        onPointerOut={() => setHover(null)}
        onClick={handleClick}
      >
        <planeGeometry args={[GRID, GRID]} />
        <meshStandardMaterial color="#9bca6f" />
      </mesh>
      <gridHelper args={[GRID, GRID, "#3a5a2a", "#5e8a3f"]} position={[0, 0.02, 0]} />

      {[-half, half].map((x) =>
        [-half, half].map((z) => (
          <mesh key={`${x}-${z}`} castShadow position={[x, 0.4, z]}>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))
      )}

      {/* Walls (auto-built between pillars) */}
      {walls.map((w) => (
        <WallMesh key={w.id} w={w} color={wallColor} onRemove={() => onWallRemove(w.id)} />
      ))}

      {/* Roofs (auto-built across 4 pillars) */}
      {roofs.map((r) => (
        <RoofMesh key={r.id} r={r} onRemove={() => onRoofRemove(r.id)} />
      ))}

      {/* Placed items */}
      {placed.map((p) => {
        const it = getItem(p.itemId);
        if (!it) return null;
        const swap = p.rotation % 2 === 1;
        const fw = swap ? it.d : it.w;
        const fd = swap ? it.w : it.d;
        const wx = p.x - half + fw / 2;
        const wz = p.z - half + fd / 2;
        // Legacy mái nhà (đã đặt từ trước) vẫn nằm trên đỉnh tường
        const yOffset = isRoof(p.itemId) ? WALL_HEIGHT : (p.itemId === "window" ? 1.2 : 0);
        const isWallPickPillar = wallMode && p.itemId === "pillar" && wallPickA === p.id;
        const isRoofPickPillar = roofMode && p.itemId === "pillar" && roofPicks.includes(p.id);
        const isPickedPillar = isWallPickPillar || isRoofPickPillar;
        return (
          <group
            key={p.id}
            position={[wx, yOffset, wz]}
            rotation={[0, (p.rotation * Math.PI) / 2, 0]}
            onContextMenu={(e) => {
              e.stopPropagation();
              if (!buildMode) onRemove(p.id);
            }}
            onClick={(e) => {
              if (buildMode && p.itemId === "pillar") {
                e.stopPropagation();
                onPillarClick(p.id);
              }
            }}
          >
            <ItemModel item={it} />
            {isPickedPillar && (
              <mesh position={[0, 2.5, 0]}>
                <torusGeometry args={[0.6, 0.08, 8, 24]} />
                <meshStandardMaterial color={roofMode ? "#60a5fa" : "#fde047"} emissive={roofMode ? "#3b82f6" : "#fbbf24"} emissiveIntensity={1} />
              </mesh>
            )}
            {buildMode && p.itemId === "pillar" && !isPickedPillar && (
              <mesh position={[0, 5.3, 0]}>
                <sphereGeometry args={[0.18, 12, 12]} />
                <meshStandardMaterial color={roofMode ? "#60a5fa" : "#22c55e"} emissive={roofMode ? "#2563eb" : "#16a34a"} emissiveIntensity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Ghost */}
      {!buildMode && selected && hover && (() => {
        const { w: fw, d: fd } = rotatedFootprint(selected);
        const wx = hover.x - half + fw / 2;
        const wz = hover.z - half + fd / 2;
        const inside = hover.x >= 0 && hover.z >= 0 && hover.x + fw <= GRID && hover.z + fd <= GRID;
        const yOffset = isRoof(selected.id) ? WALL_HEIGHT : (selected.id === "window" ? 1.2 : 0);
        return (
          <group position={[wx, yOffset, wz]} rotation={[0, (rotation * Math.PI) / 2, 0]}>
            <mesh position={[0, selected.h / 2, 0]}>
              <boxGeometry args={[selected.w, selected.h, selected.d]} />
              <meshStandardMaterial color={inside ? "#22c55e" : "#ef4444"} transparent opacity={0.45} />
            </mesh>
          </group>
        );
      })()}
    </group>
  );
}

export default function GameWorld(props: Props) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") props.onRotate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <Canvas shadows="soft" camera={{ position: [0, 12, 18], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true, toneMappingExposure: 1.1 }}>
      {/* Solid sky-blue background so the canvas never flashes white before Sky/Environment finish loading */}
      <color attach="background" args={["#87ceeb"]} />
      <SoftShadows size={25} samples={16} focus={0.5} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#cfe9ff", "#5a8a4a", 0.35]} />
      <directionalLight
        castShadow
        position={[25, 35, 18]}
        intensity={2}
        color="#fff5e1"
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      {/* Async assets (Sky/Environment/Clouds) get their own boundary so a slow HDRI never blanks the scene */}
      <Suspense fallback={null}>
        <Sky sunPosition={[100, 30, 100]} turbidity={1.5} rayleigh={0.4} mieCoefficient={0.005} mieDirectionalG={0.85} />
        <Environment preset="park" background={false} environmentIntensity={0.6} />
        <Clouds material={THREE.MeshBasicMaterial}>
          <Cloud position={[-15, 18, -10]} speed={0.2} opacity={0.55} />
          <Cloud position={[20, 22, 5]} speed={0.2} opacity={0.5} />
          <Cloud position={[0, 25, -20]} speed={0.15} opacity={0.45} />
        </Clouds>
      </Suspense>
      <Character controlsRef={controlsRef} />
      <PlotAndPlacement {...props} />
      <ContactShadows position={[0, 0.03, 0]} opacity={0.45} scale={60} blur={2.4} far={15} resolution={1024} />
      <fog attach="fog" args={["#dbeafe", 60, 180]} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
