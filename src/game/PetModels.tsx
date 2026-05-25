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

// ============ Two tigers wandering stage 1 corridor with varied direction/speed ============
type TigerAgent = {
  ref: React.MutableRefObject<THREE.Group | null>;
  pos: THREE.Vector3;
  heading: number;       // current facing angle (radians)
  targetHeading: number; // desired facing angle
  speed: number;         // current speed (m/s)
  targetSpeed: number;   // desired speed
  nextDecision: number;  // seconds until next behavior change
  yawVel: number;        // visual extra yaw wobble
};

function useTigerAgent(initial: THREE.Vector3, seed: number): TigerAgent {
  const ref = useRef<THREE.Group | null>(null);
  const agent = useRef<TigerAgent>({
    ref,
    pos: initial.clone(),
    heading: Math.random() * Math.PI * 2,
    targetHeading: Math.random() * Math.PI * 2,
    speed: 1.2 + seed * 0.3,
    targetSpeed: 1.5,
    nextDecision: 0.5 + Math.random(),
    yawVel: 0,
  });
  return agent.current;
}

function CorridorTiger({
  agent,
  bounds,
  onCheckHit,
}: {
  agent: TigerAgent;
  bounds: { halfX: number; halfZ: number };
  onCheckHit: (pos: THREE.Vector3) => void;
}) {
  useFrame((_, dt) => {
    const a = agent;
    a.nextDecision -= dt;
    if (a.nextDecision <= 0) {
      // Pick a new direction + speed; sometimes do a sharp turn (quay đầu)
      const sharp = Math.random() < 0.35;
      a.targetHeading = sharp
        ? a.heading + Math.PI + (Math.random() - 0.5) * 1.2
        : a.heading + (Math.random() - 0.5) * Math.PI;
      // Mix of slow and fast wanders
      a.targetSpeed = Math.random() < 0.3 ? 0.4 + Math.random() * 0.6 : 1.6 + Math.random() * 2.2;
      a.nextDecision = 0.6 + Math.random() * 1.8;
    }
    // Smoothly rotate toward target heading (shortest arc)
    let diff = a.targetHeading - a.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turnRate = 3.2; // rad/s
    a.heading += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
    // Ease speed
    a.speed += (a.targetSpeed - a.speed) * Math.min(1, dt * 2.5);

    // Move forward (note: model "forward" is -Z by default)
    const vx = Math.sin(a.heading) * a.speed;
    const vz = Math.cos(a.heading) * a.speed;
    a.pos.x += vx * dt;
    a.pos.z += vz * dt;

    // Bounce off corridor bounds by flipping target heading
    if (a.pos.x > bounds.halfX) { a.pos.x = bounds.halfX; a.targetHeading = -a.heading; }
    if (a.pos.x < -bounds.halfX) { a.pos.x = -bounds.halfX; a.targetHeading = -a.heading; }
    if (a.pos.z > bounds.halfZ) { a.pos.z = bounds.halfZ; a.targetHeading = Math.PI - a.heading; }
    if (a.pos.z < -bounds.halfZ) { a.pos.z = -bounds.halfZ; a.targetHeading = Math.PI - a.heading; }

    if (a.ref.current) {
      a.ref.current.position.set(a.pos.x, 0.05, a.pos.z);
      a.ref.current.rotation.y = a.heading;
    }
    onCheckHit(a.pos);
  });
  return (
    <group ref={agent.ref} scale={1.3}>
      <Animal name="tiger" />
      <pointLight position={[0, 0.8, 0]} intensity={1.0} distance={3.5} color="#ffb070" />
    </group>
  );
}

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
  const lastHit = useRef(0);
  const halfX = Math.max(1, corridorW / 2 - 1.0);
  const halfZ = Math.max(2, corridorLen / 2 - 4);
  const a1 = useTigerAgent(new THREE.Vector3(-halfX * 0.4, 0.05, -halfZ * 0.5), 0);
  const a2 = useTigerAgent(new THREE.Vector3(halfX * 0.4, 0.05, halfZ * 0.5), 1);

  const check = (pos: THREE.Vector3) => {
    if (!active) return;
    const now = performance.now();
    if (now - lastHit.current < 4000) return;
    const d2 = (camera.position.x - pos.x) ** 2 + (camera.position.z - pos.z) ** 2;
    if (d2 < 1.6) {
      lastHit.current = now;
      onHit();
    }
  };

  return (
    <>
      <CorridorTiger agent={a1} bounds={{ halfX, halfZ }} onCheckHit={check} />
      <CorridorTiger agent={a2} bounds={{ halfX, halfZ }} onCheckHit={check} />
    </>
  );
}

