import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

function M({ c, m = 0.05, r = 0.7, e, ei = 0 }: { c: string; m?: number; r?: number; e?: string; ei?: number }) {
  return <meshStandardMaterial color={c} metalness={m} roughness={r} emissive={e} emissiveIntensity={ei} />;
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function leaf(g: CanvasRenderingContext2D, x: number, y: number, s: number, a: number, col: string, vein = "#e8efc8") {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = col; g.beginPath();
  g.moveTo(0, 0); g.bezierCurveTo(s * 0.6, -s * 0.5, s * 0.6, -s * 1.4, 0, -s * 1.8);
  g.bezierCurveTo(-s * 0.6, -s * 1.4, -s * 0.6, -s * 0.5, 0, 0); g.fill();
  g.strokeStyle = vein; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * 1.75); g.stroke();
  g.lineWidth = 2;
  for (let i = 1; i < 8; i++) { const yy = -s * 0.22 * i; g.beginPath(); g.moveTo(0, yy); g.lineTo(s * 0.4, yy - s * 0.18); g.moveTo(0, yy); g.lineTo(-s * 0.4, yy - s * 0.18); g.stroke(); }
  g.restore();
}

function parrot(g: CanvasRenderingContext2D, x: number, y: number, s: number, body: string, dark: string, beak: string) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = dark; g.beginPath(); g.moveTo(-8, 40); g.lineTo(10, 150); g.lineTo(22, 145); g.lineTo(14, 40); g.fill();
  g.fillStyle = body; g.beginPath(); g.ellipse(0, 10, 26, 48, 0.15, 0, Math.PI * 2); g.fill();
  g.fillStyle = dark; g.beginPath(); g.ellipse(8, 20, 16, 38, 0.25, 0, Math.PI * 2); g.fill();
  g.fillStyle = body; g.beginPath(); g.arc(-4, -40, 20, 0, Math.PI * 2); g.fill();
  g.fillStyle = beak; g.beginPath(); g.moveTo(-20, -44); g.quadraticCurveTo(-36, -36, -24, -24); g.lineTo(-16, -34); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(-10, -46, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(-10, -46, 2.5, 0, Math.PI * 2); g.fill();
  g.restore();
}

function FramedCanvas({ w, h, tex, frame = "#c9a26b", depth = 0.14 }: { w: number; h: number; tex: THREE.Texture; frame?: string; depth?: number }) {
  const t = 0.08;
  return (
    <group position={[0, 1.7, -0.02]}>
      <mesh position={[0, 0, -0.01]}><boxGeometry args={[w - 0.04, h - 0.04, depth * 0.7]} /><M c="#4a3a2a" r={0.9} /></mesh>
      <mesh position={[0, 0, depth * 0.35 - 0.005]}><planeGeometry args={[w - 0.06, h - 0.06]} /><meshStandardMaterial map={tex} roughness={0.85} /></mesh>
      {[
        [0, h / 2 + t / 2, w + t * 2, t],
        [0, -h / 2 - t / 2, w + t * 2, t],
        [w / 2 + t / 2, 0, t, h],
        [-w / 2 - t / 2, 0, t, h],
      ].map(([x, y, sw, sh], i) => (
        <mesh key={i} position={[x, y, 0]} castShadow><boxGeometry args={[sw, sh, depth]} /><M c={frame} r={0.6} /></mesh>
      ))}
    </group>
  );
}

// 1. Tropical parrot canvas in floating oak frame
export function ParrotCanvas() {
  const tex = useMemo(() => canvasTex(1200, 800, (g) => {
    g.fillStyle = "#e4e2d9"; g.fillRect(0, 0, 1200, 800);
    const greens = ["#7aa23a", "#9cbf4a", "#5d8a2d", "#b5cf6a", "#4f7a26"];
    for (let i = 0; i < 26; i++) leaf(g, (i * 211) % 1250, 120 + ((i * 337) % 760), 90 + (i % 4) * 30, (i * 1.7) % 6.28, greens[i % 5]);
    parrot(g, 600, 380, 1.7, "#3a6fd1", "#2a4fa8", "#222");
    parrot(g, 1060, 160, 1.4, "#3a6fd1", "#2a4fa8", "#222");
    parrot(g, 200, 260, 1.4, "#62b544", "#3d8a2e", "#d23a3a");
    parrot(g, 880, 470, 1.3, "#62b544", "#3d8a2e", "#d23a3a");
  }), []);
  return <FramedCanvas w={2.4} h={1.6} tex={tex} />;
}

// 2. Toucan canvas, pink background
export function ToucanCanvas() {
  const tex = useMemo(() => canvasTex(900, 720, (g) => {
    g.fillStyle = "#ead1cf"; g.fillRect(0, 0, 900, 720);
    const flower = (x: number, y: number) => {
      g.fillStyle = "#2fb3a3"; g.beginPath(); g.arc(x, y, 62, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff";
      for (let i = 0; i < 12; i++) { g.save(); g.translate(x, y); g.rotate((i / 12) * Math.PI * 2); g.beginPath(); g.ellipse(0, -30, 9, 22, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.fillStyle = "#f2a51f"; g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
    };
    [[360, 140], [640, 430], [220, 620]].forEach(([x, y]) => flower(x, y));
    const lf = (x: number, y: number, a: number) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = "#1f9c86"; g.beginPath(); g.ellipse(0, 0, 22, 48, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
    [[250, 330, 0.6], [400, 330, -0.4], [470, 600, 0.5], [560, 580, -0.6], [620, 300, 0.3], [180, 450, -0.5]].forEach(([x, y, a]) => lf(x, y, a));
    const toucan = (x: number, y: number, s: number) => {
      g.save(); g.translate(x, y); g.scale(s, s);
      g.fillStyle = "#1f2d4f"; g.beginPath(); g.ellipse(0, 40, 70, 110, 0.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(40, 120); g.lineTo(150, 230); g.lineTo(120, 240); g.lineTo(10, 140); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.ellipse(-20, -40, 34, 46, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f6b52c"; g.beginPath(); g.moveTo(0, -80); g.quadraticCurveTo(130, -110, 150, -60); g.quadraticCurveTo(80, -45, 5, -40); g.fill();
      g.fillStyle = "#1f2d4f"; g.beginPath(); g.arc(-8, -70, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f08a2b"; g.beginPath(); g.arc(20, 40, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#2fb3a3"; g.beginPath(); g.arc(-20, 80, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f6b52c"; g.beginPath(); g.arc(30, 100, 12, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    toucan(560, 230, 1); toucan(260, 450, 0.85);
    g.strokeStyle = "#1f9c86"; g.lineWidth = 8;
    g.beginPath(); g.moveTo(420, 370); g.lineTo(700, 360); g.stroke();
    g.beginPath(); g.moveTo(160, 560); g.lineTo(460, 545); g.stroke();
  }), []);
  return <FramedCanvas w={2} h={1.6} tex={tex} frame="#cfa66e" />;
}

// 3. Black textured subwoofer on isolation base with chrome pillars
export function Subwoofer() {
  return (
    <group>
      <RoundedBox args={[1.5, 0.08, 1.5]} radius={0.03} position={[0, 0.04, 0]} castShadow>
        <M c="#1c1c1e" r={0.95} />
      </RoundedBox>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.55, 0.16, z * 0.55]}>
          <cylinderGeometry args={[0.05, 0.05, 0.16, 16]} />
          <M c="#c9ccd0" m={0.95} r={0.15} />
        </mesh>
      ))}
      <RoundedBox args={[1.3, 1.4, 1.3]} radius={0.12} smoothness={2} position={[0, 0.94, 0]} castShadow>
        <M c="#232325" r={0.98} />
      </RoundedBox>
      <mesh position={[-0.35, 0.45, 0.652]}><planeGeometry args={[0.16, 0.18]} /><M c="#6cc23a" r={0.4} /></mesh>
    </group>
  );
}

// 4. Abstract mid-century art in oak frame with mat
export function AbstractFrameArt() {
  const tex = useMemo(() => canvasTex(600, 900, (g) => {
    g.fillStyle = "#efe4d0"; g.fillRect(0, 0, 600, 900);
    const cols = ["#d8892f", "#1e5f7a", "#7fb8b8", "#b8622c", "#e9c27a", "#2c7f7a", "#c8432f", "#f3e2c3"];
    const arc = (x: number, y: number, r: number, a0: number, a1: number, c: string) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a0, a1); g.fill(); };
    arc(420, 120, 260, Math.PI * 0.5, Math.PI * 1.1, cols[1]);
    arc(60, 80, 260, 0, Math.PI * 0.5, cols[0]);
    arc(300, 450, 300, Math.PI, Math.PI * 1.5, cols[3]);
    arc(560, 420, 200, Math.PI * 0.9, Math.PI * 1.6, cols[4]);
    arc(560, 420, 120, Math.PI * 0.9, Math.PI * 1.6, cols[1]);
    for (let i = 0; i < 8; i++) arc(130, 900, 330 - i * 38, Math.PI, Math.PI * 2, i % 2 ? cols[5] : cols[2]);
    for (let i = 0; i < 7; i++) arc(470, 900, 280 - i * 38, Math.PI, Math.PI * 2, i % 2 ? cols[7] : cols[4]);
    arc(0, 720, 80, -Math.PI / 2, Math.PI / 2, cols[6]);
  }), []);
  const w = 1.2, h = 1.8;
  return (
    <group position={[0, 1.7, -0.02]}>
      <mesh position={[0, 0, -0.02]} castShadow><boxGeometry args={[w + 0.24, h + 0.24, 0.1]} /><M c="#c39a64" r={0.55} /></mesh>
      <mesh position={[0, 0, 0.032]}><planeGeometry args={[w, h]} /><M c="#f2ead9" r={0.9} /></mesh>
      <mesh position={[0, 0, 0.034]}><planeGeometry args={[w * 0.8, h * 0.82]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
    </group>
  );
}

// 5. Olive tufted leather sofa set: loveseat + 3-seater + ottoman
function Tufted({ w, d, h, c }: { w: number; d: number; h: number; c: string }) {
  const cols = Math.max(2, Math.round(w / 0.35)), rows = Math.max(2, Math.round(d / 0.35));
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.08} smoothness={3}><M c={c} r={0.4} m={0.1} /></RoundedBox>
      {Array.from({ length: (cols - 1) * (rows - 1) }).map((_, i) => {
        const cx = (i % (cols - 1)) + 1, cz = Math.floor(i / (cols - 1)) + 1;
        return (
          <mesh key={i} position={[-w / 2 + (cx * w) / cols, h / 2 + 0.001, -d / 2 + (cz * d) / rows]}>
            <sphereGeometry args={[0.025, 8, 6]} /><M c="#4d5520" r={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
export function OliveSofaSet() {
  const c = "#7d8a32";
  const sofa = (len: number) => (
    <group>
      <group position={[0, 0.35, 0]}><Tufted w={len} d={1.1} h={0.5} c={c} /></group>
      <RoundedBox args={[len + 0.3, 0.9, 0.3]} radius={0.08} position={[0, 0.65, -0.6]} castShadow><M c={c} r={0.45} m={0.1} /></RoundedBox>
      {Array.from({ length: Math.round(len / 1.2) }).map((_, i, a) => (
        <group key={i} position={[-len / 2 + (len / a.length) * (i + 0.5), 0.95, -0.35]} rotation-x={-0.25}>
          <Tufted w={len / a.length - 0.08} d={0.22} h={0.55} c="#8a9838" />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.25, 0.75, 1.4]} radius={0.08} position={[s * (len / 2 + 0.12), 0.45, -0.1]} castShadow><M c={c} r={0.45} m={0.1} /></RoundedBox>
      ))}
    </group>
  );
  return (
    <group>
      <group position={[-1.6, 0, -0.5]} rotation-y={0.25}>{sofa(2.2)}</group>
      <group position={[1.4, 0, -0.9]}>{sofa(3)}</group>
      <group position={[0.2, 0.32, 0.9]}><Tufted w={1.3} d={1} h={0.5} c={c} /></group>
    </group>
  );
}

// 6. Round walnut-framed wall clock with Arabic numerals
export function RoundWoodClock() {
  const face = useMemo(() => canvasTex(512, 512, (g) => {
    g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#151515";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, L = i % 5 === 0 ? 22 : 10;
      g.save(); g.translate(256, 256); g.rotate(a); g.fillRect(-2, -240, 4, L); g.restore();
    }
    g.font = "bold 62px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let n = 1; n <= 12; n++) { const a = (n / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(String(n), 256 + Math.cos(a) * 180, 256 + Math.sin(a) * 180); }
  }), []);
  return (
    <group position={[0, 1.7, 0]}>
      <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.55, 0.55, 0.1, 48]} /><M c="#6a3a1c" r={0.4} /></mesh>
      <mesh position={[0, 0, 0.05]}><torusGeometry args={[0.5, 0.05, 16, 48]} /><M c="#7a4524" r={0.35} /></mesh>
      <mesh position={[0, 0, 0.051]}><circleGeometry args={[0.47, 48]} /><meshStandardMaterial map={face} roughness={0.5} /></mesh>
      {/* 10:10 */}
      <mesh position={[-0.1, 0.05, 0.06]} rotation-z={Math.PI / 2 - 0.45 + Math.PI / 2 - Math.PI / 2 + 0.05}><boxGeometry args={[0.24, 0.03, 0.005]} /><M c="#111" /></mesh>
      <mesh position={[0.14, 0.09, 0.065]} rotation-z={0.55}><boxGeometry args={[0.34, 0.022, 0.005]} /><M c="#111" /></mesh>
      <mesh position={[0, 0, 0.07]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, 0.02, 16]} /><M c="#111" /></mesh>
    </group>
  );
}

// 7. Retro desk fan: pastel blue body, orange blades, chrome grill, coiled cord
export function RetroDeskFan() {
  const spin = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (spin.current) spin.current.rotation.z -= Math.min(d, 0.05) * 10; });
  const blue = "#9fd3dc", orange = "#f2a531";
  return (
    <group>
      <RoundedBox args={[1.1, 0.16, 0.75]} radius={0.07} position={[0, 0.1, 0]} castShadow><M c={blue} r={0.25} /></RoundedBox>
      <mesh position={[0, 0.02, 0]}><boxGeometry args={[1.12, 0.03, 0.77]} /><M c={orange} r={0.35} /></mesh>
      <mesh position={[0, 0.185, 0.18]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.6, 0.18]} /><M c="#efe6d2" r={0.5} /></mesh>
      <mesh position={[0.12, 0.22, 0.2]}><cylinderGeometry args={[0.05, 0.05, 0.05, 16]} /><M c={orange} r={0.3} /></mesh>
      {[-0.22, -0.12].map((x) => (
        <mesh key={x} position={[x, 0.22, 0.2]}><boxGeometry args={[0.03, 0.06, 0.03]} /><M c="#ddd" m={0.8} r={0.2} /></mesh>
      ))}
      <mesh position={[0, 0.45, -0.05]} castShadow><cylinderGeometry args={[0.1, 0.2, 0.5, 24]} /><M c={blue} r={0.25} /></mesh>
      <group position={[0, 1.1, 0]}>
        <mesh position={[0, 0, -0.25]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.18, 0.22, 0.3, 24]} /><M c={blue} r={0.25} /></mesh>
        <mesh position={[0.24, 0, -0.25]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.08, 0.08, 0.1, 20]} /><M c="#f2f2ee" r={0.4} /></mesh>
        <mesh><torusGeometry args={[0.55, 0.05, 12, 48]} /><M c={blue} r={0.25} /></mesh>
        {[0.06, -0.06].map((z) => (
          <group key={z} position={[0, 0, z]}>
            {[0.18, 0.36, 0.52].map((r) => <mesh key={r}><torusGeometry args={[r, 0.006, 6, 48]} /><M c="#d8dcdf" m={0.9} r={0.15} /></mesh>)}
            {Array.from({ length: 16 }).map((_, i) => (
              <mesh key={i} rotation-z={(i / 16) * Math.PI}><boxGeometry args={[1.06, 0.008, 0.006]} /><M c="#d8dcdf" m={0.9} r={0.15} /></mesh>
            ))}
          </group>
        ))}
        <group ref={spin}>
          {Array.from({ length: 4 }).map((_, i) => (
            <group key={i} rotation-z={(i / 4) * Math.PI * 2}>
              <mesh position={[0.27, 0, 0]} rotation-x={0.4} scale={[1, 0.75, 0.06]}><sphereGeometry args={[0.24, 20, 12]} /><M c={orange} r={0.3} /></mesh>
            </group>
          ))}
        </group>
        <mesh position={[0, 0, 0.08]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.12, 0.12, 0.06, 24]} /><M c={orange} r={0.25} /></mesh>
      </group>
    </group>
  );
}

// 8. Plank-top round wooden table on 3 splayed legs
export function PlankRoundTable() {
  return (
    <group>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow><cylinderGeometry args={[1.3, 1.3, 0.1, 48]} /><M c="#c27a3e" r={0.6} /></mesh>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 1.001, 0]} rotation={[-Math.PI / 2, 0, 0.12]}><planeGeometry args={[0.012, 2.5]} /><M c="#7a4420" /></mesh>
      ))}
      <mesh position={[0, 0.85, 0]}><cylinderGeometry args={[1.25, 1.25, 0.08, 48]} /><M c="#a5622e" r={0.65} /></mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.75, 0.42, Math.sin(a) * 0.75]} rotation={[Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2]} castShadow>
            <cylinderGeometry args={[0.06, 0.035, 0.9, 12]} /><M c="#b06c34" r={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

// 9. Smart TV with app-launcher home screen on silver bar stand
export function SmartHomeTV() {
  const tex = useMemo(() => canvasTex(1280, 720, (g) => {
    const bg = g.createLinearGradient(0, 0, 1280, 720);
    bg.addColorStop(0, "#1d4f7a"); bg.addColorStop(0.5, "#2f78a8"); bg.addColorStop(1, "#2a2350");
    g.fillStyle = bg; g.fillRect(0, 0, 1280, 720);
    for (let i = 0; i < 30; i++) { g.globalAlpha = 0.15; g.fillStyle = "#bfe6ff"; g.beginPath(); g.arc(Math.random() * 1280, Math.random() * 300, 20 + Math.random() * 50, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.fillStyle = "#fff";
    for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(240 + i * 140, 90, 22, 0, Math.PI * 2); g.lineWidth = 5; g.strokeStyle = "#e6f3ff"; g.stroke(); }
    const rooms = ["#8a8580", "#c9c2b8", "#9c6b45", "#d8cfc2", "#e8e6e3", "#a8794d"];
    rooms.forEach((c, i) => {
      const x = 110 + i * 190;
      g.fillStyle = c; g.fillRect(x, 170, 175, 150);
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 20, 250, 135, 40);
      g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(x, 290, 175, 30);
    });
    g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(110, 400, 1120, 3);
    const apps = ["#1aa7e8", "#e08a2a", "#ffffff", "#ffffff", "#e010d8", "#8fb0f5"];
    apps.forEach((c, i) => {
      const x = 110 + i * 190;
      g.fillStyle = c; g.fillRect(x, 430, 180, 120);
      if (c === "#ffffff") { g.fillStyle = "#e50914"; g.fillRect(x + 30, 480, 120, 22); }
      else { g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(x + 90, 490, 26, 0, Math.PI * 2); g.fill(); }
    });
    g.fillStyle = "rgba(10,20,40,0.55)"; g.fillRect(60, 590, 1170, 90);
  }), []);
  const W = 3.8, H = 2.15;
  return (
    <group>
      <RoundedBox args={[2.6, 0.05, 0.45]} radius={0.02} position={[0, 0.03, 0.05]} castShadow><M c="#c8ccd2" m={0.9} r={0.2} /></RoundedBox>
      <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.3, 0.16, 0.08]} /><M c="#aeb3ba" m={0.9} r={0.2} /></mesh>
      <group position={[0, 0.2 + H / 2, 0]}>
        <RoundedBox args={[W, H, 0.07]} radius={0.02} castShadow><M c="#1a1b1e" m={0.6} r={0.3} /></RoundedBox>
        <mesh position={[0, -H / 2 + 0.01, 0]}><boxGeometry args={[W, 0.03, 0.075]} /><M c="#d3d7dc" m={0.9} r={0.2} /></mesh>
        <mesh position={[0, 0.01, 0.037]}><planeGeometry args={[W - 0.08, H - 0.08]} /><meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.55} roughness={0.25} /></mesh>
      </group>
    </group>
  );
}
