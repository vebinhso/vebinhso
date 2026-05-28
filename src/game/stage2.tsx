import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import type React from "react";
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
  // ===== main spine (A → B → C → D → rooms) =====
  { xmin: -2.5, xmax: 2.5, zmin: -10, zmax: 2.5 }, // A vertical
  { xmin: -2.5, xmax: 32.5, zmin: -12.5, zmax: -7.5 }, // B horizontal
  { xmin: 27.5, xmax: 32.5, zmin: -32.5, zmax: -7.5 }, // C vertical
  { xmin: 27.5, xmax: 47.5, zmin: -32.5, zmax: -27.5 }, // D horizontal

  // ===== ROOMS (now open and connected) =====
  { xmin: 20, xmax: 27.5, zmin: -18, zmax: -12.5 }, // room1
  { xmin: 32.5, xmax: 40, zmin: -7.5, zmax: -2 }, // room2
  { xmin: 20, xmax: 27.5, zmin: -27.5, zmax: -22.5 }, // room3
  { xmin: 27.5, xmax: 32.5, zmin: -27.5, zmax: -22.5 }, // room4
  { xmin: 40, xmax: 47.5, zmin: -32.5, zmax: -27.5 }, // room5

  // ===== maze decoy branches — adjusted so they don't block main path =====
  // E — west off A
  { xmin: -12, xmax: 0, zmin: -5, zmax: -1 }, // E1
  { xmin: -12, xmax: -7, zmin: -15, zmax: -3 }, // E2
  { xmin: -22, xmax: -9, zmin: -15, zmax: -11 }, // E3

  // F — south off B
  { xmin: 12, xmax: 17, zmin: -22, zmax: -10 }, // F1
  { xmin: 12, xmax: 25, zmin: -22, zmax: -18 }, // F2
  { xmin: 20, xmax: 25, zmin: -32, zmax: -20 }, // F3

  // G — north off B
  { xmin: 15, xmax: 20, zmin: -12, zmax: 0 }, // G1
  { xmin: 5, xmax: 20, zmin: -2, zmax: 2 }, // G2
  { xmin: 5, xmax: 10, zmin: 0, zmax: 8 }, // G3

  // H — east off C
  { xmin: 32, xmax: 42, zmin: -26, zmax: -22 }, // H1
  { xmin: 37, xmax: 42, zmin: -23, zmax: -14 }, // H2
  { xmin: 37, xmax: 47, zmin: -16, zmax: -12 }, // H3

  // I — south off D
  { xmin: 42, xmax: 47, zmin: -42, zmax: -31 }, // I1
  { xmin: 33, xmax: 43, zmin: -42, zmax: -38 }, // I2
  { xmin: 32, xmax: 38, zmin: -50, zmax: -41 }, // I3

  // J — south off C
  { xmin: 27.5, xmax: 32.5, zmin: -42, zmax: -31 }, // J1
  { xmin: 15, xmax: 28, zmin: -42, zmax: -38 }, // J2
  { xmin: 15, xmax: 20, zmin: -55, zmax: -42 }, // J3
];

// Walls = [x1, z1, x2, z2]
const WALLS: Array<[number, number, number, number]> = [
  // ===== Main A =====
  [-HALF, 2.5, HALF, 2.5], // A north
  [HALF, 2.5, HALF, -7.5], // A east
  [-HALF, 2.5, -HALF, -1], // A west upper (above E1 opening)
  [-HALF, -5, -HALF, -7.5], // A west lower (below E1 opening)
  // ===== Main B =====
  [HALF, -7.5, 15, -7.5], // B north (left of G1 opening)
  [20, -7.5, 32.5, -7.5], // B north (right of G1 opening)
  [-HALF, -12.5, 12, -12.5], // B south (left of F1 opening)
  [17, -12.5, 32.5, -12.5], // B south (right of F1 opening)
  [32.5, -7.5, 32.5, -12.5], // B east
  [-HALF, -10, -HALF, -12.5], // B west (below A)
  // ===== Main C =====
  [32.5, -12.5, 32.5, -22], // C east (above H1 opening)
  [32.5, -26, 32.5, -27.5], // C east (below H1, above D)
  [27.5, -12.5, 27.5, -27.5], // C west
  // C south fully open into J1
  // ===== Main D =====
  [32.5, -27.5, 47.5, -27.5], // D north
  [32.5, -32.5, 42, -32.5], // D south (between J1 and I1 openings)
  [47.5, -27.5, 47.5, -32.5], // D east

  // ===== decoy E (west arm + south + west) =====
  [-12, -1, 0, -1], // E1 N
  [-12, -5, -7, -5], // E1 S (gap x[-7,0] for E2)
  [-12, -3, -12, -1], // E1 W upper
  [-9, -15, -7, -15], // E2 S (gap x[-12,-9] for E3)
  [-7, -15, -7, -5], // E2 E
  [-12, -11, -12, -3], // E2 W (gap x=-12 z[-15,-11] for E3)
  [-22, -11, -9, -11], // E3 N
  [-22, -15, -9, -15], // E3 S
  [-22, -15, -22, -11], // E3 W
  // ===== decoy F (south arm + east + south) =====
  [17, -18, 17, -12.5], // F1 E
  [12, -18, 12, -12.5], // F1 W
  [17, -18, 25, -18], // F2 N (gap x[12,17] for F1)
  [12, -22, 20, -22], // F2 S (gap x[20,25] for F3)
  [25, -20, 25, -18], // F2 E
  [20, -32, 25, -32], // F3 S
  [25, -32, 25, -22], // F3 E
  [20, -32, 20, -22], // F3 W
  // ===== decoy G (north arm + west + north) =====
  [20, -7.5, 20, -2], // G1 E
  [15, -7.5, 15, -2], // G1 W
  [10, 2, 20, 2], // G2 N (gap x[5,10] for G3)
  [5, -2, 15, -2], // G2 S (gap x[15,20] for G1)
  [20, 0, 20, 2], // G2 E
  [5, -2, 5, 0], // G2 W
  [5, 8, 10, 8], // G3 N
  [10, 2, 10, 8], // G3 E
  [5, 2, 5, 8], // G3 W
  // ===== decoy H (east arm + north + east) =====
  [32, -22, 37, -22], // H1 N (gap x[37,42] for H2)
  [32, -26, 42, -26], // H1 S
  [42, -26, 42, -23], // H1 E
  [42, -22, 42, -16], // H2 E
  [37, -23, 37, -16], // H2 W
  [37, -12, 47, -12], // H3 N
  [42, -16, 47, -16], // H3 S (gap x[37,42] for H2)
  [47, -16, 47, -12], // H3 E
  [37, -14, 37, -12], // H3 W
  // ===== decoy I (south arm + west + south) =====
  [43, -42, 47, -42], // I1 S (gap x[42,43] for I2)
  [47, -42, 47, -32.5], // I1 E
  [42, -38, 42, -32.5], // I1 W
  [33, -38, 42, -38], // I2 N
  [38, -42, 42, -42], // I2 S (gaps for I3 and I1)
  [33, -41, 33, -38], // I2 W
  [32, -41, 33, -41], // I3 N
  [32, -50, 38, -50], // I3 S
  [38, -50, 38, -42], // I3 E
  [32, -50, 32, -41], // I3 W
  // ===== decoy J (south arm + west + south) =====
  [28, -42, 32.5, -42], // J1 S (gap x[27.5,28] for J2)
  [32.5, -42, 32.5, -32.5], // J1 E
  [27.5, -38, 27.5, -32.5], // J1 W
  [15, -38, 27.5, -38], // J2 N
  [20, -42, 27.5, -42], // J2 S (gaps for J3 and J1)
  [15, -41, 15, -38], // J2 W
  [15, -50, 20, -50], // J3 S
  [20, -50, 20, -42], // J3 E
  [15, -50, 15, -41], // J3 W
];

// 5 doors. yaw = how the door faces (which way the door's front normal points, into corridor).
export type S2DoorDef = { idx: number; x: number; z: number; yaw: number; approach: [number, number] };
export const S2_DOORS: S2DoorDef[] = [
  { idx: 0, x: 10, z: -12.5, yaw: 0, approach: [10, -11.5] }, // chest15
  { idx: 1, x: 25, z: -7.5, yaw: Math.PI, approach: [25, -8.5] }, // shield
  { idx: 2, x: 27.5, z: -15, yaw: Math.PI / 2, approach: [28.5, -15] }, // potion
  { idx: 3, x: 32.5, z: -20, yaw: -Math.PI / 2, approach: [31.5, -20] }, // empty
  { idx: 4, x: 47.5, z: -30, yaw: -Math.PI / 2, approach: [46.5, -30] }, // room5
];

// Patrol path for ghosts (centerline waypoints)
const GHOST_PATH: Array<[number, number]> = [
  [0, 0],
  [0, -10],
  [10, -10],
  [25, -10],
  [30, -10],
  [30, -20],
  [30, -30],
  [40, -30],
  [46, -30],
];

function inAnySeg(x: number, z: number, pad = 0): boolean {
  return S2_SEGMENTS.some((r) => x >= r.xmin + pad && x <= r.xmax - pad && z >= r.zmin + pad && z <= r.zmax - pad);
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
          const g = ctx.createRadialGradient(x * ts + ts / 2, y * ts + ts / 2, 0, x * ts + ts / 2, y * ts + ts / 2, ts);
          g.addColorStop(0, "rgba(255,255,255,0.18)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x * ts, y * ts, ts, ts);
        }
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= tiles; i++) {
      ctx.beginPath();
      ctx.moveTo(i * ts, 0);
      ctx.lineTo(i * ts, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * ts);
      ctx.lineTo(512, i * ts);
      ctx.stroke();
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
        const w = r.xmax - r.xmin,
          d = r.zmax - r.zmin;
        const cx = (r.xmin + r.xmax) / 2,
          cz = (r.zmin + r.zmax) / 2;
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
        const cx = (x1 + x2) / 2,
          cz = (z1 + z2) / 2;
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
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#d4a020";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);
  ctx.fillStyle = "#d4a020";
  ctx.font = "bold 80px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
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

// ============ GHOSTS — random spawn (wall/floor/ceiling) ============
export const GHOST_POSITIONS: { x: number; z: number; y: number; alive: boolean }[] = [];

function randomPointInSegment(): [number, number] {
  const areas = S2_SEGMENTS.map((r) => (r.xmax - r.xmin) * (r.zmax - r.zmin));
  const total = areas.reduce((a, b) => a + b, 0);
  let pick = Math.random() * total;
  let r = S2_SEGMENTS[0];
  for (let i = 0; i < S2_SEGMENTS.length; i++) {
    if (pick < areas[i]) {
      r = S2_SEGMENTS[i];
      break;
    }
    pick -= areas[i];
  }
  const pad = 0.8;
  const x = r.xmin + pad + Math.random() * (r.xmax - r.xmin - pad * 2);
  const z = r.zmin + pad + Math.random() * (r.zmax - r.zmin - pad * 2);
  return [x, z];
}
type SpawnMode = "wall" | "floor" | "ceiling";

function Ghost({ slot, initialDelay }: { slot: number; initialDelay: number }) {
  const ref = useRef<THREE.Group>(null!);
  const state = useRef({
    pos: randomPointInSegment(),
    mode: (["wall", "floor", "ceiling"] as SpawnMode[])[Math.floor(Math.random() * 3)],
    bornAt: performance.now() + initialDelay,
    lifeMs: 7000 + Math.random() * 4000,
  });
  useFrame(() => {
    if (!ref.current) return;
    const now = performance.now();
    const age = now - state.current.bornAt;
    if (age < 0) {
      ref.current.visible = false;
      GHOST_POSITIONS[slot] = { x: 0, z: 0, y: 0, alive: false };
      return;
    }
    if (age > state.current.lifeMs) {
      state.current = {
        pos: randomPointInSegment(),
        mode: (["wall", "floor", "ceiling"] as SpawnMode[])[Math.floor(Math.random() * 3)],
        bornAt: now + 200 + Math.random() * 500,
        lifeMs: 8000 + Math.random() * 4000,
      };
      return;
    }
    ref.current.visible = true;
    const fadeIn = 1200,
      fadeOut = 1200;
    const opacity =
      age < fadeIn
        ? age / fadeIn
        : age > state.current.lifeMs - fadeOut
          ? Math.max(0, (state.current.lifeMs - age) / fadeOut)
          : 1;
    let yBase = 1.4;
    if (state.current.mode === "floor") yBase = 0.3 + Math.min(1, age / fadeIn) * 1.1;
    if (state.current.mode === "ceiling") yBase = S2_H - 0.5 - Math.min(1, age / fadeIn) * 2.8;
    const [x, z] = state.current.pos;
    const wx = x + Math.sin(now / 1200 + slot) * 0.4;
    const wz = z + Math.cos(now / 1300 + slot) * 0.4;
    ref.current.position.set(wx, yBase + Math.sin(now / 700 + slot) * 0.12, wz);
    ref.current.rotation.y = Math.sin(now / 1400 + slot) * 0.4;
    GHOST_POSITIONS[slot] = { x: wx, z: wz, y: yBase, alive: opacity > 0.35 };
    ref.current.traverse((c: any) => {
      if (c.material && "opacity" in c.material) {
        c.material.transparent = true;
        c.material.opacity = 0.92 * opacity;
      }
    });
  });
  return (
    <group ref={ref}>
      <pointLight intensity={1.6} distance={6.5} color="#cfeeff" decay={1.7} />
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.55, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#e6f5ff"
          emissiveIntensity={1.5}
          transparent
          opacity={0.96}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.55, 0.52, 0.68, 36, 1, true]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#e6f5ff"
          emissiveIntensity={1.4}
          transparent
          opacity={0.94}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.46, -0.58, Math.sin(a) * 0.46]}>
            <sphereGeometry args={[0.18, 18, 18]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#e6f5ff"
              emissiveIntensity={1.4}
              transparent
              opacity={0.92}
              roughness={0.5}
            />
          </mesh>
        );
      })}
      <mesh position={[-0.17, 0.22, 0.46]}>
        <sphereGeometry args={[0.08, 18, 18]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>
      <mesh position={[0.17, 0.22, 0.46]}>
        <sphereGeometry args={[0.08, 18, 18]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>
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
      <Ghost slot={0} initialDelay={0} />
      <Ghost slot={1} initialDelay={1000} />
      <Ghost slot={2} initialDelay={2000} />
      <Ghost slot={3} initialDelay={3000} />
      <Ghost slot={4} initialDelay={4000} />
      <Ghost slot={5} initialDelay={5000} />
      <Ghost slot={6} initialDelay={6000} />
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
export function Stage2PlayerController({
  active,
  onNearDoor,
  onGhostHit,
  spawnRef,
}: {
  active: boolean;
  onNearDoor: (idx: number | null) => void;
  onGhostHit?: () => void;
  spawnRef?: React.MutableRefObject<{ x: number; z: number; lookX: number; lookZ: number } | null>;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vy = useRef(0);
  const grounded = useRef(true);

  useEffect(() => {
    const s = spawnRef?.current;
    if (s) {
      camera.position.set(s.x, 1.7, s.z);
      camera.lookAt(s.x + s.lookX, 1.6, s.z + s.lookZ);
    } else {
      camera.position.set(0, 1.7, 0);
      camera.lookAt(0, 1.6, -10);
    }
    const d = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const u = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    return () => {
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
  }, [camera, spawnRef]);

  useFrame((_, dt) => {
    if (!active) return;
    const k = keys.current;
    const speed = 5;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
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
    if (k[" "] && grounded.current) {
      vy.current = 6;
      grounded.current = false;
    }
    vy.current -= 16 * dt;
    camera.position.y += vy.current * dt;
    if (camera.position.y <= 1.7) {
      camera.position.y = 1.7;
      vy.current = 0;
      grounded.current = true;
    }

    // nearest door (use approach point)
    let nearest = -1;
    let nd = 999;
    S2_DOORS.forEach((d, i) => {
      const dd = (camera.position.x - d.approach[0]) ** 2 + (camera.position.z - d.approach[1]) ** 2;
      if (dd < nd) {
        nd = dd;
        nearest = i;
      }
    });
    onNearDoor(nd < 5 ? nearest : null);
    // ghost collision
    if (onGhostHit) {
      for (const g of GHOST_POSITIONS) {
        if (!g || !g.alive) continue;
        const d2 = (camera.position.x - g.x) ** 2 + (camera.position.z - g.z) ** 2;
        if (d2 < 0.8) {
          onGhostHit();
          break;
        }
      }
    }
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
      <mesh castShadow>
        <coneGeometry args={[0.85, 2.0, 16]} />
        <meshStandardMaterial color="#1a0824" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial color="#a8c890" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.95, 0.32]} rotation={[Math.PI / 2.2, 0, 0]}>
        <coneGeometry args={[0.06, 0.28, 10]} />
        <meshStandardMaterial color="#8aa874" />
      </mesh>
      <mesh position={[-0.12, 1.06, 0.28]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#ffe066" emissive="#ffaa00" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.12, 1.06, 0.28]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#ffe066" emissive="#ffaa00" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <coneGeometry args={[0.42, 0.95, 16]} />
        <meshStandardMaterial color="#0d0418" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 24]} />
        <meshStandardMaterial color="#0d0418" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.22, 0.55]}>
        <boxGeometry args={[0.14, 0.1, 0.02]} />
        <meshStandardMaterial color="#d4a020" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.55, 0.4, 0.05]} castShadow>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#a8c890" />
      </mesh>
      <mesh position={[0.65, 0.6, 0.05]} rotation={[0, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
        <meshStandardMaterial color="#3a2510" />
      </mesh>
      <mesh position={[0.85, 1.45, 0.05]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color="#a0d8ff"
          emissive="#5fb8ff"
          emissiveIntensity={2 + damaged * 2}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight position={[0.85, 1.45, 0.05]} intensity={1.4} distance={4} color="#a0d8ff" />
    </group>
  );
}

// ============ LIGHTNING — large multi-bolt strike ============
export function Lightning({ active }: { active: boolean }) {
  const grp = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (!grp.current) return;
    const op = active ? 0.7 + Math.random() * 0.3 : 0;
    grp.current.traverse((c: any) => {
      if (c.material && "opacity" in c.material) c.material.opacity = op;
    });
  });
  return (
    <group ref={grp}>
      {[-1.6, -0.6, 0.4, 1.4].map((x, i) => (
        <group key={i} position={[x, 0, -3 - (i % 2) * 0.5]} rotation={[0, i % 2 ? 0.1 : -0.1, 0]}>
          <mesh position={[0, 2.5, 0]} rotation={[0, 0, (Math.random() - 0.5) * 0.3]}>
            <cylinderGeometry args={[0.06 + Math.random() * 0.04, 0.02, 5, 6]} />
            <meshBasicMaterial color="#dff0ff" transparent opacity={0} />
          </mesh>
          <mesh position={[0.15 * (i % 2 ? 1 : -1), 1.4, 0]} rotation={[0, 0, i % 2 ? -0.5 : 0.5]}>
            <cylinderGeometry args={[0.03, 0.015, 1.5, 6]} />
            <meshBasicMaterial color="#bfe6ff" transparent opacity={0} />
          </mesh>
          <pointLight position={[0, 3, 0]} intensity={4} distance={12} color="#cfe6ff" />
        </group>
      ))}
    </group>
  );
}

export { PointerLockControls };
