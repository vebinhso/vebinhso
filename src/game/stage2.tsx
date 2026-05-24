import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// ============ STAGE 2 CONSTANTS ============
export const S2_LEN = 64;
export const S2_W = 7;
export const S2_H = 4.8;
export const S2_DOORS = 5;
const DOOR_SPACING = S2_LEN / (S2_DOORS + 1);

// 5 rooms — alternating sides to evoke a "bent" corridor feel
export const S2_DOOR_SLOTS = Array.from({ length: S2_DOORS }).map((_, i) => {
  const side = i % 2 === 0 ? -1 : 1; // L, R, L, R, L
  const z = -S2_LEN / 2 + DOOR_SPACING * (i + 1);
  const x = side * (S2_W / 2 - 0.05);
  return { z, x, side };
});

// ============ CHECKERED MARBLE FLOOR TEXTURE ============
function useCheckerTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null as any;
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const ctx = c.getContext("2d")!;
    const tiles = 8;
    const ts = 1024 / tiles;
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        const dark = (x + y) % 2 === 0;
        ctx.fillStyle = dark ? "#0a0a0c" : "#e6e6ea";
        ctx.fillRect(x * ts, y * ts, ts, ts);
        // marble veins
        ctx.strokeStyle = dark ? "rgba(120,120,140,0.35)" : "rgba(80,80,90,0.35)";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const sx = x * ts + Math.random() * ts;
          const sy = y * ts + Math.random() * ts;
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(
            sx + (Math.random() - 0.5) * ts,
            sy + (Math.random() - 0.5) * ts,
            sx + (Math.random() - 0.5) * ts,
            sy + (Math.random() - 0.5) * ts,
            sx + (Math.random() - 0.5) * ts,
            sy + (Math.random() - 0.5) * ts,
          );
          ctx.stroke();
        }
        // subtle highlight
        if (!dark) {
          const g = ctx.createRadialGradient(x * ts + ts / 2, y * ts + ts / 2, 0, x * ts + ts / 2, y * ts + ts / 2, ts);
          g.addColorStop(0, "rgba(255,255,255,0.15)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x * ts, y * ts, ts, ts);
        }
      }
    }
    // grout
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= tiles; i++) {
      ctx.beginPath(); ctx.moveTo(i * ts, 0); ctx.lineTo(i * ts, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * ts); ctx.lineTo(1024, i * ts); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, S2_LEN / 8);
    tex.anisotropy = 8;
    return tex;
  }, []);
}

// ============ STAGE 2 CORRIDOR ============
export function Stage2Corridor() {
  const checker = useCheckerTexture();
  return (
    <group>
      {/* checkered marble floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[S2_W, S2_LEN]} />
        <meshStandardMaterial map={checker} metalness={0.55} roughness={0.25} />
      </mesh>
      {/* ceiling — dark concrete */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, S2_H, 0]}>
        <planeGeometry args={[S2_W, S2_LEN]} />
        <meshStandardMaterial color="#0d0d10" roughness={1} />
      </mesh>
      {/* side walls — dark stone with pilasters */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * S2_W / 2, S2_H / 2, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[S2_LEN, S2_H]} />
            <meshStandardMaterial color="#1a1a1d" roughness={0.85} metalness={0.15} />
          </mesh>
          {/* pilasters between doors */}
          {Array.from({ length: S2_DOORS + 1 }).map((_, i) => {
            const z = -S2_LEN / 2 + DOOR_SPACING * i + DOOR_SPACING / 2 - DOOR_SPACING / 2;
            return (
              <mesh key={i} position={[s * (S2_W / 2 - 0.08), S2_H / 2, -S2_LEN / 2 + i * DOOR_SPACING]} castShadow>
                <boxGeometry args={[0.18, S2_H, 0.5]} />
                <meshStandardMaterial color="#2a2a2e" roughness={0.7} metalness={0.3} />
              </mesh>
            );
          })}
          {/* baseboard */}
          <mesh position={[s * (S2_W / 2 - 0.06), 0.2, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <planeGeometry args={[S2_LEN, 0.4]} />
            <meshStandardMaterial color="#e6e6ea" roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      ))}
      {/* end walls */}
      <mesh position={[0, S2_H / 2, -S2_LEN / 2]}>
        <planeGeometry args={[S2_W, S2_H]} />
        <meshStandardMaterial color="#0a0a0d" roughness={1} />
      </mesh>
      <mesh position={[0, S2_H / 2, S2_LEN / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[S2_W, S2_H]} />
        <meshStandardMaterial color="#0a0a0d" roughness={1} />
      </mesh>

      {/* single wall sconce — like in the reference image */}
      <group position={[0, S2_H - 0.5, -S2_LEN / 2 + 0.05]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.5, 16]} />
          <meshStandardMaterial color="#dcdce0" emissive="#ffffff" emissiveIntensity={1.8} />
        </mesh>
        <pointLight intensity={2.2} distance={14} color="#cfd6e0" decay={1.6} />
      </group>

      {/* very dim corridor light (~20cd feel) */}
      <ambientLight intensity={0.08} color="#5a6878" />
      <hemisphereLight args={["#6a7888", "#0a0a0d", 0.1]} />
      <fog attach="fog" args={["#000", 6, 38]} />

      {/* faint floor accent at each door */}
      {S2_DOOR_SLOTS.map((d, i) => (
        <pointLight key={i} position={[d.x * 0.5, 0.6, d.z]} intensity={0.35} distance={4.5} color="#9bbacf" decay={1.8} />
      ))}

      {/* doors */}
      {S2_DOOR_SLOTS.map((d, i) => (
        <Stage2Door key={i} pos={[d.x, 0, d.z]} rotY={d.side > 0 ? -Math.PI / 2 : Math.PI / 2} index={i + 1} />
      ))}
    </group>
  );
}

function Stage2Door({ pos, rotY, index }: { pos: [number, number, number]; rotY: number; index: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* dark recessed frame */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[1.7, 3.2, 0.12]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      {/* door slab */}
      <mesh position={[0, 1.5, 0.08]} castShadow>
        <boxGeometry args={[1.4, 2.9, 0.08]} />
        <meshStandardMaterial color="#1f1f24" metalness={0.5} roughness={0.55} />
      </mesh>
      {/* gold knob */}
      <mesh position={[0.5, 1.4, 0.14]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#d4a020" metalness={0.95} roughness={0.18} />
      </mesh>
      {/* lit number plate */}
      <mesh position={[0, 3.05, 0.13]}>
        <planeGeometry args={[0.42, 0.32]} />
        <meshBasicMaterial>
          <canvasTexture attach="map" args={[s2NumberCanvas(index)]} />
        </meshBasicMaterial>
      </mesh>
    </group>
  );
}

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

// ============ PLAYER CONTROLLER FOR STAGE 2 ============
export function Stage2PlayerController({ active, onNearDoor }: { active: boolean; onNearDoor: (idx: number | null) => void }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vy = useRef(0);
  const grounded = useRef(true);
  useEffect(() => {
    camera.position.set(0, 1.7, S2_LEN / 2 - 2);
    camera.lookAt(0, 1.6, -S2_LEN / 2);
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

    const halfW = S2_W / 2 - 0.4;
    const halfL = S2_LEN / 2 - 0.4;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -halfW, halfW);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfL, halfL);

    // nearest door
    let nearest = -1;
    let nd = 999;
    S2_DOOR_SLOTS.forEach((d, i) => {
      const dd = (camera.position.x - d.x) ** 2 + (camera.position.z - d.z) ** 2;
      if (dd < nd) { nd = dd; nearest = i; }
    });
    onNearDoor(nd < 6 ? nearest : null);
  });
  return null;
}

// ============ STAGE 2 SCENE ============
export function Stage2Scene() {
  return (
    <>
      <color attach="background" args={["#000"]} />
      <Stage2Corridor />
    </>
  );
}

// ============ WITCH BOSS VISUAL ============
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
      {/* cloak body */}
      <mesh castShadow>
        <coneGeometry args={[0.85, 2.0, 16]} />
        <meshStandardMaterial color="#1a0824" roughness={0.85} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial color="#a8c890" roughness={0.6} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.95, 0.32]} rotation={[Math.PI / 2.2, 0, 0]}>
        <coneGeometry args={[0.06, 0.28, 10]} />
        <meshStandardMaterial color="#8aa874" />
      </mesh>
      {/* eyes */}
      <mesh position={[-0.12, 1.06, 0.28]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#ffe066" emissive="#ffaa00" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.12, 1.06, 0.28]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#ffe066" emissive="#ffaa00" emissiveIntensity={2} />
      </mesh>
      {/* witch hat */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <coneGeometry args={[0.42, 0.95, 16]} />
        <meshStandardMaterial color="#0d0418" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 24]} />
        <meshStandardMaterial color="#0d0418" roughness={0.9} />
      </mesh>
      {/* hat buckle */}
      <mesh position={[0, 1.22, 0.55]}>
        <boxGeometry args={[0.14, 0.1, 0.02]} />
        <meshStandardMaterial color="#d4a020" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* hands holding staff */}
      <mesh position={[0.55, 0.4, 0.05]} castShadow>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#a8c890" />
      </mesh>
      <mesh position={[0.65, 0.6, 0.05]} rotation={[0, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
        <meshStandardMaterial color="#3a2510" />
      </mesh>
      {/* staff orb — crackles when she casts */}
      <mesh position={[0.85, 1.45, 0.05]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#a0d8ff" emissive="#5fb8ff" emissiveIntensity={2 + damaged * 2} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0.85, 1.45, 0.05]} intensity={1.4} distance={4} color="#a0d8ff" />
    </group>
  );
}

// ============ LIGHTNING BOLT ============
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

// Re-export PointerLockControls for convenience
export { PointerLockControls };
