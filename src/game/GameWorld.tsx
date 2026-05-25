import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, Cloud, Clouds, Environment, ContactShadows, SoftShadows } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getItem, type CatalogItem } from "./catalog";
import { ItemModel } from "./Models";
import type { PlacedItem, WallSegment } from "@/lib/game";
import { WALL_HEIGHT } from "@/lib/game";

const GRID = 20;
const CELL = 1;
const PATH = 3;

type Props = {
  placed: PlacedItem[];
  walls: WallSegment[];
  wallColor: string;
  wallMode: boolean;
  wallPickA: string | null;
  selectedItemId: string | null;
  rotation: number;
  onRotate: () => void;
  onPlace: (x: number, z: number) => void;
  onRemove: (id: string) => void;
  onPillarClick: (placedId: string) => void;
  onWallRemove: (id: string) => void;
};

function Character({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const ref = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Mesh>(null!);
  const armR = useRef<THREE.Mesh>(null!);
  const legL = useRef<THREE.Mesh>(null!);
  const legR = useRef<THREE.Mesh>(null!);
  const keys = useRef<Record<string, boolean>>({});
  const yVel = useRef(0);
  const grounded = useRef(true);
  const walkPhase = useRef(0);
  const { camera } = useThree();

  const [outfit, setOutfit] = useState<any>(null);
  useEffect(() => {
    import("@/lib/character").then((m) => setOutfit(m.loadOutfit() || m.DEFAULT_OUTFIT));
  }, []);
  const o = outfit || { skin: "#fde68a", hair: "#7c2d12", shirt: "#ef4444", pants: "#1e40af", shoes: "#1f2937", accent: "#fcd34d", hat: undefined };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const k = keys.current;
    const speed = 6;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; camDir.normalize();
    const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (k["w"]) move.add(camDir);
    if (k["s"]) move.sub(camDir);
    if (k["d"]) move.add(right);
    if (k["a"]) move.sub(right);
    const moving = move.lengthSq() > 0;
    if (moving) {
      move.normalize().multiplyScalar(speed * dt);
      ref.current.position.x += move.x;
      ref.current.position.z += move.z;
      ref.current.rotation.y = Math.atan2(move.x, move.z);
      walkPhase.current += dt * 10;
    } else {
      walkPhase.current *= 0.8;
    }
    const swing = Math.sin(walkPhase.current) * 0.7;
    if (armL.current) armL.current.rotation.x = swing;
    if (armR.current) armR.current.rotation.x = -swing;
    if (legL.current) legL.current.rotation.x = -swing;
    if (legR.current) legR.current.rotation.x = swing;

    if (k[" "] && grounded.current) { yVel.current = 7; grounded.current = false; }
    yVel.current -= 18 * dt;
    ref.current.position.y += yVel.current * dt;
    if (ref.current.position.y <= 0) { ref.current.position.y = 0; yVel.current = 0; grounded.current = true; }

    const limit = (GRID + PATH * 2) / 2;
    ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x, -limit, limit);
    ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z, -limit, limit);

    if (controlsRef.current) {
      const t = new THREE.Vector3(ref.current.position.x, ref.current.position.y + 1.0, ref.current.position.z);
      controlsRef.current.target.lerp(t, 0.18);
      controlsRef.current.update();
    }
  });

  // Character: 2 cells tall × 1 cell wide
  return (
    <group ref={ref} position={[0, 0, 0]}>
      <mesh ref={legL} castShadow position={[-0.18, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.7, 0.22]} />
        <meshStandardMaterial color={o.pants} />
      </mesh>
      <mesh ref={legR} castShadow position={[0.18, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.7, 0.22]} />
        <meshStandardMaterial color={o.pants} />
      </mesh>
      <mesh position={[-0.18, 0.05, 0.04]} castShadow>
        <boxGeometry args={[0.28, 0.1, 0.36]} />
        <meshStandardMaterial color={o.shoes} />
      </mesh>
      <mesh position={[0.18, 0.05, 0.04]} castShadow>
        <boxGeometry args={[0.28, 0.1, 0.36]} />
        <meshStandardMaterial color={o.shoes} />
      </mesh>
      <mesh castShadow position={[0, 1.02, 0]}>
        <boxGeometry args={[0.65, 0.65, 0.38]} />
        <meshStandardMaterial color={o.shirt} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[0.68, 0.08, 0.4]} />
        <meshStandardMaterial color={o.accent} />
      </mesh>
      <mesh ref={armL} castShadow position={[-0.42, 1.05, 0]}>
        <boxGeometry args={[0.18, 0.62, 0.22]} />
        <meshStandardMaterial color={o.shirt} />
      </mesh>
      <mesh ref={armR} castShadow position={[0.42, 1.05, 0]}>
        <boxGeometry args={[0.18, 0.62, 0.22]} />
        <meshStandardMaterial color={o.shirt} />
      </mesh>
      <mesh castShadow position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color={o.skin} />
      </mesh>
      <mesh castShadow position={[0, 1.82, -0.03]}>
        <sphereGeometry args={[0.32, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={o.hair} />
      </mesh>
      {o.hat && (
        <mesh castShadow position={[0, 1.98, 0]}>
          <coneGeometry args={[0.34, 0.32, 16]} />
          <meshStandardMaterial color={o.hat} />
        </mesh>
      )}
      <mesh position={[-0.1, 1.68, 0.26]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.1, 1.68, 0.26]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}


function PlotAndPlacement({ placed, selectedItemId, rotation, onPlace, onRemove }: Omit<Props, "onRotate">) {
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  const selected = selectedItemId ? getItem(selectedItemId) : null;
  const half = (GRID * CELL) / 2;

  // rotate footprint
  const rotatedFootprint = (it: CatalogItem) => {
    const swap = rotation % 2 === 1;
    return { w: swap ? it.d : it.w, d: swap ? it.w : it.d };
  };

  const handleMove = (e: any) => {
    if (!selected) return;
    const p = e.point as THREE.Vector3;
    const gx = Math.floor(p.x + half);
    const gz = Math.floor(p.z + half);
    setHover({ x: gx, z: gz });
  };
  const handleClick = () => { if (selected && hover) onPlace(hover.x, hover.z); };

  return (
    <group>
      {/* Far ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#86c46c" />
      </mesh>

      {/* Path ring around plot */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[GRID + PATH * 2, GRID + PATH * 2]} />
        <meshStandardMaterial color="#b8b0a4" />
      </mesh>

      {/* Plot (dirt/grass mix) */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        onPointerMove={handleMove}
        onPointerOut={() => setHover(null)}
        onClick={handleClick}
      >
        <planeGeometry args={[GRID, GRID]} />
        <meshStandardMaterial color="#9bca6f" />
      </mesh>

      {/* Grid */}
      <gridHelper args={[GRID, GRID, "#3a5a2a", "#5e8a3f"]} position={[0, 0.02, 0]} />

      {/* Plot border posts */}
      {[-half, half].map((x) =>
        [-half, half].map((z) => (
          <mesh key={`${x}-${z}`} castShadow position={[x, 0.4, z]}>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))
      )}

      {/* Placed items */}
      {placed.map((p) => {
        const it = getItem(p.itemId);
        if (!it) return null;
        const swap = p.rotation % 2 === 1;
        const fw = swap ? it.d : it.w;
        const fd = swap ? it.w : it.d;
        const wx = p.x - half + fw / 2;
        const wz = p.z - half + fd / 2;
        return (
          <group
            key={p.id}
            position={[wx, 0, wz]}
            rotation={[0, (p.rotation * Math.PI) / 2, 0]}
            onContextMenu={(e) => { e.stopPropagation(); onRemove(p.id); }}
          >
            <ItemModel item={it} />
          </group>
        );
      })}

      {/* Ghost */}
      {selected && hover && (() => {
        const { w: fw, d: fd } = rotatedFootprint(selected);
        const wx = hover.x - half + fw / 2;
        const wz = hover.z - half + fd / 2;
        const inside = hover.x >= 0 && hover.z >= 0 && hover.x + fw <= GRID && hover.z + fd <= GRID;
        return (
          <group position={[wx, 0, wz]} rotation={[0, (rotation * Math.PI) / 2, 0]}>
            <mesh position={[0, selected.h / 2, 0]}>
              <boxGeometry args={[selected.w, selected.h, selected.d]} />
              <meshStandardMaterial color={inside ? "#22c55e" : "#ef4444"} transparent opacity={0.45} />
            </mesh>
          </group>
        );
      })()}
    </group>
  );
}

export default function GameWorld(props: Props) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") props.onRotate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <Canvas shadows="soft" camera={{ position: [0, 12, 18], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true, toneMappingExposure: 1.1 }}>
      <SoftShadows size={25} samples={16} focus={0.5} />
      <Sky sunPosition={[100, 30, 100]} turbidity={1.5} rayleigh={0.4} mieCoefficient={0.005} mieDirectionalG={0.85} />
      <Environment preset="park" background={false} environmentIntensity={0.6} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#cfe9ff", "#5a8a4a", 0.35]} />
      <directionalLight
        castShadow
        position={[25, 35, 18]}
        intensity={2}
        color="#fff5e1"
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud position={[-15, 18, -10]} speed={0.2} opacity={0.55} />
        <Cloud position={[20, 22, 5]} speed={0.2} opacity={0.5} />
        <Cloud position={[0, 25, -20]} speed={0.15} opacity={0.45} />
      </Clouds>
      <Character controlsRef={controlsRef} />
      <PlotAndPlacement {...props} />
      <ContactShadows position={[0, 0.03, 0]} opacity={0.45} scale={60} blur={2.4} far={15} resolution={1024} />
      <fog attach="fog" args={["#dbeafe", 60, 180]} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
