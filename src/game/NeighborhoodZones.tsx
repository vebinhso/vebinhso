import { memo, Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/locale";
import { PARK_ORIGIN, GARDEN_ORIGIN, gardenSlotPosition, ridePose, type GardenPlant, type RideKind } from "@/lib/neighborhood";
import cartAsset from "@/assets/neighborhood/cart.glb.asset.json";
import treeAsset from "@/assets/neighborhood/tree.glb.asset.json";
import roseAsset from "@/assets/neighborhood/rose.glb.asset.json";
import flowerAsset from "@/assets/neighborhood/flower.glb.asset.json";

const palette = { path: "#b8b2a6", rail: "#dc4f45", support: "#558b9b", wheel: "#e9b644", cabin: "#36a6a5", soil: "#79533d", leaf: "#498246", cream: "#fff1d0", pink: "#d35c8f", wall: "#e7b447", roof: "#514a45", door: "#3d332d", trim: "#f5e1aa" };
const box = new THREE.BoxGeometry(1, 1, 1);
const mats = Object.fromEntries(Object.entries(palette).map(([k, color]) => [k, new THREE.MeshStandardMaterial({ color, roughness: 0.72 })]));
function Block({ p, s, mat = "support" }: { p: [number, number, number]; s: [number, number, number]; mat?: string }) {
  return <mesh geometry={box} material={mats[mat]} position={p} scale={s} />;
}
function Model({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} scale={scale} />;
}
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-21, 2, 9), new THREE.Vector3(-22, 6, -4), new THREE.Vector3(-13, 15, -15),
  new THREE.Vector3(0, 3, -16), new THREE.Vector3(12, 3, -12), new THREE.Vector3(15, 11, -7),
  new THREE.Vector3(12, 18, -5), new THREE.Vector3(8, 11, -7), new THREE.Vector3(12, 3, -9),
  new THREE.Vector3(23, 4, 0), new THREE.Vector3(16, 6, 10), new THREE.Vector3(0, 2, 12),
], true, "centripetal");
const railGeo = new THREE.TubeGeometry(path, 180, 0.19, 6, true);
export type ZoneProps = { plants?: GardenPlant[]; ride?: { kind: RideKind; id: number } | null; onRideEnd?: () => void; onOpenPark?: () => void; parkEntered?: boolean; onSelectRide?: (kind: RideKind) => void; onOpenGarden?: (slot?: number) => void };

function ZoneHouse({ title, onClick, position }: { title: string; onClick?: () => void; position: [number, number, number] }) {
  return <group position={position} onClick={e => { e.stopPropagation(); onClick?.(); }}>
    <Block p={[0, 2.8, 0]} s={[18, 5.6, 11]} mat="wall" />
    <Block p={[0, 5.85, 0]} s={[19.4, 0.65, 12.4]} mat="roof" />
    {Array.from({length: 12}, (_, i) => <Block key={i} p={[-7.2 + i * 1.3, 6.25, 0]} s={[0.28, 0.22, 10.2]} mat="trim" />)}
    <Block p={[0, 1.75, 4.56]} s={[3.2, 3.5, 0.22]} mat="door" />
    {[-5.1, 5.1].map(x => <group key={x}>
      <Block p={[x, 2.75, 4.57]} s={[2.8, 3.1, 0.25]} mat="door" />
      <Block p={[x, 2.75, 4.74]} s={[0.13, 3.1, 0.15]} mat="trim" />
    </group>)}
    <Html position={[0, 8.3, 0]} center distanceFactor={45} zIndexRange={[15, 0]}>
      <Button className="font-bold whitespace-nowrap" onClick={onClick}>{title}</Button>
    </Html>
  </group>;
}
function Park({ ride, onRideEnd, onOpenPark, parkEntered, onSelectRide }: ZoneProps) {
  const en = useLocale() === "en";
  const car = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Group>(null);
  const carousel = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const lastId = useRef(-1);
  const supports = useMemo(() => Array.from({ length: 26 }, (_, i) => path.getPointAt(i / 26)), []);
  const temp = useMemo(() => ({ p: new THREE.Vector3(), ahead: new THREE.Vector3(), eye: new THREE.Vector3(), offset: new THREE.Vector3(), q: new THREE.Quaternion() }), []);
  useFrame(({ camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    if (ride?.id !== lastId.current) { elapsed.current = 0; lastId.current = ride?.id ?? -1; }
    elapsed.current += dt;
    const phase = elapsed.current / 30;
    if (wheel.current) wheel.current.rotation.z += dt * (ride?.kind === "wheel" ? 0.21 : 0.06);
    if (carousel.current) carousel.current.rotation.y += dt * (ride?.kind === "carousel" ? 0.8 : 0.15);
    const t = (elapsed.current / 30) % 1;
    path.getPointAt(t, temp.p); path.getPointAt((t + 0.008) % 1, temp.ahead);
    if (car.current) { car.current.position.copy(temp.p); car.current.lookAt(temp.ahead); }
    if (!ride) return;
    if (phase >= 1) { ridePose.active = false; onRideEnd?.(); return; }
    if (ride.kind === "coaster") {
      temp.eye.copy(temp.p).add(temp.offset.set(PARK_ORIGIN[0], 2.3, PARK_ORIGIN[1]));
      temp.ahead.add(temp.offset.set(PARK_ORIGIN[0], 2.1, PARK_ORIGIN[1]));
    } else if (ride.kind === "wheel") {
      const a = elapsed.current * 0.21 - Math.PI / 2;
      temp.eye.set(PARK_ORIGIN[0] - 15 + Math.cos(a) * 9, 11 + Math.sin(a) * 9, PARK_ORIGIN[1] + 2);
      temp.ahead.set(0, 2, 0);
    } else {
      const a = elapsed.current * 0.8;
      temp.eye.set(PARK_ORIGIN[0] + 12 + Math.cos(a) * 5, 3.4, PARK_ORIGIN[1] + 4 + Math.sin(a) * 5);
      temp.ahead.set(PARK_ORIGIN[0] + 12 + Math.cos(a + 0.3) * 8, 3.4, PARK_ORIGIN[1] + 4 + Math.sin(a + 0.3) * 8);
    }
    ridePose.active = true; ridePose.x = temp.eye.x; ridePose.y = temp.eye.y - 1.6; ridePose.z = temp.eye.z;
    camera.position.copy(temp.eye); camera.lookAt(temp.ahead);
  });
  return <group position={[PARK_ORIGIN[0], 0, PARK_ORIGIN[1]]}>
    <Block p={[0, 0.07, -1]} s={[56, 0.12, 38]} mat="path" />
    {!parkEntered && <ZoneHouse position={[0, 0.3, 0]} title={en ? "AMUSEMENT PARK" : "KHU VUI CHƠI"} onClick={onOpenPark} />}
    {parkEntered && <group>
    <mesh geometry={railGeo} material={mats.rail} onClick={e => { e.stopPropagation(); onSelectRide?.("coaster"); }} />
    <mesh geometry={railGeo} material={mats.support} position={[0, -0.42, 0]} />
    {supports.map((p, i) => <Block key={i} p={[p.x, p.y / 2, p.z]} s={[0.28, p.y, 0.28]} />)}
    <Suspense fallback={null}><group ref={car}><Model url={cartAsset.url} scale={3} /></group></Suspense>
    <group onClick={e => { e.stopPropagation(); onSelectRide?.("wheel"); }} position={[-15, 11, 2]} rotation={[0, Math.PI / 5, 0]}>
      {[-1, 1].map(sign => <group key={sign} rotation={[0, 0, sign * 0.29]}><Block p={[sign * 1.3, -5.5, -0.8]} s={[0.7, 13, 0.7]} /></group>)}
      <group ref={wheel}>
        <mesh material={mats.wheel}><torusGeometry args={[9, 0.22, 6, 64]} /></mesh>
        {Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5; return <group key={i} rotation={[0, 0, a]}>
          <Block p={[4.5, 0, 0]} s={[9, 0.13, 0.13]} mat="wheel" />
          <group position={[9, 0, 0]} rotation={[0, 0, -a]}><Block p={[0, -0.6, 0]} s={[1.5, 1.1, 1.5]} mat="cabin" /><Block p={[0, 0.65, 0]} s={[1.9, 0.18, 1.9]} mat="cream" /></group>
        </group>; })}
      </group>
    </group>
    <group onClick={e => { e.stopPropagation(); onSelectRide?.("carousel"); }} position={[12, 0.2, 4]}>
      <mesh material={mats.cream}><cylinderGeometry args={[7, 7, 0.3, 32]} /></mesh>
      <Block p={[0, 3, 0]} s={[0.8, 6, 0.8]} mat="wheel" />
      <mesh position={[0, 6, 0]} material={mats.pink}><coneGeometry args={[7.8, 2.4, 16]} /></mesh>
      <group ref={carousel}>{Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return <group key={i} position={[Math.cos(a) * 5, 0, Math.sin(a) * 5]}>
        <Block p={[0, 2.5, 0]} s={[0.13, 5, 0.13]} mat="wheel" />
        <Block p={[0, 1.2, 0]} s={[1.5, 0.6, 1.4]} mat={i % 2 ? "cabin" : "pink"} />
        <Block p={[0, 1.9, -0.65]} s={[1.5, 1, 0.2]} mat="cream" />
      </group>; })}</group>
    </group>
    </group>}
    {!parkEntered && <Block p={[0, 1.2, 17]} s={[4.8, 2.4, 0.6]} mat="cabin" />}
    {!parkEntered && <Html position={[0, 3.4, 17]} center distanceFactor={45} zIndexRange={[15, 0]}>
      <Button className="font-bold" onClick={onOpenPark} aria-label={en ? "Amusement park control board" : "Bảng điều khiển khu vui chơi"}>🎢 {en ? "AMUSEMENT PARK" : "KHU VUI CHƠI"}</Button>
    </Html>}
  </group>;
}
function Garden({ plants = [], onOpenGarden }: ZoneProps) {
  const en = useLocale() === "en";
  const bySlot = useMemo(() => new Map(plants.map(p => [p.slot, p])), [plants]);
  return <group>
    <Block p={[GARDEN_ORIGIN[0], 0.06, GARDEN_ORIGIN[1] - 2]} s={[47, 0.1, 34]} mat="path" />
    <ZoneHouse position={[GARDEN_ORIGIN[0], 0.3, GARDEN_ORIGIN[1] - 24]} title={en ? "GROWING AREA" : "KHU TRỒNG TRỌT"} onClick={() => onOpenGarden?.()} />
    <Block p={[GARDEN_ORIGIN[0], 0.14, 12]} s={[47, 0.16, 3]} mat="path" />
    {Array.from({ length: 40 }, (_, slot) => {
      const [x, z] = gardenSlotPosition(slot), plant = bySlot.get(slot);
      const growth = plant ? 0.3 + 0.7 * (plant.growth / plant.grow_days) : 0;
      return <group key={slot} position={[x, 0.15, z]} onClick={e => { e.stopPropagation(); onOpenGarden?.(slot); }}>
        <Block p={[0, 0, 0]} s={[3.8, 0.18, 3.8]} mat="soil" />
        <Suspense fallback={null}>{plant && <group scale={growth}>
          <Model url={plant.species === "seed_mango" ? treeAsset.url : plant.species === "seed_sunflower" ? flowerAsset.url : roseAsset.url} scale={plant.species === "seed_mango" ? 3 : 5} />
          {plant.species === "seed_mango" && plant.growth >= plant.grow_days && [-1, 0, 1].map(i => <mesh key={i} position={[i * 0.6, 2.7, 0.7]} material={mats.wheel}><sphereGeometry args={[0.17, 6, 6]} /></mesh>)}
        </group>}</Suspense>
      </group>;
    })}
    <Html position={[70, 3.2, 13]} center distanceFactor={45} zIndexRange={[15, 0]}><Button onClick={() => onOpenGarden?.()} className="font-bold" aria-label={en ? "Open shared garden" : "Mở vườn chung"}>🌱 {en ? "GROWING AREA" : "KHU TRỒNG TRỌT"}</Button></Html>
  </group>;
}
export const NeighborhoodZones = memo(function NeighborhoodZones(props: ZoneProps) {
  return <><Park {...props} /><Garden {...props} /></>;
});