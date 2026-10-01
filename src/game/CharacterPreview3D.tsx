import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import type { Outfit } from "@/lib/character";
import { bodyOf, faceOf } from "@/lib/appearance";
import { equippedBySlot } from "@/lib/accessories";
import { HeadBodyAccessory3D, ArmAccessory3D } from "./Accessory3D";
import { Hair3D } from "./Hair3D";
import { isHairStyle, DEFAULT_HAIR_STYLE } from "@/lib/hair";
import { bottomOf, topOf } from "@/lib/clothes";

function Figure({ o }: { o: Outfit }) {
  const acc = equippedBySlot(o.accessories);
  const b = bodyOf(o.bodyShape);
  const top = topOf(o.topStyle);
  const bot = bottomOf(o.bottomStyle);
  const shirt = top?.color ?? o.shirt;
  const shirt2 = top?.color2 ?? o.accent;
  const pants = bot?.color ?? o.pants;
  const skirt = bot && (bot.kind === "skirt" || bot.kind === "longskirt");
  const shorts = bot?.kind === "shorts";
  const legColor = skirt || shorts ? o.skin : pants;
  const helmet = top?.helmet;
  return (
    <group position={[0, -1, 0]}>
      {[-0.18, 0.18].map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, 0.35, 0]}>
            <boxGeometry args={[bot?.kind === "wide" ? 0.28 : 0.22, 0.7, 0.22]} />
            <meshStandardMaterial color={legColor} />
          </mesh>
          {shorts && (
            <mesh position={[x, 0.6, 0]}>
              <boxGeometry args={[0.26, 0.24, 0.26]} />
              <meshStandardMaterial color={pants} />
            </mesh>
          )}
        </group>
      ))}
      <Shoes3D shoeStyle={o.shoeStyle} fallbackColor={o.shoes} />
      {skirt && (
        <mesh position={[0, bot!.kind === "longskirt" ? 0.42 : 0.56, 0]}>
          <cylinderGeometry args={[0.36, bot!.kind === "longskirt" ? 0.55 : 0.48, bot!.kind === "longskirt" ? 0.62 : 0.34, 20]} />
          <meshStandardMaterial color={pants} />
        </mesh>
      )}
      <mesh castShadow position={[0, 1.02, 0]} scale={[b.top / 32, 1, (b.waist + 32) / 64]}>
        <boxGeometry args={[0.65, 0.65, 0.38]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      {top?.long && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.34, 0.42, 0.42, 20]} />
          <meshStandardMaterial color={shirt} />
        </mesh>
      )}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[0.68, 0.08, 0.4]} />
        <meshStandardMaterial color={shirt2} />
      </mesh>
      <mesh castShadow position={[-0.42, 1.05, 0]}>
        <boxGeometry args={[0.18, 0.62, 0.22]} />
        <meshStandardMaterial color={shirt} />
        {acc.wrist && <ArmAccessory3D id={acc.wrist} />}
      </mesh>
      <mesh castShadow position={[0.42, 1.05, 0]}>
        <boxGeometry args={[0.18, 0.62, 0.22]} />
        <meshStandardMaterial color={shirt} />
        {acc.finger && <ArmAccessory3D id={acc.finger} />}
      </mesh>
      <mesh castShadow position={[0, 1.65, 0]} scale={faceOf(o.faceShape).s3 as unknown as [number, number, number]}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color={helmet ? top!.color : o.skin} />
      </mesh>
      {!helmet && !acc.head && <Hair3D style={isHairStyle(o.hairStyle) ? o.hairStyle : DEFAULT_HAIR_STYLE} color={o.hair} />}
      {!helmet && acc.beard && <HeadBodyAccessory3D id={acc.beard} hair={o.hair} />}
      {!helmet && acc.head && <HeadBodyAccessory3D id={acc.head} hair={o.hair} />}
      {acc.neck && <HeadBodyAccessory3D id={acc.neck} hair={o.hair} />}
      {o.hat && !acc.head && !helmet && (
        <mesh position={[0, 1.98, 0]}>
          <coneGeometry args={[0.34, 0.32, 16]} />
          <meshStandardMaterial color={o.hat} />
        </mesh>
      )}
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 1.68, 0.26]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color={helmet ? "#111" : "#111"} />
        </mesh>
      ))}
    </group>
  );
}

export default function CharacterPreview3D({ o }: { o: Outfit }) {
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0.6, 3.4], fov: 40 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} castShadow />
      <directionalLight position={[-3, 2, -3]} intensity={0.4} />
      <Figure o={o} />
      <ContactShadows position={[0, -1, 0]} opacity={0.35} scale={4} blur={2} />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={5} target={[0, 0.2, 0]} autoRotate autoRotateSpeed={1.2} />
    </Canvas>
  );
}
