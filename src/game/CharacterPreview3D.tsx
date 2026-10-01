import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Lightformer } from "@react-three/drei";
import type { Outfit } from "@/lib/character";
import { ChibiCharacter3D } from "./ChibiCharacter3D";

export default function CharacterPreview3D({ o }: { o: Outfit }) {
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.15, 4.25], fov: 36 }}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 5, 4]} intensity={1.45} castShadow />
      <directionalLight position={[-3, 2, -3]} intensity={0.55} />
      <Environment><Lightformer intensity={1.5} position={[0, 4, 2]} scale={[5, 5, 1]} /></Environment>
      <group position={[0, -1.05, 0]}><ChibiCharacter3D o={o} /></group>
      <ContactShadows position={[0, -1.02, 0]} opacity={0.28} scale={4} blur={2.5} />
      <OrbitControls enablePan={false} minDistance={2.8} maxDistance={5.5} target={[0, 0.1, 0]} autoRotate autoRotateSpeed={0.8} />
    </Canvas>
  );
}
