import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import boatAsset from "@/assets/hoi-an-rowboat.glb.asset.json";

export const RIVER_CENTER_Z = -73;
export const RIVER_NEAR_BANK_Z = -61;
export const RIVER_BOARD_POSITION = [0, RIVER_NEAR_BANK_Z + 1.5] as const;

export type ReleasedLantern = {
  id: string;
  x: number;
  z: number;
  color: string;
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
          <span className="whitespace-normal text-[11px] font-bold leading-snug">{en ? "5 correct out of 7 = 1 lantern" : "Đúng 5/7 câu = 1 hoa đăng"}</span>
          <span className="text-[10px] opacity-80">{en ? "Come close and tap to play" : "Đến gần và bấm để chơi"}</span>
        </Button>
      </Html>
    </group>
  );
}

function LotusLantern({ lantern, index }: { lantern: ReleasedLantern; index: number }) {
  const ref = useRef<THREE.Group>(null);
  const color = lantern.color || LANTERN_COLORS[index % LANTERN_COLORS.length];
  const petalMat = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.65, side: THREE.DoubleSide }), [color]);
  useFrame(({ clock }, rawDelta) => {
    if (!ref.current) return;
    const dt = Math.min(rawDelta, 0.05);
    ref.current.position.x += dt * (0.34 + (index % 3) * 0.06);
    ref.current.position.z += Math.sin(clock.elapsedTime * 0.7 + index) * dt * 0.08;
    ref.current.position.y = 0.22 + Math.sin(clock.elapsedTime * 1.4 + index) * 0.035;
    ref.current.rotation.y += dt * 0.08;
  });
  return (
    <group ref={ref} position={[lantern.x, 0.22, lantern.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.12, 8]} />
        <meshStandardMaterial color="#f5e7c8" roughness={0.9} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[Math.sin((i / 8) * Math.PI * 2) * 0.24, 0.18, Math.cos((i / 8) * Math.PI * 2) * 0.24]} rotation={[0.42, (i / 8) * Math.PI * 2, 0]} material={petalMat}>
          <coneGeometry args={[0.16, 0.48, 4]} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.14, 0.24, 0.14]} />
        <meshBasicMaterial color="#fff4b0" />
      </mesh>
      <pointLight color={color} intensity={1.2} distance={4} decay={2} />
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
      <QuizBoard onStartQuiz={onStartQuiz} />
      <RowBoat position={[-26, 0.15, RIVER_CENTER_Z - 1]} rotation={Math.PI / 2.15} scale={1.1} />
      <RowBoat position={[25, 0.15, RIVER_CENTER_Z + 2.5]} rotation={Math.PI / 2.5} scale={0.9} />
      {Array.from({ length: 25 }).map((_, i) => <FarHouse key={i} x={-94 + i * 7.8} seed={i + 3} />)}
      {(releasedLanterns ?? []).map((lantern, index) => <LotusLantern key={lantern.id} lantern={lantern} index={index} />)}
    </group>
  );
});

useGLTF.preload(boatAsset.url);