import type { HairStyleId } from "@/lib/hair";

/** Tóc 3D cho đầu chibi tâm (0,1.82,0), nhân vật nhìn về +Z. */
export function Hair3D({ style, color }: { style: HairStyleId; color: string }) {
  const m = <meshStandardMaterial color={color} roughness={0.8} />;
  const cap = (
    <mesh castShadow position={[0, 1.85, -0.03]} scale={[1.18, 1.12, 1.08]}>
      <sphereGeometry args={[0.39, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      {m}
    </mesh>
  );
  const fringe = (
    <group>
      {[-0.24, -0.12, 0, 0.12, 0.24].map((x, i) => (
        <mesh key={x} castShadow position={[x, 1.995 - Math.abs(i - 2) * 0.012, 0.31]} rotation={[0.12, 0, (i - 2) * -0.05]} scale={[1, i % 2 ? 1.08 : 0.92, 0.72]}>
          <capsuleGeometry args={[0.052, 0.16, 7, 12]} />{m}
        </mesh>
      ))}
    </group>
  );
  const longBack = (len: number) => (
    <mesh castShadow position={[0, 1.78 - len / 2, -0.22]} scale={[1, 1, 0.72]}>
      <capsuleGeometry args={[0.31, len, 7, 16]} />
      {m}
    </mesh>
  );
  switch (style) {
    case "spiky":
      return (
        <group>
          {cap}
          {[-0.18, -0.06, 0.06, 0.18].map((x, i) => (
            <mesh key={x} castShadow position={[x * 1.25, 2.22, i % 2 ? 0.02 : -0.06]}>
              <coneGeometry args={[0.08, 0.2, 6]} />{m}
            </mesh>
          ))}
        </group>
      );
    case "sidesweep":
      return (
        <group>
          {cap}
          <mesh castShadow position={[0.1, 2.04, 0.27]} rotation={[0.3, 0, -0.35]}>
            <capsuleGeometry args={[0.065, 0.34, 5, 12]} />{m}
          </mesh>
        </group>
      );
    case "pompadour":
      return (
        <group>
          {cap}
          <mesh castShadow position={[0, 2.22, 0.1]} scale={[1.3, 0.65, 1]}>
            <sphereGeometry args={[0.22, 16, 12]} />{m}
          </mesh>
        </group>
      );
    case "curlyshort":
      return (
        <group>
          {cap}
          {[[-0.27, 2.08, 0.1], [0, 2.2, 0.14], [0.27, 2.08, 0.1], [-0.29, 2.02, -0.15], [0.29, 2.02, -0.15], [0, 2.16, -0.2]].map((p, i) => (
            <mesh key={i} castShadow position={p as [number, number, number]}>
              <sphereGeometry args={[0.15, 12, 10]} />{m}
            </mesh>
          ))}
        </group>
      );
    case "bun":
      return (
        <group>
          {cap}
          <mesh castShadow position={[0, 2.28, -0.06]}><sphereGeometry args={[0.17, 14, 12]} />{m}</mesh>
        </group>
      );
    case "twinbuns":
      return (
        <group>
          {cap}
          {fringe}
          <mesh castShadow position={[-0.38, 2.1, -0.02]}><sphereGeometry args={[0.17, 16, 12]} />{m}</mesh>
          <mesh castShadow position={[0.38, 2.1, -0.02]}><sphereGeometry args={[0.17, 16, 12]} />{m}</mesh>
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
            <mesh castShadow position={[-0.2, 1.87, 0.31]} rotation={[0, 0, 0.3]}>
              <capsuleGeometry args={[0.07, 0.34, 5, 12]} />{m}
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
          {[1.38, 1.2].map((y) =>
            [-0.29, 0, 0.29].map((x) => (
              <mesh key={`${x}${y}`} castShadow position={[x, y, -0.16]}>
                <sphereGeometry args={[style === "longcurly" ? 0.15 : 0.12, 12, 10]} />{m}
              </mesh>
            )),
          )}
        </group>
      );
    case "pigtails":
      return (
        <group>
          {cap}
          {fringe}
          {([-1, 1] as const).map((side) => <group key={side}>
            {[1.87, 1.72, 1.57].map((y, i) => <mesh key={y} castShadow position={[side * (0.42 + (i % 2) * 0.035), y, -0.02]}><sphereGeometry args={[0.13, 14, 12]} />{m}</mesh>)}
            <mesh position={[side * 0.4, 1.99, 0.02]}><torusGeometry args={[0.105, 0.035, 8, 18]} /><meshStandardMaterial color="#ef4135" roughness={0.72} /></mesh>
          </group>)}
        </group>
      );
    default:
      return cap;
  }
}
