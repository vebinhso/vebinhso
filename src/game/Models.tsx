// Detailed 3D models composed from primitives — cartoon style (Play Together vibe)
import type { CatalogItem } from "./catalog";

const CELL = 1;

function Wood({ args, position, color = "#92400e" }: any) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

export function Tree() {
  return (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 1.2, 10]} />
        <meshStandardMaterial color="#6b3a1a" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.7, 16, 14]} />
        <meshStandardMaterial color="#22c55e" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.35, 2.0, 0.1]}>
        <sphereGeometry args={[0.45, 12, 10]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <mesh castShadow position={[-0.3, 2.0, -0.2]}>
        <sphereGeometry args={[0.5, 12, 10]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
    </group>
  );
}

export function Sofa({ w = 4, d = 2 }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[w, 0.6, d]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.85, -d / 2 + 0.2]}>
        <boxGeometry args={[w, 0.9, 0.4]} />
        <meshStandardMaterial color="#8b5cf6" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-w / 2 + 0.15, 0.7, 0]}>
        <boxGeometry args={[0.3, 0.8, d]} />
        <meshStandardMaterial color="#8b5cf6" />
      </mesh>
      <mesh castShadow position={[w / 2 - 0.15, 0.7, 0]}>
        <boxGeometry args={[0.3, 0.8, d]} />
        <meshStandardMaterial color="#8b5cf6" />
      </mesh>
      {[...Array(Math.max(1, Math.floor(w / 1.3)))].map((_, i, arr) => {
        const x = -w / 2 + (i + 0.5) * (w / arr.length);
        return (
          <mesh key={i} castShadow position={[x, 0.7, 0.1]}>
            <boxGeometry args={[w / arr.length - 0.15, 0.35, d - 0.6]} />
            <meshStandardMaterial color="#c4b5fd" roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Bed({ w = 4, d = 3 }) {
  return (
    <group>
      <Wood args={[w, 0.3, d]} position={[0, 0.15, 0]} color="#78350f" />
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[w - 0.2, 0.4, d - 0.2]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      <mesh castShadow position={[0, 0.85, -d / 2 + 0.5]}>
        <boxGeometry args={[w - 0.6, 0.25, 0.8]} />
        <meshStandardMaterial color="#f9a8d4" />
      </mesh>
      <Wood args={[w + 0.1, 1.2, 0.15]} position={[0, 0.6, -d / 2]} color="#92400e" />
    </group>
  );
}

export function Fridge() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1.25, 0]}>
        <boxGeometry args={[1, 2.5, 1]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.9, 0.51]}>
        <boxGeometry args={[0.9, 1.0, 0.02]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      <mesh position={[0, 0.8, 0.51]}>
        <boxGeometry args={[0.9, 1.3, 0.02]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      <mesh position={[0.35, 1.9, 0.53]}>
        <boxGeometry args={[0.05, 0.3, 0.02]} />
        <meshStandardMaterial color="#374151" metalness={0.8} />
      </mesh>
      <mesh position={[0.35, 0.8, 0.53]}>
        <boxGeometry args={[0.05, 0.3, 0.02]} />
        <meshStandardMaterial color="#374151" metalness={0.8} />
      </mesh>
    </group>
  );
}

export function TV({ w = 3, h = 1.5 }) {
  return (
    <group>
      <mesh castShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 0.15]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[0, h / 2, 0.08]}>
        <boxGeometry args={[w - 0.2, h - 0.2, 0.02]} />
        <meshStandardMaterial color="#1e3a8a" emissive="#3b82f6" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.4]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  );
}

export function Stove() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 1]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 1.02, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
          <meshStandardMaterial color="#000" />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0.51]}>
        <boxGeometry args={[1.6, 0.5, 0.02]} />
        <meshStandardMaterial color="#374151" emissive="#f97316" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function Toilet() {
  return (
    <group>
      <mesh castShadow position={[0, 0.25, 0.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 16]} />
        <meshStandardMaterial color="#f9fafb" />
      </mesh>
      <mesh castShadow position={[0, 0.65, -0.4]}>
        <boxGeometry args={[0.8, 1, 0.3]} />
        <meshStandardMaterial color="#f3f4f6" />
      </mesh>
      <mesh position={[0, 0.5, 0.2]}>
        <torusGeometry args={[0.32, 0.08, 8, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export function Lamp() {
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 3, 10]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#fde047" emissive="#fbbf24" emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={0.5} distance={6} color="#fef08a" />
    </group>
  );
}

export function Wall({ h = 3 }) {
  return (
    <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
      <boxGeometry args={[1, h, 1]} />
      <meshStandardMaterial color="#f5e6c8" roughness={0.9} />
    </mesh>
  );
}

export function Door() {
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[1, 3, 0.15]} />
        <meshStandardMaterial color="#8b4513" roughness={0.7} />
      </mesh>
      <mesh position={[0.3, 1.5, 0.1]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} />
      </mesh>
    </group>
  );
}

export function Mailbox() {
  return (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh castShadow position={[0, 1.3, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.4]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[0.31, 1.3, 0]}>
        <boxGeometry args={[0.02, 0.15, 0.05]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

export function Wardrobe({ w = 2, h = 2.5 }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 1]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      <mesh position={[-w / 4, h / 2, 0.51]}>
        <boxGeometry args={[w / 2 - 0.05, h - 0.1, 0.02]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>
      <mesh position={[w / 4, h / 2, 0.51]}>
        <boxGeometry args={[w / 2 - 0.05, h - 0.1, 0.02]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>
      <mesh position={[-0.08, h / 2, 0.54]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} />
      </mesh>
      <mesh position={[0.08, h / 2, 0.54]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} />
      </mesh>
    </group>
  );
}

export function Table({ w = 3, d = 2, h = 0.8 }) {
  return (
    <group>
      <Wood args={[w, 0.1, d]} position={[0, h, 0]} color="#92400e" />
      {[[-w / 2 + 0.15, -d / 2 + 0.15], [w / 2 - 0.15, -d / 2 + 0.15], [-w / 2 + 0.15, d / 2 - 0.15], [w / 2 - 0.15, d / 2 - 0.15]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, h / 2, z]}>
          <cylinderGeometry args={[0.08, 0.08, h, 8]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
      ))}
    </group>
  );
}

export function Desk() {
  return (
    <group>
      <Table w={2} d={2} h={1.0} />
      <mesh castShadow position={[0.6, 1.3, -0.7]}>
        <boxGeometry args={[0.8, 0.5, 0.05]} />
        <meshStandardMaterial color="#111827" emissive="#3b82f6" emissiveIntensity={0.4} />
      </mesh>
      <mesh castShadow position={[-0.6, 1.05, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.4]} />
        <meshStandardMaterial color="#f9fafb" />
      </mesh>
    </group>
  );
}

export function TVStand({ w = 4 }) {
  return (
    <group>
      <Wood args={[w, 0.8, 1]} position={[0, 0.4, 0]} color="#7c2d12" />
      <mesh position={[0, 0.4, 0.51]}>
        <boxGeometry args={[w - 0.3, 0.6, 0.02]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>
    </group>
  );
}

export function Sign({ w = 2 }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[w, 0.6, 0.08]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

export function Pillar() {
  return (
    <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
      <cylinderGeometry args={[0.3, 0.35, 3, 16]} />
      <meshStandardMaterial color="#9ca3af" roughness={0.8} />
    </mesh>
  );
}

export function Floor() {
  return (
    <mesh receiveShadow position={[0, 0.05, 0]}>
      <boxGeometry args={[1, 0.1, 1]} />
      <meshStandardMaterial color="#d4a574" roughness={0.6} />
    </mesh>
  );
}

export function DiningTable() {
  return (
    <group>
      <Table w={4} d={4} h={1} />
      {[[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.5, 0]}>
            <boxGeometry args={[0.5, 0.1, 0.5]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
          <mesh castShadow position={[0, 0.9, -0.2]}>
            <boxGeometry args={[0.5, 0.7, 0.05]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
          {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([cx, cz], j) => (
            <mesh key={j} castShadow position={[cx, 0.25, cz]}>
              <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Sink() {
  return (
    <group>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1, 0.8, 0.6]} />
        <meshStandardMaterial color="#f3f4f6" />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.9, 0.05, 0.55]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
      <mesh position={[0, 1.05, -0.2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
      </mesh>
    </group>
  );
}

export function ItemModel({ item }: { item: CatalogItem }) {
  switch (item.id) {
    case "tree": return <Tree />;
    case "sofa": return <Sofa w={item.w} d={item.d} />;
    case "bed": return <Bed w={item.w} d={item.d} />;
    case "fridge": return <Fridge />;
    case "tv": return <TV w={item.w} h={item.h} />;
    case "stove": return <Stove />;
    case "toilet": return <Toilet />;
    case "lamp": return <Lamp />;
    case "wall": return <Wall h={item.h} />;
    case "door": return <Door />;
    case "mailbox": return <Mailbox />;
    case "wardrobe": return <Wardrobe w={item.w} h={item.h} />;
    case "table": return <Table w={item.w} d={item.d} h={item.h} />;
    case "desk": return <Desk />;
    case "tvstand": return <TVStand w={item.w} />;
    case "sign": return <Sign w={item.w} />;
    case "pillar": return <Pillar />;
    case "floor": return <Floor />;
    case "diningtable": return <DiningTable />;
    case "sink": return <Sink />;
    default:
      return (
        <mesh castShadow receiveShadow position={[0, item.h / 2, 0]}>
          <boxGeometry args={[item.w * CELL, item.h, item.d * CELL]} />
          <meshStandardMaterial color={item.color} />
        </mesh>
      );
  }
}
