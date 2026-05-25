import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export const ANIMAL_NAMES = [
  "beaver", "bee", "bunny", "cat", "caterpillar", "chick", "cow", "crab",
  "deer", "dog", "elephant", "fish", "fox", "giraffe", "hog", "koala",
  "lion", "monkey", "panda", "parrot", "penguin", "pig", "polar", "tiger",
] as const;
export type AnimalName = typeof ANIMAL_NAMES[number];

const animalUrl = (n: AnimalName) => `/models/pets/animal-${n}.glb`;

// Preload ALL animal models so they're cached even though we only render some.
ANIMAL_NAMES.forEach((n) => {
  try { useGLTF.preload(animalUrl(n)); } catch {}
});

export function Animal({ name, scale = 1 }: { name: AnimalName; scale?: number | [number, number, number] }) {
  const { scene } = useGLTF(animalUrl(name)) as any;
  const cloned = useMemo(() => {
    const c = (scene as THREE.Object3D).clone(true);
    c.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={cloned} scale={scale as any} />;
}

// ============ Tiger walks from darkness (replaces blue monster at room with progress 0..1) ============
export function TigerEmerging({ progress, baseZ = -9 }: { progress: number; baseZ?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.position.y = 0.05 + Math.abs(Math.sin(t.current * 5)) * 0.04;
    }
  });
  const startZ = baseZ;
  const endZ = -5;
  const z = startZ + (endZ - startZ) * progress;
  const reveal = Math.min(1, progress * 1.4);
  return (
    <group ref={ref} position={[0, 0.05, z]} rotation={[0, 0, 0]} scale={[reveal * 1.7, reveal * 1.7, reveal * 1.7]}>
      <Animal name="tiger" />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.6} distance={5} color="#ffb070" />
    </group>
  );
}

// ============ Parrot flies slowly down from ceiling ============
export function ParrotDescending({ progress }: { progress: number }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) ref.current.rotation.y = Math.sin(t.current * 1.8) * 0.35;
  });
  const startY = 3.6;
  const endY = 1.3;
  const y = startY + (endY - startY) * progress;
  const reveal = Math.min(1, progress * 1.4);
  return (
    <group ref={ref} position={[0, y, -5]} scale={[reveal * 1.6, reveal * 1.6, reveal * 1.6]}>
      <Animal name="parrot" />
      <pointLight position={[0, 0.5, 0]} intensity={1.4} distance={5} color="#a0ffd0" />
    </group>
  );
}

// ============ Beaver crawls out of a dirt hole ============
export function BeaverEmerging({ progress }: { progress: number }) {
  const ref = useRef<THREE.Group>(null!);
  const startY = -0.9;
  const endY = 0.05;
  const y = startY + (endY - startY) * progress;
  const reveal = Math.min(1, progress * 1.4);
  return (
    <group position={[0, 0, -5]}>
      {/* Dirt mound rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <ringGeometry args={[0.75, 1.35, 28]} />
        <meshStandardMaterial color="#3a2410" roughness={1} />
      </mesh>
      {/* Dark hole interior */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <circleGeometry args={[0.78, 28]} />
        <meshStandardMaterial color="#0a0604" roughness={1} />
      </mesh>
      <group ref={ref} position={[0, y, 0]} scale={[reveal * 1.5, reveal * 1.5, reveal * 1.5]}>
        <Animal name="beaver" />
        <pointLight position={[0, 0.6, 0]} intensity={1.3} distance={4} color="#ffd070" />
      </group>
    </group>
  );
}

// ============ Random non-special animal (for "animal2q" doors) ============
const RANDOM_POOL: AnimalName[] = ANIMAL_NAMES.filter(
  (n) => n !== "tiger" && n !== "parrot" && n !== "beaver"
) as AnimalName[];

export function pickRandomAnimal(seed: number): AnimalName {
  return RANDOM_POOL[Math.abs(seed) % RANDOM_POOL.length];
}

export function RandomAnimal({ name }: { name: AnimalName }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.position.y = 0.05 + Math.sin(t.current * 2.5) * 0.10;
      ref.current.rotation.y = Math.sin(t.current * 0.8) * 0.35;
    }
  });
  return (
    <group ref={ref} position={[0, 0.05, -5]} scale={1.7}>
      <Animal name={name} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.5} distance={5} color="#bfe6ff" />
    </group>
  );
}

// ============ Two tigers patrolling stage 1 corridor; calls onHit when player collides ============
export function CorridorTigers({
  onHit,
  corridorLen,
  corridorW,
  active,
}: {
  onHit: () => void;
  corridorLen: number;
  corridorW: number;
  active: boolean;
}) {
  const { camera } = useThree();
  const ref1 = useRef<THREE.Group>(null!);
  const ref2 = useRef<THREE.Group>(null!);
  const lastHit = useRef(0);
  const t0 = useRef(performance.now());
  useFrame(() => {
    const now = performance.now();
    const elapsed = (now - t0.current) / 1000;
    const range = corridorLen / 2 - 6;
    const lane = corridorW / 2 - 1.2;

    // Tiger A: long sweep along the corridor on left lane
    if (ref1.current) {
      const phase = elapsed * 0.45;
      const z = Math.sin(phase) * range;
      const dz = Math.cos(phase) * range * 0.45;
      const x = -lane * 0.55 + Math.sin(elapsed * 0.7) * lane * 0.25;
      ref1.current.position.set(x, 0.05, z);
      ref1.current.rotation.y = Math.atan2(0, dz) + (dz < 0 ? Math.PI : 0);
    }
    // Tiger B: different phase + right lane
    if (ref2.current) {
      const phase = elapsed * 0.55 + 2.1;
      const z = Math.sin(phase) * range;
      const dz = Math.cos(phase) * range * 0.55;
      const x = lane * 0.55 + Math.cos(elapsed * 0.6) * lane * 0.25;
      ref2.current.position.set(x, 0.05, z);
      ref2.current.rotation.y = Math.atan2(0, dz) + (dz < 0 ? Math.PI : 0);
    }

    if (!active) return;
    if (now - lastHit.current < 4000) return;
    for (const r of [ref1, ref2]) {
      if (!r.current) continue;
      const p = r.current.position;
      const d2 = (camera.position.x - p.x) ** 2 + (camera.position.z - p.z) ** 2;
      if (d2 < 1.4) {
        lastHit.current = now;
        onHit();
        break;
      }
    }
  });
  return (
    <>
      <group ref={ref1} scale={1.3}>
        <Animal name="tiger" />
        <pointLight position={[0, 0.8, 0]} intensity={1.0} distance={3.5} color="#ffb070" />
      </group>
      <group ref={ref2} scale={1.3}>
        <Animal name="tiger" />
        <pointLight position={[0, 0.8, 0]} intensity={1.0} distance={3.5} color="#ffb070" />
      </group>
    </>
  );
}
