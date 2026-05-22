import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, Cloud, Clouds } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CATALOG, getItem, type CatalogItem } from "./catalog";
import type { PlacedItem } from "@/lib/game";

const GRID = 20; // 20x20 plot
const CELL = 1;

type Props = {
  placed: PlacedItem[];
  selectedItemId: string | null;
  rotation: number;
  onPlace: (x: number, z: number) => void;
  onRemove: (id: string) => void;
};

function Character({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const ref = useRef<THREE.Group>(null!);
  const vel = useRef(new THREE.Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const yVel = useRef(0);
  const grounded = useRef(true);
  const { camera } = useThree();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.code === "Space") keys.current[" "] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
      if (e.code === "Space") keys.current[" "] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const k = keys.current;
    const speed = 6;

    // camera-relative movement
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (k["w"]) move.add(camDir);
    if (k["s"]) move.sub(camDir);
    if (k["d"]) move.add(right);
    if (k["a"]) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt);
      ref.current.position.x += move.x;
      ref.current.position.z += move.z;
      const angle = Math.atan2(move.x, move.z);
      ref.current.rotation.y = angle;
    }

    // jump
    if (k[" "] && grounded.current) {
      yVel.current = 7;
      grounded.current = false;
    }
    yVel.current -= 18 * dt;
    ref.current.position.y += yVel.current * dt;
    if (ref.current.position.y <= 1) {
      ref.current.position.y = 1;
      yVel.current = 0;
      grounded.current = true;
    }

    // clamp inside larger world
    ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x, -40, 40);
    ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z, -40, 40);

    // third-person camera follow
    if (controlsRef.current) {
      controlsRef.current.target.lerp(ref.current.position, 0.15);
      controlsRef.current.update();
    }
    vel.current.set(0, 0, 0);
  });

  return (
    <group ref={ref} position={[0, 1, 0]}>
      {/* body */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.35, 0.7, 8, 16]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>
      {/* face direction marker */}
      <mesh position={[0, 1.05, 0.3]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* hat */}
      <mesh castShadow position={[0, 1.32, 0]}>
        <coneGeometry args={[0.35, 0.4, 16]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function ItemMesh({ item, rotation }: { item: CatalogItem; rotation: number }) {
  const color = item.color;
  if (item.shape === "cylinder") {
    return (
      <mesh castShadow receiveShadow position={[0, item.h / 2, 0]} rotation={[0, (rotation * Math.PI) / 2, 0]}>
        <cylinderGeometry args={[item.w / 2, item.w / 2, item.h, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }
  return (
    <mesh castShadow receiveShadow position={[0, item.h / 2, 0]} rotation={[0, (rotation * Math.PI) / 2, 0]}>
      <boxGeometry args={[item.w * CELL, item.h, item.d * CELL]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function PlotAndPlacement({ placed, selectedItemId, rotation, onPlace, onRemove }: Props) {
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  const selected = selectedItemId ? getItem(selectedItemId) : null;

  // Plot covers from -GRID/2..GRID/2
  const half = (GRID * CELL) / 2;

  const handleMove = (e: any) => {
    if (!selected) return;
    const p = e.point as THREE.Vector3;
    // snap to cells, account for item footprint
    const gx = Math.floor(p.x + half);
    const gz = Math.floor(p.z + half);
    setHover({ x: gx, z: gz });
  };

  const handleClick = () => {
    if (!selected || !hover) return;
    onPlace(hover.x, hover.z);
  };

  return (
    <group>
      {/* Ground around plot */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#7cc472" />
      </mesh>

      {/* Plot */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerMove={handleMove}
        onPointerOut={() => setHover(null)}
        onClick={handleClick}
      >
        <planeGeometry args={[GRID, GRID]} />
        <meshStandardMaterial color="#caa472" />
      </mesh>

      {/* Grid lines */}
      <gridHelper args={[GRID, GRID, "#5a3e1b", "#8a6a3a"]} position={[0, 0.01, 0]} />

      {/* Plot border */}
      {[
        [0, -half - 0.1],
        [0, half + 0.1],
      ].map((p, i) => (
        <mesh key={"bx" + i} position={[p[0], 0.2, p[1]]}>
          <boxGeometry args={[GRID + 0.4, 0.4, 0.2]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      ))}
      {[
        [-half - 0.1, 0],
        [half + 0.1, 0],
      ].map((p, i) => (
        <mesh key={"bz" + i} position={[p[0], 0.2, p[1]]}>
          <boxGeometry args={[0.2, 0.4, GRID + 0.4]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      ))}

      {/* Placed items */}
      {placed.map((p) => {
        const it = getItem(p.itemId);
        if (!it) return null;
        const wx = p.x - half + (it.w * CELL) / 2;
        const wz = p.z - half + (it.d * CELL) / 2;
        return (
          <group
            key={p.id}
            position={[wx, 0, wz]}
            onContextMenu={(e) => {
              e.stopPropagation();
              onRemove(p.id);
            }}
          >
            <ItemMesh item={it} rotation={p.rotation} />
          </group>
        );
      })}

      {/* Ghost preview */}
      {selected && hover && (() => {
        const wx = hover.x - half + (selected.w * CELL) / 2;
        const wz = hover.z - half + (selected.d * CELL) / 2;
        const inside = hover.x >= 0 && hover.z >= 0 && hover.x + selected.w <= GRID && hover.z + selected.d <= GRID;
        return (
          <group position={[wx, 0, wz]}>
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

  return (
    <Canvas shadows camera={{ position: [0, 10, 18], fov: 55 }} dpr={[1, 1.5]}>
      <Sky sunPosition={[100, 30, 100]} turbidity={2} rayleigh={0.5} />
      <ambientLight intensity={0.7} />
      <directionalLight
        castShadow
        position={[20, 25, 10]}
        intensity={1.4}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud position={[-15, 18, -10]} speed={0.2} opacity={0.6} />
        <Cloud position={[20, 22, 5]} speed={0.2} opacity={0.5} />
      </Clouds>
      <Character controlsRef={controlsRef} />
      <PlotAndPlacement {...props} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
