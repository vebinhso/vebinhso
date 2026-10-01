import { shoeOf } from "@/lib/clothes";

/** Một chiếc giày 3D theo kiểu; gốc tại mặt đất, mũi hướng +z. */
function OneShoe({ kind, color, color2 }: { kind: string; color: string; color2: string }) {
  switch (kind) {
    case "boot":
      return (
        <group>
          <mesh castShadow position={[0, 0.08, 0.06]} scale={[1, 0.75, 1.25]}><capsuleGeometry args={[0.13, 0.16, 6, 14]} /><meshStandardMaterial color={color} roughness={0.75} /></mesh>
          <mesh castShadow position={[0, 0.22, -0.06]}><capsuleGeometry args={[0.12, 0.22, 6, 14]} /><meshStandardMaterial color={color} roughness={0.75} /></mesh>
          <mesh position={[0, 0.035, 0.06]} scale={[1, 0.35, 1.28]}><capsuleGeometry args={[0.14, 0.17, 6, 14]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    case "tallboot":
      return (
        <group>
          <mesh castShadow position={[0, 0.08, 0.06]} scale={[1, 0.75, 1.25]}><capsuleGeometry args={[0.13, 0.16, 6, 14]} /><meshStandardMaterial color={color} roughness={0.75} /></mesh>
          <mesh castShadow position={[0, 0.35, -0.04]}><capsuleGeometry args={[0.125, 0.48, 6, 14]} /><meshStandardMaterial color={color} roughness={0.75} /></mesh>
          <mesh position={[0, 0.62, -0.04]} scale={[1.08, 0.35, 1.08]}><torusGeometry args={[0.12, 0.025, 6, 18]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    case "flat":
      return (
        <group>
          <mesh castShadow position={[0, 0.065, 0.06]} scale={[1, 0.62, 1.22]}><capsuleGeometry args={[0.13, 0.16, 6, 14]} /><meshStandardMaterial color={color} roughness={0.75} /></mesh>
          <mesh position={[0, 0.13, 0.11]}><sphereGeometry args={[0.045, 12, 8]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    case "heel":
      return (
        <group>
          <mesh castShadow position={[0, 0.1, 0.07]} rotation-x={-0.22} scale={[1, 0.45, 1.2]}><capsuleGeometry args={[0.12, 0.16, 6, 14]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>
          <mesh castShadow position={[0, 0.07, -0.08]}><cylinderGeometry args={[0.035, 0.045, 0.14, 10]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    case "sandal":
      return (
        <group>
          <mesh castShadow position={[0, 0.03, 0.06]} scale={[1, 0.25, 1.25]}><capsuleGeometry args={[0.13, 0.16, 5, 12]} /><meshStandardMaterial color={color2} /></mesh>
          {[0.01, 0.12].map((z) => <mesh key={z} position={[0, 0.09, z]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.1, 0.025, 6, 16, Math.PI]} /><meshStandardMaterial color={color} /></mesh>)}
        </group>
      );
    case "clogs":
      return (
        <group>
          <mesh castShadow position={[0, 0.09, 0.06]} scale={[1, 0.78, 1.24]}><capsuleGeometry args={[0.14, 0.17, 6, 14]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>
          <mesh position={[0, 0.025, 0.06]} scale={[1.05, 0.28, 1.28]}><capsuleGeometry args={[0.14, 0.17, 6, 14]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    default: // sneaker
      return (
        <group>
          <mesh castShadow position={[0, 0.09, 0.06]} scale={[1, 0.78, 1.26]}><capsuleGeometry args={[0.14, 0.17, 6, 14]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>
          <mesh position={[0, 0.025, 0.06]} scale={[1.05, 0.28, 1.3]}><capsuleGeometry args={[0.14, 0.17, 6, 14]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
  }
}

export function Shoes3D({ shoeStyle, fallbackColor }: { shoeStyle?: string; fallbackColor: string }) {
  const s = shoeOf(shoeStyle);
  const kind = s?.kind ?? "sneaker";
  const color = s?.color ?? fallbackColor;
  const color2 = s?.color2 ?? "#e5e5e5";
  return (
    <>
      {[-0.18, 0.18].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <OneShoe kind={kind} color={color} color2={color2} />
        </group>
      ))}
    </>
  );
}
