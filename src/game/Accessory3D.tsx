import type { AccessoryId, AccessorySlot } from "@/lib/accessories";

const SILVER = <meshStandardMaterial color="#e4e4e7" metalness={0.9} roughness={0.2} />;

/** Phụ kiện gắn vào đầu/thân (đầu tâm 0,1.65,0 r0.3; ngực trên y≈1.34, mặt trước z≈0.19). */
export function HeadBodyAccessory3D({ id, hair }: { id: AccessoryId; hair: string }) {
  const m = <meshStandardMaterial color={id === "beard_long" ? "#e5e7eb" : hair} roughness={0.9} />;
  switch (id) {
    case "beard_mustache":
      return <mesh position={[0, 1.57, 0.28]}><boxGeometry args={[0.2, 0.05, 0.05]} />{m}</mesh>;
    case "beard_goatee":
      return (
        <group>
          <mesh position={[0, 1.57, 0.28]}><boxGeometry args={[0.18, 0.04, 0.05]} />{m}</mesh>
          <mesh position={[0, 1.43, 0.22]}><sphereGeometry args={[0.07, 10, 8]} />{m}</mesh>
        </group>
      );
    case "beard_full":
      return (
        <mesh position={[0, 1.55, 0.04]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.315, 18, 10, -Math.PI * 0.15, Math.PI * 1.3, 0, Math.PI / 2.2]} />{m}
        </mesh>
      );
    case "beard_chinstrap":
      return (
        <mesh position={[0, 1.6, 0.02]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.31, 18, 8, -Math.PI * 0.1, Math.PI * 1.2, Math.PI / 3, Math.PI / 7]} />{m}
        </mesh>
      );
    case "beard_horseshoe":
      return (
        <group>
          <mesh position={[0, 1.57, 0.28]}><boxGeometry args={[0.2, 0.05, 0.05]} />{m}</mesh>
          <mesh position={[-0.09, 1.49, 0.26]}><boxGeometry args={[0.04, 0.16, 0.04]} />{m}</mesh>
          <mesh position={[0.09, 1.49, 0.26]}><boxGeometry args={[0.04, 0.16, 0.04]} />{m}</mesh>
        </group>
      );
    case "beard_long":
      return <mesh position={[0, 1.32, 0.2]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.17, 0.5, 10]} />{m}</mesh>;
    case "head_keffiyeh":
      return (
        <group>
          <mesh position={[0, 1.7, -0.02]}><sphereGeometry args={[0.34, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.8]} /><meshStandardMaterial color="#f4f4f5" /></mesh>
          <mesh position={[0, 1.38, -0.12]}><boxGeometry args={[0.72, 0.6, 0.26]} /><meshStandardMaterial color="#f4f4f5" /></mesh>
          <mesh position={[0, 1.86, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.3, 0.03, 8, 24]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      );
    case "head_hijab":
      return (
        <group>
          <mesh position={[0, 1.66, -0.03]}><sphereGeometry args={[0.345, 18, 14, Math.PI * 0.62, Math.PI * 1.76]} /><meshStandardMaterial color="#a1a1aa" side={2} /></mesh>
          <mesh position={[0, 1.36, 0]}><cylinderGeometry args={[0.24, 0.36, 0.14, 18]} /><meshStandardMaterial color="#a1a1aa" /></mesh>
        </group>
      );
    case "neck_layered":
      return (
        <group position={[0, 1.33, 0.0]}>
          <mesh rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[0.2, 0.012, 6, 28]} />{SILVER}</mesh>
          <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2.2, 0, 0]}><torusGeometry args={[0.22, 0.012, 6, 28]} />{SILVER}</mesh>
          <mesh position={[0, -0.12, 0.21]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.05} /></mesh>
        </group>
      );
    default:
      return null;
  }
}

/** Phụ kiện gắn vào tay (toạ độ trong khối tay: tâm 0,0,0; đáy y=-0.31). */
export function ArmAccessory3D({ id }: { id: AccessoryId }) {
  if (id === "wrist_bangle") {
    return <mesh position={[0, -0.24, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.13, 0.018, 8, 24]} />{SILVER}</mesh>;
  }
  if (id === "finger_heart") {
    return (
      <group position={[0, -0.34, 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.04, 0.012, 6, 16]} />{SILVER}</mesh>
        <mesh position={[0, 0.04, 0]}><octahedronGeometry args={[0.035]} /><meshStandardMaterial color="#dbeafe" metalness={0.2} roughness={0.05} /></mesh>
      </group>
    );
  }
  return null;
}

export const HEAD_BODY_SLOTS: AccessorySlot[] = ["beard", "head", "neck"];
