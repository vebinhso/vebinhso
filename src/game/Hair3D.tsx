import type { HairStyleId } from "@/lib/hair";

/** Tóc 3D cho đầu hình cầu tâm (0,1.65,0) bán kính 0.3. Nhân vật nhìn về +Z. */
export function Hair3D({ style, color }: { style: HairStyleId; color: string }) {
  const m = <meshStandardMaterial color={color} roughness={0.8} />;
  const cap = (
    <mesh castShadow position={[0, 1.68, -0.02]}>
      <sphereGeometry args={[0.32, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      {m}
    </mesh>
  );
  const longBack = (len: number) => (
    <mesh castShadow position={[0, 1.68 - len / 2, -0.16]}>
      <boxGeometry args={[0.6, len, 0.22]} />
      {m}
    </mesh>
  );
  switch (style) {
    case "spiky":
      return (
        <group>
          {cap}
          {[-0.18, -0.06, 0.06, 0.18].map((x, i) => (
            <mesh key={x} castShadow position={[x, 2.0, i % 2 ? 0.02 : -0.06]}>
              <coneGeometry args={[0.08, 0.2, 6]} />{m}
            </mesh>
          ))}
        </group>
      );
    case "sidesweep":
      return (
        <group>
          {cap}
          <mesh castShadow position={[0.1, 1.86, 0.2]} rotation={[0.3, 0, -0.35]}>
            <boxGeometry args={[0.38, 0.1, 0.12]} />{m}
          </mesh>
        </group>
      );
    case "pompadour":
      return (
        <group>
          {cap}
          <mesh castShadow position={[0, 2.0, 0.12]} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.2, 14, 10]} />{m}
          </mesh>
        </group>
      );
    case "curlyshort":
      return (
        <group>
          {cap}
          {[[-0.2, 1.9, 0.1], [0, 1.98, 0.12], [0.2, 1.9, 0.1], [-0.22, 1.85, -0.15], [0.22, 1.85, -0.15], [0, 1.95, -0.18]].map((p, i) => (
            <mesh key={i} castShadow position={p as [number, number, number]}>
              <sphereGeometry args={[0.12, 10, 8]} />{m}
            </mesh>
          ))}
        </group>
      );
    case "bun":
      return (
        <group>
          {cap}
          <mesh castShadow position={[0, 2.02, -0.06]}><sphereGeometry args={[0.13, 12, 10]} />{m}</mesh>
        </group>
      );
    case "twinbuns":
      return (
        <group>
          {cap}
          <mesh castShadow position={[-0.22, 1.96, -0.04]}><sphereGeometry args={[0.11, 12, 10]} />{m}</mesh>
          <mesh castShadow position={[0.22, 1.96, -0.04]}><sphereGeometry args={[0.11, 12, 10]} />{m}</mesh>
        </group>
      );
    case "bob":
      return <group>{cap}{longBack(0.42)}</group>;
    case "longstraight":
    case "sidebang":
      return (
        <group>
          {cap}
          {longBack(0.78)}
          {style === "sidebang" && (
            <mesh castShadow position={[-0.16, 1.66, 0.24]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.14, 0.34, 0.06]} />{m}
            </mesh>
          )}
        </group>
      );
    case "longwavy":
    case "longcurly":
      return (
        <group>
          {cap}
          {longBack(0.5)}
          {[1.3, 1.16].map((y) =>
            [-0.22, 0, 0.22].map((x) => (
              <mesh key={`${x}${y}`} castShadow position={[x, y, -0.16]}>
                <sphereGeometry args={[style === "longcurly" ? 0.12 : 0.1, 10, 8]} />{m}
              </mesh>
            )),
          )}
        </group>
      );
    case "pigtails":
      return (
        <group>
          {cap}
          <mesh castShadow position={[-0.34, 1.5, -0.04]}><capsuleGeometry args={[0.08, 0.28, 4, 8]} />{m}</mesh>
          <mesh castShadow position={[0.34, 1.5, -0.04]}><capsuleGeometry args={[0.08, 0.28, 4, 8]} />{m}</mesh>
        </group>
      );
    default:
      return cap;
  }
}
