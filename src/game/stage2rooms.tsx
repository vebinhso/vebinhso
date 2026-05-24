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

// ===== Animated ocean (real-ish sea) =====
function useSeaTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, "#2b80b8");
    g.addColorStop(0.5, "#1565a0");
    g.addColorStop(1, "#0a3a68");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = `rgba(220,240,255,${0.08 + Math.random() * 0.22})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * 1024;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 28) ctx.lineTo(x, y + Math.sin(x * 0.04 + i) * 8);
      ctx.stroke();
    }
    // foam highlights
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, Math.random() * 1024, 12 + Math.random() * 20, 3, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
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
    g.addColorStop(0, "#b8d8ee");
    g.addColorStop(0.5, "#e0eef5");
    g.addColorStop(1, "#7eb0d0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 10; i++) {
      const cx = Math.random() * 1024, cy = 50 + Math.random() * 280;
      for (let j = 0; j < 7; j++) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.35})`;
        ctx.beginPath();
        ctx.arc(cx + j * 32 - 80, cy + (Math.random() - 0.5) * 18, 30 + Math.random() * 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return new THREE.CanvasTexture(c);
  }, []);
}

function AnimatedSea({ tex }: { tex: any }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (tex) { tex.offset.x = (performance.now() / 9000) % 1; tex.offset.y = (performance.now() / 12000) % 1; }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -S2_ROOM_D / 2]}>
      <planeGeometry args={[160, 160, 32, 32]} />
      <meshStandardMaterial map={tex} color="#1a78b0" roughness={0.25} metalness={0.6} />
    </mesh>
  );
}

function PirateShip({ pos }: { pos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.y = pos[1] + Math.sin(performance.now() / 1000) * 0.08;
      ref.current.rotation.z = Math.sin(performance.now() / 1300) * 0.04;
    }
  });
  return (
    <group ref={ref} position={pos} rotation={[0, 0.4, 0]}>
      <mesh><boxGeometry args={[3.2, 0.9, 1.4]} /><meshStandardMaterial color="#3a230f" roughness={0.85} /></mesh>
      <mesh position={[1.6, 0.1, 0]} rotation={[0, 0, -0.3]}><boxGeometry args={[1, 0.7, 1.4]} /><meshStandardMaterial color="#3a230f" /></mesh>
      <mesh position={[-1.6, 0.1, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[1, 0.7, 1.4]} /><meshStandardMaterial color="#3a230f" /></mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[3.2, 0.05, 1.3]} /><meshStandardMaterial color="#8a6334" /></mesh>
      {[-0.9, 0.2, 1.1].map((x, i) => (
        <group key={i} position={[x, 0.5, 0]}>
          <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.05, 0.06, 2.8, 10]} /><meshStandardMaterial color="#2a1a0a" /></mesh>
          <mesh position={[0, 1.7, 0]}><boxGeometry args={[0.9, 0.7, 0.02]} /><meshStandardMaterial color="#f0e0b8" side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 2.5, 0]}><boxGeometry args={[0.7, 0.5, 0.02]} /><meshStandardMaterial color="#d8c8a8" side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
      <mesh position={[0.2, 3.3, 0]}><planeGeometry args={[0.5, 0.3]} /><meshStandardMaterial color="#111" side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

function FloatingCoin({ pos, delay }: { pos: [number, number, number]; delay: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() / 1000 + delay;
    ref.current.position.y = pos[1] + Math.max(0, Math.sin(t * 1.4)) * 0.6;
    ref.current.rotation.y = t * 2.5;
  });
  return (
    <mesh ref={ref} position={pos} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.09, 0.09, 0.02, 20]} />
      <meshStandardMaterial color="#ffe066" metalness={0.95} roughness={0.18} emissive="#ffaa00" emissiveIntensity={0.9} />
    </mesh>
  );
}

function CoinPile({ origin }: { origin: [number, number, number] }) {
  return (
    <group position={origin}>
      <mesh>
        <sphereGeometry args={[0.34, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffd54a" metalness={0.95} roughness={0.22} emissive="#ffa600" emissiveIntensity={1.2} />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = i * 0.9; const r = 0.1 + (i % 3) * 0.07;
        return <FloatingCoin key={i} pos={[Math.cos(a) * r, 0.15 + (i % 4) * 0.05, Math.sin(a) * r * 0.6]} delay={i * 0.13} />;
      })}
      <pointLight intensity={3.2} distance={7} color="#ffcc55" />
    </group>
  );
}

function PirateChest({ visible, opened }: { visible: boolean; opened?: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const lidRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (ref.current) ref.current.position.y = 0.4 + Math.sin(performance.now() / 600) * 0.04;
    if (lidRef.current) {
      const target = opened ? -1.15 : 0;
      lidRef.current.rotation.x += (target - lidRef.current.rotation.x) * 0.12;
    }
  });
  if (!visible) return null;
  return (
    <group ref={ref} position={[0, 0.4, -5]} rotation={[0, -0.3, 0]}>
      <mesh position={[0, 0.3, 0]}><boxGeometry args={[1.2, 0.6, 0.8]} /><meshStandardMaterial color="#6a3a14" /></mesh>
      {/* hinged lid */}
      <group position={[0, 0.6, -0.4]}>
        <group ref={lidRef}>
          <mesh position={[0, 0.06, 0.4]}><boxGeometry args={[1.22, 0.12, 0.82]} /><meshStandardMaterial color="#e4b248" metalness={0.9} roughness={0.25} /></mesh>
        </group>
      </group>
      <mesh position={[0, 0.5, 0.42]}><boxGeometry args={[0.18, 0.2, 0.02]} /><meshStandardMaterial color="#e4b248" metalness={0.9} roughness={0.2} /></mesh>
      {opened && <CoinPile origin={[0, 0.65, 0]} />}
      <pointLight intensity={opened ? 3.5 : 1.6} distance={opened ? 9 : 5} color="#ffcc55" />
    </group>
  );
}

export function PirateRoomScene({ phase, chestVisible, chestOpened }: { phase: number; chestVisible: boolean; chestOpened?: boolean }) {
  const sea = useSeaTexture();
  const sky = useSkySeaTexture();
  return (
    <>
      <S2RoomCameraSetup />
      <color attach="background" args={["#b8d8ee"]} />
      <mesh>
        <sphereGeometry args={[80, 32, 24]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} />
      </mesh>
      {/* real animated sea */}
      <AnimatedSea tex={sea} />
      {/* wood platform */}
      <mesh position={[0, 0.05, -1.5]}>
        <boxGeometry args={[4.5, 0.1, 3]} />
        <meshStandardMaterial color="#7a5224" />
      </mesh>
      <FrontWallWithDoor color="#221408" />
      <PirateShip pos={[-2, 0.6, -14]} />
      <PirateShip pos={[5, 0.6, -22]} />
      <PirateChest visible={chestVisible} opened={chestOpened} />
      {/* much brighter sun lit scene */}
      <ambientLight intensity={1.4} color="#dbeaf2" />
      <hemisphereLight args={["#eaf4fc", "#1a2a36", 1.0]} />
      <directionalLight position={[5, 14, 4]} intensity={1.8} color="#fff4d0" />
      <directionalLight position={[-6, 10, 6]} intensity={0.8} color="#bcd6ee" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#ffd070" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

// ============================================================
// FOREST + LAKE — clearer blue water, +30 brightness
// ============================================================
function useLakeTex() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(512, 512, 50, 512, 512, 600);
    g.addColorStop(0, "#5fc8e8");
    g.addColorStop(1, "#1a78a8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = `rgba(220,245,255,${0.1 + Math.random() * 0.2})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, Math.random() * 1024, 30 + Math.random() * 70, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);
}
function useForestSky() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#8acce8"); g.addColorStop(0.6, "#d4ecf3"); g.addColorStop(1, "#7aa890");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
    return new THREE.CanvasTexture(c);
  }, []);
}

function PineTree({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <group position={pos} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.1, 0.14, 1.2, 8]} /><meshStandardMaterial color="#3a2510" /></mesh>
      <mesh position={[0, 1.6, 0]}><coneGeometry args={[0.7, 1.4, 10]} /><meshStandardMaterial color="#0e4a26" /></mesh>
      <mesh position={[0, 2.4, 0]}><coneGeometry args={[0.55, 1.2, 10]} /><meshStandardMaterial color="#155a30" /></mesh>
      <mesh position={[0, 3.1, 0]}><coneGeometry args={[0.4, 1.0, 10]} /><meshStandardMaterial color="#1c6638" /></mesh>
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
    const rise = Math.min(1, t / 2.5);
    ref.current.position.y = -0.3 + rise * 1.5 + Math.sin(performance.now() / 700) * 0.06;
    ref.current.rotation.y = performance.now() / 1400;
  });
  if (!visible) return null;
  return (
    <group ref={ref} position={[0, -0.3, -6]}>
      <mesh><cylinderGeometry args={[0.7, 0.7, 0.12, 6]} /><meshStandardMaterial color="#1a3550" emissive="#3aa8ff" emissiveIntensity={1.4} metalness={0.85} roughness={0.25} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.75, 0.06, 14, 24]} /><meshStandardMaterial color="#5fd0ff" emissive="#5fd0ff" emissiveIntensity={2.4} /></mesh>
      <mesh position={[0, 0.08, 0]}><sphereGeometry args={[0.22, 24, 24]} /><meshStandardMaterial color="#bfeaff" emissive="#5fd0ff" emissiveIntensity={3} /></mesh>
      <pointLight intensity={3} distance={9} color="#5fd0ff" />
    </group>
  );
}

export function ForestLakeScene({ shieldVisible }: { shieldVisible: boolean }) {
  const lake = useLakeTex();
  const sky = useForestSky();
  // animate ripples
  useFrame(() => { if (lake) { lake.offset.x = (performance.now() / 10000) % 1; } });
  return (
    <>
      <S2RoomCameraSetup />
      <color attach="background" args={["#a8d8ee"]} />
      <mesh>
        <sphereGeometry args={[60, 32, 24]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -1.5]}>
        <planeGeometry args={[6, 3.6]} />
        <meshStandardMaterial color="#4a7a36" roughness={0.95} />
      </mesh>
      {/* clear blue lake */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]}>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial map={lake} color="#3fb4e0" roughness={0.1} metalness={0.75} transparent opacity={0.92} />
      </mesh>
      {[-9, -6.5, -4, 4, 6.5, 9].map((x, i) => (
        <PineTree key={i} pos={[x, 0, -12 - (i % 3)]} scale={1 + (i % 2) * 0.3} />
      ))}
      {[-12, 12].map((x, i) => (<PineTree key={"s" + i} pos={[x, 0, -4]} scale={1.4} />))}
      <FrontWallWithDoor color="#0a1a08" />
      <FloatingShield visible={shieldVisible} />
      {/* +30cd brightness boost */}
      <ambientLight intensity={1.5} color="#dbf0e6" />
      <hemisphereLight args={["#e0f0e8", "#1c3020", 1.2]} />
      <directionalLight position={[5, 14, 4]} intensity={1.8} color="#fff4d0" />
      <directionalLight position={[-6, 10, 6]} intensity={0.9} color="#cfeaff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#9bffd0" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

// ============================================================
// DARK POTION ROOM — potion + glowing aura
// ============================================================
function GlowAura() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (!ref.current) return;
    const s = 1 + Math.sin(performance.now() / 500) * 0.12;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(performance.now() / 600) * 0.1;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.2, 24, 24]} />
      <meshBasicMaterial color="#ff4060" transparent opacity={0.3} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  );
}

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
      {/* outer glowing halo */}
      <GlowAura />
      <mesh>
        <sphereGeometry args={[0.42, 28, 28]} />
        <meshPhysicalMaterial color="#ff2a3a" emissive="#ff3050" emissiveIntensity={2.2} roughness={0.15} metalness={0.1} transparent opacity={0.92} transmission={0.4} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.06, 12, 28]} />
        <meshStandardMaterial color="#e4b248" metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.13, 0.18, 0.35, 18]} />
        <meshPhysicalMaterial color="#ffd0d8" transparent opacity={0.5} transmission={0.6} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.14, 0.13, 0.18, 18]} />
        <meshStandardMaterial color="#b07a3a" roughness={0.85} />
      </mesh>
      <pointLight intensity={5} distance={14} color="#ff5060" />
      <pointLight position={[0, 0.6, 0]} intensity={2.5} distance={8} color="#ff80a0" />
      {/* shimmering particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[Math.cos(i) * 0.8, Math.sin(i * 1.7) * 0.6, Math.sin(i) * 0.8]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#ffb0c0" emissive="#ff4060" emissiveIntensity={3} />
        </mesh>
      ))}
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
      <mesh position={[0, S2_ROOM_H / 2, -S2_ROOM_D]}><planeGeometry args={[S2_ROOM_W, S2_ROOM_H]} /><meshStandardMaterial color="#050507" /></mesh>
      <mesh position={[-S2_ROOM_W / 2, S2_ROOM_H / 2, -S2_ROOM_D / 2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[S2_ROOM_D, S2_ROOM_H]} /><meshStandardMaterial color="#050507" /></mesh>
      <mesh position={[S2_ROOM_W / 2, S2_ROOM_H / 2, -S2_ROOM_D / 2]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[S2_ROOM_D, S2_ROOM_H]} /><meshStandardMaterial color="#050507" /></mesh>
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
// SPIDER WEB ROOM (Phòng 4) — dark cobweb dungeon like S1 door 1
// ============================================================
function useCobwebTex() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    const corners: Array<[number, number]> = [[0, 0], [512, 0], [0, 512], [512, 512]];
    for (const [cx, cy] of corners) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * (Math.PI / 2);
        const r = 200 + Math.random() * 60;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a + (cx ? Math.PI : 0)) * r * (cx ? -1 : 1), cy + Math.sin(a + (cy ? Math.PI : 0)) * r * (cy ? -1 : 1));
        ctx.stroke();
      }
      for (let ring = 1; ring < 7; ring++) {
        const rr = ring * 32;
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
    return new THREE.CanvasTexture(c);
  }, []);
}

export function SpiderWebRoomScene() {
  const web = useCobwebTex();
  return (
    <>
      <S2RoomCameraSetup />
      <color attach="background" args={["#0a0604"]} />
      {/* floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -S2_ROOM_D / 2]}>
        <planeGeometry args={[S2_ROOM_W, S2_ROOM_D]} />
        <meshStandardMaterial color="#5a4a32" roughness={0.95} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, S2_ROOM_H, -S2_ROOM_D / 2]}>
        <planeGeometry args={[S2_ROOM_W, S2_ROOM_D]} />
        <meshStandardMaterial color="#3a2e1f" roughness={1} />
      </mesh>
      {/* walls */}
      <mesh position={[0, S2_ROOM_H / 2, -S2_ROOM_D]}><planeGeometry args={[S2_ROOM_W, S2_ROOM_H]} /><meshStandardMaterial color="#6e5a44" /></mesh>
      <mesh position={[-S2_ROOM_W / 2, S2_ROOM_H / 2, -S2_ROOM_D / 2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[S2_ROOM_D, S2_ROOM_H]} /><meshStandardMaterial color="#6e5a44" /></mesh>
      <mesh position={[S2_ROOM_W / 2, S2_ROOM_H / 2, -S2_ROOM_D / 2]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[S2_ROOM_D, S2_ROOM_H]} /><meshStandardMaterial color="#6e5a44" /></mesh>
      <FrontWallWithDoor color="#3a2a1a" />
      {/* cobweb corners */}
      {[
        [-S2_ROOM_W / 2 + 0.05, S2_ROOM_H - 0.05, -0.05],
        [S2_ROOM_W / 2 - 0.05, S2_ROOM_H - 0.05, -0.05],
        [-S2_ROOM_W / 2 + 0.05, S2_ROOM_H - 0.05, -S2_ROOM_D + 0.05],
        [S2_ROOM_W / 2 - 0.05, S2_ROOM_H - 0.05, -S2_ROOM_D + 0.05],
      ].map((p, i) => (
        <mesh key={i} position={p as any} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial map={web} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* hanging web */}
      <mesh position={[-2, S2_ROOM_H - 1.2, -S2_ROOM_D + 1.5]} rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial map={web} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* dim hanging bulb */}
      <group position={[0, S2_ROOM_H - 0.4, -S2_ROOM_D / 2]}>
        <mesh position={[0, -0.4, 0]}>
          <sphereGeometry args={[0.14, 14, 14]} />
          <meshStandardMaterial color="#fff7d0" emissive="#ffb060" emissiveIntensity={2.8} />
        </mesh>
        <pointLight position={[0, -0.4, 0]} intensity={2.2} distance={12} color="#ffb070" />
      </group>
      <ambientLight intensity={0.55} color="#5c4632" />
      <hemisphereLight args={["#c89878", "#2a1a10", 0.4]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#ffb070" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

// ============================================================
// WITCH ROOM — bright enough to see witch clearly
// ============================================================
export function WitchRoomScene({ flashIntensity = 0 }: { flashIntensity?: number }) {
  return (
    <>
      <S2RoomCameraSetup />
      <color attach="background" args={["#0a0814"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -S2_ROOM_D / 2]}>
        <planeGeometry args={[S2_ROOM_W, S2_ROOM_D]} />
        <meshStandardMaterial color="#1c1428" roughness={0.85} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, S2_ROOM_H, -S2_ROOM_D / 2]}>
        <planeGeometry args={[S2_ROOM_W, S2_ROOM_D]} />
        <meshStandardMaterial color="#0a0612" />
      </mesh>
      <mesh position={[0, S2_ROOM_H / 2, -S2_ROOM_D]}><planeGeometry args={[S2_ROOM_W, S2_ROOM_H]} /><meshStandardMaterial color="#161024" /></mesh>
      <mesh position={[-S2_ROOM_W / 2, S2_ROOM_H / 2, -S2_ROOM_D / 2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[S2_ROOM_D, S2_ROOM_H]} /><meshStandardMaterial color="#161024" /></mesh>
      <mesh position={[S2_ROOM_W / 2, S2_ROOM_H / 2, -S2_ROOM_D / 2]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[S2_ROOM_D, S2_ROOM_H]} /><meshStandardMaterial color="#161024" /></mesh>
      <FrontWallWithDoor color="#0a0814" />
      {/* base lighting — witch is visible */}
      <ambientLight intensity={0.85} color="#a890c8" />
      <hemisphereLight args={["#b8a0d8", "#2a1840", 0.7]} />
      <pointLight position={[0, 3.5, -5]} intensity={2.4} distance={14} color="#d8b8ff" />
      <pointLight position={[-3, 2, -3]} intensity={1.4} distance={9} color="#9080b0" />
      <pointLight position={[3, 2, -3]} intensity={1.4} distance={9} color="#9080b0" />
      {/* lightning flash */}
      {flashIntensity > 0 && (
        <>
          <pointLight position={[0, 4, -5]} intensity={flashIntensity * 8} distance={30} color="#dff0ff" />
          <ambientLight intensity={flashIntensity * 1.4} color="#cfe6ff" />
        </>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#d8b8ff" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

// Kept for backwards compat
export function S2StarRoomScene() {
  return <SpiderWebRoomScene />;
}
