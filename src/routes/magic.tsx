import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
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

// === Stage 1 spec ===
// Corridor: 10 doors (5 each side). Walk to a door, press E to open.
// Outcomes per door:
const DOOR_OUTCOMES: Array<
  | { kind: "empty" }
  | { kind: "chest"; reward: number }
  | { kind: "boss"; level: 1 | 2 | 3; hp: number; bullets: number; perHit: number }
  | { kind: "exit" }
> = [
  { kind: "empty" },                                   // 1
  { kind: "boss", level: 1, hp: 100, bullets: 10, perHit: 10 }, // 2
  { kind: "chest", reward: 20 },                       // 3
  { kind: "boss", level: 2, hp: 100, bullets: 5, perHit: 20 },  // 4
  { kind: "chest", reward: 30 },                       // 5
  { kind: "empty" },                                   // 6
  { kind: "boss", level: 3, hp: 100, bullets: 5, perHit: 20 },  // 7
  { kind: "empty" },                                   // 8
  { kind: "chest", reward: 10 },                       // 9
  { kind: "exit" },                                    // 10
];

const CORRIDOR_LEN = 60;
const CORRIDOR_W = 6;
const WALL_H = 4;
const DOOR_SPACING = CORRIDOR_LEN / 6; // 10 doors split into 5 per side

type DoorState = "closed" | "open" | "cleared";

// ---------- 3D scene ----------
function Walls() {
  return (
    <group>
      {/* polished dark floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[CORRIDOR_W, CORRIDOR_LEN]} />
        <meshStandardMaterial color="#1a1208" metalness={0.55} roughness={0.25} />
      </mesh>
      {/* dark ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]}>
        <planeGeometry args={[CORRIDOR_W, CORRIDOR_LEN]} />
        <meshStandardMaterial color="#0a0805" roughness={0.95} />
      </mesh>
      {/* left/right walls: cream upper + dark wainscot */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* wainscot (lower) */}
          <mesh position={[s * CORRIDOR_W / 2, 0.6, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[CORRIDOR_LEN, 1.2]} />
            <meshStandardMaterial color="#1f1408" roughness={0.85} />
          </mesh>
          {/* trim */}
          <mesh position={[s * (CORRIDOR_W / 2 - 0.01), 1.25, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <planeGeometry args={[CORRIDOR_LEN, 0.08]} />
            <meshStandardMaterial color="#3a2410" />
          </mesh>
          {/* upper wall */}
          <mesh position={[s * CORRIDOR_W / 2, (WALL_H + 1.3) / 2, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[CORRIDOR_LEN, WALL_H - 1.3]} />
            <meshStandardMaterial color="#6b5232" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* back wall */}
      <mesh position={[0, WALL_H / 2, -CORRIDOR_LEN / 2]}>
        <planeGeometry args={[CORRIDOR_W, WALL_H]} />
        <meshStandardMaterial color="#0a0805" />
      </mesh>
      {/* far wall (exit) */}
      <mesh position={[0, WALL_H / 2, CORRIDOR_LEN / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CORRIDOR_W, WALL_H]} />
        <meshStandardMaterial color="#050302" />
      </mesh>
    </group>
  );
}

function CeilingDome({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* mount */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 16]} />
        <meshStandardMaterial color="#2a1d10" />
      </mesh>
      {/* dome */}
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fff2c0" emissive="#ffb547" emissiveIntensity={1.6} transparent opacity={0.95} />
      </mesh>
      <pointLight position={[0, -0.15, 0]} intensity={1.4} distance={9} decay={1.6} color="#ffb060" castShadow />
    </group>
  );
}

function Torch({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 0.4]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#ff8800" emissive="#ff5500" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 0.3, 0]} intensity={1.2} distance={8} color="#ffaa55" castShadow />
    </group>
  );
}

function Door({ pos, rotY, state, index }: { pos: [number, number, number]; rotY: number; state: DoorState; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (!ref.current) return;
    const target = state === "open" || state === "cleared" ? Math.PI / 2.2 : 0;
    ref.current.rotation.y += (target - ref.current.rotation.y) * 0.1;
  });
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* frame */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[1.6, 3, 0.15]} />
        <meshStandardMaterial color={state === "cleared" ? "#4a5d3a" : "#5a3a1a"} />
      </mesh>
      {/* door panel - pivot on hinge */}
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
      {/* number plate */}
      <mesh position={[0, 3.1, 0.08]}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.4} />
      </mesh>
      <Text3DLike pos={[0, 3.1, 0.09]} text={String(index)} />
    </group>
  );
}

function Text3DLike({ pos, text }: { pos: [number, number, number]; text: string }) {
  // simple billboard
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

function Chest({ pos, opened }: { pos: [number, number, number]; opened: boolean }) {
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[0.9, 0.6, 0.6]} />
        <meshStandardMaterial color="#7a4a1a" />
      </mesh>
      <mesh castShadow position={[0, 0.65, 0]} rotation={[opened ? -1.1 : 0, 0, 0]}>
        <boxGeometry args={[0.9, 0.2, 0.6]} />
        <meshStandardMaterial color="#a06a2a" metalness={0.3} />
      </mesh>
      {opened && (
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.18, 14, 14]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffaa00" emissiveIntensity={1.5} />
        </mesh>
      )}
    </group>
  );
}

function Boss({ pos, hp, maxHp, level }: { pos: [number, number, number]; hp: number; maxHp: number; level: number }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.position.y = pos[1] + Math.sin(t.current * 2) * 0.15;
      ref.current.rotation.y += dt * 0.5;
    }
  });
  const size = 1 + level * 0.4;
  const color = level === 1 ? "#16a3a3" : level === 2 ? "#a32d2d" : "#a32da3";
  return (
    <group position={pos}>
      <group ref={ref}>
        {/* body */}
        <mesh castShadow>
          <sphereGeometry args={[size, 24, 24]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        {/* fur spikes */}
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * size * 0.95, size * 0.6, Math.sin(a) * size * 0.95]}>
              <coneGeometry args={[0.12, 0.4, 6]} />
              <meshStandardMaterial color={color} />
            </mesh>
          );
        })}
        {/* eyes */}
        <mesh position={[-0.35, 0.2, size * 0.85]}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <mesh position={[0.35, 0.2, size * 0.85]}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <mesh position={[-0.35, 0.2, size * 0.98]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        <mesh position={[0.35, 0.2, size * 0.98]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        {/* mouth - sharp teeth */}
        <mesh position={[0, -0.3, size * 0.85]}>
          <boxGeometry args={[0.7, 0.3, 0.1]} />
          <meshStandardMaterial color="#400" />
        </mesh>
      </group>
      {/* HP bar */}
      <group position={[0, size + 1.2, 0]}>
        <mesh>
          <planeGeometry args={[2, 0.25]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[-(1 - hp / maxHp), 0, 0.01]}>
          <planeGeometry args={[(2 * hp) / maxHp, 0.22]} />
          <meshBasicMaterial color="#e11d48" />
        </mesh>
      </group>
    </group>
  );
}

function Gun() {
  // Held in bottom-right of view via attached to camera
  const { camera } = useThree();
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.copy(camera.position);
    ref.current.quaternion.copy(camera.quaternion);
    ref.current.translateX(0.35);
    ref.current.translateY(-0.3);
    ref.current.translateZ(-0.6);
  });
  return (
    <group ref={ref}>
      {/* barrel */}
      <mesh>
        <boxGeometry args={[0.12, 0.12, 0.6]} />
        <meshStandardMaterial color="#ff66cc" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* body */}
      <mesh position={[0, -0.08, 0.15]}>
        <boxGeometry args={[0.16, 0.18, 0.3]} />
        <meshStandardMaterial color="#ffcc33" metalness={0.4} />
      </mesh>
      {/* grip */}
      <mesh position={[0, -0.25, 0.2]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.1, 0.25, 0.1]} />
        <meshStandardMaterial color="#66ccff" />
      </mesh>
      {/* tip glow */}
      <mesh position={[0, 0, -0.32]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#aef" emissive="#88ccff" emissiveIntensity={2} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function IceBullet({ from, to, onDone }: { from: THREE.Vector3; to: THREE.Vector3; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt * 2;
    if (t.current >= 1) { onDone(); return; }
    if (ref.current) {
      ref.current.position.lerpVectors(from, to, t.current);
    }
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.12, 0]} />
      <meshStandardMaterial color="#aef" emissive="#66ccff" emissiveIntensity={1.5} transparent opacity={0.85} />
    </mesh>
  );
}

function PlayerController({
  onNearDoor,
}: {
  onNearDoor: (idx: number | null) => void;
}) {
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

    // clamp inside corridor
    const halfW = CORRIDOR_W / 2 - 0.4;
    const halfL = CORRIDOR_LEN / 2 - 0.4;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -halfW, halfW);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfL, halfL);

    // detect nearby door (within 2.5 units)
    let nearest = -1;
    let nd = 999;
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? -1 : 1; // even index left, odd right
      const z = -CORRIDOR_LEN / 2 + DOOR_SPACING * (Math.floor(i / 2) + 1);
      const x = side * (CORRIDOR_W / 2 - 0.05);
      const d2 = (camera.position.x - x) ** 2 + (camera.position.z - z) ** 2;
      if (d2 < nd) { nd = d2; nearest = i; }
    }
    onNearDoor(nd < 6 ? nearest : null);
  });
  return null;
}

function HeldOutfitBadge({ outfit }: { outfit: Outfit }) {
  // Tiny preview that follows camera bottom-left, showing character shoulder (cosmetic)
  return null;
}

function Scene({
  doors, onNear, bullets, hitTarget,
}: {
  doors: DoorState[];
  onNear: (i: number | null) => void;
  bullets: { id: number; from: THREE.Vector3; to: THREE.Vector3 }[];
  hitTarget: (id: number) => void;
}) {
  return (
    <>
      <color attach="background" args={["#050302"]} />
      <ambientLight intensity={0.08} color="#3a2a18" />
      <fog attach="fog" args={["#050302", 6, 40]} />

      <Walls />

      {/* ceiling dome lights down the corridor center */}
      {Array.from({ length: 12 }).map((_, i) => {
        const z = -CORRIDOR_LEN / 2 + (i + 0.5) * (CORRIDOR_LEN / 12);
        return <CeilingDome key={i} position={[0, WALL_H - 0.02, z]} />;
      })}
      {/* bright lamp at far exit for hallway depth glow */}
      <pointLight position={[0, WALL_H - 0.3, CORRIDOR_LEN / 2 - 1]} intensity={3} distance={14} color="#ffd58a" />


      {/* 10 doors */}
      {Array.from({ length: 10 }).map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const z = -CORRIDOR_LEN / 2 + DOOR_SPACING * (Math.floor(i / 2) + 1);
        const x = side * (CORRIDOR_W / 2 - 0.05);
        return <Door key={i} index={i + 1} pos={[x, 0, z]} rotY={side > 0 ? -Math.PI / 2 : Math.PI / 2} state={doors[i]} />;
      })}

      {/* bullets */}
      {bullets.map((b) => (
        <IceBullet key={b.id} from={b.from} to={b.to} onDone={() => hitTarget(b.id)} />
      ))}

      <Gun />
    </>
  );
}

// ---------- UI / state ----------
function MagicPage() {
  const navigate = useNavigate();
  const [outfit, setOutfit] = useState<Outfit>(DEFAULT_OUTFIT);
  const [near, setNear] = useState<number | null>(null);
  const [doors, setDoors] = useState<DoorState[]>(Array(10).fill("closed"));
  const [activeDoor, setActiveDoor] = useState<number | null>(null);
  const [modal, setModal] = useState<null | { kind: "empty" | "chest" | "exit"; text: string }>(null);
  const [boss, setBoss] = useState<null | { door: number; hp: number; maxHp: number; level: 1 | 2 | 3; bulletsLeft: number; perHit: number; question: Question | null }>(null);
  const [coins, setCoins] = useState(0);
  const [won, setWon] = useState(false);
  const [bullets, setBullets] = useState<{ id: number; from: THREE.Vector3; to: THREE.Vector3 }[]>([]);
  const bulletId = useRef(0);

  useEffect(() => {
    if (!getCurrentUser()) navigate({ to: "/login" });
    setOutfit(loadOutfit() || DEFAULT_OUTFIT);
  }, [navigate]);

  // handle E to open door
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && near != null && doors[near] === "closed" && !modal && !boss) {
        openDoor(near);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [near, doors, modal, boss]);

  const openDoor = (i: number) => {
    setDoors((d) => { const n = [...d]; n[i] = "open"; return n; });
    setActiveDoor(i);
    const outcome = DOOR_OUTCOMES[i];
    if (outcome.kind === "empty") {
      setModal({ kind: "empty", text: `Cửa ${i + 1}: trống không 🌫️` });
    } else if (outcome.kind === "chest") {
      setCoins((c) => c + outcome.reward);
      setModal({ kind: "chest", text: `Cửa ${i + 1}: Rương vàng! +${outcome.reward} đồng 🎁` });
    } else if (outcome.kind === "exit") {
      setWon(true);
      setModal({ kind: "exit", text: `🏆 Bạn đã thoát Stage 1! Tổng thưởng: ${coins} đồng` });
    } else if (outcome.kind === "boss") {
      setBoss({
        door: i,
        hp: outcome.hp,
        maxHp: outcome.hp,
        level: outcome.level,
        bulletsLeft: outcome.bullets,
        perHit: outcome.perHit,
        question: randomQuestion(),
      });
    }
  };

  const closeModal = () => {
    setModal(null);
    if (activeDoor != null) {
      setDoors((d) => { const n = [...d]; n[activeDoor] = "cleared"; return n; });
    }
    setActiveDoor(null);
  };

  const answerBoss = (idx: number) => {
    if (!boss || !boss.question) return;
    const correct = idx === boss.question.answer;
    // fire visual bullet
    const from = new THREE.Vector3(0, 1.5, 0); // approximate
    const to = new THREE.Vector3(0, 1.2, 5);
    const id = ++bulletId.current;
    setBullets((b) => [...b, { id, from, to }]);

    if (correct) {
      const newHp = Math.max(0, boss.hp - boss.perHit);
      const newBullets = boss.bulletsLeft - 1;
      if (newHp <= 0) {
        setCoins((c) => c + boss.maxHp); // small reward
        if (activeDoor != null) setDoors((d) => { const n = [...d]; n[activeDoor] = "cleared"; return n; });
        setBoss(null);
        setActiveDoor(null);
        setModal({ kind: "chest", text: `⚔️ Hạ gục boss cấp ${boss.level}! +${boss.maxHp} đồng` });
        return;
      }
      if (newBullets <= 0) {
        setBoss({ ...boss, hp: newHp, bulletsLeft: 10, question: randomQuestion() }); // reload
      } else {
        setBoss({ ...boss, hp: newHp, bulletsLeft: newBullets, question: randomQuestion() });
      }
    } else {
      const newBullets = Math.max(0, boss.bulletsLeft - 1);
      setBoss({ ...boss, bulletsLeft: newBullets <= 0 ? 10 : newBullets, question: randomQuestion() });
    }
  };

  const hitTarget = (id: number) => setBullets((b) => b.filter((x) => x.id !== id));

  return (
    <div className="relative w-full h-screen bg-black">
      <Canvas shadows camera={{ fov: 75, near: 0.05, far: 200 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene
            doors={doors}
            onNear={setNear}
            bullets={bullets}
            hitTarget={hitTarget}
          />
          <PlayerController onNearDoor={setNear} />
          {!modal && !boss && !won && <PointerLockControls />}
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
        <Link to="/play" className="toy-button !text-xs">← Về chọn map</Link>
        <div className="glass-card px-3 py-2 text-sm font-black">
          💰 {coins} đồng · 🚪 {doors.filter((d) => d === "cleared").length}/10
        </div>
      </div>

      {/* crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="w-3 h-3 rounded-full border-2 border-white/80 shadow-lg" />
      </div>

      {/* near hint */}
      {near != null && doors[near] === "closed" && !modal && !boss && !won && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass-card px-4 py-2 font-black text-sm z-20">
          Nhấn <span className="text-orange-600">E</span> để mở Cửa {near + 1}
        </div>
      )}

      {/* controls */}
      <div className="absolute bottom-3 right-3 glass-card px-3 py-2 text-xs font-bold z-20">
        WASD di chuyển · Chuột nhìn · Space nhảy · E mở cửa · Click để khoá chuột
      </div>

      {/* Modal: empty/chest/exit */}
      {modal && (
        <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center p-4">
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

      {/* Boss fight overlay */}
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
                <button
                  key={i}
                  onClick={() => answerBoss(i)}
                  className="toy-button !text-sm py-2"
                >
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
    </div>
  );
}
