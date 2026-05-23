import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getCurrentUser } from "@/lib/auth";
import { loadOutfit, DEFAULT_OUTFIT, type Outfit } from "@/lib/character";
import { randomQuestion, type Question } from "@/game/questions";

export const Route = createFileRoute("/magic")({
  component: MagicPage,
  head: () => ({
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Nosifer&family=Creepster&display=swap",
      },
    ],
  }),
});

type DoorKind =
  | { kind: "empty" }
  | { kind: "chest"; reward: number }
  | { kind: "boss"; level: 1 | 2 | 3; hp: number; bullets: number; perHit: number }
  | { kind: "exit" };

const DOOR_OUTCOMES: DoorKind[] = [
  { kind: "empty" },
  { kind: "boss", level: 1, hp: 100, bullets: 10, perHit: 10 },
  { kind: "chest", reward: 20 },
  { kind: "boss", level: 2, hp: 100, bullets: 5, perHit: 20 },
  { kind: "chest", reward: 30 },
  { kind: "empty" },
  { kind: "boss", level: 3, hp: 100, bullets: 5, perHit: 20 },
  { kind: "empty" },
  { kind: "chest", reward: 10 },
  { kind: "exit" },
];

const CORRIDOR_LEN = 60;
const CORRIDOR_W = 6;
const WALL_H = 4;
const DOOR_SPACING = CORRIDOR_LEN / 6;

type DoorState = "closed" | "open" | "cleared";

// ============ CORRIDOR ============
function CorridorWalls() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[CORRIDOR_W, CORRIDOR_LEN]} />
        <meshStandardMaterial color="#2a1f12" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]}>
        <planeGeometry args={[CORRIDOR_W, CORRIDOR_LEN]} />
        <meshStandardMaterial color="#1a140c" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * CORRIDOR_W / 2, 0.6, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[CORRIDOR_LEN, 1.2]} />
            <meshStandardMaterial color="#33210f" roughness={0.85} />
          </mesh>
          <mesh position={[s * (CORRIDOR_W / 2 - 0.01), 1.25, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <planeGeometry args={[CORRIDOR_LEN, 0.08]} />
            <meshStandardMaterial color="#5a3a18" />
          </mesh>
          <mesh position={[s * CORRIDOR_W / 2, (WALL_H + 1.3) / 2, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[CORRIDOR_LEN, WALL_H - 1.3]} />
            <meshStandardMaterial color="#8a6c44" roughness={0.92} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, WALL_H / 2, -CORRIDOR_LEN / 2]}>
        <planeGeometry args={[CORRIDOR_W, WALL_H]} />
        <meshStandardMaterial color="#1a140c" />
      </mesh>
      <mesh position={[0, WALL_H / 2, CORRIDOR_LEN / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CORRIDOR_W, WALL_H]} />
        <meshStandardMaterial color="#0a0805" />
      </mesh>
    </group>
  );
}

function CeilingDome({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 16]} />
        <meshStandardMaterial color="#2a1d10" />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fff2c0" emissive="#ffc870" emissiveIntensity={2.2} transparent opacity={0.95} />
      </mesh>
      <pointLight position={[0, -0.15, 0]} intensity={2.3} distance={12} decay={1.4} color="#ffc070" castShadow />
    </group>
  );
}

function CorridorDoor({ pos, rotY, state, index }: { pos: [number, number, number]; rotY: number; state: DoorState; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (!ref.current) return;
    const target = state === "open" || state === "cleared" ? Math.PI / 2.2 : 0;
    ref.current.rotation.y += (target - ref.current.rotation.y) * 0.1;
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[1.6, 3, 0.15]} />
        <meshStandardMaterial color={state === "cleared" ? "#4a5d3a" : "#5a3a1a"} />
      </mesh>
      <group position={[-0.6, 0, 0]}>
        <group ref={ref}>
          <mesh position={[0.6, 1.4, 0.05]} castShadow>
            <boxGeometry args={[1.2, 2.6, 0.1]} />
            <meshStandardMaterial color={state === "cleared" ? "#6b8e4a" : "#8b5a2b"} metalness={0.2} roughness={0.6} />
          </mesh>
          <mesh position={[1.05, 1.4, 0.12]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color="#d4a020" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>
      <mesh position={[0, 3.1, 0.08]}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.4} />
      </mesh>
      <Text3DLike pos={[0, 3.1, 0.09]} text={String(index)} />
    </group>
  );
}

function Text3DLike({ pos, text }: { pos: [number, number, number]; text: string }) {
  return (
    <mesh position={pos}>
      <planeGeometry args={[0.45, 0.35]} />
      <meshBasicMaterial>
        <canvasTexture attach="map" args={[makeTextCanvas(text)]} />
      </meshBasicMaterial>
    </mesh>
  );
}

const _canvasCache: Record<string, HTMLCanvasElement> = {};
function makeTextCanvas(t: string) {
  if (typeof document === "undefined") return null as any;
  if (_canvasCache[t]) return _canvasCache[t];
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#222"; ctx.font = "bold 90px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(t, 64, 70);
  _canvasCache[t] = c;
  return c;
}

// ============ ROOMS ============
const ROOM_W = 8;   // x
const ROOM_D = 10;  // z (depth, door at z=0, back wall at z=-ROOM_D)
const ROOM_H = 4;

// Procedural cobweb texture
function useCobwebTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    const corners: Array<[number, number]> = [[0, 0], [512, 0], [0, 512], [512, 512]];
    for (const [cx, cy] of corners) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * (Math.PI / 2);
        const r = 180 + Math.random() * 60;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a + (cx ? Math.PI : 0)) * r * (cx ? -1 : 1), cy + Math.sin(a + (cy ? Math.PI : 0)) * r * (cy ? -1 : 1));
        ctx.stroke();
      }
      for (let ring = 1; ring < 7; ring++) {
        const rr = ring * 28;
        ctx.beginPath();
        for (let i = 0; i <= 14; i++) {
          const a = (i / 14) * (Math.PI / 2);
          const x = cx + Math.cos(a + (cx ? Math.PI : 0)) * rr * (cx ? -1 : 1);
          const y = cy + Math.sin(a + (cy ? Math.PI : 0)) * rr * (cy ? -1 : 1);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    // grime splotches
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(40,30,20,${0.05 + Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 50, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);
}

function useStarTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d")!;
    // deep night blue gradient
    const g = ctx.createRadialGradient(512, 512, 50, 512, 512, 720);
    g.addColorStop(0, "#1a2a55");
    g.addColorStop(0.5, "#0b1430");
    g.addColorStop(1, "#03060f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    // nebula wisps
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const g2 = ctx.createRadialGradient(x, y, 0, x, y, 180);
      g2.addColorStop(0, "rgba(80,100,200,0.25)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2; ctx.fillRect(0, 0, 1024, 1024);
    }
    // stars
    for (let i = 0; i < 700; i++) {
      const r = Math.random() * 1.6 + 0.3;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`;
      ctx.beginPath(); ctx.arc(Math.random() * 1024, Math.random() * 1024, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const g3 = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g3.addColorStop(0, "rgba(255,255,255,0.9)");
      g3.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g3; ctx.fillRect(x - 10, y - 10, 20, 20);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);
}

function DungeonRoom({ withMonster }: { withMonster: boolean }) {
  const web = useCobwebTexture();
  const wallMat = (
    <meshStandardMaterial color="#6e5a44" roughness={0.95} />
  );
  return (
    <group>
      {/* floor - tiled grimy */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#5a4a32" roughness={0.95} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#3a2e1f" roughness={1} />
      </mesh>
      {/* back wall */}
      <mesh position={[0, ROOM_H / 2, -ROOM_D]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        {wallMat}
      </mesh>
      {/* side walls */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, -ROOM_D / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        {wallMat}
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, -ROOM_D / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        {wallMat}
      </mesh>
      {/* front wall with door opening */}
      <mesh position={[-ROOM_W / 2 + (ROOM_W - 1.6) / 4, ROOM_H / 2, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[(ROOM_W - 1.6) / 2, ROOM_H]} />
        {wallMat}
      </mesh>
      <mesh position={[ROOM_W / 2 - (ROOM_W - 1.6) / 4, ROOM_H / 2, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[(ROOM_W - 1.6) / 2, ROOM_H]} />
        {wallMat}
      </mesh>
      <mesh position={[0, ROOM_H - 0.5, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.6, 1]} />
        {wallMat}
      </mesh>

      {/* cobweb decals in 4 corners */}
      {[
        [-ROOM_W / 2 + 0.02, ROOM_H - 0.02, -0.02, Math.PI / 2, 0, 0],
        [ROOM_W / 2 - 0.02, ROOM_H - 0.02, -0.02, Math.PI / 2, 0, 0],
        [-ROOM_W / 2 + 0.02, ROOM_H - 0.02, -ROOM_D + 0.02, Math.PI / 2, 0, 0],
        [ROOM_W / 2 - 0.02, ROOM_H - 0.02, -ROOM_D + 0.02, Math.PI / 2, 0, 0],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]] as any} rotation={[p[3], p[4], p[5]] as any}>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial map={web} transparent opacity={0.75} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* hanging cobweb plane in back corner */}
      <mesh position={[-ROOM_W / 2 + 1.2, ROOM_H - 1.2, -ROOM_D + 1.2]} rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial map={web} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* cracks on floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.01, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W * 0.9, ROOM_D * 0.9]} />
        <meshBasicMaterial color="#1a120a" transparent opacity={0.25} />
      </mesh>

      {/* hanging bulb - brighter */}
      <group position={[0, ROOM_H - 0.4, -ROOM_D / 2]}>
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 0.6]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.14, 14, 14]} />
          <meshStandardMaterial color="#fff7d0" emissive={withMonster ? "#ffb060" : "#ffe090"} emissiveIntensity={3.2} />
        </mesh>
        <pointLight position={[0, -0.4, 0]} intensity={withMonster ? 3.2 : 4.0} distance={14} color={withMonster ? "#ffc080" : "#ffe0a0"} />
      </group>
      {/* corner accent lights for visibility */}
      <pointLight position={[-ROOM_W / 2 + 0.6, ROOM_H - 0.5, -1]} intensity={1.4} distance={8} color="#ffb070" />
      <pointLight position={[ROOM_W / 2 - 0.6, ROOM_H - 0.5, -1]} intensity={1.4} distance={8} color="#ffb070" />
      <pointLight position={[0, 1.6, -ROOM_D + 0.8]} intensity={1.6} distance={9} color="#ffa860" />

      {/* ambient room light - boosted ~+20cd */}
      <ambientLight intensity={withMonster ? 0.85 : 1.05} color="#5c4632" />
      <hemisphereLight args={["#c89878", "#2a1a10", 0.55]} />
    </group>
  );
}


function StarRoom() {
  const stars = useStarTexture();
  return (
    <group>
      {/* floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#101428" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* dome of stars: big inverted sphere */}
      <mesh position={[0, 0, -ROOM_D / 2]}>
        <sphereGeometry args={[ROOM_D * 1.2, 32, 24]} />
        <meshBasicMaterial map={stars} side={THREE.BackSide} />
      </mesh>
      {/* front wall with door cutout (so corridor connects visually) */}
      <mesh position={[-ROOM_W / 2 + (ROOM_W - 1.6) / 4, ROOM_H / 2, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[(ROOM_W - 1.6) / 2, ROOM_H]} />
        <meshStandardMaterial color="#0a1230" />
      </mesh>
      <mesh position={[ROOM_W / 2 - (ROOM_W - 1.6) / 4, ROOM_H / 2, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[(ROOM_W - 1.6) / 2, ROOM_H]} />
        <meshStandardMaterial color="#0a1230" />
      </mesh>
      <ambientLight intensity={0.4} color="#7a90ff" />
      <pointLight position={[0, 3, -ROOM_D / 2]} intensity={1.2} distance={14} color="#9bb0ff" />
      {/* floating sparkles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i} position={[
          (Math.random() - 0.5) * ROOM_W * 0.8,
          0.5 + Math.random() * 3,
          -Math.random() * ROOM_D,
        ]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
}

function Monster({ progress, visible }: { progress: number; visible: boolean }) {
  // progress 0 = at back darkness, 1 = at target spot
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.position.y = 1.1 + Math.sin(t.current * 3) * 0.08;
      ref.current.rotation.y = Math.sin(t.current * 2) * 0.15;
    }
  });
  if (!visible) return null;
  const startZ = -ROOM_D + 0.8;
  const endZ = -4; // 2 cells from player (player at z=-2)
  const z = startZ + (endZ - startZ) * progress;
  return (
    <group ref={ref} position={[0, 1.1, z]}>
      {/* fluffy teal body */}
      <mesh castShadow>
        <sphereGeometry args={[0.9, 28, 28]} />
        <meshStandardMaterial color="#1fb8c8" emissive="#16808a" emissiveIntensity={0.6} roughness={0.6} />
      </mesh>
      {/* fur fuzz - small spheres around body */}
      {Array.from({ length: 60 }).map((_, i) => {
        const a = Math.random() * Math.PI * 2;
        const b = Math.acos(2 * Math.random() - 1);
        const r = 0.88;
        return (
          <mesh key={i} position={[Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#1fb8c8" emissive="#16808a" emissiveIntensity={0.5} />
          </mesh>
        );
      })}
      {/* arms */}
      <mesh position={[-0.95, 0.4, 0]} rotation={[0, 0, 0.6]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color="#1fb8c8" emissive="#16808a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.95, 0.4, 0]} rotation={[0, 0, -0.6]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color="#1fb8c8" emissive="#16808a" emissiveIntensity={0.5} />
      </mesh>
      {/* eyes - big white with red rim */}
      <mesh position={[-0.28, 0.15, 0.78]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[0.28, 0.15, 0.78]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[-0.28, 0.15, 0.93]}>
        <torusGeometry args={[0.22, 0.04, 8, 20]} />
        <meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.28, 0.15, 0.93]}>
        <torusGeometry args={[0.22, 0.04, 8, 20]} />
        <meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[-0.28, 0.15, 0.95]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#1d3a8a" />
      </mesh>
      <mesh position={[0.28, 0.15, 0.95]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#1d3a8a" />
      </mesh>
      {/* mouth open with teeth */}
      <mesh position={[0, -0.35, 0.78]}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#2a0010" />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-0.2 + i * 0.1, -0.2, 0.95]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.15, 6]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      ))}
      <mesh position={[0, -0.4, 1.0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color="#ff6aa0" />
      </mesh>
      {/* glow */}
      <pointLight position={[0, 0, 0.5]} intensity={2.5} distance={6} color="#5af0ff" />
    </group>
  );
}

function Chest({ pos }: { pos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) ref.current.position.y = pos[1] + Math.sin(t.current * 2) * 0.08;
  });
  return (
    <group ref={ref} position={pos}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[0.9, 0.6, 0.6]} />
        <meshStandardMaterial color="#7a4a1a" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.62, 0]} rotation={[-0.8, 0, 0]}>
        <boxGeometry args={[0.9, 0.2, 0.6]} />
        <meshStandardMaterial color="#a06a2a" metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffaa00" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} intensity={2} distance={5} color="#ffcc55" />
    </group>
  );
}

// ============ PLAYER (corridor) ============
function PlayerController({ active, onNearDoor }: { active: boolean; onNearDoor: (idx: number | null) => void }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vy = useRef(0);
  const grounded = useRef(true);
  useEffect(() => {
    camera.position.set(0, 1.7, -CORRIDOR_LEN / 2 + 2);
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
      camera.position.x += move.x;
      camera.position.z += move.z;
    }
    if (k[" "] && grounded.current) { vy.current = 6; grounded.current = false; }
    vy.current -= 16 * dt;
    camera.position.y += vy.current * dt;
    if (camera.position.y <= 1.7) { camera.position.y = 1.7; vy.current = 0; grounded.current = true; }

    const halfW = CORRIDOR_W / 2 - 0.4;
    const halfL = CORRIDOR_LEN / 2 - 0.4;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -halfW, halfW);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfL, halfL);

    let nearest = -1;
    let nd = 999;
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -CORRIDOR_LEN / 2 + DOOR_SPACING * (Math.floor(i / 2) + 1);
      const x = side * (CORRIDOR_W / 2 - 0.05);
      const d2 = (camera.position.x - x) ** 2 + (camera.position.z - z) ** 2;
      if (d2 < nd) { nd = d2; nearest = i; }
    }
    onNearDoor(nd < 6 ? nearest : null);
  });
  return null;
}

// ============ ROOM camera (looks toward back wall) ============
function RoomCameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    // Player stands 2 cells inside the room. Door is at z=0, depth toward -z.
    camera.position.set(0, 1.7, -2);
    camera.lookAt(0, 1.6, -ROOM_D);
  }, [camera]);
  return null;
}

// ============ CORRIDOR SCENE ============
function CorridorScene({ doors }: { doors: DoorState[] }) {
  return (
    <>
      <color attach="background" args={["#0a0805"]} />
      {/* lifted ambient (+~10cd worth visually) so layout is faintly visible */}
      <ambientLight intensity={0.32} color="#5a4628" />
      <hemisphereLight args={["#8a7050", "#1a1208", 0.35]} />
      <fog attach="fog" args={["#0a0805", 10, 55]} />

      <CorridorWalls />

      {Array.from({ length: 12 }).map((_, i) => {
        const z = -CORRIDOR_LEN / 2 + (i + 0.5) * (CORRIDOR_LEN / 12);
        return <CeilingDome key={i} position={[0, WALL_H - 0.02, z]} />;
      })}
      <pointLight position={[0, WALL_H - 0.3, CORRIDOR_LEN / 2 - 1]} intensity={3.5} distance={16} color="#ffd58a" />
      <pointLight position={[0, WALL_H - 0.3, -CORRIDOR_LEN / 2 + 1]} intensity={1.6} distance={10} color="#ffb070" />

      {Array.from({ length: 10 }).map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const z = -CORRIDOR_LEN / 2 + DOOR_SPACING * (Math.floor(i / 2) + 1);
        const x = side * (CORRIDOR_W / 2 - 0.05);
        return <CorridorDoor key={i} index={i + 1} pos={[x, 0, z]} rotY={side > 0 ? -Math.PI / 2 : Math.PI / 2} state={doors[i]} />;
      })}
    </>
  );
}

// ============ ROOM SCENE ============
type RoomState = {
  doorIdx: number;
  outcome: DoorKind;
  phase: number; // ms since enter
};

function RoomScene({ room }: { room: RoomState }) {
  const isBoss = room.outcome.kind === "boss";
  const isChest = room.outcome.kind === "chest";
  const monsterProgress = isBoss ? Math.min(1, Math.max(0, (room.phase - 2000) / 1500)) : 0;
  const monsterVisible = isBoss && room.phase >= 2000;
  const chestVisible = isChest && room.phase >= 2000;
  return (
    <>
      <RoomCameraSetup />
      <color attach="background" args={[isChest ? "#03060f" : "#0a0604"]} />
      {isChest ? <StarRoom /> : <DungeonRoom withMonster={isBoss} />}
      {monsterVisible && <Monster progress={monsterProgress} visible />}
      {chestVisible && <Chest pos={[0, 0, -5]} />}
      {/* marker for player spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color={isChest ? "#9bb0ff" : "#ffb070"} transparent opacity={0.7} />
      </mesh>
    </>
  );
}

// ============ MAIN ============
function MagicPage() {
  const navigate = useNavigate();
  const [outfit, setOutfit] = useState<Outfit>(DEFAULT_OUTFIT);
  const [near, setNear] = useState<number | null>(null);
  const [doors, setDoors] = useState<DoorState[]>(Array(10).fill("closed"));
  const [room, setRoom] = useState<RoomState | null>(null);
  const [modal, setModal] = useState<null | { kind: "empty" | "chest" | "exit"; text: string }>(null);
  const [boss, setBoss] = useState<null | { door: number; hp: number; maxHp: number; level: 1 | 2 | 3; bulletsLeft: number; perHit: number; question: Question | null }>(null);
  const [coins, setCoins] = useState(0);
  const [won, setWon] = useState(false);

  const [intro, setIntro] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    if (intro === 0) { const t = setTimeout(() => setIntro(1), 4200); return () => clearTimeout(t); }
    if (intro === 1) { const t = setTimeout(() => setIntro(2), 3200); return () => clearTimeout(t); }
  }, [intro]);

  useEffect(() => {
    if (!getCurrentUser()) navigate({ to: "/login" });
    setOutfit(loadOutfit() || DEFAULT_OUTFIT);
  }, [navigate]);

  // room phase ticker
  useEffect(() => {
    if (!room) return;
    const start = Date.now();
    const id = setInterval(() => {
      setRoom((r) => (r ? { ...r, phase: Date.now() - start } : r));
    }, 50);
    return () => clearInterval(id);
  }, [room?.doorIdx]);

  // boss trigger after monster appears + 3s
  useEffect(() => {
    if (!room || room.outcome.kind !== "boss") return;
    if (boss) return;
    if (room.phase >= 2000 + 1500 + 3000) {
      const o = room.outcome;
      setBoss({
        door: room.doorIdx,
        hp: o.hp, maxHp: o.hp,
        level: o.level, bulletsLeft: o.bullets, perHit: o.perHit,
        question: randomQuestion(),
      });
    }
  }, [room, boss]);

  // open door = enter room (or finish for exit)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && near != null && doors[near] === "closed" && !modal && !boss && !room && intro === 2) {
        const outcome = DOOR_OUTCOMES[near];
        setDoors((d) => { const n = [...d]; n[near] = "open"; return n; });
        if (outcome.kind === "exit") {
          setWon(true);
          setModal({ kind: "exit", text: `🏆 Bạn đã thoát Stage 1! Tổng thưởng: ${coins} đồng` });
          return;
        }
        // exit pointer lock so room camera is fixed
        if (document.exitPointerLock) document.exitPointerLock();
        setRoom({ doorIdx: near, outcome, phase: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [near, doors, modal, boss, room, coins, intro]);

  const exitRoom = (cleared: boolean) => {
    if (room) {
      setDoors((d) => { const n = [...d]; n[room.doorIdx] = cleared ? "cleared" : "closed"; return n; });
    }
    setRoom(null);
    setBoss(null);
  };

  const closeModal = () => {
    setModal(null);
    exitRoom(true);
  };

  const answerBoss = (idx: number) => {
    if (!boss || !boss.question) return;
    const correct = idx === boss.question.answer;
    if (correct) {
      const newHp = Math.max(0, boss.hp - boss.perHit);
      const newBullets = boss.bulletsLeft - 1;
      if (newHp <= 0) {
        setCoins((c) => c + boss.maxHp);
        setModal({ kind: "chest", text: `⚔️ Hạ gục boss cấp ${boss.level}! +${boss.maxHp} đồng` });
        return;
      }
      setBoss({ ...boss, hp: newHp, bulletsLeft: newBullets <= 0 ? 10 : newBullets, question: randomQuestion() });
    } else {
      const nb = Math.max(0, boss.bulletsLeft - 1);
      setBoss({ ...boss, bulletsLeft: nb <= 0 ? 10 : nb, question: randomQuestion() });
    }
  };

  const collectChest = () => {
    if (!room || room.outcome.kind !== "chest") return;
    setCoins((c) => c + (room.outcome as any).reward);
    setModal({ kind: "chest", text: `🎁 Rương vàng! +${(room.outcome as any).reward} đồng` });
  };

  // chest auto-prompt once visible
  const chestReady = room?.outcome.kind === "chest" && room.phase >= 2000;
  const emptyReady = room?.outcome.kind === "empty" && room.phase >= 1500;

  return (
    <div className="relative w-full h-screen bg-black">
      <Canvas shadows camera={{ fov: 75, near: 0.05, far: 200 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          {room ? (
            <RoomScene room={room} />
          ) : (
            <>
              <CorridorScene doors={doors} />
              <PlayerController active={!modal && !won && intro === 2} onNearDoor={setNear} />
              {!modal && !won && intro === 2 && <PointerLockControls />}
            </>
          )}
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
        <Link to="/play" className="toy-button !text-xs">← Về chọn map</Link>
        <div className="glass-card px-3 py-2 text-sm font-black">
          💰 {coins} đồng · 🚪 {doors.filter((d) => d === "cleared").length}/10
        </div>
      </div>

      {/* crosshair only in corridor */}
      {!room && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-3 h-3 rounded-full border-2 border-white/80 shadow-lg" />
        </div>
      )}

      {/* hint */}
      {!room && near != null && doors[near] === "closed" && !modal && !won && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass-card px-4 py-2 font-black text-sm z-20">
          Nhấn <span className="text-orange-600">E</span> để mở Cửa {near + 1}
        </div>
      )}

      {/* controls hint */}
      {!room && (
        <div className="absolute bottom-3 right-3 glass-card px-3 py-2 text-xs font-bold z-20">
          WASD di chuyển · Chuột nhìn · Space nhảy · E mở cửa · Click để khoá chuột
        </div>
      )}

      {/* Room status banner */}
      {room && !modal && (
        <div className="absolute top-3 right-3 z-20 glass-card px-3 py-2 text-xs font-black max-w-xs">
          {room.outcome.kind === "boss" && (
            room.phase < 2000 ? "🌫️ Đứng yên... có gì đó trong bóng tối..."
              : room.phase < 3500 ? "👹 Một quái vật đang tiến tới!"
                : !boss ? "❄️ Chuẩn bị... câu hỏi sắp xuất hiện..."
                  : "❓ Trả lời đúng để hạ gục quái vật!"
          )}
          {room.outcome.kind === "empty" && (room.phase < 1500 ? "🌫️ Phòng trống lạnh lẽo..." : "Không có gì ở đây. Bạn có thể rời đi.")}
          {room.outcome.kind === "chest" && (room.phase < 2000 ? "✨ Bầu trời sao... có gì đó đang xuất hiện..." : "🎁 Rương vàng đã xuất hiện trước mặt bạn!")}
        </div>
      )}

      {/* Room action buttons */}
      {room && !modal && !boss && (emptyReady || chestReady) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {chestReady && (
            <button onClick={collectChest} className="toy-button toy-button-primary !text-base px-6 py-3">
              🎁 Mở rương
            </button>
          )}
          {emptyReady && (
            <button onClick={() => exitRoom(true)} className="toy-button !text-base px-6 py-3">
              🚪 Rời phòng
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 text-center">
            <div className="text-4xl mb-2">
              {modal.kind === "chest" ? "🎁" : modal.kind === "exit" ? "🏆" : "🌫️"}
            </div>
            <p className="font-black mb-4">{modal.text}</p>
            {modal.kind === "exit" ? (
              <Link to="/play" className="toy-button toy-button-primary w-full">Quay lại chọn map</Link>
            ) : (
              <button onClick={closeModal} className="toy-button toy-button-primary w-full">Tiếp tục</button>
            )}
          </div>
        </div>
      )}

      {/* Boss question */}
      {boss && boss.question && (
        <div className="absolute inset-x-0 bottom-0 z-30 p-4">
          <div className="max-w-2xl mx-auto glass-card p-4">
            <div className="flex items-center justify-between mb-2 text-xs font-black">
              <span>👹 Boss cấp {boss.level}</span>
              <span>❤️ {boss.hp}/{boss.maxHp}</span>
              <span>❄️ Đạn: {boss.bulletsLeft}/10</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-red-500" style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
            </div>
            <p className="font-black text-base mb-3">❓ {boss.question.q}</p>
            <div className="grid grid-cols-2 gap-2">
              {boss.question.options.map((opt, i) => (
                <button key={i} onClick={() => answerBoss(i)} className="toy-button !text-sm py-2">
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold mt-2 opacity-70">
              Đáp đúng → bắn đạn băng −{boss.perHit} HP. Hết đạn sẽ reload.
            </p>
          </div>
        </div>
      )}

      {/* Creepy intro overlay */}
      {intro < 2 && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-6 text-center select-none"
          style={{ background: "radial-gradient(ellipse at center, #1a0a0a 0%, #050000 70%, #000 100%)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.85) 90%)",
              animation: "creepyFlicker 2.4s infinite",
            }}
          />
          {intro === 0 ? (
            <p
              className="relative max-w-2xl text-xl md:text-3xl leading-relaxed text-amber-100/90"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                letterSpacing: "0.03em",
                textShadow: "0 0 18px rgba(255,80,0,0.35), 0 0 2px #000",
                animation: "creepyFade 4.2s ease-in-out forwards",
              }}
            >
              Chào mừng đến lâu đài ma thuật,
              <br />
              nhiệm vụ của bạn chính là tìm đường thoát khỏi đây...
            </p>
          ) : (
            <h1
              className="relative text-7xl md:text-9xl"
              style={{
                fontFamily: "'Nosifer', 'Creepster', 'Montserrat', cursive",
                color: "#a30000",
                textShadow:
                  "0 0 8px #ff0000, 0 0 24px #5a0000, 4px 8px 0 #2a0000, 0 30px 28px rgba(120,0,0,0.6)",
                animation: "bloodDrip 1.4s ease-out, creepyShake 0.18s infinite",
                letterSpacing: "0.08em",
              }}
            >
              CHẠY ĐI
            </h1>
          )}
          <style>{`
            @keyframes creepyFade {
              0% { opacity: 0; filter: blur(8px); }
              15% { opacity: 1; filter: blur(0); }
              85% { opacity: 1; }
              100% { opacity: 0.2; }
            }
            @keyframes creepyFlicker {
              0%,19%,21%,23%,80%,100% { opacity: 1; }
              20%,22%,55% { opacity: 0.55; }
            }
            @keyframes creepyShake {
              0% { transform: translate(0,0); }
              25% { transform: translate(-1px,1px); }
              50% { transform: translate(1px,-1px); }
              75% { transform: translate(-1px,-1px); }
              100% { transform: translate(1px,1px); }
            }
            @keyframes bloodDrip {
              0% { transform: scale(0.6); opacity: 0; text-shadow: 0 0 0 #000; }
              40% { transform: scale(1.05); opacity: 1; }
              100% {
                transform: scale(1);
                opacity: 1;
                text-shadow:
                  0 0 8px #ff0000,
                  0 0 24px #5a0000,
                  4px 8px 0 #2a0000,
                  0 60px 50px rgba(150,0,0,0.85),
                  0 90px 4px rgba(120,0,0,0.6);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
