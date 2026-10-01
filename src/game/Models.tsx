// Models 3D chi tiết, PBR (metalness/roughness) — hướng tả thực cartoon
import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBox, Text } from "@react-three/drei";
import type { CatalogItem } from "./catalog";
import { useWorldToggles } from "@/lib/world-toggles";
import { getLocale } from "@/lib/locale";
import * as X from "./ModelsExtra";

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
  const blue = "#2587c7";
  const blueLight = "#54a9dc";
  const blueDark = "#17679f";
  const wood = "#a86624";

  return (
    <group>
      {/* Khung bọc vải và tấm yếm trước */}
      <RoundedBox args={[w - 0.2, 0.55, d - 0.22]} radius={0.14} smoothness={4} castShadow receiveShadow position={[0, 0.52, 0]}>
        <MStd color={blueDark} roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[w - 0.3, 0.42, 0.18]} radius={0.08} smoothness={4} castShadow position={[0, 0.48, d / 2 - 0.08]}>
        <MStd color={blue} roughness={0.78} />
      </RoundedBox>

      {/* Tựa lưng cao, hơi ngả về sau như mẫu */}
      <RoundedBox args={[w - 0.5, 1.16, 0.36]} radius={0.18} smoothness={5} castShadow receiveShadow position={[0, 1.18, -d / 2 + 0.2]} rotation={[-0.09, 0, 0]}>
        <MStd color={blue} roughness={0.74} />
      </RoundedBox>
      {[-1.1, 0, 1.1].map((x) => (
        <mesh key={x} castShadow position={[x * (w / 4), 1.22, -d / 2 + 0.405]}>
          <capsuleGeometry args={[0.025, 0.7, 3, 6]} />
          <MStd color={blueDark} roughness={0.8} />
        </mesh>
      ))}

      {/* Hai tay ghế cong, dày và thấp dần về phía trước */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (w / 2 - 0.25), 0, 0]}>
          <RoundedBox args={[0.5, 0.78, d - 0.22]} radius={0.2} smoothness={5} castShadow receiveShadow position={[0, 0.86, 0.02]} rotation={[0, 0, side * -0.035]}>
            <MStd color={blue} roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[0.42, 0.12, d - 0.36]} radius={0.06} smoothness={4} castShadow position={[side * -0.02, 1.22, 0.05]}>
            <MStd color={blueLight} roughness={0.78} />
          </RoundedBox>
        </group>
      ))}

      {/* Hai đệm ngồi tách rời, viền rõ */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (w - 1.05) / 4, 0.88, 0.18]}>
          <RoundedBox args={[(w - 1.02) / 2, 0.34, d - 0.72]} radius={0.14} smoothness={5} castShadow receiveShadow>
            <MStd color={blueLight} roughness={0.78} />
          </RoundedBox>
          <mesh position={[0, -0.04, (d - 0.72) / 2 + 0.008]}>
            <boxGeometry args={[(w - 1.12) / 2, 0.025, 0.025]} />
            <MStd color={blueDark} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Gối tựa: hai gối xanh lớn và hai gối trắng nhỏ */}
      {[-1, 1].map((side) => (
        <RoundedBox key={`blue-${side}`} args={[0.94, 0.9, 0.24]} radius={0.2} smoothness={5} castShadow position={[side * (w / 2 - 0.92), 1.39, -0.48]} rotation={[0.04, side * 0.05, side * -0.16]}>
          <MStd color={blueLight} roughness={0.88} />
        </RoundedBox>
      ))}
      {[-1, 1].map((side) => (
        <RoundedBox key={`white-${side}`} args={[0.7, 0.68, 0.22]} radius={0.16} smoothness={5} castShadow position={[side * 0.48, 1.32, -0.36]} rotation={[0.03, side * 0.04, side * -0.08]}>
          <MStd color="#f5f5ed" roughness={0.92} />
        </RoundedBox>
      ))}

      {/* Chân gỗ thon và hơi choãi */}
      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <mesh key={`${xSide}-${zSide}`} castShadow position={[xSide * (w / 2 - 0.55), 0.18, zSide * (d / 2 - 0.35)]} rotation={[zSide * 0.08, 0, xSide * -0.13]}>
          <cylinderGeometry args={[0.055, 0.085, 0.48, 12]} />
          <MStd color={wood} roughness={0.5} />
        </mesh>
      )))}
    </group>
  );
}

export function LargeSofa() {
  const fabric = "#e7e5e4";
  const fabricLight = "#f5f5f4";
  const seam = "#d6d3d1";
  const foot = "#292524";
  const seatY = 0.62;

  const Cushion = ({ x, z, width = 1.42, depth = 1.3 }: { x: number; z: number; width?: number; depth?: number }) => (
    <group position={[x, seatY, z]}>
      <RoundedBox args={[width, 0.42, depth]} radius={0.14} smoothness={5} castShadow receiveShadow>
        <MStd color={fabricLight} roughness={0.92} />
      </RoundedBox>
      <mesh position={[0, -0.03, depth / 2 + 0.012]}>
        <boxGeometry args={[width - 0.18, 0.025, 0.025]} />
        <MStd color={seam} roughness={1} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Low modular plinths reproduce the broad U/L-shaped footprint. */}
      <RoundedBox args={[4.82, 0.42, 1.7]} radius={0.12} smoothness={5} castShadow receiveShadow position={[0, 0.4, -0.95]}>
        <MStd color={fabric} roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[2.96, 0.42, 3.7]} radius={0.12} smoothness={5} castShadow receiveShadow position={[-0.93, 0.4, 0.55]}>
        <MStd color={fabric} roughness={0.9} />
      </RoundedBox>

      {/* Rear backrest and side arms. */}
      <RoundedBox args={[4.75, 1.1, 0.38]} radius={0.13} smoothness={5} castShadow receiveShadow position={[0, 1.08, -1.8]}>
        <MStd color={fabricLight} roughness={0.94} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.98, 1.72]} radius={0.14} smoothness={5} castShadow receiveShadow position={[2.29, 0.99, -0.96]}>
        <MStd color={fabricLight} roughness={0.94} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.98, 1.72]} radius={0.14} smoothness={5} castShadow receiveShadow position={[-2.29, 0.99, -0.96]}>
        <MStd color={fabricLight} roughness={0.94} />
      </RoundedBox>

      {/* Three rear seats plus two long chaise modules on the left. */}
      <Cushion x={-1.46} z={-0.72} />
      <Cushion x={0} z={-0.72} />
      <Cushion x={1.46} z={-0.72} />
      <Cushion x={-1.46} z={0.78} depth={1.62} />
      <Cushion x={-1.46} z={2.18} depth={1.18} />
      <Cushion x={0} z={0.78} depth={1.62} />
      <Cushion x={0} z={2.18} depth={1.18} />

      {/* Inner divider mirrors the raised arm visible between chaise and corner seat. */}
      <RoundedBox args={[0.38, 0.88, 1.5]} radius={0.12} smoothness={5} castShadow receiveShadow position={[-0.72, 1.02, 0.08]}>
        <MStd color={fabricLight} roughness={0.94} />
      </RoundedBox>

      {/* Discreet dark feet keep the sofa visually grounded. */}
      {[[-2.2, -1.65], [2.2, -1.65], [-2.2, 2.0], [0.68, 2.0]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} castShadow position={[x, 0.12, z]}>
          <cylinderGeometry args={[0.06, 0.075, 0.24, 12]} />
          <MStd color={foot} metalness={0.2} roughness={0.55} />
        </mesh>
      ))}
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
  const screenH = h * 0.82;
  const centerY = 0.28 + screenH / 2;

  return (
    <group>
      {/* Slim beveled television body and near edge-to-edge glass. */}
      <RoundedBox args={[w, screenH, 0.14]} radius={0.035} smoothness={4} castShadow position={[0, centerY, 0]}>
        <MStd color="#111315" metalness={0.7} roughness={0.2} />
      </RoundedBox>
      <RoundedBox args={[w - 0.1, screenH - 0.1, 0.018]} radius={0.015} smoothness={3} position={[0, centerY + 0.015, 0.078]}>
        <MStd color="#123f34" metalness={0.05} roughness={0.17} emissive="#159447" emissiveIntensity={0.22} />
      </RoundedBox>

      {/* Layered green leaf forms echo the picture displayed in the reference. */}
      <mesh position={[-0.82, centerY - 0.02, 0.091]} rotation={[0, 0, 0.62]}>
        <capsuleGeometry args={[0.22, 1.18, 8, 18]} />
        <MStd color="#72d80e" roughness={0.32} emissive="#3c9b13" emissiveIntensity={0.16} />
      </mesh>
      <mesh position={[0.08, centerY + 0.02, 0.094]} rotation={[0, 0, 0.27]}>
        <capsuleGeometry args={[0.18, 1.05, 8, 18]} />
        <MStd color="#58c914" roughness={0.34} emissive="#2e8c15" emissiveIntensity={0.14} />
      </mesh>
      <mesh position={[0.9, centerY, 0.092]} rotation={[0, 0, -0.48]}>
        <capsuleGeometry args={[0.24, 1.2, 8, 18]} />
        <MStd color="#35a91a" roughness={0.36} emissive="#19751c" emissiveIntensity={0.12} />
      </mesh>

      {/* Brushed-metal lower badge, power light and rear electronics housing. */}
      <RoundedBox args={[0.62, 0.045, 0.11]} radius={0.018} smoothness={3} position={[0, 0.275, 0.105]}>
        <MStd color="#a8adb0" metalness={0.92} roughness={0.18} />
      </RoundedBox>
      <mesh position={[0.48, 0.27, 0.116]}>
        <sphereGeometry args={[0.012, 10, 8]} />
        <MStd color="#dcfce7" emissive="#4ade80" emissiveIntensity={1.5} />
      </mesh>
      <RoundedBox args={[1.28, 0.64, 0.12]} radius={0.05} smoothness={3} position={[0, centerY, -0.1]} castShadow>
        <MStd color="#202326" metalness={0.28} roughness={0.55} />
      </RoundedBox>

      {/* Two low, outward-splayed V feet matching the reference television. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * w * 0.34, 0.1, 0]}>
          <RoundedBox args={[0.58, 0.075, 0.11]} radius={0.025} smoothness={3} rotation={[0, side * 0.34, side * 0.035]} position={[side * 0.1, 0, 0.18]} castShadow>
            <MStd color="#181a1c" metalness={0.72} roughness={0.25} />
          </RoundedBox>
          <RoundedBox args={[0.48, 0.07, 0.1]} radius={0.025} smoothness={3} rotation={[0, -side * 0.34, -side * 0.035]} position={[-side * 0.07, 0, -0.14]} castShadow>
            <MStd color="#181a1c" metalness={0.72} roughness={0.25} />
          </RoundedBox>
        </group>
      ))}
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
  const { lightsOn } = useWorldToggles();
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 3, 12]} />
        <MStd color="#1f2937" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <sphereGeometry args={[0.28, 18, 18]} />
        <MStd color={lightsOn ? "#fde047" : "#9ca3af"} emissive={lightsOn ? "#fbbf24" : "#000000"} emissiveIntensity={lightsOn ? 1.4 : 0} />
      </mesh>
      {lightsOn && <pointLight position={[0, 3, 0]} intensity={0.6} distance={7} color="#fef08a" />}
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

export function Door({ placedId }: { placedId?: string } = {}) {
  const t = useWorldToggles();
  const isOpen = t.doorsOpen || (placedId ? t.openDoorIds?.includes(placedId) : false);
  // Bản lề ở mép trái (x = -0.5). Group ngoài xoay quanh bản lề.
  const open = isOpen ? -Math.PI / 2 : 0;
  return (
    <group position={[-0.5, 0, 0]} rotation={[0, open, 0]}>
      <group position={[0.5, 0, 0]}>
        <mesh castShadow position={[0, 1.5, 0]}>
          <boxGeometry args={[1, 3, 0.25]} />
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
  const legAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  return (
    <group>
      {/* Warm walnut tray top with a raised rounded rim. */}
      <mesh castShadow receiveShadow position={[0, 0.92, 0]}>
        <cylinderGeometry args={[1, 1, 0.13, 64]} />
        <MStd color="#713b1e" roughness={0.3} />
      </mesh>
      <mesh receiveShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[0.88, 0.88, 0.03, 64]} />
        <MStd color="#9a6241" roughness={0.52} />
      </mesh>
      <mesh castShadow position={[0, 1.035, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.91, 0.075, 16, 64]} />
        <MStd color="#5a2d17" roughness={0.26} />
      </mesh>

      {/* Fine wood-grain lines across the inset top. */}
      {[-0.58, -0.38, -0.18, 0.02, 0.22, 0.42, 0.62].map((z) => {
        const halfWidth = Math.sqrt(Math.max(0, 0.72 - z * z));
        return (
          <mesh key={z} position={[0, 1.019, z]}>
            <boxGeometry args={[halfWidth * 2, 0.006, 0.012]} />
            <MStd color="#7f4a2d" roughness={0.75} />
          </mesh>
        );
      })}

      {/* Slim black steel frame: four posts and a circular lower brace. */}
      {legAngles.map((angle) => {
        const x = Math.cos(angle) * 0.78;
        const z = Math.sin(angle) * 0.78;
        return (
          <mesh key={angle} castShadow position={[x, 0.49, z]}>
            <cylinderGeometry args={[0.038, 0.046, 0.84, 16]} />
            <MStd color="#151617" metalness={0.78} roughness={0.22} />
          </mesh>
        );
      })}
      <mesh castShadow position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.045, 14, 64]} />
        <MStd color="#111214" metalness={0.82} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.79, 0.025, 12, 64]} />
        <MStd color="#17191b" metalness={0.82} roughness={0.18} />
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

export function Sign({ w = 2, label = "" }: { w?: number; label?: string }) {
  // Khung biển: cao 0.6m, rộng w mét. Chữ chỉ gói gọn trong khung (~92% bề rộng).
  const innerW = w * 0.92;
  const innerH = 0.6 * 0.78;
  const text = (label || (getLocale() === "en" ? "House name" : "Bảng tên nhà")).slice(0, 50);
  // Auto-size: vừa khung theo cả chiều rộng và chiều cao.
  const byHeight = innerH * 0.85;
  const byWidth = (innerW / Math.max(text.length, 4)) * 1.6;
  const fontSize = Math.max(0.08, Math.min(byHeight, byWidth));
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
      {/* 2 mặt chữ — không cần font ngoài, drei dùng font mặc định */}
      <Text
        position={[0, 1.2, 0.056]}
        fontSize={fontSize}
        maxWidth={innerW}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
      >
        {text}
      </Text>
      <Text
        position={[0, 1.2, -0.056]}
        rotation={[0, Math.PI, 0]}
        fontSize={fontSize}
        maxWidth={innerW}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
      >
        {text}
      </Text>
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

// Vẽ tranh canvas "rừng tuyết" theo phong cách màu nước
function drawWinterCanvas(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const W = 1200, H = 800;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  if (!g) return null;

  // Bầu trời
  const sky = g.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, "#cfe2ee");
  sky.addColorStop(1, "#e6f0f6");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);

  // Đồi tuyết xa
  const hill = (pts: number[][], color: string) => {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fillStyle = color; g.fill();
  };
  hill([[0, 460], [320, 430], [640, 350], [900, 300], [1200, 330], [1200, 800], [0, 800]], "#eaf2f8");

  // Rặng thông
  const pine = (x: number, y: number, s: number, c: string) => {
    for (let k = 0; k < 3; k++) {
      const yy = y - k * s * 0.42, ww = s * (0.62 - k * 0.14);
      g.beginPath(); g.moveTo(x, yy - s * 0.75); g.lineTo(x - ww, yy); g.lineTo(x + ww, yy);
      g.closePath(); g.fillStyle = c; g.fill();
    }
    g.fillStyle = "#f4f8fb";
    g.beginPath(); g.moveTo(x, y - s * 1.52); g.lineTo(x - s * 0.17, y - s * 1.18); g.lineTo(x + s * 0.17, y - s * 1.18);
    g.closePath(); g.fill();
  };
  const pineCols = ["#8fa8cb", "#6f8cba", "#5f7fb4", "#879fc6"];
  for (let i = 0; i < 9; i++) pine(680 + i * 62, 380 - (i % 3) * 14, 78, pineCols[i % 4]);
  for (let i = 0; i < 5; i++) pine(470 + i * 54, 520 - (i % 2) * 10, 62, "#b9cada");

  // Các dải tuyết / bóng xanh
  hill([[0, 620], [300, 585], [700, 520], [1200, 470], [1200, 800], [0, 800]], "#f2f7fb");
  hill([[0, 700], [260, 660], [620, 600], [1200, 560], [1200, 800], [0, 800]], "#cfe0f0");
  hill([[0, 790], [340, 735], [760, 690], [1200, 660], [1200, 800], [0, 800]], "#9dc0e0");
  hill([[0, 560], [180, 585], [330, 660], [120, 760], [0, 760]], "#7fb0da");
  hill([[860, 560], [1200, 540], [1200, 700], [900, 690]], "#8fb9df");

  // Lối đi tuyết uốn lượn
  g.beginPath();
  g.moveTo(420, 800);
  g.bezierCurveTo(520, 700, 680, 690, 700, 600);
  g.bezierCurveTo(715, 530, 660, 500, 640, 470);
  g.lineWidth = 56; g.lineCap = "round";
  g.strokeStyle = "#f6fafd"; g.stroke();
  g.lineWidth = 26; g.strokeStyle = "#ffffff"; g.stroke();

  // Tán cây tròn (xanh xám + cam đất)
  const blob = (x: number, y: number, rx: number, ry: number, c: string) => {
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = c; g.fill();
  };
  // Cây trơ cành
  const bare = (x: number, base: number, hgt: number, wdt: number) => {
    g.strokeStyle = "#2b3a60"; g.lineCap = "round";
    g.lineWidth = wdt; g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - hgt); g.stroke();
    g.lineWidth = Math.max(2, wdt * 0.55);
    for (let i = 0; i < 5; i++) {
      const yy = base - hgt * (0.45 + i * 0.12);
      const dir = i % 2 === 0 ? -1 : 1;
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x + dir * hgt * 0.22, yy - hgt * 0.16); g.stroke();
      g.beginPath(); g.moveTo(x + dir * hgt * 0.12, yy - hgt * 0.085);
      g.lineTo(x + dir * hgt * 0.2, yy - hgt * 0.24); g.stroke();
    }
  };
  blob(360, 640, 72, 96, "#e7a187");
  bare(360, 740, 190, 8);
  blob(470, 600, 80, 104, "#9fb3cc");
  bare(470, 720, 215, 9);
  blob(560, 570, 86, 112, "#7f9ac0");
  bare(558, 712, 240, 10);
  blob(760, 575, 62, 74, "#9db1c8");
  bare(760, 670, 150, 7);
  blob(950, 540, 86, 110, "#e3a083");
  bare(950, 700, 230, 10);
  blob(200, 520, 70, 92, "#e9ab93");

  // Hai thân cây lớn tiền cảnh
  g.strokeStyle = "#263250"; g.lineCap = "round";
  g.lineWidth = 26; g.beginPath(); g.moveTo(275, 800); g.bezierCurveTo(268, 500, 300, 330, 318, 180); g.stroke();
  g.lineWidth = 12;
  g.beginPath(); g.moveTo(300, 360); g.lineTo(195, 262); g.stroke();
  g.beginPath(); g.moveTo(306, 310); g.lineTo(404, 212); g.stroke();
  g.beginPath(); g.moveTo(290, 470); g.lineTo(188, 430); g.stroke();
  g.lineWidth = 22; g.beginPath(); g.moveTo(1040, 800); g.bezierCurveTo(1036, 520, 1046, 320, 1052, 150); g.stroke();
  g.lineWidth = 10;
  g.beginPath(); g.moveTo(1046, 380); g.lineTo(1136, 300); g.stroke();
  g.beginPath(); g.moveTo(1044, 520); g.lineTo(960, 470); g.stroke();

  // Người nhỏ trên lối đi
  g.fillStyle = "#e9bd86";
  g.beginPath(); g.ellipse(556, 700, 13, 15, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#26304e";
  g.beginPath(); g.moveTo(543, 712); g.lineTo(569, 712); g.lineTo(576, 772); g.lineTo(536, 772); g.closePath(); g.fill();
  g.fillRect(547, 770, 6, 22); g.fillRect(560, 770, 6, 22);

  // Hạt tuyết rơi
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * W, y = Math.random() * H * 0.8, r = Math.random() * 2.2 + 0.6;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function Painting({ w = 2 }) {
  const tex = useMemo(() => drawWinterCanvas(), []);
  const h = w * 0.66;
  const depth = 0.12;
  return (
    <group position={[0, 1.05, 0]}>
      {/* Khung canvas bọc vải (gallery wrap) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, depth]} />
        <MStd color="#e8eef3" roughness={0.92} />
      </mesh>
      {/* Mặt tranh */}
      <mesh position={[0, 0, depth / 2 + 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex ?? undefined} color={tex ? "#ffffff" : "#bcd6e8"} roughness={0.85} metalness={0} />
      </mesh>
      {/* Mép vải cuộn cạnh trái/phải */}
      <mesh position={[-w / 2 - 0.001, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, h]} />
        <MStd color="#aebfd0" roughness={0.9} />
      </mesh>
      <mesh position={[w / 2 + 0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, h]} />
        <MStd color="#c7d6e3" roughness={0.9} />
      </mesh>
      {/* Bóng đổ nhẹ phía sau */}
      <mesh position={[0, 0, -depth / 2 - 0.004]}>
        <planeGeometry args={[w * 0.98, h * 0.98]} />
        <MStd color="#94a3b8" roughness={1} />
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

export function CeilingFan() {
  return (
    <group position={[0, 4.15, 0]}>
      {/* Ceiling cup, short downrod and upper collar. */}
      <mesh castShadow position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.34, 0.24, 0.18, 32]} />
        <MStd color="#f8fafc" metalness={0.18} roughness={0.28} />
      </mesh>
      <mesh castShadow position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.34, 24]} />
        <MStd color="#f1f5f9" metalness={0.35} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.24, 0]}>
        <torusGeometry args={[0.13, 0.025, 12, 32]} />
        <MStd color="#d7dde2" metalness={0.75} roughness={0.18} />
      </mesh>

      {/* Teardrop motor body from the reference. */}
      <mesh castShadow position={[0, 0.02, 0]}>
        <coneGeometry args={[0.49, 0.76, 48]} />
        <MStd color="#f8fafc" metalness={0.12} roughness={0.24} />
      </mesh>
      <mesh castShadow position={[0, -0.31, 0]}>
        <sphereGeometry args={[0.48, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <MStd color="#f8fafc" metalness={0.12} roughness={0.24} />
      </mesh>

      {/* Four wide, slim blades and their polished mounting arms. */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <RoundedBox args={[0.86, 0.055, 0.17]} radius={0.035} smoothness={3} position={[0.58, -0.18, 0]} rotation={[0, -0.08, -0.035]} castShadow>
            <MStd color="#d9dde0" metalness={0.62} roughness={0.2} />
          </RoundedBox>
          <RoundedBox args={[1.72, 0.075, 0.43]} radius={0.055} smoothness={4} position={[1.72, -0.2, 0]} rotation={[0, -0.055, -0.025]} castShadow receiveShadow>
            <MStd color="#f7f8f8" metalness={0.18} roughness={0.26} />
          </RoundedBox>
          <mesh position={[0.66, -0.205, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.075, 24]} />
            <MStd color="#eef1f3" metalness={0.72} roughness={0.18} />
          </mesh>
        </group>
      ))}

      {/* Layered lower motor cap and decorative chrome ring. */}
      <mesh castShadow position={[0, -0.39, 0]}>
        <cylinderGeometry args={[0.35, 0.3, 0.13, 40]} />
        <MStd color="#edf0f2" metalness={0.35} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.43, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.31, 0.025, 12, 40]} />
        <MStd color="#c7cdd1" metalness={0.92} roughness={0.1} />
      </mesh>
      <mesh castShadow position={[0, -0.49, 0]}>
        <cylinderGeometry args={[0.27, 0.34, 0.12, 40]} />
        <MStd color="#f8fafc" metalness={0.18} roughness={0.24} />
      </mesh>
    </group>
  );
}

export function Speaker() {
  const SpeakerCabinet = ({ x, angle = 0 }: { x: number; angle?: number }) => (
    <group position={[x, 0, 0]} rotation={[0, angle, 0]}>
      {/* Beveled black wood cabinet and inset front baffle. */}
      <RoundedBox args={[0.9, 1.58, 0.82]} radius={0.045} smoothness={4} castShadow receiveShadow position={[0, 0.8, 0]}>
        <MStd color="#18181b" metalness={0.08} roughness={0.48} />
      </RoundedBox>
      <RoundedBox args={[0.79, 1.43, 0.055]} radius={0.018} smoothness={3} castShadow position={[0, 0.8, 0.424]}>
        <MStd color="#27272a" metalness={0.12} roughness={0.62} />
      </RoundedBox>

      {/* Subtle vertical wood-grain grooves. */}
      {[-0.3, -0.18, -0.06, 0.06, 0.18, 0.3].map((gx) => (
        <mesh key={gx} position={[gx, 0.8, 0.456]}>
          <boxGeometry args={[0.009, 1.31, 0.008]} />
          <MStd color="#3f3f46" roughness={0.9} />
        </mesh>
      ))}

      {/* Woofer: rubber surround, silver cone, dark dust cap. */}
      <mesh position={[0, 0.53, 0.475]} castShadow>
        <torusGeometry args={[0.27, 0.065, 16, 48]} />
        <MStd color="#3f3f46" metalness={0.34} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.53, 0.477]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.245, 0.085, 48, 1, true]} />
        <MStd color="#a1a1aa" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.53, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.082, 0.082, 0.025, 32]} />
        <MStd color="#27272a" metalness={0.32} roughness={0.32} />
      </mesh>

      {/* Mid driver, matching the reference's smaller upper cone. */}
      <mesh position={[0, 1.14, 0.47]} castShadow>
        <torusGeometry args={[0.18, 0.047, 14, 40]} />
        <MStd color="#52525b" metalness={0.45} roughness={0.28} />
      </mesh>
      <mesh position={[0, 1.14, 0.472]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.155, 0.062, 40, 1, true]} />
        <MStd color="#a1a1aa" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0, 1.14, 0.51]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.022, 28]} />
        <MStd color="#3f3f46" metalness={0.35} roughness={0.3} />
      </mesh>

      {/* Bass ports and visible fasteners. */}
      {[-0.29, 0.29].map((px) => (
        <mesh key={`port-${px}`} position={[px, 1.36, 0.47]}>
          <torusGeometry args={[0.038, 0.014, 10, 24]} />
          <MStd color="#a1a1aa" metalness={0.8} roughness={0.22} />
        </mesh>
      ))}
      {[[-0.31, 0.17], [0.31, 0.17], [-0.31, 1.45], [0.31, 1.45]].map(([sx, sy]) => (
        <mesh key={`${sx}-${sy}`} position={[sx, sy, 0.47]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.015, 14]} />
          <MStd color="#d4d4d8" metalness={0.88} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group>
      <SpeakerCabinet x={-0.49} angle={0.025} />
      <SpeakerCabinet x={0.49} angle={-0.025} />
    </group>
  );
}

// TV soundbar set: long soundbar + wireless subwoofer + 2 surround speakers + remote
export function SoundbarSet() {
  const Satellite = ({ x, z, angle = 0 }: { x: number; z: number; angle?: number }) => (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      {/* Small rounded surround speaker */}
      <RoundedBox args={[0.5, 0.34, 0.42]} radius={0.06} smoothness={4} castShadow receiveShadow position={[0, 0.19, 0]}>
        <MStd color="#17171a" metalness={0.15} roughness={0.45} />
      </RoundedBox>
      {/* Fabric grille front */}
      <RoundedBox args={[0.42, 0.26, 0.03]} radius={0.012} smoothness={3} position={[0, 0.19, 0.2]}>
        <MStd color="#26262b" roughness={0.85} />
      </RoundedBox>
      {/* Tiny status LED */}
      <mesh position={[0.14, 0.1, 0.215]}>
        <sphereGeometry args={[0.012, 10, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Soundbar */}
      <group position={[0, 0, 0]}>
        <RoundedBox args={[3.4, 0.3, 0.42]} radius={0.06} smoothness={4} castShadow receiveShadow position={[0, 0.17, 0]}>
          <MStd color="#141417" metalness={0.2} roughness={0.42} />
        </RoundedBox>
        {/* Grille texture strips */}
        {Array.from({ length: 22 }, (_, i) => -1.55 + i * 0.148).map((gx) => (
          <mesh key={gx} position={[gx, 0.17, 0.2]}>
            <boxGeometry args={[0.02, 0.2, 0.012]} />
            <MStd color="#2a2a30" roughness={0.9} />
          </mesh>
        ))}
        {/* Top control buttons */}
        {[-0.18, -0.06, 0.06, 0.18].map((bx) => (
          <mesh key={bx} position={[bx, 0.325, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.015, 16]} />
            <MStd color="#333338" metalness={0.4} roughness={0.35} />
          </mesh>
        ))}
        {/* Front display dot */}
        <mesh position={[0, 0.17, 0.215]}>
          <sphereGeometry args={[0.014, 10, 8]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* Wireless subwoofer */}
      <group position={[1.6, 0, -0.9]}>
        <RoundedBox args={[0.85, 1.25, 0.95]} radius={0.05} smoothness={4} castShadow receiveShadow position={[0, 0.68, 0]}>
          <MStd color="#17171a" metalness={0.15} roughness={0.45} />
        </RoundedBox>
        {/* Front baffle */}
        <RoundedBox args={[0.72, 1.1, 0.04]} radius={0.02} smoothness={3} position={[0, 0.68, 0.48]}>
          <MStd color="#232327" roughness={0.7} />
        </RoundedBox>
        {/* Brand badge */}
        <mesh position={[0, 0.32, 0.505]}>
          <boxGeometry args={[0.14, 0.06, 0.012]} />
          <MStd color="#4b4b52" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Feet */}
        {[[-0.3, -0.35], [0.3, -0.35], [-0.3, 0.35], [0.3, 0.35]].map(([fx, fz]) => (
          <mesh key={`${fx}-${fz}`} position={[fx, 0.035, fz]}>
            <cylinderGeometry args={[0.05, 0.06, 0.07, 12]} />
            <MStd color="#0c0c0e" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Surround satellites */}
      <Satellite x={-2.1} z={0.25} angle={0.12} />
      <Satellite x={2.1} z={0.25} angle={-0.12} />

      {/* Remote control */}
      <group position={[-0.7, 0, 0.75]} rotation={[0, 0.35, 0]}>
        <RoundedBox args={[0.16, 0.035, 0.5]} radius={0.015} smoothness={3} castShadow position={[0, 0.02, 0]}>
          <MStd color="#1c1c20" metalness={0.2} roughness={0.4} />
        </RoundedBox>
        {[-0.14, -0.05, 0.04, 0.13].map((bz, i) => (
          <mesh key={bz} position={[0, 0.042, bz]}>
            <cylinderGeometry args={[i === 0 ? 0.03 : 0.02, i === 0 ? 0.03 : 0.02, 0.012, 12]} />
            <MStd color="#3a3a41" roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Small wooden bookshelf speaker pair with coaxial drivers (KEF-style)
export function BookshelfSpeakers() {
  const Cabinet = ({ x, z, angle = 0 }: { x: number; z: number; angle?: number }) => (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      {/* Walnut cabinet */}
      <RoundedBox args={[0.62, 0.95, 0.72]} radius={0.02} smoothness={3} castShadow receiveShadow position={[0, 0.475, 0]}>
        <MStd color="#6b4a2f" metalness={0.05} roughness={0.55} />
      </RoundedBox>
      {/* Wood grain streaks */}
      {[-0.22, -0.11, 0, 0.11, 0.22].map((gx) => (
        <mesh key={gx} position={[gx, 0.475, 0.363]}>
          <boxGeometry args={[0.012, 0.9, 0.006]} />
          <MStd color="#573a22" roughness={0.85} />
        </mesh>
      ))}
      {/* Dark front baffle ring */}
      <mesh position={[0, 0.52, 0.365]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.02, 40]} />
        <MStd color="#1c1c1f" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Ribbed surround */}
      <mesh position={[0, 0.52, 0.378]}>
        <torusGeometry args={[0.2, 0.028, 12, 40]} />
        <MStd color="#2e2e33" roughness={0.5} />
      </mesh>
      {/* Coaxial cone */}
      <mesh position={[0, 0.52, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.185, 0.06, 40, 1, true]} />
        <MStd color="#3a3a40" metalness={0.55} roughness={0.3} />
      </mesh>
      {/* Center tweeter dome with radial fins */}
      <mesh position={[0, 0.52, 0.415]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.02, 24]} />
        <MStd color="#17171a" metalness={0.6} roughness={0.25} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4).map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.035, 0.52 + Math.sin(a) * 0.035, 0.428]}>
          <boxGeometry args={[0.008, 0.03, 0.008]} />
          <MStd color="#2c2c31" roughness={0.5} />
        </mesh>
      ))}
      {/* Brand badge */}
      <mesh position={[0, 0.86, 0.365]}>
        <boxGeometry args={[0.16, 0.045, 0.012]} />
        <MStd color="#3a2c1c" metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  );

  return (
    <group>
      <Cabinet x={-0.42} z={0} angle={0.06} />
      <Cabinet x={0.42} z={0.08} angle={-0.06} />
    </group>
  );
}

export function Clock() {
  const ticks = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  return (
    <group>
      {/* Clock body */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 36]} rotation-x={Math.PI / 2} />
        <MStd color="#e5e7eb" roughness={0.35} />
      </mesh>
      {/* Face */}
      <mesh position={[0, 0.75, 0.052]}>
        <cylinderGeometry args={[0.44, 0.44, 0.015, 36]} rotation-x={Math.PI / 2} />
        <MStd color="#fafafa" roughness={0.25} />
      </mesh>
      {/* Hour ticks — longer at 12/3/6/9 */}
      {ticks.map((a, i) => {
        const major = i % 3 === 0;
        const len = major ? 0.09 : 0.05;
        const r = 0.36;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * r, 0.75 + Math.cos(a) * r, 0.062]}
            rotation={[0, 0, -a]}
          >
            <boxGeometry args={[major ? 0.028 : 0.016, len, 0.012]} />
            <MStd color="#374151" roughness={0.4} />
          </mesh>
        );
      })}
      {/* Hour hand (points to 12) */}
      <mesh position={[0, 0.85, 0.068]}>
        <boxGeometry args={[0.035, 0.22, 0.012]} />
        <MStd color="#1f2937" roughness={0.35} />
      </mesh>
      {/* Minute hand (points to 3) */}
      <mesh position={[0.14, 0.75, 0.07]}>
        <boxGeometry args={[0.3, 0.024, 0.012]} />
        <MStd color="#1f2937" roughness={0.35} />
      </mesh>
      {/* Center pin */}
      <mesh position={[0, 0.75, 0.075]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} rotation-x={Math.PI / 2} />
        <MStd color="#6b7280" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Pendulum rod */}
      <mesh position={[0, -0.15, 0.01]}>
        <cylinderGeometry args={[0.012, 0.012, 0.8, 10]} />
        <MStd color="#9ca3af" metalness={0.5} roughness={0.35} />
      </mesh>
      {/* Pendulum ring */}
      <mesh position={[0, -0.62, 0.01]}>
        <torusGeometry args={[0.09, 0.018, 10, 24]} />
        <MStd color="#9ca3af" metalness={0.5} roughness={0.35} />
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
  const { lightsOn } = useWorldToggles();
  return (
    <group>
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 1.4, 10]} />
        <MStd color="#374151" metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <MStd color={lightsOn ? "#fde047" : "#9ca3af"} emissive={lightsOn ? "#fbbf24" : "#000000"} emissiveIntensity={lightsOn ? 1.5 : 0} />
      </mesh>
      {lightsOn && <pointLight position={[0, 1.55, 0]} intensity={0.4} distance={5} color="#fef08a" />}
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

// ============ BALCONY — realistic pots & tea set (no plain boxes) ============

// Curved terracotta pot using a lathe geometry (rotational profile)
function CurvedPot({
  height = 0.8,
  topR = 0.36,
  midR = 0.42,
  bottomR = 0.24,
  color = "#b45309",
  rimColor = "#92400e",
}: {
  height?: number;
  topR?: number;
  midR?: number;
  bottomR?: number;
  color?: string;
  rimColor?: string;
}) {
  // Profile points from base to rim (x = radius, y = height)
  const points = [
    new THREE.Vector2(bottomR * 0.7, 0.0),
    new THREE.Vector2(bottomR, 0.05),
    new THREE.Vector2(midR * 0.95, height * 0.35),
    new THREE.Vector2(midR, height * 0.55),
    new THREE.Vector2(midR * 0.97, height * 0.75),
    new THREE.Vector2(topR, height * 0.95),
    new THREE.Vector2(topR + 0.04, height),
  ];
  return (
    <group>
      {/* Pot body */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <latheGeometry args={[points, 32]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Rim ring */}
      <mesh castShadow position={[0, height - 0.02, 0]}>
        <torusGeometry args={[topR + 0.02, 0.04, 12, 32]} />
        <meshStandardMaterial color={rimColor} roughness={0.8} />
      </mesh>
      {/* Soil disk */}
      <mesh receiveShadow position={[0, height - 0.04, 0]}>
        <cylinderGeometry args={[topR - 0.02, topR - 0.02, 0.05, 24]} />
        <meshStandardMaterial color="#3f2a14" roughness={1} />
      </mesh>
    </group>
  );
}

// Pattern decoration: vertical painted bands using slim rings
function PotPattern({ height = 0.8, radius = 0.42, color = "#fde047" }: { height?: number; radius?: number; color?: string }) {
  return (
    <group>
      {[0.3, 0.55, 0.8].map((y, i) => (
        <mesh key={i} position={[0, height * y, 0]}>
          <torusGeometry args={[radius + 0.005, 0.022, 8, 32]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// Foliage = clustered spheres (lush, organic look) — replaces the plain cone
function Foliage({ y = 0.9, scale = 1, color = "#16a34a", flowerColor }: { y?: number; scale?: number; color?: string; flowerColor?: string }) {
  const blobs: [number, number, number, number][] = [
    [0, 0, 0, 0.32],
    [0.18, 0.05, 0.08, 0.22],
    [-0.16, 0.07, -0.05, 0.24],
    [0.04, 0.18, -0.12, 0.2],
    [-0.08, 0.16, 0.15, 0.22],
    [0.1, 0.28, 0.05, 0.18],
  ];
  return (
    <group position={[0, y, 0]} scale={scale}>
      {blobs.map(([x, by, z, r], i) => (
        <mesh key={i} position={[x, by, z]} castShadow>
          <sphereGeometry args={[r, 14, 12]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
      {flowerColor && [
        [0.16, 0.22, -0.02],
        [-0.12, 0.12, 0.18],
        [0.02, 0.34, 0.12],
        [-0.18, 0.18, -0.1],
      ].map(([x, by, z], i) => (
        <mesh key={`f${i}`} position={[x, by, z]} castShadow>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color={flowerColor} emissive={flowerColor} emissiveIntensity={0.15} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function SmallPot() {
  return (
    <group>
      <CurvedPot height={0.7} topR={0.32} midR={0.38} bottomR={0.22} color="#b45309" />
      <Foliage y={0.66} scale={0.95} color="#16a34a" />
    </group>
  );
}

export function MidPot() {
  return (
    <group>
      <CurvedPot height={0.9} topR={0.4} midR={0.46} bottomR={0.26} color="#9a3412" />
      <Foliage y={0.86} scale={1.1} color="#15803d" flowerColor="#f472b6" />
    </group>
  );
}

export function TallPot() {
  return (
    <group>
      <CurvedPot height={1.4} topR={0.36} midR={0.42} bottomR={0.24} color="#7c2d12" rimColor="#5b1d0a" />
      <Foliage y={1.36} scale={1.25} color="#15803d" />
    </group>
  );
}

export function PatternPotSmall() {
  return (
    <group>
      <CurvedPot height={0.7} topR={0.32} midR={0.38} bottomR={0.22} color="#c2410c" rimColor="#9a3412" />
      <PotPattern height={0.7} radius={0.38} color="#fde047" />
      <Foliage y={0.66} scale={0.95} color="#16a34a" flowerColor="#fb7185" />
    </group>
  );
}

export function PatternPotMid() {
  return (
    <group>
      <CurvedPot height={0.9} topR={0.4} midR={0.46} bottomR={0.26} color="#9f1239" rimColor="#7f1d1d" />
      <PotPattern height={0.9} radius={0.46} color="#fcd34d" />
      <Foliage y={0.86} scale={1.1} color="#16a34a" flowerColor="#e11d48" />
    </group>
  );
}

export function PatternPotTall() {
  return (
    <group>
      <CurvedPot height={1.4} topR={0.38} midR={0.46} bottomR={0.26} color="#7f1d1d" rimColor="#450a0a" />
      <PotPattern height={1.4} radius={0.46} color="#fcd34d" />
      <Foliage y={1.36} scale={1.25} color="#15803d" flowerColor="#f97316" />
    </group>
  );
}

// Ghế nhựa đỏ dựa theo ảnh tham chiếu: mặt ghế bo tròn, chân choãi nhẹ,
// tựa lưng cao với ba nan dọc và bề mặt nhựa bóng.
export function PlasticChair() {
  const plastic = "#d71912";
  const plasticDark = "#a90f0a";
  const legPositions: Array<[number, number, number, number, number]> = [
    [-0.34, 0.35, 0.31, -0.07, 0.07],
    [0.34, 0.35, 0.31, -0.07, -0.07],
    [-0.34, 0.35, -0.31, 0.07, 0.07],
    [0.34, 0.35, -0.31, 0.07, -0.07],
  ];

  return (
    <group>
      {legPositions.map(([x, y, z, rx, rz], index) => (
        <mesh key={index} castShadow position={[x, y, z]} rotation={[rx, 0, rz]}>
          <cylinderGeometry args={[0.055, 0.075, 0.7, 12]} />
          <MStd color={index < 2 ? plastic : plasticDark} roughness={0.28} />
        </mesh>
      ))}

      <RoundedBox args={[0.88, 0.14, 0.88]} radius={0.09} smoothness={3} castShadow receiveShadow position={[0, 0.72, 0]}>
        <MStd color={plastic} roughness={0.24} />
      </RoundedBox>
      <mesh castShadow position={[0, 0.77, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.64, 0.58]} />
        <meshStandardMaterial color="#ef3027" roughness={0.2} />
      </mesh>

      {[-0.39, 0.39].map((x) => (
        <mesh key={x} castShadow position={[x, 1.18, -0.37]} rotation={[-0.08, 0, x * -0.08]}>
          <capsuleGeometry args={[0.065, 0.78, 6, 12]} />
          <MStd color={plastic} roughness={0.25} />
        </mesh>
      ))}
      <RoundedBox args={[0.83, 0.13, 0.12]} radius={0.055} smoothness={3} castShadow position={[0, 1.57, -0.38]}>
        <MStd color={plastic} roughness={0.22} />
      </RoundedBox>
      <RoundedBox args={[0.78, 0.1, 0.1]} radius={0.04} smoothness={3} castShadow position={[0, 0.88, -0.37]}>
        <MStd color={plasticDark} roughness={0.28} />
      </RoundedBox>
      {[-0.25, 0, 0.25].map((x) => (
        <mesh key={x} castShadow position={[x, 1.23, -0.37]} rotation={[-0.05, 0, x * -0.08]}>
          <capsuleGeometry args={[0.045, 0.56, 6, 10]} />
          <MStd color={plastic} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// Curvy chair using lathe back + soft cushion sphere — far from a cube
export function BalconyChair() {
  // Curved seat back profile
  const backProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.04, 0.4),
    new THREE.Vector2(0.06, 0.9),
    new THREE.Vector2(0.04, 1.1),
    new THREE.Vector2(0.0, 1.15),
  ];
  return (
    <group>
      {/* Curved seat (squashed cushion sphere) */}
      <mesh castShadow position={[0, 0.5, 0]} scale={[0.9, 0.35, 0.95]}>
        <sphereGeometry args={[0.5, 24, 18]} />
        <meshStandardMaterial color="#facc15" roughness={0.7} />
      </mesh>
      {/* Lathe-curved back rest */}
      <group position={[0, 0.6, -0.4]} rotation={[Math.PI / 12, 0, 0]}>
        <mesh castShadow>
          <latheGeometry args={[backProfile, 24]} />
          <meshStandardMaterial color="#a16207" roughness={0.6} />
        </mesh>
      </group>
      {/* 4 curved legs (tapered cylinders, tilted slightly outward) */}
      {[
        [0.32, 0.32, 0.05, 0.05],
        [-0.32, 0.32, -0.05, 0.05],
        [0.3, -0.3, 0.05, -0.05],
        [-0.3, -0.3, -0.05, -0.05],
      ].map(([x, z, rz, rx], i) => (
        <mesh key={i} castShadow position={[x, 0.22, z]} rotation={[rx, 0, rz]}>
          <cylinderGeometry args={[0.04, 0.06, 0.45, 12]} />
          <meshStandardMaterial color="#3f2a14" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// Round bistro tea table with curved pedestal + saucer + teapot on top
export function BalconyTable() {
  return (
    <group>
      {/* Base pedestal — curved profile */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.1, 24]} />
        <meshStandardMaterial color="#52341e" roughness={0.7} />
      </mesh>
      {/* Slim column */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 18]} />
        <meshStandardMaterial color="#3f2a14" roughness={0.6} />
      </mesh>
      {/* Round table top with bevelled edge */}
      <mesh castShadow position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.08, 32]} />
        <meshStandardMaterial color="#a16207" roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 0.83, 0]}>
        <torusGeometry args={[0.85, 0.04, 12, 40]} />
        <meshStandardMaterial color="#78350f" roughness={0.5} />
      </mesh>
      {/* Decorative teapot (sphere body + curved spout + handle ring) */}
      <group position={[0, 0.93, 0]}>
        <mesh castShadow position={[0, 0.13, 0]}>
          <sphereGeometry args={[0.18, 20, 16]} />
          <meshStandardMaterial color="#f5f3ee" roughness={0.4} metalness={0.05} />
        </mesh>
        <mesh castShadow position={[0.22, 0.16, 0]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.045, 0.18, 10]} />
          <meshStandardMaterial color="#f5f3ee" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[-0.2, 0.13, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.07, 0.022, 8, 18]} />
          <meshStandardMaterial color="#f5f3ee" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.04, 12, 10]} />
          <meshStandardMaterial color="#a16207" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// Tea set = round table with 2 elegant chairs (replaces the previous cube-cup version)
export function TeaSet() {
  return (
    <group>
      <BalconyTable />
      <group position={[1.25, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <BalconyChair />
      </group>
      <group position={[-1.25, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <BalconyChair />
      </group>
    </group>
  );
}


export function ItemModel({ item, label, placedId }: { item: CatalogItem; label?: string; placedId?: string }) {
  switch (item.id) {
    case "tree": return <Tree />;
    case "bigtree": return <BigTree />;
    case "sofa": return <Sofa w={item.w} d={item.d} />;
    case "sofa_large": return <LargeSofa />;
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
    case "door": return <Door placedId={placedId} />;
    case "mailbox": return <Mailbox />;
    case "wardrobe": return <Wardrobe w={item.w} h={item.h} />;
    case "table": return <Table w={item.w} d={item.d} h={item.h} />;
    case "roundtable": return <RoundTable />;
    case "desk": return <Desk />;
    case "tvstand": return <TVStand w={item.w} />;
    case "sign": return <Sign w={item.w} label={label} />;
    case "pillar": return <Pillar />;
    case "floor": return <Floor />;
    case "roof": return <Roof />;
    case "roof_ton": return <RoofTon />;
    case "window": return <Window />;
    case "curtain": return <Curtain />;
    case "painting": return <Painting w={item.w} />;
    case "fan": return <Fan />;
    case "ceilingfan": return <CeilingFan />;
    case "speaker": return <Speaker />;
    case "soundbar": return <SoundbarSet />;
    case "bookshelf_speaker": return <BookshelfSpeakers />;
    case "coolingfan": return <X.CoolingFan />;
    case "tvcab_walnut": return <X.WalnutTVCabinet />;
    case "smarttv": return <X.SmartTV />;
    case "standfan": return <X.StandingFan />;
    case "sofa_black": return <X.BlackModularSofa />;
    case "tvcab_oak": return <X.OakTVCabinet />;
    case "storage_white": return <X.WhiteStorageCabinet />;
    case "cafetable": return <X.CafeTable />;
    case "holofan": return <X.HologramFan />;
    case "octaclock": return <X.OctagonClock />;
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
    case "midpot": return <MidPot />;
    case "tallpot": return <TallPot />;
    case "patternpot_s": return <PatternPotSmall />;
    case "patternpot_m": return <PatternPotMid />;
    case "patternpot_l": return <PatternPotTall />;
    case "chair": return <PlasticChair />;
    case "balconychair": return <BalconyChair />;
    case "balconytable": return <BalconyTable />;
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
