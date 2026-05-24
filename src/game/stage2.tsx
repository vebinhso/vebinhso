import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// ============ STAGE 2 — WINDING CORRIDOR ============
//
// Layout (top-down, +X = east, -Z = forward from spawn):
//
//   z =  +2.5  ┌─────┐
//              │ A   │   spawn
//   z =  -7.5  ┤     ├──────────────────────────┐
//              │ B (east) ────────── room2 ──── │
//   z = -12.5  ┤              ── room1 ──┐   ┌──┘
//                                        │ C │
//   z = -22.5             room3 ─        │   │── room4
//                                        │   │
//   z = -27.5                       ┌────┘   ┘─────────────┐
//                                   │ D (east) ─── room5  │
//   z = -32.5                       └─────────────────────┘
//
// Player walks 2s south (A) -> right turn -> 2s east -> room1 right -> 3s east -> room2 left
// -> 1s east -> left turn -> 1s south -> room3 left -> 1s south -> room4 right
// -> 2s south -> right turn -> east -> room5

export const S2_H = 4.8;
const HALF = 2.5;

type Rect = { xmin: number; xmax: number; zmin: number; zmax: number };
export const S2_SEGMENTS: Rect[] = [
  { xmin: -HALF, xmax: HALF, zmin: -10, zmax: 2.5 },     // A
  { xmin: -HALF, xmax: 32.5, zmin: -12.5, zmax: -7.5 },  // B
  { xmin: 27.5, xmax: 32.5, zmin: -32.5, zmax: -7.5 },   // C
  { xmin: 27.5, xmax: 47.5, zmin: -32.5, zmax: -27.5 },  // D
];

// Walls = [x1, z1, x2, z2]
const WALLS: Array<[number, number, number, number]> = [
  [-HALF, 2.5, HALF, 2.5],
  [-HALF, 2.5, -HALF, -12.5],
  [HALF, 2.5, HALF, -7.5],
  [HALF, -7.5, 32.5, -7.5],
  [32.5, -7.5, 32.5, -27.5],
  [-HALF, -12.5, 27.5, -12.5],
  [27.5, -12.5, 27.5, -32.5],
  [27.5, -32.5, 47.5, -32.5],
  [47.5, -32.5, 47.5, -27.5],
  [32.5, -27.5, 47.5, -27.5],
];

// 5 doors. yaw = how the door faces (which way the door's front normal points, into corridor).
export type S2DoorDef = { idx: number; x: number; z: number; yaw: number; approach: [number, number] };
export const S2_DOORS: S2DoorDef[] = [
  { idx: 0, x: 10, z: -12.5, yaw: 0,             approach: [10, -11.5] },  // chest15
  { idx: 1, x: 25, z: -7.5,  yaw: Math.PI,       approach: [25, -8.5]  },  // shield
  { idx: 2, x: 27.5, z: -15, yaw: Math.PI / 2,   approach: [28.5, -15] },  // potion
  { idx: 3, x: 32.5, z: -20, yaw: -Math.PI / 2,  approach: [31.5, -20] },  // empty
  { idx: 4, x: 47.5, z: -30, yaw: -Math.PI / 2,  approach: [46.5, -30] },  // room5
];

// Patrol path for ghosts (centerline waypoints)
const GHOST_PATH: Array<[number, number]> = [
  [0, 0], [0, -10], [10, -10], [25, -10], [30, -10],
  [30, -20], [30, -30], [40, -30], [46, -30],
];

function inAnySeg(x: number, z: number, pad = 0): boolean {
  return S2_SEGMENTS.some(r => x >= r.xmin + pad && x <= r.xmax - pad && z >= r.zmin + pad && z <= r.zmax - pad);
}

// Keep this re-exported for backwards compatibility (some imports may still reference it)
export const S2_LEN = 50;
export const S2_DOOR_SLOTS = S2_DOORS.map((d) => ({ x: d.x, z: d.z, side: d.yaw > 0 ? -1 : 1 }));

// ============ TEXTURES ============
function useCheckerTexture(repeatX = 2, repeatZ = 8) {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d")!;
    const tiles = 6;
    const ts = 512 / tiles;
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        const dark = (x + y) % 2 === 0;
        ctx.fillStyle = dark ? "#0c0c10" : "#e8e8ec";
        ctx.fillRect(x * ts, y * ts, ts, ts);
        if (!dark) {
          const g = ctx.createRadialGradient(x*ts+ts/2, y*ts+ts/2, 0, x*ts+ts/2, y*ts+ts/2, ts);
          g.addColorStop(0, "rgba(255,255,255,0.18)"); g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g; ctx.fillRect(x*ts, y*ts, ts, ts);
        }
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 2;
    for (let i = 0; i <= tiles; i++) {
      ctx.beginPath(); ctx.moveTo(i*ts, 0); ctx.lineTo(i*ts, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*ts); ctx.lineTo(512, i*ts); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatZ);
    return tex;
  }, [repeatX, repeatZ]);
}

// ============ FLOORS & CEILINGS ============
function Stage2Floors() {
  const tex = useCheckerTexture(1.5, 1.5);
  return (
    <>
      {S2_SEGMENTS.map((r, i) => {
        const w = r.xmax - r.xmin, d = r.zmax - r.zmin;
        const cx = (r.xmin + r.xmax) / 2, cz = (r.zmin + r.zmax) / 2;
        return (
          <group key={`fc${i}`}>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial map={tex} metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[cx, S2_H, cz]}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color="#15151b" roughness={1} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ============ WALLS ============
function Stage2Walls() {
  return (
    <>
      {WALLS.map((w, i) => {
        const [x1, z1, x2, z2] = w;
        const len = Math.hypot(x2 - x1, z2 - z1);
        const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
        const rotY = Math.atan2(x2 - x1, z2 - z1);
        return (
          <group key={i} position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
            <mesh position={[0, S2_H / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.22, S2_H, len]} />
              <meshStandardMaterial color="#1c1c24" roughness={0.85} metalness={0.18} />
            </mesh>
            {/* baseboard accent */}
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.26, 0.4, len]} />
              <meshStandardMaterial color="#e6e6ea" roughness={0.5} metalness={0.4} />
            </mesh>
            {/* top trim */}
            <mesh position={[0, S2_H - 0.15, 0]}>
              <boxGeometry args={[0.26, 0.18, len]} />
              <meshStandardMaterial color="#3a3a44" roughness={0.6} metalness={0.5} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ============ DOORS ============
const _s2num: Record<number, HTMLCanvasElement> = {};
function s2NumberCanvas(n: number) {
  if (typeof document === "undefined") return null as any;
  if (_s2num[n]) return _s2num[n];
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#d4a020"; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 124, 124);
  ctx.fillStyle = "#d4a020"; ctx.font = "bold 80px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(n), 64, 70);
  _s2num[n] = c;
  return c;
}

function Stage2Doors() {
  return (
    <>
      {S2_DOORS.map((d) => (
        <group key={d.idx} position={[d.x, 0, d.z]} rotation={[0, d.yaw, 0]}>
          {/* recessed dark frame on the wall */}
          <mesh position={[0, 1.6, 0.07]}>
            <boxGeometry args={[1.7, 3.2, 0.05]} />
            <meshStandardMaterial color="#000" />
          </mesh>
          {/* door slab */}
          <mesh position={[0, 1.5, 0.12]} castShadow>
            <boxGeometry args={[1.4, 2.9, 0.08]} />
            <meshStandardMaterial color="#1f1f24" metalness={0.5} roughness={0.55} />
          </mesh>
          {/* gold knob */}
          <mesh position={[0.5, 1.4, 0.18]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color="#d4a020" metalness={0.95} roughness={0.18} />
          </mesh>
          {/* lit number plate */}
          <mesh position={[0, 3.05, 0.18]}>
            <planeGeometry args={[0.42, 0.32]} />
            <meshBasicMaterial>
              <canvasTexture attach="map" args={[s2NumberCanvas(d.idx + 1)]} />
            </meshBasicMaterial>
          </mesh>
          {/* a soft warm light marking each door */}
          <pointLight position={[0, 2.7, 0.6]} intensity={0.9} distance={5.5} color="#ffc080" decay={1.6} />
        </group>
      ))}
    </>
  );
}

// ============ WALL SCONCES (placed at corridor centerline waypoints) ============
function Stage2Sconces() {
  return (
    <>
      {GHOST_PATH.map((p, i) => (
        <group key={i} position={[p[0], S2_H - 0.55, p[1]]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.45, 14]} />
            <meshStandardMaterial color="#e8e8ee" emissive="#ffffff" emissiveIntensity={2.4} />
          </mesh>
          <pointLight intensity={2.4} distance={11} color="#cfd6e8" decay={1.5} />
        </group>
      ))}
    </>
  );
}

// ============ GHOSTS — glowing patrol mobs ============
function pathLength() {
  let total = 0;
  for (let i = 1; i < GHOST_PATH.length; i++) {
    total += Math.hypot(GHOST_PATH[i][0] - GHOST_PATH[i - 1][0], GHOST_PATH[i][1] - GHOST_PATH[i - 1][1]);
  }
  return total;
}
const PATH_LEN = pathLength();

function pointAlongPath(t: number): [number, number] {
  // t in [0, 1)
  const target = ((t % 1) + 1) % 1 * PATH_LEN;
  let acc = 0;
  for (let i = 1; i < GHOST_PATH.length; i++) {
    const [x1, z1] = GHOST_PATH[i - 1];
    const [x2, z2] = GHOST_PATH[i];
    const seg = Math.hypot(x2 - x1, z2 - z1);
    if (acc + seg >= target) {
      const f = (target - acc) / seg;
      return [x1 + (x2 - x1) * f, z1 + (z2 - z1) * f];
    }
    acc += seg;
  }
  return GHOST_PATH[GHOST_PATH.length - 1];
}

function Ghost({ phase, speed, dir }: { phase: number; speed: number; dir: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(phase);
  useFrame((_, dt) => {
    t.current += dt * speed * dir;
    const [x, z] = pointAlongPath(t.current);
    if (ref.current) {
      ref.current.position.x = x;
      ref.current.position.z = z;
      ref.current.position.y = 1.4 + Math.sin((t.current + phase) * 3) * 0.18;
      ref.current.rotation.y = Math.sin(t.current * 1.2) * 0.3;
    }
  });
  // Smooth rounded ghost — single capsule body, soft skirt, no sharp head bump.
  // Uses a half-sphere top + cylinder middle + 6 small rounded tabs as a gentle "skirt".
  return (
    <group ref={ref}>
      <pointLight intensity={1.6} distance={6.5} color="#cfeeff" decay={1.7} />
      {/* rounded top dome */}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.55, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color="#ffffff" emissive="#e6f5ff" emissiveIntensity={1.5} transparent opacity={0.96} roughness={0.45} />
      </mesh>
      {/* gown body */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.55, 0.52, 0.68, 36, 1, true]} />
        <meshStandardMaterial color="#ffffff" emissive="#e6f5ff" emissiveIntensity={1.4} transparent opacity={0.94} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* soft scalloped bottom edge */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.46, -0.58, Math.sin(a) * 0.46]}>
            <sphereGeometry args={[0.18, 18, 18]} />
            <meshStandardMaterial color="#ffffff" emissive="#e6f5ff" emissiveIntensity={1.4} transparent opacity={0.92} roughness={0.5} />
          </mesh>
        );
      })}
      {/* soft eyes */}
      <mesh position={[-0.17, 0.22, 0.46]}>
        <sphereGeometry args={[0.08, 18, 18]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>
      <mesh position={[0.17, 0.22, 0.46]}>
        <sphereGeometry args={[0.08, 18, 18]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>
      {/* tiny nose dot */}
      <mesh position={[0, 0.06, 0.52]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>
    </group>
  );
}

function Stage2Ghosts() {
  return (
    <>
      <Ghost phase={0.0} speed={0.04} dir={1} />
      <Ghost phase={0.35} speed={0.05} dir={-1} />
      <Ghost phase={0.7} speed={0.045} dir={1} />
    </>
  );
}

// ============ CORRIDOR ============
export function Stage2Corridor() {
  return (
    <group>
      <Stage2Floors />
      <Stage2Walls />
      <Stage2Doors />
      <Stage2Sconces />
      <Stage2Ghosts />

      {/* brighter ambient (+~20cd feel) */}
      <ambientLight intensity={0.28} color="#7a8ca0" />
      <hemisphereLight args={["#8a9cb0", "#0a0a10", 0.28]} />
      <fog attach="fog" args={["#03050a", 8, 42]} />
    </group>
  );
}

// ============ PLAYER ============
export function Stage2PlayerController({ active, onNearDoor }: { active: boolean; onNearDoor: (idx: number | null) => void }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vy = useRef(0);
  const grounded = useRef(true);

  useEffect(() => {
    camera.position.set(0, 1.7, 0);
    camera.lookAt(0, 1.6, -10);
    const d = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const u = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, [camera]);

  useFrame((_, dt) => {
    if (!active) return;
    const k = keys.current;
    const speed = 5;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (k["w"]) move.add(fwd);
    if (k["s"]) move.sub(fwd);
    if (k["d"]) move.add(right);
    if (k["a"]) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt);
      const pad = 0.45;
      const tryX = camera.position.x + move.x;
      const tryZ = camera.position.z + move.z;
      if (inAnySeg(tryX, camera.position.z, pad)) camera.position.x = tryX;
      if (inAnySeg(camera.position.x, tryZ, pad)) camera.position.z = tryZ;
    }
    if (k[" "] && grounded.current) { vy.current = 6; grounded.current = false; }
    vy.current -= 16 * dt;
    camera.position.y += vy.current * dt;
    if (camera.position.y <= 1.7) { camera.position.y = 1.7; vy.current = 0; grounded.current = true; }

    // nearest door (use approach point)
    let nearest = -1;
    let nd = 999;
    S2_DOORS.forEach((d, i) => {
      const dd = (camera.position.x - d.approach[0]) ** 2 + (camera.position.z - d.approach[1]) ** 2;
      if (dd < nd) { nd = dd; nearest = i; }
    });
    onNearDoor(nd < 5 ? nearest : null);
  });
  return null;
}

// ============ SCENE ============
export function Stage2Scene() {
  return (
    <>
      <color attach="background" args={["#03050a"]} />
      <Stage2Corridor />
    </>
  );
}

// ============ WITCH BOSS ============
export function Witch({ visible, hp, maxHp }: { visible: boolean; hp: number; maxHp: number }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.position.y = 1.4 + Math.sin(t.current * 2.2) * 0.18;
      ref.current.rotation.y = Math.sin(t.current * 0.8) * 0.12;
    }
  });
  if (!visible) return null;
  const damaged = 1 - hp / maxHp;
  return (
    <group ref={ref} position={[0, 1.4, -5.5]}>
      <mesh castShadow><coneGeometry args={[0.85, 2.0, 16]} /><meshStandardMaterial color="#1a0824" roughness={0.85} /></mesh>
      <mesh position={[0, 1.0, 0]} castShadow><sphereGeometry args={[0.32, 20, 20]} /><meshStandardMaterial color="#a8c890" roughness={0.6} /></mesh>
      <mesh position={[0, 0.95, 0.32]} rotation={[Math.PI / 2.2, 0, 0]}><coneGeometry args={[0.06, 0.28, 10]} /><meshStandardMaterial color="#8aa874" /></mesh>
      <mesh position={[-0.12, 1.06, 0.28]}><sphereGeometry args={[0.05, 10, 10]} /><meshStandardMaterial color="#ffe066" emissive="#ffaa00" emissiveIntensity={2} /></mesh>
      <mesh position={[0.12, 1.06, 0.28]}><sphereGeometry args={[0.05, 10, 10]} /><meshStandardMaterial color="#ffe066" emissive="#ffaa00" emissiveIntensity={2} /></mesh>
      <mesh position={[0, 1.55, 0]} castShadow><coneGeometry args={[0.42, 0.95, 16]} /><meshStandardMaterial color="#0d0418" roughness={0.9} /></mesh>
      <mesh position={[0, 1.18, 0]}><cylinderGeometry args={[0.55, 0.55, 0.06, 24]} /><meshStandardMaterial color="#0d0418" roughness={0.9} /></mesh>
      <mesh position={[0, 1.22, 0.55]}><boxGeometry args={[0.14, 0.1, 0.02]} /><meshStandardMaterial color="#d4a020" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[0.55, 0.4, 0.05]} castShadow><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial color="#a8c890" /></mesh>
      <mesh position={[0.65, 0.6, 0.05]} rotation={[0, 0, -0.2]} castShadow><cylinderGeometry args={[0.04, 0.04, 1.8, 8]} /><meshStandardMaterial color="#3a2510" /></mesh>
      <mesh position={[0.85, 1.45, 0.05]}><sphereGeometry args={[0.16, 16, 16]} /><meshStandardMaterial color="#a0d8ff" emissive="#5fb8ff" emissiveIntensity={2 + damaged * 2} transparent opacity={0.9} /></mesh>
      <pointLight position={[0.85, 1.45, 0.05]} intensity={1.4} distance={4} color="#a0d8ff" />
    </group>
  );
}

// ============ LIGHTNING ============
export function Lightning({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity = active ? 0.7 + Math.random() * 0.3 : 0;
    }
  });
  return (
    <mesh ref={ref} position={[0, 1.5, -3]}>
      <cylinderGeometry args={[0.04, 0.04, 4.5, 6]} />
      <meshBasicMaterial color="#bfe6ff" transparent opacity={0} />
    </mesh>
  );
}

export { PointerLockControls };
