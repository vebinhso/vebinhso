import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import boatAsset from "@/assets/hoi-an-rowboat.glb.asset.json";

export const RIVER_CENTER_Z = -73;
export const RIVER_NEAR_BANK_Z = -61;
export const RIVER_BOARD_POSITION = [0, RIVER_NEAR_BANK_Z + 1.5] as const;
export const riverPoseState = { kneelingUntil: 0, targetX: 0, targetZ: RIVER_NEAR_BANK_Z - 4 };

export type ReleasedLantern = {
  id: string;
  x: number;
  z: number;
  color: string;
  wish?: string;
};

const RIVER_WIDTH = 196;
const RIVER_DEPTH = 22;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const WATER_MAT = new THREE.MeshPhysicalMaterial({
  color: "#14677a",
  roughness: 0.18,
  metalness: 0.08,
  transparent: true,
  opacity: 0.92,
  clearcoat: 0.8,
  clearcoatRoughness: 0.2,
});
const RIPPLE_MAT = new THREE.MeshBasicMaterial({ color: "#7dd8d5", transparent: true, opacity: 0.18, depthWrite: false });
const BANK_MAT = new THREE.MeshStandardMaterial({ color: "#776f65", roughness: 0.98 });
const WOOD_MAT = new THREE.MeshStandardMaterial({ color: "#241711", roughness: 0.88 });
const GOLD_MAT = new THREE.MeshStandardMaterial({ color: "#d9a52e", roughness: 0.45, metalness: 0.35 });
const SIGN_MAT = new THREE.MeshStandardMaterial({ color: "#7c2d12", roughness: 0.75 });
const FAR_WALL = new THREE.MeshStandardMaterial({ color: "#d6a73c", roughness: 1, transparent: true, opacity: 0.48 });
const FAR_ROOF = new THREE.MeshStandardMaterial({ color: "#55382d", roughness: 1, transparent: true, opacity: 0.45 });
const LANTERN_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#ec4899"];

function RowBoat({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  const { scene } = useGLTF(boatAsset.url);
  const boat = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.material = WOOD_MAT;
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    clone.scale.setScalar(4.8 / Math.max(size.x, size.z, 1));
    const scaled = new THREE.Box3().setFromObject(clone);
    clone.position.y -= scaled.min.y;
    return clone;
  }, [scene]);
  return <primitive object={boat} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

function FarHouse({ x, seed }: { x: number; seed: number }) {
  const w = 5 + (seed % 3) * 1.1;
  const h = 3.8 + (seed % 2) * 2.3;
  return (
    <group position={[x, 0, RIVER_CENTER_Z - 17]}>
      <mesh geometry={BOX} material={FAR_WALL} position={[0, h / 2, 0]} scale={[w, h, 5]} />
      <mesh geometry={BOX} material={FAR_ROOF} position={[0, h + 0.45, 0]} rotation={[0, 0, seed % 2 ? 0.18 : -0.18]} scale={[w + 0.8, 0.35, 5.7]} />
      {[-0.28, 0.28].map((offset) => (
        <mesh key={offset} position={[w * offset, h * 0.55, 2.52]}>
          <planeGeometry args={[0.7, 0.9]} />
          <meshBasicMaterial color="#ffd36b" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function QuizBoard({ onStartQuiz }: { onStartQuiz?: () => void }) {
  const en = useLocale() === "en";
  return (
    <group position={[RIVER_BOARD_POSITION[0], 0, RIVER_BOARD_POSITION[1]]}>
      <mesh geometry={BOX} material={WOOD_MAT} position={[-0.72, 0.95, 0]} rotation={[0.12, 0, 0]} scale={[0.1, 1.9, 0.1]} />
      <mesh geometry={BOX} material={WOOD_MAT} position={[0.72, 0.95, 0]} rotation={[-0.12, 0, 0]} scale={[0.1, 1.9, 0.1]} />
      <mesh geometry={BOX} material={GOLD_MAT} position={[0, 1.65, 0]} scale={[2.65, 1.65, 0.1]} />
      <mesh geometry={BOX} material={SIGN_MAT} position={[0, 1.65, 0.07]} scale={[2.42, 1.42, 0.04]} />
      <Html position={[0, 1.65, 0.13]} center distanceFactor={7} zIndexRange={[20, 0]}>
        <Button
          onClick={(event) => { event.stopPropagation(); onStartQuiz?.(); }}
          className="h-auto w-44 flex-col gap-1 border-2 border-amber-300 bg-amber-950/95 px-3 py-2 text-center text-amber-50 shadow-xl hover:bg-amber-900"
        >
          <span className="text-base font-black">🏮 {en ? "Lantern challenge" : "Thử thách hoa đăng"}</span>
          <span className="whitespace-normal text-[11px] font-bold leading-snug">{en ? "All 7 correct = 1 lantern" : "Đúng cả 7/7 câu = 1 hoa đăng"}</span>
          <span className="text-[10px] opacity-80">{en ? "Come close and tap to play" : "Đến gần và bấm để chơi"}</span>
        </Button>
      </Html>
    </group>
  );
}

const PETAL_GEO = new THREE.SphereGeometry(1, 10, 6);
PETAL_GEO.translate(0, 1, 0);
const LEAF_GEO = new THREE.CylinderGeometry(0.62, 0.62, 0.05, 10);
const CANDLE_GEO = new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8);
const FLAME_GEO = new THREE.SphereGeometry(0.06, 8, 6);
const LEAF_MAT = new THREE.MeshStandardMaterial({ color: "#3f8a3a", roughness: 0.8, emissive: "#14361a", emissiveIntensity: 0.4 });
const CANDLE_MAT = new THREE.MeshStandardMaterial({ color: "#fff3d6", roughness: 0.7 });
const FLAME_MAT = new THREE.MeshBasicMaterial({ color: "#ffd36b" });
const LOTUS_COLORS = ["#f97362", "#f472b6", "#facc15", "#ef4444", "#60a5fa", "#fb923c"];
const petalMatCache = new Map<string, THREE.MeshStandardMaterial>();
function petalMat(color: string, inner: boolean) {
  const k = color + inner;
  let m = petalMatCache.get(k);
  if (!m) {
    const c = new THREE.Color(color);
    if (inner) c.lerp(new THREE.Color("#fff1e0"), 0.35);
    m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: inner ? 0.55 : 0.4, roughness: 0.6 });
    petalMatCache.set(k, m);
  }
  return m;
}

function LotusModel({ color, scale = 1, light = false }: { color: string; scale?: number; light?: boolean }) {
  const outer = petalMat(color, false);
  const inner = petalMat(color, true);
  return (
    <group scale={scale}>
      {/* Lá sen xanh */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.26;
        return <mesh key={"l" + i} geometry={PETAL_GEO} material={LEAF_MAT} position={[Math.sin(a) * 0.18, 0.02, Math.cos(a) * 0.18]} rotation={[1.35, a, 0]} scale={[0.2, 0.42, 0.04]} />;
      })}
      <mesh geometry={LEAF_GEO} material={LEAF_MAT} position={[0, 0.02, 0]} scale={0.55} />
      {/* Cánh ngoài */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <mesh key={"o" + i} geometry={PETAL_GEO} material={outer} position={[Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.14]} rotation={[0.95, a, 0]} scale={[0.13, 0.22, 0.05]} />;
      })}
      {/* Cánh trong */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        return <mesh key={"i" + i} geometry={PETAL_GEO} material={inner} position={[Math.sin(a) * 0.09, 0.08, Math.cos(a) * 0.09]} rotation={[0.45, a, 0]} scale={[0.1, 0.2, 0.04]} />;
      })}
      <mesh geometry={CANDLE_GEO} material={CANDLE_MAT} position={[0, 0.16, 0]} />
      <mesh geometry={FLAME_GEO} material={FLAME_MAT} position={[0, 0.29, 0]} scale={[1, 1.6, 1]} />
      {light && <pointLight color="#ffc56b" intensity={1.4} distance={4} decay={2} position={[0, 0.4, 0]} />}
    </group>
  );
}

function LotusLantern({ lantern, index }: { lantern: ReleasedLantern; index: number }) {
  const ref = useRef<THREE.Group>(null);
  const [open, setOpen] = useState(false);
  const en = useLocale() === "en";
  const color = LOTUS_COLORS[index % LOTUS_COLORS.length];
  useFrame(({ clock }, rawDelta) => {
    if (!ref.current) return;
    const dt = Math.min(rawDelta, 0.05);
    ref.current.position.x += dt * (0.22 + (index % 3) * 0.04);
    if (ref.current.position.x > RIVER_WIDTH / 2 - 2) ref.current.position.x = -RIVER_WIDTH / 2 + 2;
    ref.current.position.z += Math.sin(clock.elapsedTime * 0.5 + index) * dt * 0.06;
    ref.current.position.y = 0.1 + Math.sin(clock.elapsedTime * 1.2 + index) * 0.03;
    ref.current.rotation.y += dt * 0.06;
  });
  return (
    <group ref={ref} position={[lantern.x, 0.1, lantern.z]}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      onPointerOver={() => { document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}>
      <mesh visible={false}><sphereGeometry args={[0.9, 8, 6]} /></mesh>
      <LotusModel color={color} scale={1.6} light={index < 8} />
      {open && (
        <Html position={[0, 1.6, 0]} center distanceFactor={10} zIndexRange={[40, 0]}>
          <div className="w-48 rounded-xl border-2 border-primary bg-card/95 p-2 text-center text-xs shadow-lg" onClick={() => setOpen(false)}>
            <div className="font-black">🏮 {en ? "Wish" : "Lời ước"}</div>
            <div className="mt-1 whitespace-pre-wrap break-words italic">{lantern.wish || (en ? "(No wish written)" : "(Không có lời ước)")}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

/** Vài đèn hoa đăng có sẵn trôi chậm trên sông. */
function AmbientLanterns() {
  const items = useMemo(() => Array.from({ length: 14 }).map((_, i) => ({
    x: -90 + ((i * 53) % 180),
    z: RIVER_CENTER_Z - 7 + ((i * 37) % 14),
    speed: 0.12 + (i % 4) * 0.035,
    color: LOTUS_COLORS[i % LOTUS_COLORS.length],
    s: 1.3 + (i % 3) * 0.2,
  })), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    items.forEach((it, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.x += dt * it.speed;
      if (g.position.x > RIVER_WIDTH / 2 - 2) g.position.x = -RIVER_WIDTH / 2 + 2;
      g.position.y = 0.1 + Math.sin(clock.elapsedTime * 1.1 + i) * 0.03;
      g.rotation.y += dt * 0.05;
    });
  });
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} position={[it.x, 0.1, it.z]}>
          <LotusModel color={it.color} scale={it.s} />
        </group>
      ))}
    </group>
  );
}

function RiverRipples() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.x = (clock.elapsedTime * 0.55) % 4;
  });
  return (
    <group ref={group} position={[0, 0.06, RIVER_CENTER_Z]}>
      {Array.from({ length: 24 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-94 + i * 8, 0, ((i * 7) % 16) - 8]}>
          <ringGeometry args={[0.6, 0.66, 20]} />
          <primitive object={RIPPLE_MAT} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

export const HoiAnRiver = memo(function HoiAnRiver({
  releasedLanterns,
  onStartQuiz,
  onReleaseLantern,
}: {
  releasedLanterns?: ReleasedLantern[];
  onStartQuiz?: () => void;
  onReleaseLantern?: (x: number, z: number) => void;
}) {
  return (
    <group>
      <mesh geometry={BOX} material={BANK_MAT} position={[0, 0.08, RIVER_NEAR_BANK_Z]} scale={[RIVER_WIDTH, 0.16, 3.5]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, RIVER_CENTER_Z]}
        onClick={(event) => { event.stopPropagation(); onReleaseLantern?.(event.point.x, event.point.z); }}
      >
        <planeGeometry args={[RIVER_WIDTH, RIVER_DEPTH, 32, 4]} />
        <primitive object={WATER_MAT} attach="material" />
      </mesh>
      <RiverRipples />
      <AmbientLanterns />
      <QuizBoard onStartQuiz={onStartQuiz} />
      <RowBoat position={[-26, 0.15, RIVER_CENTER_Z - 1]} rotation={Math.PI / 2.15} scale={1.1} />
      <RowBoat position={[25, 0.15, RIVER_CENTER_Z + 2.5]} rotation={Math.PI / 2.5} scale={0.9} />
      {Array.from({ length: 25 }).map((_, i) => <FarHouse key={i} x={-94 + i * 7.8} seed={i + 3} />)}
      {(releasedLanterns ?? []).map((lantern, index) => <LotusLantern key={lantern.id} lantern={lantern} index={index} />)}
    </group>
  );
});

useGLTF.preload(boatAsset.url);