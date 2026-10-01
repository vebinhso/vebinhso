import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import type { Outfit } from "@/lib/character";
import { bodyOf, faceOf } from "@/lib/appearance";
import { bottomOf, topOf, type BottomPattern, type TopPattern } from "@/lib/clothes";
import { equippedBySlot, type AccessoryId } from "@/lib/accessories";
import { isHairStyle, DEFAULT_HAIR_STYLE } from "@/lib/hair";
import { HeadBodyAccessory3D, ArmAccessory3D } from "./Accessory3D";
import { Hair3D } from "./Hair3D";
import { Shoes3D } from "./Shoes3D";

type RigRefs = {
  armL?: RefObject<THREE.Group | null>;
  armR?: RefObject<THREE.Group | null>;
  legL?: RefObject<THREE.Group | null>;
  legR?: RefObject<THREE.Group | null>;
  body?: RefObject<THREE.Group | null>;
};

function rgb(hex: string) {
  const c = new THREE.Color(hex);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)] as const;
}

function usePatternTexture(pattern: TopPattern | BottomPattern, color: string, color2: string) {
  const texture = useMemo(() => {
    const size = 48;
    const data = new Uint8Array(size * size * 4);
    const a = rgb(color);
    const b = rgb(color2);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let useB = false;
        if (pattern === "stripes") useB = y % 14 < 5;
        if (pattern === "plaid") useB = x % 16 < 4 || y % 16 < 4;
        if (pattern === "floral") {
          const px = x % 16 - 8;
          const py = y % 16 - 8;
          useB = px * px + py * py < 12 || Math.abs(px) + Math.abs(py) === 5;
        }
        const c = useB ? b : a;
        const i = (y * size + x) * 4;
        data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
      }
    }
    const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    result.colorSpace = THREE.SRGBColorSpace;
    result.wrapS = THREE.RepeatWrapping;
    result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(2, 2);
    result.needsUpdate = true;
    return result;
  }, [color, color2, pattern]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function GarmentMaterial({ pattern, color, color2 }: { pattern: TopPattern | BottomPattern; color: string; color2: string }) {
  const texture = usePatternTexture(pattern, color, color2);
  return <meshStandardMaterial map={texture} roughness={0.82} />;
}

function ChestDetail({ pattern, color }: { pattern: TopPattern; color: string }) {
  if (pattern === "star") {
    return <mesh position={[0, 1.18, 0.337]} rotation={[0, 0, Math.PI / 4]}><octahedronGeometry args={[0.105, 0]} /><meshStandardMaterial color={color} /></mesh>;
  }
  if (pattern === "heart") {
    return <group position={[0, 1.17, 0.34]}><mesh position={[-0.045, 0.035, 0]}><sphereGeometry args={[0.065, 12, 10]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0.045, 0.035, 0]}><sphereGeometry args={[0.065, 12, 10]} /><meshStandardMaterial color={color} /></mesh><mesh rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 0.45]}><boxGeometry args={[0.105, 0.105, 0.035]} /><meshStandardMaterial color={color} /></mesh></group>;
  }
  if (pattern === "cat") {
    return <group position={[0, 1.17, 0.34]}><mesh><sphereGeometry args={[0.1, 14, 12]} /><meshStandardMaterial color={color} /></mesh>{[-0.06, 0.06].map((x) => <mesh key={x} position={[x, 0.085, 0]}><coneGeometry args={[0.045, 0.09, 3]} /><meshStandardMaterial color={color} /></mesh>)}</group>;
  }
  if (pattern === "number") {
    return <group position={[0, 1.16, 0.345]}>{[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 0, 0]}><torusGeometry args={[0.055, 0.018, 6, 16]} /><meshStandardMaterial color={color} /></mesh>)}</group>;
  }
  if (pattern === "bow") {
    return <group position={[0, 1.36, 0.34]}>{[-0.06, 0.06].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, x < 0 ? -0.5 : 0.5]}><coneGeometry args={[0.075, 0.13, 4]} /><meshStandardMaterial color={color} /></mesh>)}</group>;
  }
  if (["trim", "collar", "zip", "ranger"].includes(pattern)) {
    return <group><mesh position={[0, 1.37, 0.335]} rotation={[0, 0, Math.PI / 4]}><torusGeometry args={[0.105, 0.022, 6, 4, Math.PI]} /><meshStandardMaterial color={color} /></mesh>{(pattern === "zip" || pattern === "ranger") && <mesh position={[0, 1.13, 0.337]}><boxGeometry args={[0.025, 0.42, 0.018]} /><meshStandardMaterial color={color} /></mesh>}</group>;
  }
  return null;
}

function Face({ skin, shape, expression }: { skin: string; shape?: string; expression?: string }) {
  const s = faceOf(shape).s3 as unknown as [number, number, number];
  const closedLeft = expression === "wink" || expression === "laugh" || expression === "tears";
  const closedRight = expression === "laugh" || expression === "tears";
  const sad = expression === "sad" || expression === "upset";
  const loving = expression === "love";
  const blushing = expression === "blush" || loving || expression === "smile";
  const openMouth = expression === "laugh" || expression === "tears" || expression === "love";
  return (
    <group>
      <mesh castShadow position={[0, 1.82, 0]} scale={[s[0] * 1.28, s[1] * 1.18, s[2] * 1.06]}>
        <sphereGeometry args={[0.34, 28, 22]} /><meshStandardMaterial color={skin} roughness={0.88} />
      </mesh>
      {[-0.145, 0.145].map((x, i) => {
        const closed = i === 0 ? closedLeft : closedRight;
        if (loving) return <group key={x} position={[x, 1.91, 0.405]} rotation={[0, 0, Math.PI / 4]}><mesh><boxGeometry args={[0.075, 0.075, 0.025]} /><meshStandardMaterial color="#ef5350" /></mesh><mesh position={[-0.035, 0.035, 0]}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color="#ef5350" /></mesh><mesh position={[0.035, 0.035, 0]}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color="#ef5350" /></mesh></group>;
        return closed ? <mesh key={x} position={[x, 1.89, 0.382]} rotation={[0, 0, i === 0 && expression === "wink" ? -0.15 : 0]}><torusGeometry args={[0.058, 0.011, 6, 16, Math.PI]} /><meshStandardMaterial color="#332820" /></mesh> : <group key={x}><mesh position={[x, 1.9, 0.386]} scale={[1, 1.25, 0.42]}><sphereGeometry args={[0.082, 18, 14]} /><meshStandardMaterial color="#fffaf2" /></mesh><mesh position={[x, 1.895, 0.432]} scale={[1, 1.18, 0.72]}><sphereGeometry args={[0.055, 14, 12]} /><meshStandardMaterial color="#302a2a" /></mesh><mesh position={[x - 0.018, 1.925, 0.472]}><sphereGeometry args={[0.014, 8, 6]} /><meshBasicMaterial color="#ffffff" /></mesh></group>;
      })}
      <mesh position={[0, 1.765, 0.401]} rotation={[Math.PI / 2, 0, sad ? Math.PI : 0]} scale={[openMouth ? 1.05 : 1, openMouth ? 1.6 : 0.6, 1]}><torusGeometry args={[openMouth ? 0.05 : 0.065, 0.013, 7, 18, Math.PI]} /><meshStandardMaterial color="#8f4450" /></mesh>
      {blushing && [-0.245, 0.245].map((x) => <mesh key={x} position={[x, 1.79, 0.35]} scale={[1.5, 0.55, 0.3]}><sphereGeometry args={[0.055, 12, 8]} /><meshStandardMaterial color="#f48b98" transparent opacity={0.58} /></mesh>)}
    </group>
  );
}

function Arm({ side, skin, shirt, shirt2, pattern, accessory, armRef }: { side: -1 | 1; skin: string; shirt: string; shirt2: string; pattern: TopPattern; accessory?: AccessoryId; armRef?: RefObject<THREE.Group | null> }) {
  return <group ref={armRef} position={[side * 0.44, 1.3, 0]} rotation={[0, 0, side * -0.08]}>
    <mesh castShadow position={[0, -0.18, 0]}><capsuleGeometry args={[0.115, 0.38, 6, 12]} /><GarmentMaterial pattern={pattern} color={shirt} color2={shirt2} /></mesh>
    <mesh castShadow position={[0, -0.47, 0]}><sphereGeometry args={[0.125, 14, 12]} /><meshStandardMaterial color={skin} roughness={0.9} />{accessory && <ArmAccessory3D id={accessory} />}</mesh>
  </group>;
}

export function ChibiCharacter3D({ o, rigRefs = {} }: { o: Outfit; rigRefs?: RigRefs }) {
  const acc = equippedBySlot(o.accessories);
  const body = bodyOf(o.bodyShape);
  const top = topOf(o.topStyle);
  const bottom = bottomOf(o.bottomStyle);
  const shirt = top?.color ?? o.shirt;
  const shirt2 = top?.color2 ?? o.accent;
  const pants = bottom?.color ?? o.pants;
  const topPattern = top?.pattern ?? "plain";
  const bottomPattern = bottom?.pattern ?? "plain";
  const skirt = bottom?.kind === "skirt" || bottom?.kind === "longskirt";
  const shorts = bottom?.kind === "shorts";
  const legClothed = !skirt && !shorts;
  const legWidth = bottom?.kind === "wide" ? 0.17 : 0.135;
  const shoulderScale = 0.9 + (body.top - 28) / 45;
  const hipScale = 0.92 + (body.hip - 28) / 55;
  const helmet = top?.helmet;
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <group key={side} ref={side < 0 ? rigRefs.legL : rigRefs.legR} position={[side * 0.19, 0.58, 0]}>
          <mesh castShadow scale={[hipScale, 1, 1]}><capsuleGeometry args={[legWidth, 0.62, 7, 14]} />{legClothed ? <GarmentMaterial pattern={bottomPattern} color={pants} color2={bottom?.color2 ?? pants} /> : <meshStandardMaterial color={o.skin} roughness={0.9} />}</mesh>
          {shorts && <mesh position={[0, 0.24, 0]} scale={[hipScale, 1, 1]}><capsuleGeometry args={[0.17, 0.2, 6, 12]} /><GarmentMaterial pattern={bottomPattern} color={pants} color2={bottom?.color2 ?? pants} /></mesh>}
        </group>
      ))}
      <Shoes3D shoeStyle={o.shoeStyle} fallbackColor={o.shoes} />
      {skirt && <mesh castShadow position={[0, bottom?.kind === "longskirt" ? 0.7 : 0.88, 0]}><cylinderGeometry args={[0.35 * hipScale, (bottom?.kind === "longskirt" ? 0.45 : 0.48) * hipScale, bottom?.kind === "longskirt" ? 0.92 : 0.48, 28]} /><GarmentMaterial pattern={bottomPattern} color={pants} color2={bottom?.color2 ?? pants} /></mesh>}
      <group ref={rigRefs.body}>
        <mesh castShadow position={[0, 1.22, 0]} scale={[shoulderScale, 1, 1]}><capsuleGeometry args={[0.34, 0.5, 8, 18]} /><GarmentMaterial pattern={topPattern} color={shirt} color2={shirt2} /></mesh>
        {top?.long && <mesh castShadow position={[0, 0.84, 0]}><cylinderGeometry args={[0.33 * shoulderScale, 0.42 * hipScale, 0.64, 28]} /><GarmentMaterial pattern={topPattern} color={shirt} color2={shirt2} /></mesh>}
        {top?.hood && <mesh position={[0, 1.48, -0.2]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.27, 0.075, 8, 22]} /><meshStandardMaterial color={shirt2} roughness={0.9} /></mesh>}
        {top && <ChestDetail pattern={top.pattern} color={shirt2} />}
      </group>
      <Arm side={-1} skin={helmet ? shirt2 : o.skin} shirt={shirt} shirt2={shirt2} pattern={topPattern} accessory={acc.wrist} armRef={rigRefs.armL} />
      <Arm side={1} skin={helmet ? shirt2 : o.skin} shirt={shirt} shirt2={shirt2} pattern={topPattern} accessory={acc.finger} armRef={rigRefs.armR} />
      <Face skin={helmet ? shirt : o.skin} shape={o.faceShape} expression={o.expression} />
      {!helmet && !acc.head && <Hair3D style={isHairStyle(o.hairStyle) ? o.hairStyle : DEFAULT_HAIR_STYLE} color={o.hair} />}
      {!helmet && acc.beard && <HeadBodyAccessory3D id={acc.beard} hair={o.hair} />}
      {!helmet && acc.head && <HeadBodyAccessory3D id={acc.head} hair={o.hair} />}
      {acc.neck && <HeadBodyAccessory3D id={acc.neck} hair={o.hair} />}
      {o.hat && !acc.head && !helmet && <mesh castShadow position={[0, 2.25, 0]}><coneGeometry args={[0.42, 0.34, 20]} /><meshStandardMaterial color={o.hat} roughness={0.85} /></mesh>}
    </group>
  );
}