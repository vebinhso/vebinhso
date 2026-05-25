import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getCurrentUser } from "@/lib/auth";
import { loadOutfit, DEFAULT_OUTFIT, type Outfit } from "@/lib/character";
import { randomQuestion, type Question } from "@/game/questions";
import { loadGame, saveGame } from "@/lib/game";
import { Stage2Scene, Stage2PlayerController, Witch, Lightning } from "@/game/stage2";
import { PirateRoomScene, ForestLakeScene, DarkPotionScene, S2StarRoomScene, SpiderWebRoomScene, WitchRoomScene } from "@/game/stage2rooms";
import { TigerEmerging, ParrotDescending, BeaverEmerging, RandomAnimal, CorridorTigers, pickRandomAnimal, type AnimalName } from "@/game/PetModels";

export const Route = createFileRoute("/magic")({
  component: MagicPage,
  head: () => ({
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@400;600;700;900&family=Pirata+One&family=Special+Elite&display=swap",
      },
    ],
  }),
});

type DoorKind =
  | { kind: "empty" }
  | { kind: "chest"; reward: number }
  | { kind: "boss"; level: 1 | 2 | 3; hp: number; bullets: number; perHit: number }
  | { kind: "animal" } // random animal — answer 2 questions to clear
  | { kind: "exit" };

const DOOR_OUTCOMES: DoorKind[] = [
  { kind: "animal" },                                            // 1 — random animal (2 câu)
  { kind: "boss", level: 1, hp: 100, bullets: 10, perHit: 10 },  // 2 — tiger
  { kind: "chest", reward: 20 },                                 // 3
  { kind: "boss", level: 2, hp: 100, bullets: 5, perHit: 20 },   // 4 — parrot
  { kind: "chest", reward: 30 },                                 // 5
  { kind: "animal" },                                            // 6 — random animal (2 câu)
  { kind: "boss", level: 3, hp: 100, bullets: 5, perHit: 20 },   // 7 — beaver
  { kind: "animal" },                                            // 8 — random animal (2 câu)
  { kind: "chest", reward: 10 },                                 // 9
  { kind: "animal" },                                            // 10 — random animal (cửa cuối, hoàn thành mới mở lối thoát)
];

const CORRIDOR_LEN = 60;
const CORRIDOR_W = 6;
const WALL_H = 4;
const DOOR_SPACING = CORRIDOR_LEN / 6;

type DoorState = "closed" | "open" | "cleared";

// ============ CORRIDOR ============
function CorridorWalls({ exitOpen = false }: { exitOpen?: boolean }) {
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
      {/* far back wall — opens into Stage 2 portal */}
      {!exitOpen ? (
        <mesh position={[0, WALL_H / 2, -CORRIDOR_LEN / 2]}>
          <planeGeometry args={[CORRIDOR_W, WALL_H]} />
          <meshStandardMaterial color="#1a140c" />
        </mesh>
      ) : (
        <group position={[0, 0, -CORRIDOR_LEN / 2]}>
          {/* dark void beyond — pushed back so player clearly walks through */}
          <mesh position={[0, WALL_H / 2, -1.2]}>
            <planeGeometry args={[CORRIDOR_W, WALL_H]} />
            <meshBasicMaterial color="#000" />
          </mesh>
          {/* glowing arch frame — left, right, top pillars */}
          <mesh position={[-CORRIDOR_W / 2 + 0.25, WALL_H / 2, 0.02]}>
            <boxGeometry args={[0.3, WALL_H, 0.3]} />
            <meshStandardMaterial color="#1a0d05" emissive="#ff7030" emissiveIntensity={2.6} />
          </mesh>
          <mesh position={[CORRIDOR_W / 2 - 0.25, WALL_H / 2, 0.02]}>
            <boxGeometry args={[0.3, WALL_H, 0.3]} />
            <meshStandardMaterial color="#1a0d05" emissive="#ff7030" emissiveIntensity={2.6} />
          </mesh>
          <mesh position={[0, WALL_H - 0.15, 0.02]}>
            <boxGeometry args={[CORRIDOR_W, 0.3, 0.3]} />
            <meshStandardMaterial color="#1a0d05" emissive="#ff7030" emissiveIntensity={2.6} />
          </mesh>
          {/* glowing threshold strip on the floor — invites the player to step through */}
          <mesh position={[0, 0.02, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[CORRIDOR_W - 0.6, 0.25]} />
            <meshStandardMaterial color="#ffb060" emissive="#ff8030" emissiveIntensity={3} />
          </mesh>
          {/* swirling portal disc inside the arch */}
          <mesh position={[0, WALL_H / 2, -0.2]}>
            <planeGeometry args={[CORRIDOR_W - 0.7, WALL_H - 0.5]} />
            <meshBasicMaterial color="#ff7030" transparent opacity={0.18} />
          </mesh>
          <pointLight position={[0, WALL_H - 0.4, 0.5]} intensity={5} distance={20} color="#ff9050" />
          <pointLight position={[0, 0.5, 0.5]} intensity={3.5} distance={14} color="#ff5020" />
          <pointLight position={[0, WALL_H / 2, 2.5]} intensity={2.2} distance={12} color="#ffb070" />
        </group>
      )}
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
    // Only "open" animates — "cleared" doors look identical to "closed" (no progress indicator)
    const target = state === "open" ? Math.PI / 2.2 : 0;
    ref.current.rotation.y += (target - ref.current.rotation.y) * 0.1;
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[1.6, 3, 0.15]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <group position={[-0.6, 0, 0]}>
        <group ref={ref}>
          <mesh position={[0.6, 1.4, 0.05]} castShadow>
            <boxGeometry args={[1.2, 2.6, 0.1]} />
            <meshStandardMaterial color="#8b5a2b" metalness={0.2} roughness={0.6} />
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
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.position.y = 1.0 + Math.sin(t.current * 4) * (progress < 1 ? 0.10 : 0.05);
      ref.current.rotation.y = Math.sin(t.current * 1.6) * 0.08;
    }
  });
  if (!visible) return null;
  const startZ = -ROOM_D + 0.6;
  const endZ = -5.5;
  const z = startZ + (endZ - startZ) * progress;
  const reveal = Math.min(1, progress * 1.4);

  const FUR = "#1aa8c9";
  const FUR_DARK = "#0d7fa0";
  const FUR_LIGHT = "#5dc7e0";
  const RED = "#d62828";
  const MOUTH = "#2a0a0a";
  const TONGUE = "#ff4d8a";

  const R = 0.95;
  const STRANDS = 520;
  const strands = Array.from({ length: STRANDS }).map((_, i) => {
    const phi = Math.acos(1 - 2 * ((i + 0.5) / STRANDS));
    const theta = i * 2.39996323;
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.cos(phi);
    const nz = Math.sin(phi) * Math.sin(theta);
    // leave a face area clear (front cap for eyes/mouth)
    if (nz > 0.55 && ny > -0.35 && ny < 0.55 && Math.abs(nx) < 0.6) return null;
    const len = 0.30 + (((i * 7) % 11) / 11) * 0.22;
    const ox = nx * (R - 0.02);
    const oy = ny * (R - 0.02);
    const oz = nz * (R - 0.02);
    const rotX = Math.atan2(Math.sqrt(nx * nx + nz * nz), ny);
    const rotY = Math.atan2(nx, nz);
    const shade = (i % 9 === 0) ? FUR_DARK : (i % 5 === 0 ? FUR_LIGHT : FUR);
    const thickness = 0.022 + (((i * 13) % 5) / 5) * 0.012;
    return (
      <group key={i} position={[ox, oy, oz]} rotation={[0, rotY, 0]}>
        <group rotation={[rotX, 0, 0]}>
          <mesh position={[0, len / 2, 0]}>
            <coneGeometry args={[thickness, len, 5]} />
            <meshStandardMaterial color={shade} roughness={0.95} />
          </mesh>
        </group>
      </group>
    );
  });

  return (
    <group ref={ref} position={[0, 1.0, z]} scale={[reveal, reveal, reveal]}>
      <mesh castShadow>
        <sphereGeometry args={[R, 40, 40]} />
        <meshStandardMaterial color={FUR} roughness={0.95} />
      </mesh>
      {strands}

      {/* stubby arm bumps */}
      <mesh position={[-0.95, -0.05, 0.1]} castShadow>
        <sphereGeometry args={[0.30, 22, 22]} />
        <meshStandardMaterial color={FUR} roughness={0.95} />
      </mesh>
      <mesh position={[0.95, -0.05, 0.1]} castShadow>
        <sphereGeometry args={[0.30, 22, 22]} />
        <meshStandardMaterial color={FUR} roughness={0.95} />
      </mesh>

      {/* red eye-socket rings */}
      <mesh position={[-0.32, 0.22, 0.78]} rotation={[0, -0.15, 0]}>
        <torusGeometry args={[0.24, 0.07, 14, 28]} />
        <meshStandardMaterial color={RED} roughness={0.5} />
      </mesh>
      <mesh position={[0.32, 0.22, 0.78]} rotation={[0, 0.15, 0]}>
        <torusGeometry args={[0.24, 0.07, 14, 28]} />
        <meshStandardMaterial color={RED} roughness={0.5} />
      </mesh>
      {/* eye whites */}
      <mesh position={[-0.32, 0.22, 0.86]}>
        <sphereGeometry args={[0.22, 22, 22]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} />
      </mesh>
      <mesh position={[0.32, 0.22, 0.86]}>
        <sphereGeometry args={[0.22, 22, 22]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} />
      </mesh>
      {/* irises */}
      <mesh position={[-0.30, 0.20, 1.03]}>
        <sphereGeometry args={[0.10, 16, 16]} />
        <meshStandardMaterial color="#1a4fb8" roughness={0.3} />
      </mesh>
      <mesh position={[0.34, 0.20, 1.03]}>
        <sphereGeometry args={[0.10, 16, 16]} />
        <meshStandardMaterial color="#1a4fb8" roughness={0.3} />
      </mesh>
      {/* pupils */}
      <mesh position={[-0.30, 0.20, 1.09]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.34, 0.20, 1.09]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      {/* highlights */}
      <mesh position={[-0.26, 0.26, 1.12]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.38, 0.26, 1.12]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} />
      </mesh>

      {/* big open mouth: red lips + dark interior + tongue */}
      <mesh position={[0, -0.30, 0.80]} rotation={[0.18, 0, 0]}>
        <torusGeometry args={[0.34, 0.085, 16, 32]} />
        <meshStandardMaterial color={RED} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.32, 0.74]} rotation={[0.18, 0, 0]}>
        <sphereGeometry args={[0.30, 24, 24]} />
        <meshStandardMaterial color={MOUTH} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.48, 0.92]} rotation={[0.7, 0, 0]}>
        <boxGeometry args={[0.16, 0.30, 0.10]} />
        <meshStandardMaterial color={TONGUE} roughness={0.5} />
      </mesh>

      <pointLight position={[0, 0.6, 0.8]} intensity={1.4} distance={5} color="#bfe6ff" />
      <pointLight position={[0, -0.2, 1.0]} intensity={0.5} distance={3} color="#ff8080" />
    </group>
  );
}

function Chest({ pos, reveal }: { pos: [number, number, number]; reveal: number }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      const riseY = pos[1] + (reveal < 1 ? -0.8 * (1 - reveal) : 0) + Math.sin(t.current * 2) * 0.05 * reveal;
      ref.current.position.y = riseY;
    }
  });
  const s = Math.max(0.001, reveal);
  const lidOpen = Math.min(1, reveal) * 1.05;

  const WOOD = "#7a4318";
  const WOOD_DARK = "#5a2f0e";
  const WOOD_LIGHT = "#9a5a26";
  const GOLD = "#e4b248";

  const W = 1.4, H = 0.75, D = 0.95;
  // rotate ~25° so front+top face the player
  const yaw = -Math.PI / 7;

  return (
    <group ref={ref} position={pos} scale={[s, s, s]} rotation={[0, yaw, 0]}>
      {/* SOLID wood body */}
      <mesh castShadow receiveShadow position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </mesh>

      {/* plank seams on front (decorative only, very thin) */}
      {[-W / 4, 0, W / 4].map((x, i) => (
        <mesh key={`pf${i}`} position={[x, H / 2, D / 2 + 0.002]}>
          <boxGeometry args={[0.022, H * 0.9, 0.005]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
        </mesh>
      ))}

      {/* bottom gold band */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[W + 0.04, 0.10, D + 0.04]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.28} />
      </mesh>
      {/* gold vertical corner straps on front */}
      {[-W / 2 + 0.04, W / 2 - 0.04].map((x, i) => (
        <mesh key={`gv${i}`} position={[x, H / 2, D / 2 + 0.003]}>
          <boxGeometry args={[0.08, H, 0.02]} />
          <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.28} />
        </mesh>
      ))}
      {/* lock plate */}
      <mesh position={[0, H * 0.55, D / 2 + 0.004]}>
        <boxGeometry args={[0.22, 0.26, 0.02]} />
        <meshStandardMaterial color={GOLD} metalness={0.95} roughness={0.22} />
      </mesh>
      <mesh position={[0, H * 0.55, D / 2 + 0.02]}>
        <boxGeometry args={[0.06, 0.10, 0.01]} />
        <meshStandardMaterial color="#1a1208" roughness={0.5} />
      </mesh>

      {/* Lid — solid block, hinged at back so it opens AWAY from camera */}
      <group position={[0, H, -D / 2]} rotation={[-lidOpen, 0, 0]}>
        <mesh castShadow position={[0, 0.06, D / 2]}>
          <boxGeometry args={[W, 0.14, D]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
        </mesh>
        {/* gold rim around lid */}
        <mesh position={[0, 0.135, D / 2]}>
          <boxGeometry args={[W + 0.04, 0.05, D + 0.04]} />
          <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} />
        </mesh>
      </group>

      {/* COINS — sit on top of interior, fully visible once lid opens */}
      {reveal > 0.55 && (
        <group position={[0, H + 0.02, 0]}>
          {/* pile base (hemisphere) */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.34, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ffd54a" metalness={0.95} roughness={0.22} emissive="#ffa600" emissiveIntensity={1.2} />
          </mesh>
          {/* individual coins scattered on top */}
          {Array.from({ length: 16 }).map((_, i) => {
            const a = i * 0.9;
            const r = 0.10 + (i % 3) * 0.07;
            const cx = Math.cos(a) * r;
            const cz = Math.sin(a) * r * 0.55;
            const cy = 0.06 + (i % 4) * 0.03;
            const tilt = (i % 5) * 0.18;
            return (
              <mesh key={i} position={[cx, cy, cz]} rotation={[Math.PI / 2 - 0.12, tilt, i * 0.3]} castShadow>
                <cylinderGeometry args={[0.09, 0.09, 0.02, 20]} />
                <meshStandardMaterial color="#ffe066" metalness={0.95} roughness={0.2} emissive="#ffaa00" emissiveIntensity={0.6} />
              </mesh>
            );
          })}
          <pointLight position={[0, 0.7, 0.3]} intensity={3.0 * reveal} distance={6} color="#ffcc55" />
        </group>
      )}
      <pointLight position={[0, 0.2, 0]} intensity={1.0 * reveal} distance={4} color="#ffd070" />
    </group>
  );
}


// ============ PLAYER (corridor) ============
function PlayerController({ active, onNearDoor, exitOpen, onExitCross, spawnRef }: { active: boolean; onNearDoor: (idx: number | null) => void; exitOpen?: boolean; onExitCross?: () => void; spawnRef?: React.MutableRefObject<{ x: number; z: number; lookX: number; lookZ: number } | null> }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vy = useRef(0);
  const grounded = useRef(true);
  const exited = useRef(false);
  useEffect(() => {
    const s = spawnRef?.current;
    if (s) {
      camera.position.set(s.x, 1.7, s.z);
      camera.lookAt(s.x + s.lookX, 1.6, s.z + s.lookZ);
    } else {
      // spawn at the BACK of the corridor (near door 1, near where the exit portal opens),
      // facing the far end of the corridor (toward door 10).
      camera.position.set(0, 1.7, -CORRIDOR_LEN / 2 + 3);
      camera.lookAt(0, 1.6, CORRIDOR_LEN / 2);
    }
    const d = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const u = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, [camera, spawnRef]);

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
    if (exitOpen) {
      // back wall opens — allow crossing southward through the portal
      camera.position.z = Math.max(camera.position.z, -halfL);
      camera.position.z = Math.min(camera.position.z, halfL);
      if (!exited.current && camera.position.z < -halfL + 0.2) {
        exited.current = true;
        onExitCross?.();
      }
    } else {
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfL, halfL);
    }

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
function CorridorScene({ doors, exitOpen, onTigerHit, tigersActive }: { doors: DoorState[]; exitOpen?: boolean; onTigerHit: () => void; tigersActive: boolean }) {
  return (
    <>
      <color attach="background" args={["#0a0805"]} />
      {/* lifted ambient (+~10cd worth visually) so layout is faintly visible */}
      <ambientLight intensity={0.32} color="#5a4628" />
      <hemisphereLight args={["#8a7050", "#1a1208", 0.35]} />
      <fog attach="fog" args={["#0a0805", 10, 55]} />

      <CorridorWalls exitOpen={exitOpen} />

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

      {/* Two patrolling tigers — touching one triggers a 5-question quiz */}
      <CorridorTigers onHit={onTigerHit} corridorLen={CORRIDOR_LEN} corridorW={CORRIDOR_W} active={tigersActive} />
    </>
  );
}

// ============ ROOM SCENE ============
type RoomState = {
  doorIdx: number;
  outcome: DoorKind;
  phase: number; // ms since enter
};

function RoomScene({ room, animalName }: { room: RoomState; animalName: AnimalName | null }) {
  const isBoss = room.outcome.kind === "boss";
  const isChest = room.outcome.kind === "chest";
  const isAnimal = room.outcome.kind === "animal";
  // Monster: walks from darkness over 5 seconds, starting at phase 2000ms
  const monsterProgress = isBoss ? Math.min(1, Math.max(0, (room.phase - 2000) / 5000)) : 0;
  const monsterVisible = isBoss && room.phase >= 2000;
  // Chest: reveals gradually over 5 seconds, starting at phase 2000ms
  const chestReveal = isChest ? Math.min(1, Math.max(0, (room.phase - 2000) / 5000)) : 0;
  const chestVisible = isChest && room.phase >= 2000;
  // Animal door: reveals over 2.5s starting at 1000ms
  const animalProgress = isAnimal ? Math.min(1, Math.max(0, (room.phase - 1000) / 2500)) : 0;
  const animalVisible = isAnimal && room.phase >= 1000 && animalName;

  // Boss door → specific animal based on door index
  const renderBossAnimal = () => {
    if (room.doorIdx === 1) return <TigerEmerging progress={monsterProgress} />;
    if (room.doorIdx === 3) return <ParrotDescending progress={monsterProgress} />;
    if (room.doorIdx === 6) return <BeaverEmerging progress={monsterProgress} />;
    // fallback
    return <TigerEmerging progress={monsterProgress} />;
  };

  return (
    <>
      <RoomCameraSetup />
      <color attach="background" args={[isChest ? "#03060f" : "#0a0604"]} />
      {isChest ? <StarRoom /> : <DungeonRoom withMonster={isBoss || isAnimal} />}
      {monsterVisible && renderBossAnimal()}
      {animalVisible && animalName && <RandomAnimal name={animalName} />}
      {chestVisible && <Chest pos={[0, 0, -5]} reveal={chestReveal} />}
      {/* marker for player spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color={isChest ? "#9bb0ff" : "#ffb070"} transparent opacity={0.7} />
      </mesh>
    </>
  );
}


// ============ MAIN ============
type Stage = 1 | "transition" | 2;
type S2RoomKind = "pirate" | "forest" | "potion" | "stars" | "room5quiz" | "room5stars" | "witch";
type S2DoorState = "closed" | "cleared";
type S2Room = { kind: S2RoomKind; doorIdx: number; phase: number; picked?: boolean };

const MAGIC_SAVE_KEY = "vebinhso_magic_progress";
type MagicSave = {
  stage: 1 | 2;
  doors: DoorState[];
  s2Doors: S2DoorState[];
  s2Inv: { shield: boolean; potion: number };
  coins: number;
  stage2Unlocked?: boolean;
};
function loadMagic(): MagicSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MAGIC_SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveMagic(s: MagicSave) {
  try { localStorage.setItem(MAGIC_SAVE_KEY, JSON.stringify(s)); } catch {}
}

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

  // Stage 2 state
  const [stage, setStage] = useState<Stage>(1);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitDeadline, setExitDeadline] = useState<number | null>(null);
  const [exitNow, setExitNow] = useState(Date.now());
  const [s2Near, setS2Near] = useState<number | null>(null);
  const [s2Doors, setS2Doors] = useState<S2DoorState[]>(Array(5).fill("closed"));
  const [s2Modal, setS2Modal] = useState<null | { title: string; text: string; finished?: boolean }>(null);
  const [s2Inv, setS2Inv] = useState<{ shield: boolean; potion: number }>({ shield: false, potion: 0 });
  const [room5Open, setRoom5Open] = useState(false);
  const [s2Room, setS2Room] = useState<S2Room | null>(null);
  const [witch, setWitch] = useState<null | { hp: number; maxHp: number; question: Question | null; playerHp: number; phase: "cast" | "answer"; phaseStart: number; correct: number; wave: number }>(null);
  const shieldUsedRef = useRef(false);
  const [shieldBlink, setShieldBlink] = useState(0);
  const [transStart, setTransStart] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pirateChestOpened, setPirateChestOpened] = useState(false);
  const [room5ChestOpened, setRoom5ChestOpened] = useState(false);
  const [ghostQuiz, setGhostQuiz] = useState<Question | null>(null);
  const [stage2Unlocked, setStage2Unlocked] = useState(false);
  const [selectedArea, setSelectedArea] = useState<1 | 2 | null>(null);
  const corridorSpawnRef = useRef<{ x: number; z: number; lookX: number; lookZ: number } | null>(null);

  const [intro, setIntro] = useState<0 | 1 | 2 | 3>(0);
  useEffect(() => {
    if (intro === 0) { const t = setTimeout(() => setIntro(1), 4200); return () => clearTimeout(t); }
    if (intro === 1) { const t = setTimeout(() => setIntro(2), 2400); return () => clearTimeout(t); } // CHẠY ĐI
    if (intro === 2) { const t = setTimeout(() => setIntro(3), 2400); return () => clearTimeout(t); } // KHU VỰC 1
  }, [intro]);

  useEffect(() => {
    if (!getCurrentUser()) navigate({ to: "/login" });
    setOutfit(loadOutfit() || DEFAULT_OUTFIT);
    // Hydrate saved progress
    const saved = loadMagic();
    if (saved) {
      setDoors(saved.doors || Array(10).fill("closed"));
      setS2Doors(saved.s2Doors || Array(5).fill("closed"));
      setS2Inv(saved.s2Inv || { shield: false, potion: 0 });
      setCoins(saved.coins || 0);
      setStage2Unlocked(!!saved.stage2Unlocked || saved.stage === 2);
    }
    setHydrated(true);
  }, [navigate]);

  // Auto-save progress
  useEffect(() => {
    if (!hydrated) return;
    saveMagic({
      stage: stage === "transition" ? 1 : (stage as 1 | 2),
      doors, s2Doors, s2Inv, coins, stage2Unlocked,
    });
  }, [hydrated, stage, doors, s2Doors, s2Inv, coins, stage2Unlocked]);

  // Cộng vàng vừa cho local HUD vừa vào game.money toàn cục
  const addCoins = (n: number) => {
    setCoins((c) => c + n);
    const g = loadGame();
    saveGame({ ...g, money: g.money + n });
  };

  // Cộng / reset số câu hỏi trả lời đúng (DÙNG CHUNG với map nhà)
  const bumpQuestion = (isCorrect: boolean) => {
    const g = loadGame();
    if (isCorrect) {
      saveGame({ ...g, correctAnswers: g.correctAnswers + 1, answerStreak: g.answerStreak + 1 });
    } else {
      saveGame({ ...g, answerStreak: 0 });
    }
  };

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
    if (room.phase >= 2000 + 5000 + 2000) {
      const o = room.outcome;
      setBoss({
        door: room.doorIdx,
        hp: o.hp, maxHp: o.hp,
        level: o.level, bulletsLeft: o.bullets, perHit: o.perHit,
        question: randomQuestion(),
      });
    }
  }, [room, boss]);

  // 20s exit timer ticker
  useEffect(() => {
    if (!exitOpen || exitDeadline == null || stage !== 1) return;
    const id = setInterval(() => {
      const now = Date.now();
      setExitNow(now);
      if (now >= exitDeadline) {
        // timed out — close back wall
        setExitOpen(false);
        setExitDeadline(null);
        // mark door 10 as cleared so they can try again? keep closed so they can re-open
        setDoors((d) => { const n = [...d]; n[9] = "closed"; return n; });
      }
    }, 100);
    return () => clearInterval(id);
  }, [exitOpen, exitDeadline, stage]);

  // transition timer
  useEffect(() => {
    if (stage !== "transition" || transStart == null) return;
    const t = setTimeout(() => {
      setStage(2);
      setTransStart(null);
    }, 3200);
    return () => clearTimeout(t);
  }, [stage, transStart]);

  // current animal name for animal-kind rooms (random pick once on entry)
  const [currentAnimal, setCurrentAnimal] = useState<AnimalName | null>(null);

  // mini-quiz for animal encounters: 2 questions for animal doors, 5 for corridor tigers
  const [animalQuiz, setAnimalQuiz] = useState<null | {
    q: Question;
    idx: number;
    total: number;
    correct: number;
    source: "door" | "corridor" | "s2";
    doorIdx?: number;
  }>(null);

  // open door = enter room (or trigger exit for door 10)
  useEffect(() => {
    if (stage !== 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && near != null && doors[near] === "closed" && !modal && !boss && !room && !animalQuiz && intro === 2) {
        const outcome = DOOR_OUTCOMES[near];
        setDoors((d) => { const n = [...d]; n[near] = "open"; return n; });
        if (outcome.kind === "exit") {
          // OPEN BACK WALL + 20s timer instead of ending game
          setExitOpen(true);
          setExitDeadline(Date.now() + 20000);
          if (document.exitPointerLock) document.exitPointerLock();
          return;
        }
        if (document.exitPointerLock) document.exitPointerLock();
        // Save corridor return position right in front of this door (facing into corridor)
        {
          const side = near % 2 === 0 ? -1 : 1;
          const z = -CORRIDOR_LEN / 2 + DOOR_SPACING * (Math.floor(near / 2) + 1);
          const x = side * (CORRIDOR_W / 2 - 1.4);
          corridorSpawnRef.current = { x, z, lookX: -side, lookZ: 0 };
        }
        if (outcome.kind === "animal") {
          setCurrentAnimal(pickRandomAnimal(Date.now() + near));
        } else {
          setCurrentAnimal(null);
        }
        setRoom({ doorIdx: near, outcome, phase: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [near, doors, modal, boss, room, intro, stage, animalQuiz]);

  // Auto-trigger 2-question quiz once the animal in an animal-kind room is fully revealed
  useEffect(() => {
    if (!room || room.outcome.kind !== "animal" || animalQuiz) return;
    if (room.phase >= 3500) {
      setAnimalQuiz({ q: randomQuestion(), idx: 0, total: 2, correct: 0, source: "door", doorIdx: room.doorIdx });
    }
  }, [room, animalQuiz]);

  const onTigerHit = () => {
    if (animalQuiz || modal || boss || room) return;
    if (document.exitPointerLock) document.exitPointerLock();
    setAnimalQuiz({ q: randomQuestion(), idx: 0, total: 5, correct: 0, source: "corridor" });
  };

  const answerAnimalQuiz = (i: number) => {
    if (!animalQuiz) return;
    const isCorrect = i === animalQuiz.q.answer;
    const reward = isCorrect ? animalQuiz.q.reward : 0;
    if (reward) addCoins(reward);
    bumpQuestion(isCorrect);
    const nextCorrect = animalQuiz.correct + (isCorrect ? 1 : 0);
    const nextIdx = animalQuiz.idx + 1;
    if (nextIdx >= animalQuiz.total) {
      const src = animalQuiz.source;
      const dIdx = animalQuiz.doorIdx;
      setAnimalQuiz(null);
      if (src === "door" && dIdx != null) {
        setDoors((d) => { const n = [...d]; n[dIdx] = "cleared"; return n; });
        setRoom(null);
        setCurrentAnimal(null);
        setModal({ kind: "chest", text: `🐾 Đúng ${nextCorrect}/${animalQuiz.total} câu. Bạn rời căn phòng có chú vật ngộ nghĩnh!` });
      } else if (src === "s2" && dIdx != null) {
        setS2Doors((d) => { const n = [...d]; n[dIdx] = "cleared"; return n; });
        setS2Room(null);
        setCurrentAnimal(null);
        setS2Modal({ title: "🐾 Phòng động vật", text: `Đúng ${nextCorrect}/${animalQuiz.total} câu. Bạn rời khỏi căn phòng có thú lạ.` });
      }
      // corridor: just continue playing
      return;
    }
    setAnimalQuiz({ ...animalQuiz, q: randomQuestion(), idx: nextIdx, correct: nextCorrect });
  };


  // Stage 2: open door (E key) — open a per-room scene
  useEffect(() => {
    if (stage !== 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "e" || s2Near == null) return;
      if (s2Doors[s2Near] === "cleared" || s2Modal || room5Open || witch || s2Room) return;
      const idx = s2Near;
      const kinds: S2RoomKind[] = ["pirate", "forest", "potion", "stars", "room5quiz"];
      const kind = kinds[idx];
      if (document.exitPointerLock) document.exitPointerLock();
      if (idx === 4) {
        // Phòng 5: mở bảng chọn cửa con
        setRoom5Open(true);
      } else {
        if (idx === 3) {
          // Cửa 4 stage 2: random animal + 2-question quiz
          const an = pickRandomAnimal(Date.now() + idx);
          setCurrentAnimal(an);
          setS2Room({ kind, doorIdx: idx, phase: 0 });
          setAnimalQuiz({ q: randomQuestion(), idx: 0, total: 2, correct: 0, source: "s2", doorIdx: idx });
        } else {
          setCurrentAnimal(null);
          setS2Room({ kind, doorIdx: idx, phase: 0 });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s2Near, s2Doors, s2Modal, room5Open, witch, stage, s2Room]);

  // S2 room phase ticker
  useEffect(() => {
    if (!s2Room) return;
    const id = setInterval(() => setS2Room((r) => (r ? { ...r, phase: r.phase + 100 } : r)), 100);
    return () => clearInterval(id);
  }, [s2Room]);

  // Witch fight: 5 lightning waves. Each wave = 2s cast phase → player must press shield button
  // to block; resolves; then 1 question, correct answer = -20 boss HP. Win if boss HP <= 0.
  useEffect(() => {
    if (!witch) return;
    const id = setInterval(() => {
      setWitch((w) => {
        if (!w) return w;
        const elapsed = Date.now() - w.phaseStart;
        if (w.phase === "cast" && elapsed >= 2000) {
          let php = w.playerHp;
          const blocked = shieldUsedRef.current && s2Inv.shield;
          if (!blocked) php -= 22;
          shieldUsedRef.current = false;
          if (php < 30 && s2Inv.potion > 0) {
            php = Math.min(100, php + 40);
            setS2Inv((v) => ({ ...v, potion: v.potion - 1 }));
          }
          if (php <= 0) {
            setS2Modal({ title: "💀 Thất bại", text: "Phù thủy đã hạ gục bạn. Hãy thử cánh cửa khác!" });
            return null;
          }
          return { ...w, phase: "answer", phaseStart: Date.now(), question: randomQuestion(), playerHp: php };
        }
        return w;
      });
    }, 100);
    return () => clearInterval(id);
  }, [witch, s2Inv.shield, s2Inv.potion]);

  const useShield = () => {
    if (!witch || witch.phase !== "cast" || !s2Inv.shield) return;
    shieldUsedRef.current = true;
    setShieldBlink((n) => n + 1);
  };

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
    const g = loadGame();
    if (correct) {
      saveGame({ ...g, correctAnswers: g.correctAnswers + 1, answerStreak: g.answerStreak + 1 });
      const newHp = Math.max(0, boss.hp - boss.perHit);
      const newBullets = boss.bulletsLeft - 1;
      if (newHp <= 0) {
        addCoins(boss.maxHp);
        setModal({ kind: "chest", text: `⚔️ Hạ gục boss cấp ${boss.level}! +${boss.maxHp} đồng` });
        return;
      }
      setBoss({ ...boss, hp: newHp, bulletsLeft: newBullets <= 0 ? 10 : newBullets, question: randomQuestion() });
    } else {
      saveGame({ ...g, answerStreak: 0 });
      const nb = Math.max(0, boss.bulletsLeft - 1);
      setBoss({ ...boss, bulletsLeft: nb <= 0 ? 10 : nb, question: randomQuestion() });
    }
  };

  const collectChest = () => {
    if (!room || room.outcome.kind !== "chest") return;
    addCoins((room.outcome as any).reward);
    setModal({ kind: "chest", text: `🎁 Rương vàng! +${(room.outcome as any).reward} đồng` });
  };

  // === S2 room actions ===
  const s2ClearAndExit = (doorIdx: number, title: string, text: string, finished = false) => {
    setS2Doors((d) => { const n = [...d]; n[doorIdx] = "cleared"; return n; });
    setS2Room(null);
    setS2Modal({ title, text, finished });
  };
  const s2PickShield = () => {
    setS2Inv((v) => ({ ...v, shield: true }));
    s2ClearAndExit(1, "🛡️ Khiên bảo vệ", "Bạn nhặt được khiên thần! Dùng nút khiên để chống tia sét.");
  };
  const s2PickPotion = () => {
    setS2Inv((v) => ({ ...v, potion: v.potion + 2 }));
    s2ClearAndExit(2, "🧪 Thuốc hồi máu", "Bạn nhặt được 2 lọ thuốc hồi máu! Tự hồi khi máu thấp.");
  };
  const s2OpenChestPirate = () => {
    setPirateChestOpened(true);
    setTimeout(() => {
      addCoins(25);
      setPirateChestOpened(false);
      s2ClearAndExit(0, "🏴‍☠️ Kho báu cướp biển", "+25 đồng. Bạn rời khỏi tàu cướp biển!");
    }, 1600);
  };
  const s2ExitStars = () => {
    s2ClearAndExit(3, "🕷️ Phòng mạng nhện", "Bạn rời căn phòng tối đầy mạng nhện.");
  };
  const answerGhostQuiz = (i: number) => {
    if (!ghostQuiz) return;
    const correct = i === ghostQuiz.answer;
    if (correct) addCoins(20);
    bumpQuestion(correct);
    setGhostQuiz(null);
  };

  // Room 5 sub-door choices
  const chooseRoom5 = (door: 1 | 2 | 3) => {
    setRoom5Open(false);
    if (door === 1) {
      // 5-question quiz then chest
      setS2Room({ kind: "room5quiz", doorIdx: 4, phase: 0 });
      setQuiz5({ q: randomQuestion(), idx: 0, correct: 0 });
    } else if (door === 2) {
      setS2Room({ kind: "room5stars", doorIdx: 4, phase: 0 });
    } else if (door === 3) {
      setS2Room({ kind: "witch", doorIdx: 4, phase: 0 });
      setWitch({ hp: 100, maxHp: 100, question: null, playerHp: 100, phase: "cast", phaseStart: Date.now(), correct: 0, wave: 1 });
    }
  };

  const [quiz5, setQuiz5] = useState<null | { q: Question; idx: number; correct: number }>(null);
  const answerQuiz5 = (i: number) => {
    if (!quiz5) return;
    const isCorrect = i === quiz5.q.answer;
    bumpQuestion(isCorrect);
    const nextCorrect = quiz5.correct + (isCorrect ? 1 : 0);
    const nextIdx = quiz5.idx + 1;
    if (nextIdx >= 5) {
      setQuiz5(null);
      // Show chest, player must press "Mở rương"
      (window as any).__room5correct = nextCorrect;
      return;
    }
    setQuiz5({ q: randomQuestion(), idx: nextIdx, correct: nextCorrect });
  };
  const openRoom5Chest = () => {
    const correct = (window as any).__room5correct ?? 0;
    setRoom5ChestOpened(true);
    setTimeout(() => {
      const reward = correct * 20;
      addCoins(reward);
      setRoom5ChestOpened(false);
      setS2Doors((d) => { const n = [...d]; n[4] = "cleared"; return n; });
      setS2Room(null);
      setS2Modal({ title: "📜 Cửa 1 — Hoàn thành", text: `Đúng ${correct}/5 câu. +${reward} đồng. Stage 2 hoàn thành!`, finished: true });
    }, 1600);
  };

  const answerWitch = (i: number) => {
    if (!witch || !witch.question) return;
    const isCorrect = i === witch.question.answer;
    bumpQuestion(isCorrect);
    const newHp = isCorrect ? Math.max(0, witch.hp - 20) : witch.hp;
    const newCorrect = witch.correct + (isCorrect ? 1 : 0);
    if (newHp <= 0) {
      addCoins(100);
      setWitch(null);
      setS2Doors((d) => { const n = [...d]; n[4] = "cleared"; return n; });
      setS2Room(null);
      setS2Modal({ title: "🏆 Hạ gục phù thủy!", text: "+100 đồng. Stage 2 hoàn thành!", finished: true });
      return;
    }
    const nextWave = witch.wave + 1;
    if (nextWave > 5) {
      // 5 waves done, boss still alive
      setWitch(null);
      setS2Modal({ title: "⏱️ Hết 5 đợt sét", text: `Phù thủy đã cạn sét nhưng vẫn còn ${newHp} HP. Bạn rút lui!` });
      return;
    }
    setWitch({ ...witch, hp: newHp, correct: newCorrect, wave: nextWave, phase: "cast", phaseStart: Date.now(), question: null });
  };

  // chest fully revealed after 5s reveal
  const chestReady = room?.outcome.kind === "chest" && room.phase >= 7000;
  const emptyReady = room?.outcome.kind === "empty" && room.phase >= 1500;

  const exitSeconds = exitDeadline ? Math.max(0, Math.ceil((exitDeadline - exitNow) / 1000)) : 0;

  // Area selection overlay
  const pickArea = (a: 1 | 2) => {
    if (a === 2 && !stage2Unlocked) return;
    if (a === 1) {
      // Reset stage 1 progress so it's replayable; keep coins & inventory
      setDoors(Array(10).fill("closed"));
      setRoom(null); setModal(null); setBoss(null); setWon(false);
      setExitOpen(false); setExitDeadline(null);
      corridorSpawnRef.current = null;
      setStage(1);
      setIntro(0);
    } else {
      // Replay stage 2: reset doors & inv flags but keep coins
      setS2Doors(Array(5).fill("closed"));
      setS2Inv({ shield: false, potion: 0 });
      setS2Room(null); setS2Modal(null); setRoom5Open(false); setWitch(null);
      setPirateChestOpened(false); setRoom5ChestOpened(false); setGhostQuiz(null);
      setStage(2);
    }
    setSelectedArea(a);
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <Canvas shadows camera={{ fov: 75, near: 0.05, far: 200 }} dpr={[1, 2]}>

        <Suspense fallback={null}>
          {stage === 1 && room ? (
            <RoomScene room={room} animalName={currentAnimal} />
          ) : stage === 1 ? (
            <>
              <CorridorScene
                doors={doors}
                exitOpen={exitOpen}
                onTigerHit={onTigerHit}
                tigersActive={!modal && !won && !animalQuiz && intro === 2}
              />
              <PlayerController
                active={!modal && !won && !animalQuiz && intro === 2}
                onNearDoor={setNear}
                exitOpen={exitOpen}
                onExitCross={() => { setStage2Unlocked(true); setStage("transition"); setTransStart(Date.now()); }}
                spawnRef={corridorSpawnRef}
              />
              {!modal && !won && !animalQuiz && intro === 2 && <PointerLockControls />}
            </>
          ) : stage === "transition" ? (
            <>
              <color attach="background" args={["#000"]} />
              <ambientLight intensity={0.02} />
            </>
          ) : s2Room ? (
            <>
              {s2Room.kind === "pirate" && <PirateRoomScene phase={s2Room.phase} chestVisible={s2Room.phase >= 5000} chestOpened={pirateChestOpened} />}
              {s2Room.kind === "forest" && <ForestLakeScene shieldVisible={s2Room.phase >= 5000} />}
              {s2Room.kind === "potion" && <DarkPotionScene potionVisible={s2Room.phase >= 5000} />}
              {s2Room.kind === "stars" && (
                <>
                  <SpiderWebRoomScene />
                  <RoomCameraSetup />
                  {currentAnimal && <RandomAnimal name={currentAnimal} />}
                </>
              )}
              {s2Room.kind === "room5quiz" && <PirateRoomScene phase={s2Room.phase} chestVisible={!!quiz5 ? false : true} chestOpened={room5ChestOpened} />}
              {s2Room.kind === "room5stars" && <S2StarRoomScene />}
              {s2Room.kind === "witch" && <WitchRoomScene flashIntensity={witch?.phase === "cast" ? 1 : 0} />}
              {witch && <Witch visible hp={witch.hp} maxHp={witch.maxHp} />}
              {witch && <Lightning active={witch.phase === "cast"} />}
            </>
          ) : (
            <>
              <Stage2Scene />
              <Stage2PlayerController
               active={!s2Modal && !room5Open && !witch && !quiz5 && !ghostQuiz && !animalQuiz}
               onNearDoor={setS2Near}
               onGhostHit={() => { if (!ghostQuiz && !s2Modal && !room5Open && !witch && !quiz5 && !animalQuiz) { if (document.exitPointerLock) document.exitPointerLock(); setGhostQuiz(randomQuestion()); } }}
             />
             {!s2Modal && !room5Open && !witch && !quiz5 && !ghostQuiz && !animalQuiz && <PointerLockControls />}
            </>
          )}
        </Suspense>
      </Canvas>

      {/* HUD top-left */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
        <Link to="/play" className="toy-button !text-xs">← Về chọn map</Link>
        <div className="glass-card px-3 py-2 text-sm font-black">
          💰 {coins} đồng {stage === 1 ? `· 🚪 ${doors.filter((d) => d === "cleared").length}/10` : `· 🏛️ Stage 2 · ${s2Doors.filter((d) => d === "cleared").length}/5`}
        </div>
        {stage === 2 && (s2Inv.shield || s2Inv.potion > 0) && (
          <div className="glass-card px-3 py-2 text-xs font-black">
            {s2Inv.shield && <span>🛡️ Khiên </span>}{s2Inv.potion > 0 && <span>🧪 ×{s2Inv.potion}</span>}
          </div>
        )}
      </div>

      {/* 20s countdown — top right when exit is opening */}
      {stage === 1 && exitOpen && (
        <div className="absolute top-3 right-3 z-30 glass-card px-4 py-3 text-center" style={{ background: "rgba(40,0,0,0.7)", border: "2px solid #ff6020", boxShadow: "0 0 24px rgba(255,80,20,0.6)" }}>
          <div className="text-xs font-black text-amber-200">⏱️ CỬA SẼ ĐÓNG TRONG</div>
          <div className="text-3xl font-black text-orange-400" style={{ textShadow: "0 0 12px #ff6020" }}>{exitSeconds}s</div>
          <div className="text-[10px] font-bold text-amber-100/80 mt-1">Chạy tới cuối hành lang!</div>
        </div>
      )}

      {/* crosshair only in corridor */}
      {!room && stage !== "transition" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-3 h-3 rounded-full border-2 border-white/80 shadow-lg" />
        </div>
      )}

      {/* hint stage 1 */}
      {stage === 1 && !room && near != null && doors[near] === "closed" && !modal && !won && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass-card px-4 py-2 font-black text-sm z-20">
          Nhấn <span className="text-orange-600">E</span> để mở Cửa {near + 1}
        </div>
      )}

      {/* hint stage 2 */}
      {stage === 2 && s2Near != null && s2Doors[s2Near] === "closed" && !s2Modal && !room5Open && !witch && !quiz5 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass-card px-4 py-2 font-black text-sm z-20">
          Nhấn <span className="text-orange-600">E</span> để vào Phòng {s2Near + 1}
        </div>
      )}

      {/* S2 room action banners + buttons */}
      {s2Room && !witch && !quiz5 && (
        <>
          <div className="absolute top-16 right-3 z-20 glass-card px-3 py-2 text-xs font-black max-w-xs">
            {s2Room.kind === "pirate" && (s2Room.phase < 5000 ? "🏴‍☠️ Sóng vỗ... rương đang trồi lên..." : "🪙 Rương cướp biển đã xuất hiện!")}
            {s2Room.kind === "forest" && (s2Room.phase < 5000 ? "🌲 Hồ tĩnh lặng... có gì đang nổi lên..." : "🛡️ Khiên thần đã hiện ra giữa hồ!")}
            {s2Room.kind === "potion" && (s2Room.phase < 5000 ? "🌑 Bóng tối... có ánh sáng đỏ..." : "🧪 Lọ thuốc hồi máu đã xuất hiện!")}
            {s2Room.kind === "stars" && "✨ Phòng trống đầy sao..."}
            {s2Room.kind === "room5quiz" && "📜 Trả lời 5 câu để mở rương!"}
            {s2Room.kind === "room5stars" && "🌫️ Lối thoát yên bình..."}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
            {s2Room.kind === "pirate" && s2Room.phase >= 5000 && (
              <button onClick={s2OpenChestPirate} className="toy-button toy-button-primary !text-base px-6 py-3">🎁 Mở rương (+25)</button>
            )}
            {s2Room.kind === "forest" && s2Room.phase >= 5000 && (
              <button onClick={s2PickShield} className="toy-button toy-button-primary !text-base px-6 py-3">🛡️ Nhặt khiên</button>
            )}
            {s2Room.kind === "potion" && s2Room.phase >= 5000 && (
              <button onClick={s2PickPotion} className="toy-button toy-button-primary !text-base px-6 py-3">🧪 Nhặt thuốc</button>
            )}
            {s2Room.kind === "stars" && (
              <button onClick={s2ExitStars} className="toy-button toy-button-primary !text-base px-6 py-3">🚪 Rời phòng</button>
            )}
            {s2Room.kind === "room5quiz" && !quiz5 && !room5ChestOpened && (
              <button onClick={openRoom5Chest} className="toy-button toy-button-primary !text-base px-6 py-3">🎁 Mở rương</button>
            )}
          </div>
        </>
      )}

      {/* Shield button — round, glowing, only during witch fight */}
      {witch && s2Inv.shield && (
        <button
          onClick={useShield}
          className="absolute z-30"
          style={{
            right: 24, bottom: 220, width: 88, height: 88, borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #5fd0ff, #1a3550)",
            border: "3px solid #bfeaff",
            boxShadow: `0 0 ${20 + shieldBlink % 2 * 20}px #5fd0ff, inset 0 0 18px rgba(255,255,255,0.6)`,
            cursor: witch.phase === "cast" ? "pointer" : "default",
            opacity: witch.phase === "cast" ? 1 : 0.55,
            fontSize: 36,
          }}
          title="Bấm để chống tia sét"
        >
          🛡️
        </button>
      )}


      {/* controls hint */}
      {!room && stage !== "transition" && (
        <div className="absolute bottom-3 right-3 glass-card px-3 py-2 text-xs font-bold z-20">
          WASD di chuyển · Chuột nhìn · Space nhảy · E mở cửa · Click để khoá chuột
        </div>
      )}

      {/* Stage transition overlay */}
      {stage === "transition" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black">
          <h1
            className="text-6xl md:text-8xl font-black tracking-widest"
            style={{
              fontFamily: "'Anton', sans-serif",
              color: "#c0c0c0",
              textShadow: "0 0 24px rgba(200,200,255,0.4), 0 0 48px rgba(100,100,150,0.3)",
              animation: "khuVuc2Fade 3.2s ease-in-out forwards",
            }}
          >
            KHU VỰC 2
          </h1>
          <style>{`@keyframes khuVuc2Fade { 0%{opacity:0;letter-spacing:0.5em;} 30%{opacity:1;letter-spacing:0.2em;} 80%{opacity:1;} 100%{opacity:0;} }`}</style>
        </div>
      )}

      {/* Room status banner */}
      {room && !modal && (
        <div className="absolute top-3 right-3 z-20 glass-card px-3 py-2 text-xs font-black max-w-xs">
          {room.outcome.kind === "boss" && (
            room.phase < 2000 ? "🌫️ Đứng yên... có gì đó trong bóng tối..."
              : room.phase < 7000 ? "👹 Quái vật đang bước ra từ bóng tối..."
                : !boss ? "❄️ Quái vật đã đến trước mặt bạn. Chuẩn bị..."
                  : "❓ Trả lời đúng để bắn đạn băng hạ gục quái vật!"
          )}
          {room.outcome.kind === "empty" && (room.phase < 1500 ? "🌫️ Phòng trống lạnh lẽo..." : "Không có gì ở đây. Bạn có thể rời đi.")}
          {room.outcome.kind === "chest" && (
            room.phase < 2000 ? "✨ Bầu trời sao... có gì đó đang xuất hiện..."
              : room.phase < 7000 ? "🪙 Rương báu đang từ từ hiện ra..."
                : "🎁 Rương vàng đã hoàn toàn xuất hiện. Hãy mở nó!"
          )}

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

      {/* Stage 2 modal */}
      {s2Modal && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 text-center">
            <p className="text-xl font-black mb-2">{s2Modal.title}</p>
            <p className="font-bold mb-4">{s2Modal.text}</p>
            {s2Modal.finished ? (
              <Link to="/play" className="toy-button toy-button-primary w-full">🏆 Hoàn thành — Về chọn map</Link>
            ) : (
              <button onClick={() => setS2Modal(null)} className="toy-button toy-button-primary w-full">Tiếp tục</button>
            )}
          </div>
        </div>
      )}

      {/* Room 5 — 3 sub-doors */}
      {room5Open && (
        <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6">
            <p className="text-2xl font-black text-center mb-4">🚪 Phòng 5 — Chọn cánh cửa</p>
            <div className="grid gap-3">
              <button onClick={() => chooseRoom5(1)} className="toy-button !text-left p-4">
                <div className="font-black">Cửa 1 — 📜 Thử thách kiến thức</div>
                <div className="text-xs font-bold opacity-80">Trả lời 10 câu hỏi · +15 đồng/câu đúng</div>
              </button>
              <button onClick={() => chooseRoom5(2)} className="toy-button !text-left p-4">
                <div className="font-black">Cửa 2 — 🌫️ Lối thoát yên bình</div>
                <div className="text-xs font-bold opacity-80">Thoát ngay không cần làm gì</div>
              </button>
              <button onClick={() => chooseRoom5(3)} className="toy-button !text-left p-4 bg-gradient-to-br from-purple-700 to-indigo-900 text-white">
                <div className="font-black">Cửa 3 — 🧙‍♀️ Phù thủy</div>
                <div className="text-xs font-bold opacity-90">Đánh bại phù thủy · +100 đồng (cần khiên/thuốc)</div>
              </button>
            </div>
            <button onClick={() => setRoom5Open(false)} className="toy-button !text-xs w-full mt-4">← Đóng</button>
          </div>
        </div>
      )}

      {/* Witch fight */}
      {witch && (
        <div className="absolute inset-x-0 bottom-0 z-30 p-4">
          <div className="max-w-2xl mx-auto glass-card p-4">
            <div className="flex items-center justify-between mb-2 text-xs font-black">
              <span>🧙‍♀️ Phù thủy</span>
              <span>❤️ Bạn: {witch.playerHp}/100</span>
              <span>💜 Boss: {witch.hp}/{witch.maxHp}</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-purple-500" style={{ width: `${(witch.hp / witch.maxHp) * 100}%` }} />
            </div>
            {witch.phase === "cast" ? (
              <p className="font-black text-center py-4">⚡ Phù thủy đang phóng tia sét... {s2Inv.shield ? "🛡️ Khiên giảm sát thương!" : "Không có khiên — chịu sát thương đầy đủ!"}</p>
            ) : witch.question ? (
              <>
                <p className="font-black text-base mb-3">❓ {witch.question.q}</p>
                <div className="grid grid-cols-2 gap-2">
                  {witch.question.options.map((opt, i) => (
                    <button key={i} onClick={() => answerWitch(i)} className="toy-button !text-sm py-2">{opt}</button>
                  ))}
                </div>
                <p className="text-xs font-bold mt-2 opacity-70">Đáp đúng → −20 HP phù thủy ({witch.correct}/5 câu đúng)</p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Quiz of 10 (door 1 in room 5) */}
      {quiz5 && (
        <div className="absolute inset-x-0 bottom-0 z-30 p-4">
          <div className="max-w-2xl mx-auto glass-card p-4">
            <div className="flex items-center justify-between mb-2 text-xs font-black">
              <span>📜 Cửa 1 — Câu {quiz5.idx + 1}/5</span>
              <span>✅ Đúng: {quiz5.correct}</span>
            </div>
            <p className="font-black text-base mb-3">❓ {quiz5.q.q}</p>
            <div className="grid grid-cols-2 gap-2">
              {quiz5.q.options.map((opt, i) => (
                <button key={i} onClick={() => answerQuiz5(i)} className="toy-button !text-sm py-2">{opt}</button>
              ))}
            </div>
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

      {/* Lightning screen flash during witch cast */}
      {witch && witch.phase === "cast" && (
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{ background: "rgba(220,240,255,0.55)", animation: "lightFlash 0.5s ease-out infinite" }}
        />
      )}
      <style>{`@keyframes lightFlash { 0%,100%{opacity:0;} 10%,30%{opacity:1;} 20%{opacity:0.3;} 50%{opacity:0;} }`}</style>

      {/* Animal encounter quiz (door=2 câu, corridor tiger=5 câu) */}
      {animalQuiz && (
        <div className="absolute inset-x-0 bottom-0 z-40 p-4">
          <div className="max-w-2xl mx-auto glass-card p-4">
            <div className="flex items-center justify-between mb-2 text-xs font-black">
              <span>{animalQuiz.source === "corridor" ? "🐯 Hổ tấn công! Trả lời để thoát" : "🐾 Gặp thú lạ — trả lời câu hỏi"}</span>
              <span>Câu {animalQuiz.idx + 1}/{animalQuiz.total} · ✅ {animalQuiz.correct}</span>
            </div>
            <p className="font-black text-base mb-3">❓ {animalQuiz.q.q}</p>
            <div className="grid grid-cols-2 gap-2">
              {animalQuiz.q.options.map((opt, i) => (
                <button key={i} onClick={() => answerAnimalQuiz(i)} className="toy-button !text-sm py-2">{opt}</button>
              ))}
            </div>
            <p className="text-xs font-bold mt-2 opacity-70">Mỗi câu đúng +{animalQuiz.q.reward}đ</p>
          </div>
        </div>
      )}

      {/* Ghost collision quiz */}
      {ghostQuiz && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-5">
            <p className="text-lg font-black mb-3 text-center">👻 Bị ma tấn công! Trả lời nhanh (+20đ nếu đúng)</p>
            <p className="font-black mb-3">❓ {ghostQuiz.q}</p>
            <div className="grid grid-cols-2 gap-2">
              {ghostQuiz.options.map((opt, i) => (
                <button key={i} onClick={() => answerGhostQuiz(i)} className="toy-button !text-sm py-2">{opt}</button>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Creepy intro overlay */}
      {intro < 2 && selectedArea === 1 && (
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
            <div className="relative flex flex-col items-center gap-4">
              <h1
                className="text-7xl md:text-9xl"
                style={{
                  fontFamily: "'Anton', sans-serif",
                  color: "#a30000",
                  textShadow:
                    "0 0 8px #ff0000, 0 0 24px #5a0000, 4px 8px 0 #2a0000, 0 30px 28px rgba(120,0,0,0.6)",
                  animation: "bloodDrip 1.4s ease-out, creepyShake 0.18s infinite",
                  letterSpacing: "0.08em",
                }}
              >
                CHẠY ĐI !
              </h1>
              <h2
                className="text-4xl md:text-6xl"
                style={{
                  fontFamily: "'Anton', sans-serif",
                  color: "#ffb070",
                  letterSpacing: "0.18em",
                  textShadow: "0 0 14px #ff6020, 0 4px 0 #4a1500",
                  animation: "creepyFade 2.6s ease-out 0.4s both",
                }}
              >
                KHU VỰC 1
              </h2>
            </div>
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

      {/* AREA SELECTION OVERLAY — shown before stage starts */}
      {selectedArea === null && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-8" style={{ background: "radial-gradient(ellipse at center, #1a0030 0%, #000 70%)" }}>
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-black text-amber-300" style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "0.08em", textShadow: "0 0 24px #ff8030, 0 4px 0 #5a2000" }}>
              BẢN ĐỒ MA THUẬT
            </h1>
            <p className="text-amber-100/80 mt-3 text-sm md:text-base font-bold">Chọn khu vực bạn muốn chơi</p>
          </div>
          <div className="flex flex-wrap gap-6 justify-center px-4">
            {/* Khu vực 1 */}
            <button
              onClick={() => pickArea(1)}
              className="group relative w-72 h-80 rounded-3xl overflow-hidden border-4 border-amber-400 transition-transform hover:scale-105 cursor-pointer"
              style={{
                background: "linear-gradient(180deg, #3a1a05 0%, #1a0805 100%)",
                boxShadow: "0 0 32px rgba(255,140,40,0.6), inset 0 0 32px rgba(0,0,0,0.6)",
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                <div className="text-7xl">🏚️</div>
                <div className="text-2xl font-black text-amber-200">Khu vực 1</div>
                <div className="text-xs font-bold text-amber-100/80 text-center">Hành lang ma quái · 10 cửa<br/>Dành cho người mới bắt đầu</div>
                <div className="mt-2 px-4 py-1 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-wider">Bắt buộc</div>
              </div>
            </button>
            {/* Khu vực 2 */}
            <button
              onClick={() => pickArea(2)}
              disabled={!stage2Unlocked}
              className="group relative w-72 h-80 rounded-3xl overflow-hidden border-4 transition-transform hover:scale-105 cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: stage2Unlocked
                  ? "linear-gradient(180deg, #1a0530 0%, #050010 100%)"
                  : "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
                borderColor: stage2Unlocked ? "#a060ff" : "#444",
                boxShadow: stage2Unlocked ? "0 0 32px rgba(160,80,255,0.6), inset 0 0 32px rgba(0,0,0,0.6)" : "inset 0 0 32px rgba(0,0,0,0.8)",
                opacity: stage2Unlocked ? 1 : 0.55,
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                <div className="text-7xl">{stage2Unlocked ? "🏰" : "🔒"}</div>
                <div className="text-2xl font-black" style={{ color: stage2Unlocked ? "#d8b0ff" : "#888" }}>Khu vực 2</div>
                <div className="text-xs font-bold text-center" style={{ color: stage2Unlocked ? "rgba(216,176,255,0.8)" : "#666" }}>
                  Lâu đài phù thủy · 5 phòng<br/>
                  {stage2Unlocked ? "Phòng cướp biển, hồ thần, phù thủy..." : "Hoàn thành Khu vực 1 để mở khóa"}
                </div>
                {stage2Unlocked && (
                  <div className="mt-2 px-4 py-1 rounded-full bg-purple-500 text-white text-xs font-black uppercase tracking-wider">Đã mở khóa</div>
                )}
              </div>
            </button>
          </div>
          <Link to="/play" className="toy-button !text-sm">← Về chọn map</Link>
          <div className="text-xs text-amber-100/60 italic">💡 Bạn có thể chơi lại bất cứ khu vực nào đã mở khóa</div>
        </div>
      )}

      {/* "Back to area selection" button — visible during gameplay */}
      {selectedArea !== null && (
        <button
          onClick={() => setSelectedArea(null)}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 toy-button !text-xs"
        >
          🗺️ Đổi khu vực
        </button>
      )}
    </div>
  );
}

