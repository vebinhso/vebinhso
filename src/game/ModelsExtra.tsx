import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

function M({ c, m = 0.05, r = 0.7, e, ei = 0, o }: { c: string; m?: number; r?: number; e?: string; ei?: number; o?: number }) {
  return (
    <meshStandardMaterial color={c} metalness={m} roughness={r} emissive={e} emissiveIntensity={ei}
      transparent={o !== undefined} opacity={o ?? 1} />
  );
}

function useSpin(speed: number) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (ref.current) ref.current.rotation.z -= Math.min(d, 0.05) * speed; });
  return ref;
}

function woodTexture(base: string, line: string, diagonal = false) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = line; g.globalAlpha = 0.35;
  for (let i = 0; i < 60; i++) {
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    const y = Math.random() * 256;
    if (diagonal) { g.moveTo(i * 12 - 120, 256); g.lineTo(i * 12 + 60, 0); }
    else { g.moveTo(0, y); g.bezierCurveTo(170, y + 8, 340, y - 8, 512, y + 3); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// 1. PC cooling fan (chrome frame, 5 white blades, grill)
export function CoolingFan() {
  const spin = useSpin(6);
  const s = 1.7;
  return (
    <group position={[0, 1, 0]}>
      <RoundedBox args={[s, s, 0.35]} radius={0.06} smoothness={3} castShadow>
        <M c="#2a2d31" m={0.6} r={0.35} />
      </RoundedBox>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y], i) => (
        <mesh key={i} position={[x * s * 0.4, y * s * 0.4, 0.18]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
          <M c="#c9ced4" m={0.9} r={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.2]}>
        <torusGeometry args={[0.78, 0.07, 12, 48]} />
        <M c="#dfe3e8" m={0.95} r={0.12} />
      </mesh>
      <mesh position={[0, 0, -0.2]}>
        <torusGeometry args={[0.78, 0.05, 12, 48]} />
        <M c="#aeb4bb" m={0.9} r={0.2} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.76, 0.76, 0.34, 48, 1, true]} />
        <meshStandardMaterial color="#111" side={THREE.BackSide} roughness={0.6} />
      </mesh>
      <group ref={spin}>
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={i} rotation-z={(i / 5) * Math.PI * 2}>
            <mesh position={[0.43, 0, 0]} rotation={[0.45, 0, 0.2]} scale={[1, 0.55, 0.06]}>
              <sphereGeometry args={[0.36, 20, 12]} />
              <M c="#f2f4f6" m={0.1} r={0.25} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0, 0, 0.12]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.26, 0.26, 0.12, 32]} />
        <M c="#1b1d20" m={0.7} r={0.25} />
      </mesh>
      {[0.24, 0.42, 0.6, 0.76].map((r) => (
        <mesh key={r} position={[0, 0, 0.21]}>
          <torusGeometry args={[r, 0.008, 6, 48]} />
          <M c="#cfd4da" m={0.9} r={0.2} />
        </mesh>
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[0, 0, 0.21]} rotation-z={(i * Math.PI) / 4}>
          <boxGeometry args={[1.52, 0.012, 0.01]} />
          <M c="#cfd4da" m={0.9} r={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// 2. Walnut TV cabinet with grey glass fronts
export function WalnutTVCabinet() {
  const tex = useMemo(() => woodTexture("#6b3f24", "#2e170a"), []);
  const W = 4.8, H = 0.75, D = 1;
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[W * 0.7, 0.24, D * 0.7]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.24 + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      {[-1.55, 1.55].map((x) => (
        <mesh key={x} position={[x, 0.24 + H * 0.62, D / 2 + 0.006]}>
          <boxGeometry args={[1.5, H * 0.55, 0.01]} />
          <M c="#2c2f33" m={0.4} r={0.12} />
        </mesh>
      ))}
      <mesh position={[-1.55, 0.24 + H * 0.2, D / 2 + 0.006]}>
        <boxGeometry args={[1.5, H * 0.3, 0.01]} />
        <M c="#5a5e63" m={0.3} r={0.2} />
      </mesh>
      <mesh position={[1.55, 0.24 + H * 0.2, D / 2 + 0.006]}>
        <boxGeometry args={[1.5, H * 0.3, 0.01]} />
        <meshStandardMaterial map={tex} roughness={0.5} color="#c8a080" />
      </mesh>
      <mesh position={[0, 0.24 + H * 0.68, D / 2 - 0.2]}>
        <boxGeometry args={[1.5, H * 0.45, 0.45]} />
        <M c="#1a0f08" r={0.9} />
      </mesh>
      <mesh position={[0, 0.24 + H * 0.24, D / 2 + 0.006]}>
        <boxGeometry args={[1.5, H * 0.34, 0.01]} />
        <M c="#4b4f54" m={0.3} r={0.25} />
      </mesh>
    </group>
  );
}

// 3. Large smart TV on slim pedestal showing a city skyline
export function SmartTV() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 576;
    const g = c.getContext("2d")!;
    const sky = g.createLinearGradient(0, 0, 0, 576);
    sky.addColorStop(0, "#3b6a99"); sky.addColorStop(0.45, "#9db8cf"); sky.addColorStop(0.6, "#e7c99b"); sky.addColorStop(1, "#2a2a35");
    g.fillStyle = sky; g.fillRect(0, 0, 1024, 576);
    g.globalAlpha = 0.5; g.fillStyle = "#ffffff";
    for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(Math.random() * 1024, 60 + Math.random() * 180, 120, 18, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    for (let i = 0; i < 90; i++) {
      const w = 18 + Math.random() * 40, h = 60 + Math.random() * (i % 7 === 0 ? 300 : 160);
      const x = Math.random() * 1024, y = 576 - h;
      g.fillStyle = ["#2d3340", "#3c3f4a", "#4a4d58", "#262a33"][i % 4];
      g.fillRect(x, y, w, h);
      g.fillStyle = "#ffcf7a";
      for (let k = 0; k < 18; k++) g.fillRect(x + 3 + Math.random() * (w - 6), y + 4 + Math.random() * (h - 8), 2, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, []);
  const W = 3.8, H = 2.15;
  return (
    <group>
      <RoundedBox args={[1.4, 0.06, 0.55]} radius={0.02} position={[0, 0.03, 0]} castShadow>
        <M c="#2b2d31" m={0.7} r={0.3} />
      </RoundedBox>
      <mesh position={[0, 0.2, -0.05]} castShadow>
        <boxGeometry args={[0.35, 0.3, 0.06]} />
        <M c="#3a3c40" m={0.7} r={0.3} />
      </mesh>
      <group position={[0, 0.3 + H / 2, 0]}>
        <RoundedBox args={[W, H, 0.08]} radius={0.02} castShadow>
          <M c="#4a4c50" m={0.75} r={0.3} />
        </RoundedBox>
        <mesh position={[0, 0, 0.042]}>
          <planeGeometry args={[W - 0.08, H - 0.08]} />
          <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.5} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

// 4. White pedestal standing fan with round grill and control base
export function StandingFan() {
  const spin = useSpin(9);
  return (
    <group>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.64, 0.16, 40]} />
        <M c="#ecebe7" r={0.35} />
      </mesh>
      <mesh position={[0.2, 0.161, 0.38]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.22, 0.08]} />
        <M c="#1e1e1e" e="#ff7a3a" ei={0.3} r={0.2} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 2, 20]} />
        <M c="#efeeea" r={0.35} />
      </mesh>
      <group position={[0, 2.35, 0.1]} rotation-x={-0.08}>
        <mesh rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.28, 48, 1, true]} />
          <meshStandardMaterial color="#f1f0ec" roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, -0.16]}>
          <cylinderGeometry args={[0.22, 0.22, 0.2, 24]} />
          <M c="#e9e8e4" r={0.4} />
        </mesh>
        {[0.14, 0.15].map((z, k) => (
          <group key={k} position={[0, 0, k ? -z : z]}>
            {[0.2, 0.35, 0.5].map((r) => (
              <mesh key={r}><torusGeometry args={[r, 0.008, 6, 48]} /><M c="#e2e1dd" r={0.4} /></mesh>
            ))}
            {Array.from({ length: 18 }).map((_, i) => (
              <mesh key={i} rotation-z={(i / 18) * Math.PI * 2 + (k ? 0 : 0.2)} position={[0, 0, 0]}>
                <boxGeometry args={[0.01, 1.08, 0.006]} />
                <M c="#e2e1dd" r={0.4} />
              </mesh>
            ))}
          </group>
        ))}
        <group ref={spin}>
          {Array.from({ length: 7 }).map((_, i) => (
            <group key={i} rotation-z={(i / 7) * Math.PI * 2}>
              <mesh position={[0.26, 0, 0]} rotation={[0.5, 0, 0.3]} scale={[1, 0.35, 0.05]}>
                <sphereGeometry args={[0.24, 16, 10]} />
                <M c="#f5f4f0" r={0.3} />
              </mesh>
            </group>
          ))}
        </group>
        <mesh position={[0, 0, 0.16]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.08, 0.08, 0.03, 24]} />
          <M c="#f7f6f2" r={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// 5. Black modular 3-seat sofa
export function BlackModularSofa() {
  const fab = "#26272b", fab2 = "#1d1e21";
  const W = 4.8, D = 1.8;
  return (
    <group>
      <RoundedBox args={[W, 0.45, D]} radius={0.05} smoothness={3} position={[0, 0.25, 0]} castShadow>
        <M c={fab2} r={0.9} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.55, 0.95, D]} radius={0.07} smoothness={3} position={[s * (W / 2 - 0.275), 0.5, 0]} castShadow>
          <M c={fab} r={0.92} />
        </RoundedBox>
      ))}
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[i * 1.23, 0, 0]}>
          <RoundedBox args={[1.2, 0.32, 1.3]} radius={0.08} smoothness={3} position={[0, 0.63, 0.2]} castShadow>
            <M c={fab} r={0.92} />
          </RoundedBox>
          <RoundedBox args={[1.2, 0.7, 0.45]} radius={0.1} smoothness={3} position={[0, 0.95, -0.62]} rotation-x={-0.08} castShadow>
            <M c={fab} r={0.92} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

// 6. Oak TV cabinet: 2 herringbone doors + 2 grey drawers
export function OakTVCabinet() {
  const tex = useMemo(() => woodTexture("#b98a52", "#7a5228"), []);
  const diag = useMemo(() => woodTexture("#a8783f", "#6e4520", true), []);
  const W = 4.8, H = 0.85, D = 1;
  return (
    <group>
      {[-1.9, 1.9].map((x) => (
        <mesh key={x} position={[x, 0.12, 0]} castShadow>
          <boxGeometry args={[0.1, 0.24, D * 0.8]} />
          <meshStandardMaterial map={tex} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.24 + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      {[-1.75, -0.6].map((x) => (
        <mesh key={x} position={[x, 0.24 + H / 2, D / 2 + 0.008]}>
          <boxGeometry args={[1.12, H - 0.12, 0.015]} />
          <meshStandardMaterial map={diag} roughness={0.55} />
        </mesh>
      ))}
      {[0.27, 0.73].map((f) => (
        <mesh key={f} position={[1.45, 0.24 + H * f, D / 2 + 0.008]}>
          <boxGeometry args={[1.6, H * 0.42, 0.015]} />
          <M c="#c9cdd0" r={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// 7. White storage unit: low open shelves + tall 2-door cabinet, oak tops
export function WhiteStorageCabinet() {
  const oak = useMemo(() => woodTexture("#c9a46a", "#9b7640"), []);
  const white = "#f1f1ef";
  return (
    <group>
      {/* low open shelf */}
      <group position={[-0.9, 0, 0]}>
        <mesh position={[0, 0.6, -0.48]}><boxGeometry args={[3, 1.2, 0.04]} /><M c="#e6e6e3" r={0.8} /></mesh>
        {[-1.48, 0, 1.48].map((x) => (
          <mesh key={x} position={[x, 0.6, 0]} castShadow><boxGeometry args={[0.05, 1.2, 1]} /><M c={white} r={0.7} /></mesh>
        ))}
        {[0.03, 0.62].map((y) => (
          <mesh key={y} position={[0, y, 0]}><boxGeometry args={[3, 0.05, 1]} /><M c={white} r={0.7} /></mesh>
        ))}
        <mesh position={[0, 1.23, 0]} castShadow><boxGeometry args={[3.04, 0.07, 1.04]} /><meshStandardMaterial map={oak} roughness={0.55} /></mesh>
      </group>
      {/* tall cabinet */}
      <group position={[1.6, 0, 0]}>
        <mesh position={[0, 0.98, 0]} castShadow receiveShadow><boxGeometry args={[1.95, 1.96, 1]} /><M c={white} r={0.7} /></mesh>
        {Array.from({ length: 16 }).map((_, i) => (
          <mesh key={i} position={[-0.92 + i * 0.123, 0.98, 0.505]}><boxGeometry args={[0.006, 1.9, 0.006]} /><M c="#d5d5d2" r={0.8} /></mesh>
        ))}
        <mesh position={[0, 0.98, 0.506]}><boxGeometry args={[0.01, 1.9, 0.01]} /><M c="#bdbdba" /></mesh>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 1.25, 0.54]}><capsuleGeometry args={[0.015, 0.22, 4, 8]} /><M c="#1b1b1b" m={0.6} r={0.3} /></mesh>
        ))}
        <mesh position={[0, 1.995, 0]} castShadow><boxGeometry args={[1.99, 0.07, 1.04]} /><meshStandardMaterial map={oak} roughness={0.55} /></mesh>
      </group>
    </group>
  );
}

// 8. Classic round café table: scalloped cream top, blue-gold rim, gilded legs
export function CafeTable() {
  const top = useMemo(() => {
    const s = new THREE.Shape();
    const N = 16;
    for (let i = 0; i <= N * 8; i++) {
      const a = (i / (N * 8)) * Math.PI * 2;
      const r = 1.4 + 0.05 * Math.abs(Math.cos((a * N) / 2));
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    return s;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.82, 0]} rotation-x={-Math.PI / 2} castShadow>
        <extrudeGeometry args={[top, { depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }]} />
        <M c="#efe6d6" r={0.5} />
      </mesh>
      <mesh position={[0, 0.965, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.12, 1.24, 64]} />
        <M c="#8aa4c4" m={0.2} r={0.4} />
      </mesh>
      {[1.1, 1.26].map((r) => (
        <mesh key={r} position={[0, 0.968, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[r - 0.015, r, 64]} />
          <M c="#c9a24a" m={0.8} r={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.966, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.1, 64]} />
        <M c="#f2e8d8" r={0.55} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.75, 16]} />
        <M c="#c49a3e" m={0.75} r={0.3} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <octahedronGeometry args={[0.2]} />
        <M c="#5fa0a0" m={0.3} r={0.3} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={i} rotation-y={(i * Math.PI) / 2 + Math.PI / 4}>
          <mesh position={[0.4, 0.12, 0]} rotation-z={0.35} castShadow>
            <boxGeometry args={[0.85, 0.09, 0.12]} />
            <M c="#c49a3e" m={0.75} r={0.3} />
          </mesh>
          <mesh position={[0.35, 0.6, 0]} rotation-z={-0.7}>
            <boxGeometry args={[0.6, 0.07, 0.08]} />
            <M c="#b88e34" m={0.75} r={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// 9. 3D hologram fan: clear acrylic dome, black LED arm, black stand
export function HologramFan() {
  const spin = useSpin(14);
  return (
    <group>
      <mesh position={[0, 0.03, 0]} scale={[1, 1, 0.75]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.06, 40]} />
        <M c="#18181a" m={0.5} r={0.5} />
      </mesh>
      <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.07, 0.07, 0.04, 20]} /><M c="#9a9a9a" m={0.9} r={0.2} /></mesh>
      <mesh position={[0, 0.65, 0]} castShadow><cylinderGeometry args={[0.045, 0.045, 1.2, 16]} /><M c="#18181a" m={0.4} r={0.5} /></mesh>
      <group position={[0, 1.75, 0]}>
        <mesh position={[0, -0.5, -0.06]}><boxGeometry args={[0.07, 0.6, 0.03]} /><M c="#2a2a2c" m={0.5} r={0.4} /></mesh>
        <mesh scale={[1, 1, 0.22]}>
          <sphereGeometry args={[0.8, 40, 20]} />
          <M c="#dbe7f2" m={0.1} r={0.05} o={0.22} />
        </mesh>
        <mesh><torusGeometry args={[0.8, 0.012, 8, 64]} /><M c="#e8eef4" r={0.1} o={0.6} /></mesh>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.24, 0.24, 0.12, 32]} /><M c="#141414" m={0.4} r={0.3} /></mesh>
        <group ref={spin} position={[0, 0, 0.07]}>
          <mesh><boxGeometry args={[1.45, 0.11, 0.02]} /><M c="#161616" r={0.4} /></mesh>
          <mesh position={[0, -0.04, 0.012]}>
            <boxGeometry args={[1.4, 0.015, 0.005]} />
            <M c="#d9f0c0" e="#9cff7a" ei={1.2} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// 10. Octagonal wooden wall clock with Roman numerals
export function OctagonClock() {
  const face = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#e6e4d8"; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#6b6a62"; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = 256 + Math.cos(a) * 140, y = 256 + Math.sin(a) * 140;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    const nums = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
    g.fillStyle = "#1a1a1a"; g.font = "bold 46px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
    nums.forEach((n, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      g.save(); g.translate(256 + Math.cos(a) * 198, 256 + Math.sin(a) * 198); g.rotate(a + Math.PI / 2);
      g.fillText(n, 0, 0); g.restore();
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, []);
  const wood = useMemo(() => woodTexture("#b0602c", "#6a3212"), []);
  return (
    <group position={[0, 1.6, -0.02]}>
      <mesh rotation={[Math.PI / 2, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.1, 8]} />
        <meshStandardMaterial map={wood} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.052]}>
        <circleGeometry args={[0.47, 8, Math.PI / 8]} />
        <meshStandardMaterial map={face} roughness={0.6} />
      </mesh>
      {/* hands at 2:05 like the photo */}
      <mesh position={[0.08, 0.05, 0.06]} rotation-z={-Math.PI / 3 + Math.PI / 2 - Math.PI / 2 + 0.95}>
        <boxGeometry args={[0.2, 0.025, 0.005]} />
        <M c="#111" />
      </mesh>
      <mesh position={[0, 0.17, 0.065]}>
        <boxGeometry args={[0.012, 0.34, 0.005]} />
        <M c="#111" />
      </mesh>
      <mesh position={[0.1, 0.11, 0.068]} rotation-z={-0.75}>
        <boxGeometry args={[0.006, 0.32, 0.004]} />
        <M c="#111" />
      </mesh>
      <mesh position={[0, 0, 0.07]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 16]} />
        <M c="#c9a24a" m={0.9} r={0.2} />
      </mesh>
    </group>
  );
}
