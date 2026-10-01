import { shoeOf } from "@/lib/clothes";

/** Một chiếc giày 3D theo kiểu; gốc tại mặt đất, mũi hướng +z. */
function OneShoe({ kind, color, color2 }: { kind: string; color: string; color2: string }) {
  switch (kind) {
    case "boot":
      return (
        <group>
          <mesh castShadow position={[0, 0.05, 0.05]}><boxGeometry args={[0.26, 0.1, 0.36]} /><meshStandardMaterial color={color} /></mesh>
          <mesh castShadow position={[0, 0.2, -0.06]}><boxGeometry args={[0.24, 0.3, 0.22]} /><meshStandardMaterial color={color} /></mesh>
          <mesh position={[0, 0.05, 0.06]}><boxGeometry args={[0.28, 0.05, 0.38]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    case "tallboot":
      return (
        <group>
          <mesh castShadow position={[0, 0.05, 0.05]}><boxGeometry args={[0.26, 0.1, 0.36]} /><meshStandardMaterial color={color} /></mesh>
          <mesh castShadow position={[0, 0.32, -0.05]}><boxGeometry args={[0.24, 0.56, 0.22]} /><meshStandardMaterial color={color} /></mesh>
          <mesh position={[0, 0.58, -0.05]}><boxGeometry args={[0.26, 0.06, 0.24]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    case "flat":
      return (
        <group>
          <mesh castShadow position={[0, 0.045, 0.05]}><boxGeometry args={[0.24, 0.09, 0.34]} /><meshStandardMaterial color={color} /></mesh>
          <mesh position={[0, 0.1, 0.12]}><boxGeometry args={[0.12, 0.03, 0.1]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    case "heel":
      return (
        <group>
          <mesh castShadow position={[0, 0.09, 0.07]} rotation-x={-0.25}><boxGeometry args={[0.22, 0.07, 0.32]} /><meshStandardMaterial color={color} /></mesh>
          <mesh castShadow position={[0, 0.05, -0.08]}><boxGeometry args={[0.08, 0.12, 0.08]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    case "sandal":
      return (
        <group>
          <mesh castShadow position={[0, 0.03, 0.05]}><boxGeometry args={[0.24, 0.06, 0.34]} /><meshStandardMaterial color={color2} /></mesh>
          <mesh position={[0, 0.08, 0.1]}><boxGeometry args={[0.22, 0.03, 0.06]} /><meshStandardMaterial color={color} /></mesh>
          <mesh position={[0, 0.08, 0.0]}><boxGeometry args={[0.22, 0.03, 0.06]} /><meshStandardMaterial color={color} /></mesh>
        </group>
      );
    case "clogs":
      return (
        <group>
          <mesh castShadow position={[0, 0.07, 0.04]}><boxGeometry args={[0.26, 0.14, 0.34]} /><meshStandardMaterial color={color} /></mesh>
          <mesh position={[0, 0.03, 0.05]}><boxGeometry args={[0.28, 0.05, 0.36]} /><meshStandardMaterial color={color2} /></mesh>
        </group>
      );
    default: // sneaker
      return (
        <group>
          <mesh castShadow position={[0, 0.07, 0.05]}><boxGeometry args={[0.26, 0.14, 0.36]} /><meshStandardMaterial color={color} /></mesh>
          <mesh position={[0, 0.025, 0.06]}><boxGeometry args={[0.28, 0.05, 0.38]} /><meshStandardMaterial color={color2} /></mesh>
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
