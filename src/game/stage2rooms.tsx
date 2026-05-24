import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export const S2_ROOM_W = 10;
export const S2_ROOM_D = 12;
export const S2_ROOM_H = 4.5;

export function S2RoomCameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 1.7, -2);
    camera.lookAt(0, 1.6, -S2_ROOM_D);
  }, [camera]);
  return null;
}

// ===== Shared front wall with doorway =====
function FrontWallWithDoor({ color = "#0a0a10" }: { color?: string }) {
  const sideW = (S2_ROOM_W - 1.8) / 2;
  return (
    <>
      <mesh position={[-S2_ROOM_W / 2 + sideW / 2, S2_ROOM_H / 2, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[sideW, S2_ROOM_H]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[S2_ROOM_W / 2 - sideW / 2, S2_ROOM_H / 2, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[sideW, S2_ROOM_H]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, S2_ROOM_H - 0.5, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.8, 1]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// ============================================================
// PIRATE ROOM (Phòng 1) — sea + pirate ship + chest reward
// ============================================================
function useSeaTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, "#0e3a5a");
    g.addColorStop(0.6, "#0a2540");
    g.addColorStop(1, "#06182a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = `rgba(180,210,230,${0.04 + Math.random() * 0.12})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * 1024;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 6);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);
}
function useSkySeaTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#9ab8c8");
    g.addColorStop(0.5, "#c8d6dc");
    g.addColorStop(1, "#7892a0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
    // clouds
    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * 1024, cy = 60 + Math.random() * 250;
      for (let j = 0; j < 6; j++) {
        ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx + j * 30 - 60, cy + (Math.random() - 0.5) * 20, 28 + Math.random() * 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return new THREE.CanvasTexture(c);
  }, []);
}

function PirateShip({ pos }: { pos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.position.y = pos[1] + Math.sin(performance.now() / 1000) * 0.08;
      ref.current.rotation.z = Math.sin(performance.now() / 1300) * 0.04;
    }
  });
  return (
    <group ref={ref} position={pos} rotation={[0, 0.4, 0]}>
      {/* hull */}
      <mesh>
        <boxGeometry args={[3.2, 0.9, 1.4]} />
        <meshStandardMaterial color="#3a230f" roughness={0.85} />
      </mesh>
      <mesh position={[1.6, 0.1, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[1, 0.7, 1.4]} />
        <meshStandardMaterial color="#3a230f" roughness={0.85} />
      </mesh>
      <mesh position={[-1.6, 0.1, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[1, 0.7, 1.4]} />
        <meshStandardMaterial color="#3a230f" roughness={0.85} />
      </mesh>
      {/* deck */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3.2, 0.05, 1.3]} />
        <meshStandardMaterial color="#8a6334" />
      </mesh>
      {/* masts */}
      {[-0.9, 0.2, 1.1].map((x, i) => (
        <group key={i} position={[x, 0.5, 0]}>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 2.8, 10]} />
            <meshStandardMaterial color="#2a1a0a" />
          </mesh>
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[0.9, 0.7, 0.02]} />
            <meshStandardMaterial color="#e8d8b0" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[0.7, 0.5, 0.02]} />
            <meshStandardMaterial color="#d0bfa0" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* skull flag */}
      <mesh position={[0.2, 3.3, 0]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshStandardMaterial color="#111" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function PirateChest({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (ref.current) ref.current.position.y = 0.4 + Math.sin(performance.now() / 600) * 0.04;
  });
  if (!visible) return null;
  return (
    <group ref={ref} position={[0, 0.4, -5]} rotation={[0, -0.3, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.6, 0.8]} />
        <meshStandardMaterial color="#6a3a14" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.22, 0.12, 0.82]} />
        <meshStandardMaterial color="#e4b248" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.5, 0.42]}>
        <boxGeometry args={[0.18, 0.2, 0.02]} />
        <meshStandardMaterial color="#e4b248" metalness={0.9} roughness={0.2} />
      </mesh>
      <pointLight intensity={1.6} distance={5} color="#ffcc55" />
    </group>
  );
}

export function PirateRoomScene({ phase, chestVisible }: { phase: number; chestVisible: boolean }) {
  const sea = useSeaTexture();
  const sky = useSkySeaTexture();
  return (
    <>
      <S2RoomCameraSetup />
      <color attach="background" args={["#7892a0"]} />
      {/* sky dome */}
      <mesh>
        <sphereGeometry args={[60, 32, 24]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} />
      </mesh>
      {/* sea floor (large plane) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -S2_ROOM_D / 2]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial map={sea} color="#0a3a5a" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* wood platform where player stands */}
      <mesh position={[0, 0.05, -1.5]}>
        <boxGeometry args={[4.5, 0.1, 3]} />
        <meshStandardMaterial color="#5a3a18" />
      </mesh>
      <FrontWallWithDoor color="#1a0f08" />
      {/* pirate ship in distance */}
      <PirateShip pos={[-2, 0.6, -14]} />
      <PirateShip pos={[5, 0.6, -22]} />
      <PirateChest visible={chestVisible} />
      <ambientLight intensity={0.7} color="#bcd0dc" />
      <hemisphereLight args={["#cfe0ea", "#0a1a26", 0.6]} />
      <directionalLight position={[5, 12, 4]} intensity={1.2} color="#fff2d0" />
      {/* player marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#ffd070" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

// ============================================================
// FOREST + LAKE ROOM (Phòng 2) — shield rises from water
// ============================================================
function useLakeTex() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(512, 512, 50, 512, 512, 600);
    g.addColorStop(0, "#1e5a78");
    g.addColorStop(1, "#0a2638");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 120; i++) {
      ctx.strokeStyle = `rgba(180,220,235,${0.06 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, Math.random() * 1024, 30 + Math.random() * 60, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
  }, []);
}
function useForestSky() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#7eb8d8");
    g.addColorStop(0.6, "#c3dde6");
    g.addColorStop(1, "#5a8a6a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
    return new THREE.CanvasTexture(c);
  }, []);
}

function PineTree({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <group position={pos} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 1.2, 8]} />
        <meshStandardMaterial color="#3a2510" />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <coneGeometry args={[0.7, 1.4, 10]} />
        <meshStandardMaterial color="#0e4a26" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <coneGeometry args={[0.55, 1.2, 10]} />
        <meshStandardMaterial color="#155a30" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <coneGeometry args={[0.4, 1.0, 10]} />
        <meshStandardMaterial color="#1c6638" roughness={0.9} />
      </mesh>
    </group>
  );
}

function FloatingShield({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const t0 = useRef<number | null>(null);
  useFrame(() => {
    if (!ref.current) return;
    if (t0.current == null) t0.current = performance.now();
    const t = (performance.now() - t0.current) / 1000;
    const rise = Math.min(1, t / 2.5); // emerges over 2.5s
    ref.current.position.y = -0.3 + rise * 1.5 + Math.sin(performance.now() / 700) * 0.06;
    ref.current.rotation.y = performance.now() / 1400;
  });
  if (!visible) return null;
  return (
    <group ref={ref} position={[0, -0.3, -6]}>
      {/* hex shield body */}
      <mesh>
        <cylinderGeometry args={[0.7, 0.7, 0.12, 6]} />
        <meshStandardMaterial color="#1a3550" emissive="#3aa8ff" emissiveIntensity={1.4} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.75, 0.06, 14, 24]} />
        <meshStandardMaterial color="#5fd0ff" emissive="#5fd0ff" emissiveIntensity={2.4} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* core orb */}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#bfeaff" emissive="#5fd0ff" emissiveIntensity={3} />
      </mesh>
      <pointLight intensity={3} distance={9} color="#5fd0ff" />
    </group>
  );
}

export function ForestLakeScene({ shieldVisible }: { shieldVisible: boolean }) {
  const lake = useLakeTex();
  const sky = useForestSky();
  return (
    <>
      <S2RoomCameraSetup />
      <color attach="background" args={["#7eb8d8"]} />
      <mesh>
        <sphereGeometry args={[60, 32, 24]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} />
      </mesh>
      {/* grass platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -1.5]}>
        <planeGeometry args={[6, 3.6]} />
        <meshStandardMaterial color="#3a6a2c" roughness={0.95} />
      </mesh>
      {/* lake (large reflective plane) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]}>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial map={lake} color="#1e5a78" roughness={0.15} metalness={0.7} />
      </mesh>
      {/* trees lining the back */}
      {[-9, -6.5, -4, 4, 6.5, 9].map((x, i) => (
        <PineTree key={i} pos={[x, 0, -12 - (i % 3)]} scale={1 + (i % 2) * 0.3} />
      ))}
      {[-12, 12].map((x, i) => (
        <PineTree key={"s" + i} pos={[x, 0, -4]} scale={1.4} />
      ))}
      <FrontWallWithDoor color="#0a1a08" />
      <FloatingShield visible={shieldVisible} />
      <ambientLight intensity={0.7} color="#c0dccc" />
      <hemisphereLight args={["#cfe6dc", "#0c2010", 0.7]} />
      <directionalLight position={[5, 12, 4]} intensity={1.1} color="#fff2c8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#9bffd0" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

// ============================================================
// DARK POTION ROOM (Phòng 3)
// ============================================================
function GlowPotion({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.y = 0.9 + Math.sin(performance.now() / 700) * 0.08;
      ref.current.rotation.y = performance.now() / 1500;
    }
  });
  if (!visible) return null;
  return (
    <group ref={ref} position={[0, 0.9, -5]}>
      {/* bottle body (red) */}
      <mesh>
        <sphereGeometry args={[0.42, 28, 28]} />
        <meshPhysicalMaterial color="#ff2a3a" emissive="#ff3050" emissiveIntensity={1.6} roughness={0.15} metalness={0.1} transparent opacity={0.92} transmission={0.4} />
      </mesh>
      {/* gold band */}
      <mesh position={[0, 0.05, 0]}>
        <torusGeometry args={[0.42, 0.06, 12, 28]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#e4b248" metalness={0.95} roughness={0.2} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.13, 0.18, 0.35, 18]} />
        <meshPhysicalMaterial color="#ffd0d8" transparent opacity={0.5} transmission={0.6} roughness={0.1} />
      </mesh>
      {/* cork */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.14, 0.13, 0.18, 18]} />
        <meshStandardMaterial color="#b07a3a" roughness={0.85} />
      </mesh>
      {/* highlight glow */}
      <pointLight intensity={3.5} distance={9} color="#ff5060" />
      <mesh position={[-0.15, 0.05, 0.3]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#ffe0e8" />
      </mesh>
    </group>
  );
}

export function DarkPotionScene({ potionVisible }: { potionVisible: boolean }) {
  return (
    <>
      <S2RoomCameraSetup />
      <color attach="background" args={["#000000"]} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -S2_ROOM_D / 2]}>
        <planeGeometry args={[S2_ROOM_W, S2_ROOM_D]} />
        <meshStandardMaterial color="#08080a" roughness={1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, S2_ROOM_H, -S2_ROOM_D / 2]}>
        <planeGeometry args={[S2_ROOM_W, S2_ROOM_D]} />
        <meshStandardMaterial color="#050505" roughness={1} />
      </mesh>
      <mesh position={[0, S2_ROOM_H / 2, -S2_ROOM_D]}>
        <planeGeometry args={[S2_ROOM_W, S2_ROOM_H]} />
        <meshStandardMaterial color="#050507" />
      </mesh>
      <mesh position={[-S2_ROOM_W / 2, S2_ROOM_H / 2, -S2_ROOM_D / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[S2_ROOM_D, S2_ROOM_H]} />
        <meshStandardMaterial color="#050507" />
      </mesh>
      <mesh position={[S2_ROOM_W / 2, S2_ROOM_H / 2, -S2_ROOM_D / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[S2_ROOM_D, S2_ROOM_H]} />
        <meshStandardMaterial color="#050507" />
      </mesh>
      <FrontWallWithDoor color="#050507" />
      <GlowPotion visible={potionVisible} />
      <ambientLight intensity={0.12} color="#5a3030" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#ff6080" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

// ============================================================
// STAR ROOM (Phòng 4) — reuse-of style
// ============================================================
export function S2StarRoomScene() {
  const stars = useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(512, 512, 50, 512, 512, 720);
    g.addColorStop(0, "#1a2a55"); g.addColorStop(0.5, "#0b1430"); g.addColorStop(1, "#03060f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 1.6 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <>
      <S2RoomCameraSetup />
      <color attach="background" args={["#03060f"]} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -S2_ROOM_D / 2]}>
        <planeGeometry args={[S2_ROOM_W, S2_ROOM_D]} />
        <meshStandardMaterial color="#101428" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, -S2_ROOM_D / 2]}>
        <sphereGeometry args={[S2_ROOM_D * 1.2, 32, 24]} />
        <meshBasicMaterial map={stars} side={THREE.BackSide} />
      </mesh>
      <FrontWallWithDoor color="#0a1230" />
      <ambientLight intensity={0.45} color="#7a90ff" />
      <pointLight position={[0, 3, -S2_ROOM_D / 2]} intensity={1.2} distance={14} color="#9bb0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#9bb0ff" transparent opacity={0.7} />
      </mesh>
    </>
  );
}
