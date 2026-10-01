// Ảnh polaroid nhóm bạn treo tường — dùng ảnh người dùng tải lên.
import { Suspense } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import photo from "@/assets/polaroid-ban-be.jpg.asset.json";

function PhotoFace() {
  const tex = useTexture(photo.url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return <mesh position={[0, 0.8, 0.026]}><planeGeometry args={[1.0, 1.65]} /><meshStandardMaterial map={tex} roughness={0.35} /></mesh>;
}

export function PolaroidFriendsPhoto() {
  return (
    <group>
      <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.04, 1.7, 0.05]} /><meshStandardMaterial color="#f4f2ee" roughness={0.6} /></mesh>
      <Suspense fallback={<mesh position={[0, 0.8, 0.026]}><planeGeometry args={[1.0, 1.65]} /><meshStandardMaterial color="#cfd8de" /></mesh>}>
        <PhotoFace />
      </Suspense>
    </group>
  );
}
