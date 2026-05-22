// Models 3D chi tiết, PBR (metalness/roughness) — hướng tả thực cartoon
import type { CatalogItem } from "./catalog";

function MStd({ color, metalness = 0.05, roughness = 0.75, emissive, emissiveIntensity = 0 }: any) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

export function Tree() {
  return (
    <group>
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.2, 0.28, 1.4, 12]} />
        <MStd color="#5b3318" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.85, 20, 18]} />
        <MStd color="#22c55e" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.4, 2.2, 0.15]}>
        <sphereGeometry args={[0.55, 16, 14]} />
        <MStd color="#16a34a" />
      </mesh>
      <mesh castShadow position={[-0.35, 2.2, -0.25]}>
        <sphereGeometry args={[0.6, 16, 14]} />
        <MStd color="#15803d" />
      </mesh>
    </group>
  );
}

export function BigTree() {
  return (
    <group>
      <mesh castShadow position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.3, 0.45, 2.4, 14]} />
        <MStd color="#5b3318" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 3, 0]}>
        <sphereGeometry args={[1.4, 22, 20]} />
        <MStd color="#16a34a" />
      </mesh>
      <mesh castShadow position={[0.8, 3.2, 0.3]}>
        <sphereGeometry args={[0.9, 18, 16]} />
        <MStd color="#15803d" />
      </mesh>
      <mesh castShadow position={[-0.7, 3.3, -0.4]}>
        <sphereGeometry args={[1.0, 18, 16]} />
        <MStd color="#166534" />
      </mesh>
    </group>
  );
}

export function Sofa({ w = 4, d = 2 }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[w, 0.55, d]} />
        <MStd color="#a78bfa" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.9, -d / 2 + 0.2]}>
        <boxGeometry args={[w, 0.95, 0.35]} />
        <MStd color="#8b5cf6" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[-w / 2 + 0.15, 0.75, 0]}>
        <boxGeometry args={[0.3, 0.85, d]} />
        <MStd color="#8b5cf6" />
      </mesh>
      <mesh castShadow position={[w / 2 - 0.15, 0.75, 0]}>
        <boxGeometry args={[0.3, 0.85, d]} />
        <MStd color="#8b5cf6" />
      </mesh>
      {[...Array(Math.max(1, Math.floor(w / 1.3)))].map((_, i, arr) => {
        const x = -w / 2 + (i + 0.5) * (w / arr.length);
        return (
          <mesh key={i} castShadow position={[x, 0.7, 0.1]}>
            <boxGeometry args={[w / arr.length - 0.18, 0.3, d - 0.6]} />
            <MStd color="#c4b5fd" />
          </mesh>
        );
      })}
    </group>
  );
}

export function Bed({ w = 4, d = 3 }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[w, 0.35, d]} />
        <MStd color="#78350f" />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[w - 0.2, 0.4, d - 0.2]} />
        <MStd color="#fde68a" />
      </mesh>
      <mesh castShadow position={[0, 0.85, -d / 2 + 0.5]}>
        <boxGeometry args={[w - 0.6, 0.28, 0.8]} />
        <MStd color="#f9a8d4" />
      </mesh>
      <mesh castShadow position={[0, 0.7, -d / 2 + 0.08]}>
        <boxGeometry args={[w + 0.1, 1.4, 0.18]} />
        <MStd color="#92400e" />
      </mesh>
    </group>
  );
}

export function SingleBed() {
  return <Bed w={2} d={3} />;
}

export function BunkBed() {
  return (
    <group>
      <Bed w={2} d={2.5} />
      <group position={[0, 1.6, 0]}>
        <Bed w={2} d={2.5} />
      </group>
      {[-0.9, 0.9].map((x, i) => (
        <mesh key={i} castShadow position={[x, 1.5, -1.1]}>
          <cylinderGeometry args={[0.06, 0.06, 3, 8]} />
          <MStd color="#92400e" />
        </mesh>
      ))}
    </group>
  );
}

export function Fridge({ tall = 2.5, doors = 2 }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, tall / 2, 0]}>
        <boxGeometry args={[1, tall, 1]} />
        <MStd color="#e5e7eb" metalness={0.5} roughness={0.25} />
      </mesh>
      {Array.from({ length: doors }).map((_, i) => {
        const h = tall / doors - 0.05;
        const y = tall - (i + 0.5) * (tall / doors);
        return (
          <group key={i} position={[0, y, 0.51]}>
            <mesh>
              <boxGeometry args={[0.92, h, 0.02]} />
              <MStd color="#d1d5db" metalness={0.4} />
            </mesh>
            <mesh position={[0.35, 0, 0.03]}>
              <boxGeometry args={[0.05, 0.3, 0.04]} />
              <MStd color="#374151" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Fridge3() {
  return (
    <group>
      <Fridge tall={2.5} doors={3} />
      <mesh position={[0.5, 1.8, 0.55]}>
        <boxGeometry args={[0.3, 0.5, 0.02]} />
        <MStd color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export function TV({ w = 3, h = 1.5 }) {
  return (
    <group>
      <mesh castShadow position={[0, h / 2 + 0.5, 0]}>
        <boxGeometry args={[w, h, 0.12]} />
        <MStd color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, h / 2 + 0.5, 0.07]}>
        <boxGeometry args={[w - 0.15, h - 0.15, 0.02]} />
        <MStd color="#1e3a8a" emissive="#3b82f6" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.6, 0.08, 0.4]} />
        <MStd color="#374151" metalness={0.6} />
      </mesh>
    </group>
  );
}

export function Stove() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1]} />
        <MStd color="#1f2937" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-0.5, 0.5].map((x, i) => (
        <group key={i} position={[x, 1.02, 0]}>
          <mesh>
            <cylinderGeometry args={[0.28, 0.28, 0.04, 20]} />
            <MStd color="#0a0a0a" metalness={0.9} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <torusGeometry args={[0.2, 0.025, 8, 18]} />
            <MStd color="#ef4444" emissive="#f97316" emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Toilet() {
  return (
    <group>
      <mesh castShadow position={[0, 0.3, 0.25]}>
        <cylinderGeometry args={[0.42, 0.42, 0.55, 24]} />
        <MStd color="#f9fafb" roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.7, -0.35]}>
        <boxGeometry args={[0.82, 1.0, 0.3]} />
        <MStd color="#f3f4f6" roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.6, 0.25]}>
        <torusGeometry args={[0.34, 0.06, 10, 24]} />
        <MStd color="#ffffff" />
      </mesh>
    </group>
  );
}

export function Lamp() {
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 3, 12]} />
        <MStd color="#1f2937" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <sphereGeometry args={[0.28, 18, 18]} />
        <MStd color="#fde047" emissive="#fbbf24" emissiveIntensity={1.4} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={0.6} distance={7} color="#fef08a" />
    </group>
  );
}

export function Wall({ h = 3 }) {
  return (
    <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
      <boxGeometry args={[1, h, 0.25]} />
      <MStd color="#f5e6c8" roughness={0.95} />
    </mesh>
  );
}

export function Door() {
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[1, 3, 0.18]} />
        <MStd color="#8b4513" roughness={0.7} />
      </mesh>
      <mesh position={[0.3, 1.5, 0.12]}>
        <sphereGeometry args={[0.07, 14, 14]} />
        <MStd color="#fbbf24" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2, 0.1]}>
        <boxGeometry args={[0.7, 0.4, 0.02]} />
        <MStd color="#bae6fd" metalness={0.6} roughness={0.1} />
      </mesh>
    </group>
  );
}

export function Mailbox() {
  return (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
        <MStd color="#374151" metalness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.35, 0]}>
        <boxGeometry args={[0.7, 0.45, 0.45]} />
        <MStd color="#dc2626" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0.36, 1.35, 0]}>
        <boxGeometry args={[0.02, 0.15, 0.06]} />
        <MStd color="#fbbf24" />
      </mesh>
    </group>
  );
}

export function Wardrobe({ w = 2, h = 2.5 }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 1]} />
        <MStd color="#78350f" roughness={0.85} />
      </mesh>
      {[-w / 4, w / 4].map((x, i) => (
        <mesh key={i} position={[x, h / 2, 0.51]}>
          <boxGeometry args={[w / 2 - 0.08, h - 0.1, 0.02]} />
          <MStd color="#92400e" />
        </mesh>
      ))}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={i} position={[x, h / 2, 0.54]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <MStd color="#fbbf24" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function Table({ w = 3, d = 2, h = 0.8 }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, h, 0]}>
        <boxGeometry args={[w, 0.12, d]} />
        <MStd color="#92400e" roughness={0.6} />
      </mesh>
      {[
        [-w / 2 + 0.15, -d / 2 + 0.15],
        [w / 2 - 0.15, -d / 2 + 0.15],
        [-w / 2 + 0.15, d / 2 - 0.15],
        [w / 2 - 0.15, d / 2 - 0.15],
      ].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, h / 2, z]}>
          <cylinderGeometry args={[0.08, 0.08, h, 10]} />
          <MStd color="#78350f" />
        </mesh>
      ))}
    </group>
  );
}

export function RoundTable() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[1, 1, 0.1, 32]} />
        <MStd color="#a16207" roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1, 12]} />
        <MStd color="#78350f" />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.1, 16]} />
        <MStd color="#78350f" />
      </mesh>
    </group>
  );
}

export function Desk() {
  return (
    <group>
      <Table w={2} d={2} h={1.0} />
      <mesh castShadow position={[0.5, 1.4, -0.8]}>
        <boxGeometry args={[0.9, 0.55, 0.05]} />
        <MStd color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      <mesh castShadow position={[-0.6, 1.1, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.4]} />
        <MStd color="#f9fafb" />
      </mesh>
      {/* ghế */}
      <group position={[0, 0, 1.2]}>
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
          <MStd color="#a16207" />
        </mesh>
        <mesh castShadow position={[0, 1, -0.22]}>
          <boxGeometry args={[0.5, 0.9, 0.06]} />
          <MStd color="#a16207" />
        </mesh>
        {[
          [-0.2, -0.2],
          [0.2, -0.2],
          [-0.2, 0.2],
          [0.2, 0.2],
        ].map(([x, z], i) => (
          <mesh key={i} castShadow position={[x, 0.25, z]}>
            <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
            <MStd color="#78350f" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function TVStand({ w = 4 }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[w, 0.9, 1]} />
        <MStd color="#7c2d12" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.45, 0.51]}>
        <boxGeometry args={[w - 0.3, 0.7, 0.02]} />
        <MStd color="#92400e" />
      </mesh>
    </group>
  );
}

export function Sign({ w = 2 }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
        <MStd color="#374151" metalness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[w, 0.6, 0.1]} />
        <MStd color="#f59e0b" />
      </mesh>
    </group>
  );
}

export function Pillar() {
  return (
    <mesh castShadow receiveShadow position={[0, 2.5, 0]}>
      <cylinderGeometry args={[0.32, 0.38, 5, 20]} />
      <MStd color="#9ca3af" roughness={0.85} />
    </mesh>
  );
}

export function Floor() {
  return (
    <mesh receiveShadow position={[0, 0.05, 0]}>
      <boxGeometry args={[1, 0.1, 1]} />
      <MStd color="#d4a574" roughness={0.6} />
    </mesh>
  );
}

export function Roof() {
  return (
    <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
      <boxGeometry args={[1, 0.3, 1]} />
      <MStd color="#7f1d1d" roughness={0.7} />
    </mesh>
  );
}

export function RoofTon() {
  return (
    <mesh castShadow position={[0, 0.08, 0]} rotation={[0, 0, 0]}>
      <boxGeometry args={[1, 0.15, 1]} />
      <MStd color="#b91c1c" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

export function Window() {
  return (
    <group>
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[1, 1.5, 0.1]} />
        <MStd color="#92400e" />
      </mesh>
      <mesh position={[0, 0.75, 0.06]}>
        <boxGeometry args={[0.85, 1.35, 0.02]} />
        <MStd color="#bae6fd" metalness={0.7} roughness={0.05} />
      </mesh>
      <mesh position={[0, 0.75, 0.07]}>
        <boxGeometry args={[0.85, 0.04, 0.02]} />
        <MStd color="#92400e" />
      </mesh>
      <mesh position={[0, 0.75, 0.07]}>
        <boxGeometry args={[0.04, 1.35, 0.02]} />
        <MStd color="#92400e" />
      </mesh>
    </group>
  );
}

export function Curtain() {
  return (
    <group>
      {[...Array(8)].map((_, i) => (
        <mesh key={i} castShadow position={[-0.9 + i * 0.26, 2, 0]}>
          <boxGeometry args={[0.22, 4, 0.04]} />
          <MStd color="#fda4af" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2.2, 10]} rotation-x={Math.PI / 2} />
        <MStd color="#374151" metalness={0.8} />
      </mesh>
    </group>
  );
}

export function Painting({ w = 2 }) {
  return (
    <group>
      <mesh castShadow position={[0, 1, 0]}>
        <boxGeometry args={[w, 1.2, 0.08]} />
        <MStd color="#fbbf24" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1, 0.05]}>
        <boxGeometry args={[w - 0.2, 1, 0.02]} />
        <MStd color="#60a5fa" emissive="#1e3a8a" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

export function Fan() {
  return (
    <group>
      <mesh castShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.1, 2, 10]} />
        <MStd color="#cbd5e1" metalness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 2, 0]}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <MStd color="#94a3b8" metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.08, 20]} />
        <MStd color="#475569" />
      </mesh>
    </group>
  );
}

export function Speaker() {
  return (
    <group>
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[0.8, 1.5, 0.8]} />
        <MStd color="#1f2937" roughness={0.6} />
      </mesh>
      {[0.4, 0.9, 1.2].map((y, i) => (
        <mesh key={i} position={[0, y, 0.41]}>
          <cylinderGeometry args={[0.15 + (i === 1 ? 0.05 : 0), 0.15, 0.05, 20]} rotation-x={Math.PI / 2} />
          <MStd color="#0a0a0a" metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function Clock() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.08, 28]} rotation-x={Math.PI / 2} />
        <MStd color="#f3f4f6" />
      </mesh>
      <mesh position={[0, 0.5, 0.05]}>
        <cylinderGeometry args={[0.4, 0.4, 0.02, 28]} rotation-x={Math.PI / 2} />
        <MStd color="#ffffff" />
      </mesh>
    </group>
  );
}

export function Hood() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 0.4, 1]} />
        <MStd color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.6, 0.05, 0.8]} />
        <MStd color="#1f2937" />
      </mesh>
    </group>
  );
}

export function Microwave() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1]} />
        <MStd color="#1f2937" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.2, 0.5, 0.51]}>
        <boxGeometry args={[1.2, 0.75, 0.02]} />
        <MStd color="#0f172a" emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

export function Oven() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1]} />
        <MStd color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0.51]}>
        <boxGeometry args={[1.7, 0.7, 0.02]} />
        <MStd color="#1e293b" emissive="#f97316" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function Dishwasher() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1]} />
        <MStd color="#e5e7eb" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.85, 0.51]}>
        <boxGeometry args={[1.5, 0.06, 0.02]} />
        <MStd color="#374151" />
      </mesh>
    </group>
  );
}

export function RiceCooker() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 1, 24]} />
        <MStd color="#f9fafb" metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.1, 24]} />
        <MStd color="#dc2626" />
      </mesh>
    </group>
  );
}

export function BookShelf() {
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[2, 3, 1]} />
        <MStd color="#92400e" />
      </mesh>
      {[0.4, 1.2, 2.0, 2.7].map((y, i) => (
        <mesh key={i} position={[0, y, 0.4]}>
          <boxGeometry args={[1.8, 0.05, 0.2]} />
          <MStd color="#78350f" />
        </mesh>
      ))}
      {[0.7, 1.5, 2.3].map((y, i) => (
        <group key={`b${i}`} position={[0, y, 0.4]}>
          {[...Array(5)].map((_, j) => (
            <mesh key={j} position={[-0.7 + j * 0.35, 0, 0]}>
              <boxGeometry args={[0.25, 0.5, 0.15]} />
              <MStd color={["#ef4444", "#3b82f6", "#22c55e", "#fbbf24", "#a855f7"][j]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function AirCon() {
  return (
    <group>
      <mesh castShadow position={[0, 2.5, 0]}>
        <boxGeometry args={[2, 0.8, 0.5]} />
        <MStd color="#f9fafb" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.5, 0.26]}>
        <boxGeometry args={[1.8, 0.05, 0.02]} />
        <MStd color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function Mirror() {
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[1, 3, 0.1]} />
        <MStd color="#94a3b8" metalness={0.9} roughness={0.05} />
      </mesh>
      <mesh position={[0, 1.5, 0.06]}>
        <boxGeometry args={[0.85, 2.8, 0.02]} />
        <MStd color="#bae6fd" metalness={1} roughness={0.02} />
      </mesh>
    </group>
  );
}

export function Vanity() {
  return (
    <group>
      <Table w={2} d={1} h={1} />
      <Mirror />
      <mesh position={[0, 1.55, -0.3]}>
        <boxGeometry args={[1, 1, 0.06]} />
        <MStd color="#bae6fd" metalness={0.9} roughness={0.05} />
      </mesh>
    </group>
  );
}

export function Rug({ w = 4, d = 3 }) {
  return (
    <mesh receiveShadow position={[0, 0.03, 0]}>
      <boxGeometry args={[w, 0.05, d]} />
      <MStd color="#fb7185" roughness={0.95} />
    </mesh>
  );
}

export function Bathtub() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[4, 1, 2]} />
        <MStd color="#f0f9ff" roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[3.6, 0.1, 1.6]} />
        <MStd color="#bae6fd" metalness={0.4} roughness={0.1} />
      </mesh>
    </group>
  );
}

export function Shower() {
  return (
    <group>
      <mesh castShadow position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
        <MStd color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <MStd color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>
    </group>
  );
}

export function Washer() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 2]} />
        <MStd color="#f3f4f6" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 1.01]}>
        <cylinderGeometry args={[0.35, 0.35, 0.05, 24]} rotation-x={Math.PI / 2} />
        <MStd color="#0f172a" metalness={0.7} />
      </mesh>
    </group>
  );
}

export function Lavabo() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 0.4, 0.7]} />
        <MStd color="#e0f2fe" roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 24]} />
        <MStd color="#bae6fd" />
      </mesh>
      <mesh position={[0, 0.85, -0.25]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <MStd color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>
    </group>
  );
}

export function Fence() {
  return (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[2, 1.2, 0.15]} />
        <MStd color="#fef3c7" roughness={0.8} />
      </mesh>
      {[-0.7, 0, 0.7].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.75, 0]}>
          <boxGeometry args={[0.15, 1.5, 0.18]} />
          <MStd color="#d4a574" />
        </mesh>
      ))}
    </group>
  );
}

export function Gate() {
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 0.2]} />
        <MStd color="#475569" metalness={0.8} roughness={0.4} />
      </mesh>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} castShadow position={[-1.2 + i * 0.6, 1.5, 0.11]}>
          <cylinderGeometry args={[0.05, 0.05, 2.8, 8]} />
          <MStd color="#1e293b" metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function Pot() {
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.4, 0.3, 0.8, 18]} />
        <MStd color="#a16207" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1, 0]}>
        <sphereGeometry args={[0.35, 14, 12]} />
        <MStd color="#16a34a" />
      </mesh>
    </group>
  );
}

export function StoneBench() {
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[2, 0.2, 1]} />
        <MStd color="#9ca3af" roughness={0.95} />
      </mesh>
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.2, 0]}>
          <boxGeometry args={[0.3, 0.4, 0.9]} />
          <MStd color="#6b7280" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export function FishPond() {
  return (
    <group>
      <mesh receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[3, 0.1, 2]} />
        <MStd color="#9ca3af" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[2.8, 0.25, 1.8]} />
        <MStd color="#38bdf8" metalness={0.4} roughness={0.05} emissive="#0ea5e9" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

export function GardenLamp() {
  return (
    <group>
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 1.4, 10]} />
        <MStd color="#374151" metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <MStd color="#fde047" emissive="#fbbf24" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[0, 1.55, 0]} intensity={0.4} distance={5} color="#fef08a" />
    </group>
  );
}

export function Grass() {
  return (
    <group>
      <mesh receiveShadow position={[0, 0.025, 0]}>
        <boxGeometry args={[2, 0.05, 2]} />
        <MStd color="#65a30d" roughness={0.95} />
      </mesh>
      {[...Array(6)].map((_, i) => {
        const x = (i % 3 - 1) * 0.6;
        const z = (Math.floor(i / 3) - 0.5) * 0.8;
        return (
          <mesh key={i} position={[x, 0.15, z]}>
            <coneGeometry args={[0.08, 0.25, 5]} />
            <MStd color="#4d7c0f" />
          </mesh>
        );
      })}
    </group>
  );
}

export function TrashCan() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.35, 1, 18]} />
        <MStd color="#22c55e" />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.08, 18]} />
        <MStd color="#16a34a" />
      </mesh>
    </group>
  );
}

export function Pool() {
  return (
    <group>
      <mesh receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[4, 0.1, 3]} />
        <MStd color="#e0e7ef" />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[3.8, 0.5, 2.8]} />
        <MStd color="#0ea5e9" metalness={0.4} roughness={0.05} emissive="#0284c7" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

export function PetHouse() {
  return (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[3, 1.2, 2]} />
        <MStd color="#92400e" />
      </mesh>
      <mesh castShadow position={[0, 1.4, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[2.1, 0.8, 4]} />
        <MStd color="#7f1d1d" />
      </mesh>
      <mesh position={[0, 0.5, 1.01]}>
        <boxGeometry args={[1, 1, 0.05]} />
        <MStd color="#1f2937" />
      </mesh>
    </group>
  );
}

export function TeaSet() {
  return (
    <group>
      <RoundTable />
      {[-1, 1].map((x, i) => (
        <group key={i} position={[x * 1.3, 0, 0]}>
          <mesh castShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[0.5, 0.8, 0.5]} />
            <MStd color="#fbbf24" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function SmallPot() {
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.2, 0.8, 18]} />
        <MStd color="#b45309" />
      </mesh>
      <mesh castShadow position={[0, 0.9, 0]}>
        <coneGeometry args={[0.25, 0.5, 8]} />
        <MStd color="#16a34a" />
      </mesh>
    </group>
  );
}

export function TallPot() {
  return (
    <group>
      <mesh castShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.35, 0.25, 1.5, 18]} />
        <MStd color="#7c2d12" />
      </mesh>
      <mesh castShadow position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.4, 14, 12]} />
        <MStd color="#15803d" />
      </mesh>
    </group>
  );
}

export function ItemModel({ item }: { item: CatalogItem }) {
  switch (item.id) {
    case "tree": return <Tree />;
    case "bigtree": return <BigTree />;
    case "sofa": return <Sofa w={item.w} d={item.d} />;
    case "bed": return <Bed w={item.w} d={item.d} />;
    case "singlebed": return <SingleBed />;
    case "bunkbed": return <BunkBed />;
    case "fridge": return <Fridge tall={item.h} doors={2} />;
    case "fridge3": return <Fridge3 />;
    case "tv": return <TV w={item.w} h={item.h} />;
    case "stove": return <Stove />;
    case "toilet": return <Toilet />;
    case "lamp": return <Lamp />;
    case "wall": return <Wall h={item.h} />;
    case "door": return <Door />;
    case "mailbox": return <Mailbox />;
    case "wardrobe": return <Wardrobe w={item.w} h={item.h} />;
    case "table": return <Table w={item.w} d={item.d} h={item.h} />;
    case "roundtable": return <RoundTable />;
    case "desk": return <Desk />;
    case "tvstand": return <TVStand w={item.w} />;
    case "sign": return <Sign w={item.w} />;
    case "pillar": return <Pillar />;
    case "floor": return <Floor />;
    case "roof": return <Roof />;
    case "roof_ton": return <RoofTon />;
    case "window": return <Window />;
    case "curtain": return <Curtain />;
    case "painting": return <Painting w={item.w} />;
    case "fan": return <Fan />;
    case "speaker": return <Speaker />;
    case "clock": return <Clock />;
    case "hood": return <Hood />;
    case "microwave": return <Microwave />;
    case "oven": return <Oven />;
    case "dishwasher": return <Dishwasher />;
    case "ricecooker": return <RiceCooker />;
    case "bookshelf": return <BookShelf />;
    case "aircon": return <AirCon />;
    case "mirror": return <Mirror />;
    case "vanity": return <Vanity />;
    case "rug": return <Rug w={item.w} d={item.d} />;
    case "bathtub": return <Bathtub />;
    case "shower": return <Shower />;
    case "washer": return <Washer />;
    case "lavabo":
    case "sink": return <Lavabo />;
    case "fence": return <Fence />;
    case "gate": return <Gate />;
    case "pot": return <Pot />;
    case "stonebench": return <StoneBench />;
    case "fishpond": return <FishPond />;
    case "gardenlamp": return <GardenLamp />;
    case "grass": return <Grass />;
    case "trashcan": return <TrashCan />;
    case "pool": return <Pool />;
    case "pethouse": return <PetHouse />;
    case "teaset": return <TeaSet />;
    case "smallpot": return <SmallPot />;
    case "tallpot": return <TallPot />;
    case "diningtable":
      return (
        <group>
          <Table w={4} d={4} h={1} />
          {[
            [-1.2, -1.2],
            [1.2, -1.2],
            [-1.2, 1.2],
            [1.2, 1.2],
          ].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh castShadow position={[0, 0.5, 0]}>
                <boxGeometry args={[0.5, 0.1, 0.5]} />
                <MStd color="#a16207" />
              </mesh>
              <mesh castShadow position={[0, 0.9, -0.2]}>
                <boxGeometry args={[0.5, 0.7, 0.05]} />
                <MStd color="#a16207" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "cabinet":
      return (
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[item.w, 1, item.d]} />
          <MStd color="#78350f" />
        </mesh>
      );
    default:
      return (
        <mesh castShadow receiveShadow position={[0, item.h / 2, 0]}>
          <boxGeometry args={[item.w, item.h, item.d]} />
          <MStd color={item.color} />
        </mesh>
      );
  }
}
