import { ChibiCharacter3D } from "./ChibiCharacter3D";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, Cloud, Clouds, ContactShadows, Html, AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import { Suspense, memo, useMemo, type ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getItem, topperBottomY, type CatalogItem } from "./catalog";
import { isDoorItem, isWindowItem } from "./catalog";
import { ItemModel } from "./Models";
import type { PlacedItem, WallSegment, RoofSegment, FloorSegment } from "@/lib/game";
import { WALL_HEIGHT } from "@/lib/game";
import type { Pickup } from "@/lib/worldPickups";
import type { FriendHouse } from "@/lib/friend-houses.functions";
import { playerInput, setInputKey } from "@/lib/player-input";
import { useWorldToggles } from "@/lib/world-toggles";
import { HoiAnTown } from "./HoiAnTown";
import { RIVER_NEAR_BANK_Z, riverPoseState, type ReleasedLantern } from "./HoiAnRiver";

/** Trạng thái góc nhìn mắt nhân vật (chế độ Xem nhà) */
export const fpState = { on: false, yaw: 0, pitch: 0, teleport: false };
const GRID = 20;
const CELL = 1;
// Đường đi 1 ô bao quanh mảnh đất 20x20 ⇒ (22² − 20²) = 84 ô đường
const PATH = 1;
// Toàn bộ vùng nông thôn: 220×220 = 48,400 grid cells
const WORLD = 220;

type Props = {
  placed: PlacedItem[];
  walls: WallSegment[];
  roofs: RoofSegment[];
  floors: FloorSegment[];
  wallColor: string;
  wallMode: boolean;
  /** Khi có: bấm vào tường sẽ đổ sơn */
  onWallPaint?: (id: string) => void;
  /** Đặt vật dán lên tường tại điểm bấm (toạ độ thế giới) */
  /** Góc nhìn camera */
  viewMode?: "free" | "top" | "front" | "wide" | "eye";
  /** Làm mờ phố xung quanh (chế độ chỉnh sửa nhà) */
  dimTown?: boolean;
  onWallPlace?: (wallId: string, x: number, y: number, z: number) => void;
  wallPickA: string | null;
  roofMode: boolean;
  roofPicks: string[];
  floorMode: boolean;
  floorPicks: string[];
  selectedItemId: string | null;
  rotation: number;
  onRotate: () => void;
  onPlace: (x: number, z: number) => void;
  onRemove: (id: string) => void;
  onPillarClick: (placedId: string) => void;
  onWallRemove: (id: string) => void;
  onRoofRemove: (id: string) => void;
  onFloorRemove: (id: string) => void;
  activeFloor: number;
  pickups?: Pickup[];
  collectedIds?: Set<string>;
  onPickup?: (p: Pickup) => void;
  showAdminMarkers?: boolean;
  sparkles?: { id: string; x: number; z: number; at: number }[];
  onPlayerPos?: (x: number, z: number) => void;
  /** Click vào item đã đặt (khi không ở build/place mode) để mở panel chỉnh xoay/di chuyển. */
  onItemClick?: (id: string, opts?: { localY?: number }) => void;
  /** id item đang được chỉnh — sẽ vẽ vòng highlight quanh nó. */
  editingId?: string | null;
  /** Map placedItemId → label cho biển tên nhà */
  signLabels?: Record<string, string>;
  /** Danh sách nhà bạn bè hiển thị quanh mảnh đất */
  friendHouses?: FriendHouse[];
  /** Bấm vào nhà bạn để tham quan */
  onVisitFriend?: (ownerId: string) => void;
  releasedLanterns?: ReleasedLantern[];
  onStartRiverQuiz?: () => void;
  onReleaseLantern?: (x: number, z: number) => void;
  showFriendLabels?: boolean;
};

// Item ids đặc đặc — chặn nhân vật khi bật chế độ "Bị cản".
const SOLID_ITEMS = new Set<string>([
  "sofa", "sofa_large", "bed", "singlebed", "bunkbed", "fridge", "fridge3", "tv", "tvstand",
  "stove", "toilet", "lamp", "wardrobe", "table", "roundtable", "desk",
  "bookshelf", "aircon", "vanity", "bathtub", "shower", "washer", "lavabo",
  "sink", "hood", "microwave", "oven", "dishwasher", "ricecooker", "fishpond",
  "pool", "pethouse", "teaset", "fence", "gate", "gardenlamp", "mailbox", "pillar", "chair",
]);

function Character({ controlsRef, activeFloor, pickups, collectedIds, onPickup, walls, placed, onPlayerPos }: { controlsRef: React.MutableRefObject<any>; activeFloor: number; pickups?: Pickup[]; collectedIds?: Set<string>; onPickup?: (p: Pickup) => void; walls?: WallSegment[]; placed?: PlacedItem[]; onPlayerPos?: (x: number, z: number) => void }) {
  const t = useWorldToggles();
  const { collision } = t;
  const lastReport = useRef(0);
  const ref = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const yVel = useRef(0);
  const grounded = useRef(true);
  const walkPhase = useRef(0);
  const { camera } = useThree();
  const floorY = activeFloor * 5; // WALL_HEIGHT

  // Khi đổi tầng: dịch chuyển nhân vật lên sàn của tầng đó.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.position.set(0, floorY, 0);
    yVel.current = 0;
    grounded.current = true;
  }, [activeFloor, floorY]);

  const [outfit, setOutfit] = useState<any>(null);
  useEffect(() => {
    import("@/lib/character").then((m) => setOutfit(m.loadOutfit() || m.DEFAULT_OUTFIT));
  }, []);
  const o = outfit || { skin: "#fde68a", hair: "#7c2d12", shirt: "#ef4444", pants: "#1e40af", shoes: "#1f2937", accent: "#fcd34d", hat: undefined };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { setInputKey(e.key, true); };
    const up = (e: KeyboardEvent) => { setInputKey(e.key, false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const k = playerInput;
    const speed = 6;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; camDir.normalize();
    const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (k["w"]) move.add(camDir);
    if (k["s"]) move.sub(camDir);
    if (k["d"]) move.add(right);
    if (k["a"]) move.sub(right);
    const kneeling = Date.now() < riverPoseState.kneelingUntil;
    const moving = !kneeling && move.lengthSq() > 0;
    if (moving) {
      move.normalize().multiplyScalar(speed * dt);
      const blocked = (nx: number, nz: number) => {
        if (collision !== "block" || activeFloor !== 0) return false;
        const R = 0.35; // player radius
        // walls
        if (walls) {
          for (const w of walls) {
            if ((w.floor ?? 0) !== 0) continue;
            const dx = w.bx - w.ax, dz = w.bz - w.az;
            const len2 = dx * dx + dz * dz;
            if (len2 === 0) continue;
            let t = ((nx - w.ax) * dx + (nz - w.az) * dz) / len2;
            t = Math.max(0, Math.min(1, t));
            const cx = w.ax + t * dx, cz = w.az + t * dz;
            if ((nx - cx) ** 2 + (nz - cz) ** 2 < (R + 0.18) ** 2) {
              // Cho phép đi qua nếu nằm trong lỗ khoét cửa
              if (placed) {
                const cuts = computeDoorCutouts(w, placed);
                const tRaw = ((nx - w.ax) * dx + (nz - w.az) * dz) / len2;
                if (cuts.some((c) => tRaw >= c.t0 - 0.02 && tRaw <= c.t1 + 0.02)) continue;
              }
              return true;
            }
          }
        }
        // placed solid items
        if (placed) {
          for (const p of placed) {
            if ((p.floor ?? 0) !== 0) continue;
            if (isDoorItem(p.itemId) && (t.doorsOpen || t.openDoorIds?.includes(p.id))) continue;
            if (!isDoorItem(p.itemId) && !SOLID_ITEMS.has(p.itemId)) continue;
            const it = getItem(p.itemId);
            if (!it) continue;
            const swap = p.rotation % 2 === 1;
            const fw = swap ? it.d : it.w;
            const fd = swap ? it.w : it.d;
            const hasAngle = typeof p.angleRad === "number";
            const cx = hasAngle ? p.x - 10 : p.x - 10 + fw / 2;
            const cz = hasAngle ? p.z - 10 : p.z - 10 + fd / 2;
            if (Math.abs(nx - cx) < fw / 2 + R && Math.abs(nz - cz) < fd / 2 + R) return true;
          }
        }
        return false;
      };
      const cx0 = ref.current.position.x, cz0 = ref.current.position.z;
      const tx = cx0 + move.x, tz = cz0 + move.z;
      if (!blocked(tx, cz0)) ref.current.position.x = tx;
      if (!blocked(ref.current.position.x, tz)) ref.current.position.z = tz;
      ref.current.rotation.y = Math.atan2(move.x, move.z);
      walkPhase.current += dt * 10;
    } else {
      walkPhase.current *= 0.8;
    }
    const swing = Math.sin(walkPhase.current) * 0.7;
    if (armL.current) armL.current.rotation.x = kneeling ? -1.15 : swing;
    if (armR.current) armR.current.rotation.x = kneeling ? -1.15 : -swing;
    if (legL.current) { legL.current.rotation.x = kneeling ? -1.25 : -swing; legL.current.position.y = kneeling ? 0.23 : 0.35; legL.current.position.z = kneeling ? 0.18 : 0; }
    if (legR.current) { legR.current.rotation.x = kneeling ? -1.25 : swing; legR.current.position.y = kneeling ? 0.23 : 0.35; legR.current.position.z = kneeling ? 0.18 : 0; }
    if (body.current) { body.current.position.y = kneeling ? 0.78 : 1.02; body.current.rotation.x = kneeling ? 0.18 : 0; }
    if (kneeling) ref.current.rotation.y = Math.atan2(riverPoseState.targetX - ref.current.position.x, riverPoseState.targetZ - ref.current.position.z);

    if (k[" "] && grounded.current) { yVel.current = 7; grounded.current = false; }
    yVel.current -= 18 * dt;
    ref.current.position.y += yVel.current * dt;
    if (ref.current.position.y <= floorY) { ref.current.position.y = floorY; yVel.current = 0; grounded.current = true; }

    // Vào chế độ Xem nhà: đưa nhân vật ra trước cửa nhà mình, nhìn vào nhà
    if (fpState.teleport) { ref.current.position.x = 0; ref.current.position.z = 13; fpState.teleport = false; }
    // Trên tầng cao: giới hạn trong mảnh đất 20x20 để khỏi té khỏi sàn.
    const plotHalf = 20 / 2 - 0.4;
    const limit = activeFloor > 0 ? plotHalf : WORLD / 2 - 0.5;
    ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x, -limit, limit);
    ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z, activeFloor === 0 ? RIVER_NEAR_BANK_Z + 2 : -limit, limit);

    // Va chạm pickup (chỉ ở tầng trệt)
    if (activeFloor === 0 && pickups && onPickup) {
      const px = ref.current.position.x;
      const pz = ref.current.position.z;
      for (const p of pickups) {
        if (collectedIds && collectedIds.has(p.id)) continue;
        const dx = px - p.x;
        const dz = pz - p.z;
        if (dx * dx + dz * dz < 0.7 * 0.7) {
          onPickup(p);
          break;
        }
      }
    }

    if (fpState.on) {
      ref.current.visible = false;
      camera.position.set(ref.current.position.x, ref.current.position.y + 1.55, ref.current.position.z);
      camera.rotation.set(fpState.pitch, fpState.yaw, 0, "YXZ");
    } else if (!ref.current.visible) ref.current.visible = true;
    if (controlsRef.current && !fpState.on) {
      const t = new THREE.Vector3(ref.current.position.x, ref.current.position.y + 1.0, ref.current.position.z);
      controlsRef.current.target.lerp(t, 0.18);
      controlsRef.current.update();
    }
    // Báo vị trí ra ngoài (throttle ~10Hz) để HUD xác định gần cửa
    if (onPlayerPos) {
      const now = performance.now();
      if (now - lastReport.current > 260) {
        lastReport.current = now;
        onPlayerPos(ref.current.position.x, ref.current.position.z);
      }
    }
  });

  return (
    <group ref={ref} position={[0, 0, 0]}>
      <ChibiCharacter3D o={o} rigRefs={{ armL, armR, legL, legR, body }} />
    </group>
  );
}


// Geometry/material chia sẻ cho 100+ đồng xu để giảm overhead.
const COIN_GEO = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 18);
const COIN_MAT = new THREE.MeshStandardMaterial({
  color: "#fde047",
  emissive: "#f59e0b",
  emissiveIntensity: 0.95,
  metalness: 0.9,
  roughness: 0.18,
});
const HALO_GEO = new THREE.SphereGeometry(0.55, 10, 10);
const BOMB_GEO = new THREE.SphereGeometry(0.28, 10, 10);
const BOMB_MAT = new THREE.MeshStandardMaterial({
  color: "#dc2626",
  emissive: "#7f1d1d",
  emissiveIntensity: 0.6,
  transparent: true,
  opacity: 0.55,
});

function CoinPickup({ p }: { p: Pickup }) {
  const ref = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const haloMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#fde047", transparent: true, opacity: 0.4, depthWrite: false }),
    [],
  );
  useFrame(({ clock }, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 2.8;
    if (haloRef.current) {
      const t = clock.getElapsedTime();
      const s = 1 + Math.sin(t * 4 + p.x) * 0.15;
      haloRef.current.scale.setScalar(s);
      haloMat.opacity = 0.32 + Math.sin(t * 4 + p.x) * 0.15;
    }
  });
  return (
    <group position={[p.x, 0.45, p.z]}>
      <mesh ref={haloRef} geometry={HALO_GEO} material={haloMat} />
      <mesh ref={ref} geometry={COIN_GEO} material={COIN_MAT} castShadow />
    </group>
  );
}

function PickupsField({ pickups, collectedIds, showAdminMarkers, sparkles }: { pickups: Pickup[]; collectedIds: Set<string>; showAdminMarkers: boolean; sparkles?: { id: string; x: number; z: number; at: number }[] }) {
  return (
    <group>
      {pickups.map((p) => {
        if (collectedIds.has(p.id)) return null;
        if (p.kind === "coin") return <CoinPickup key={p.id} p={p} />;
        if (!showAdminMarkers) return null;
        return (
          <mesh key={p.id} position={[p.x, 0.35, p.z]} geometry={BOMB_GEO} material={BOMB_MAT} />
        );
      })}
      {(sparkles ?? []).map((s) => (
        <Sparkle key={s.id} x={s.x} z={s.z} at={s.at} />
      ))}
    </group>
  );
}

function Sparkle({ x, z, at }: { x: number; z: number; at: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = (Date.now() - at) / 1000;
    const k = Math.min(1, t / 1.1);
    if (ringRef.current) {
      const s = 0.4 + k * 2.2;
      ringRef.current.scale.set(s, s, s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    }
    if (coreRef.current) {
      const s = 1 + k * 1.6;
      coreRef.current.scale.set(s, s, s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - k;
    }
  });
  return (
    <group position={[x, 0.6, z]}>
      <pointLight color="#fef08a" intensity={3} distance={5} decay={2} />
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#fff7c2" transparent opacity={1} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.42, 32]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}



function isRoof(id: string) {
  return id === "roof" || id === "roof_ton";
}

const DOOR_CUT_HALF = 0.5;
const DOOR_CUT_HEIGHT = 3;

/** Tính các đoạn khoét trên 1 tường (theo t∈[0,1]) do các cánh cửa nằm áp tường tạo ra. */
function computeDoorCutouts(w: WallSegment, placed: PlacedItem[]): { t0: number; t1: number }[] {
  const dx = w.bx - w.ax, dz = w.bz - w.az;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return [];
  const len = Math.sqrt(len2);
  const wFloor = w.floor ?? 0;
  const raw: { t0: number; t1: number }[] = [];
  for (const p of placed) {
    if (!isDoorItem(p.itemId)) continue;
    if ((p.floor ?? 0) !== wFloor) continue;
    const it = getItem(p.itemId);
    if (!it) continue;
    const hasAngle = typeof p.angleRad === "number";
    const swap = p.rotation % 2 === 1;
    const fw = swap ? it.d : it.w;
    const fd = swap ? it.w : it.d;
    // Cửa đã snap vào tường: (p.x, p.z) là tọa độ TÂM. Cửa cũ chưa snap: (p.x, p.z) là góc.
    const cx = hasAngle ? p.x - 10 : p.x - 10 + fw / 2;
    const cz = hasAngle ? p.z - 10 : p.z - 10 + fd / 2;
    const t = ((cx - w.ax) * dx + (cz - w.az) * dz) / len2;
    if (t < -0.05 || t > 1.05) continue;
    const px = w.ax + t * dx, pz = w.az + t * dz;
    if (Math.hypot(cx - px, cz - pz) > 0.6) continue;
    const halfT = DOOR_CUT_HALF / len;
    raw.push({ t0: Math.max(0, t - halfT), t1: Math.min(1, t + halfT) });
  }
  raw.sort((a, b) => a.t0 - b.t0);
  const merged: { t0: number; t1: number }[] = [];
  for (const c of raw) {
    const last = merged[merged.length - 1];
    if (last && c.t0 <= last.t1) last.t1 = Math.max(last.t1, c.t1);
    else merged.push({ ...c });
  }
  return merged;
}

export function WallMesh({ w, color, highlight, dim, onRemove, placed, onPaint, onPlaceAt }: { w: WallSegment; color: string; highlight?: boolean; dim?: boolean; onRemove: () => void; placed: PlacedItem[]; onPaint?: () => void; onPlaceAt?: (x: number, y: number, z: number) => void }) {
  const dx = w.bx - w.ax;
  const dz = w.bz - w.az;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const cx = (w.ax + w.bx) / 2;
  const cz = (w.az + w.bz) / 2;
  const baseY = (w.floor ?? 0) * WALL_HEIGHT;
  const opacity = dim ? 0.35 : 1;
  const cuts = computeDoorCutouts(w, placed);
  const lower: { center: number; length: number }[] = [];
  let cursor = 0;
  for (const c of cuts) {
    if (c.t0 > cursor) lower.push({ center: ((cursor + c.t0) / 2 - 0.5) * len, length: (c.t0 - cursor) * len });
    cursor = c.t1;
  }
  if (cursor < 1) lower.push({ center: ((cursor + 1) / 2 - 0.5) * len, length: (1 - cursor) * len });
  const upperH = WALL_HEIGHT - DOOR_CUT_HEIGHT;
  const mat = (key: string) => (
    <meshStandardMaterial key={key} color={highlight ? "#fde047" : (w.color || color)} roughness={0.9} transparent={dim} opacity={opacity} />
  );
  return (
    <group position={[cx, baseY, cz]} rotation={[0, angle, 0]} onContextMenu={(e) => { e.stopPropagation(); if (!dim) onRemove(); }} onClick={onPaint && !dim ? (e) => { e.stopPropagation(); onPaint(); } : (onPlaceAt && !dim ? (e) => { e.stopPropagation(); onPlaceAt(e.point.x, e.point.y, e.point.z); } : undefined)}>
      {cuts.length === 0 ? (
        <mesh castShadow receiveShadow position={[0, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.25, WALL_HEIGHT, len]} />
          {mat("m")}
        </mesh>
      ) : (
        <>
          {lower.map((s, i) => s.length > 0.01 && (
            <mesh key={`lo-${i}`} castShadow receiveShadow position={[0, DOOR_CUT_HEIGHT / 2, s.center]}>
              <boxGeometry args={[0.25, DOOR_CUT_HEIGHT, s.length]} />
              {mat(`lo-m-${i}`)}
            </mesh>
          ))}
          {upperH > 0 && (
            <mesh castShadow receiveShadow position={[0, DOOR_CUT_HEIGHT + upperH / 2, 0]}>
              <boxGeometry args={[0.25, upperH, len]} />
              {mat("up")}
            </mesh>
          )}
        </>
      )}
      <mesh castShadow position={[0, WALL_HEIGHT + 0.06, 0]}>
        <boxGeometry args={[0.35, 0.12, len]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.8} transparent={dim} opacity={opacity} />
      </mesh>
    </group>
  );
}

export function RoofMesh({ r, dim, onRemove }: { r: RoofSegment; dim?: boolean; onRemove: () => void }) {
  const w = Math.abs(r.bx - r.ax);
  const d = Math.abs(r.bz - r.az);
  const cx = (r.ax + r.bx) / 2;
  const cz = (r.az + r.bz) / 2;
  const color = r.style === "ton" ? "#b91c1c" : "#7f1d1d";
  // Mái nằm trên đỉnh tường của tầng đó: baseY = (floor+1)*WALL_HEIGHT
  const baseY = ((r.floor ?? 0) + 1) * WALL_HEIGHT;
  const opacity = dim ? 0.35 : 1;
  return (
    <group position={[cx, baseY, cz]} onContextMenu={(e) => { e.stopPropagation(); if (!dim) onRemove(); }}>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
        <meshStandardMaterial color={color} roughness={r.style === "ton" ? 0.4 : 0.85} metalness={r.style === "ton" ? 0.5 : 0.05} transparent={dim} opacity={opacity} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[w + 0.1, 0.2, d * 0.25]} />
        <meshStandardMaterial color={color} roughness={0.7} transparent={dim} opacity={opacity} />
      </mesh>
    </group>
  );
}

export function FloorMesh({ f, dim, onRemove }: { f: FloorSegment; dim?: boolean; onRemove: () => void }) {
  const w = Math.abs(f.bx - f.ax);
  const d = Math.abs(f.bz - f.az);
  const cx = (f.ax + f.bx) / 2;
  const cz = (f.az + f.bz) / 2;
  // Sàn nằm trên đỉnh tường của tầng đó (như trần ngang phía trên), giống mái
  const baseY = ((f.floor ?? 0) + 1) * WALL_HEIGHT;
  const opacity = dim ? 0.35 : 1;
  const THICK = 0.12;
  const slabColor = f.color ?? "#cbd5e1";
  const edgeColor = f.color ?? "#94a3b8";
  return (
    <group position={[cx, baseY, cz]} onContextMenu={(e) => { e.stopPropagation(); if (!dim) onRemove(); }}>
      {/* slab bê tông (đã sơn nếu có màu) */}
      <mesh receiveShadow castShadow position={[0, -THICK / 2 + 0.005, 0]}>
        <boxGeometry args={[w + 0.2, THICK, d + 0.2]} />
        <meshStandardMaterial color={slabColor} roughness={0.9} metalness={0.02} transparent={dim} opacity={opacity} />
      </mesh>
      {/* viền nhẹ trên mặt sàn */}
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + 0.18, d + 0.18]} />
        <meshStandardMaterial color={edgeColor} roughness={0.85} transparent opacity={dim ? 0.2 : 0.45} />
      </mesh>
    </group>
  );
}

// ---------------- Neighborhood (vùng xung quanh mảnh đất) ----------------
// Sinh deterministic dựa trên seed lưới để tạo cảm giác "thành phố nhỏ"
// với nhiều mô hình nhà 3D đủ hình thù + đồng cỏ xanh xen kẽ.
// Geometry/material dùng chung cho toàn bộ khu hàng xóm ⇒ ít draw-call, ít GC.
const NB_BOX = new THREE.BoxGeometry(1, 1, 1);
const NB_CONE = new THREE.ConeGeometry(1, 1, 4);
const NB_CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const NB_SPH = new THREE.SphereGeometry(1, 10, 8);
const NB_MATS = new Map<string, THREE.MeshLambertMaterial>();
function nbMat(color: string, emissive?: string) {
  const key = color + "|" + (emissive ?? "");
  let m = NB_MATS.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, ...(emissive ? { emissive, emissiveIntensity: 0.4 } : {}) });
    NB_MATS.set(key, m);
  }
  return m;
}

function NeighborHouse({ seed, color, roofColor }: { seed: number; color: string; roofColor: string }) {
  const shape = seed % 4; // 0: box+gable, 1: L-shape, 2: tower, 3: wide bungalow
  const h = 2.2 + ((seed * 13) % 5) * 0.6;
  const w = 2.6 + ((seed * 7) % 4) * 0.7;
  const d = 2.6 + ((seed * 11) % 4) * 0.7;
  const wall = nbMat(color);
  const roof = nbMat(roofColor);
  return (
    <group>
      {/* thân nhà */}
      <mesh geometry={NB_BOX} material={wall} position={[0, h / 2, 0]} scale={[w, h, d]} />
      {/* cánh phụ cho L-shape */}
      {shape === 1 && (
        <mesh
          geometry={NB_BOX}
          material={wall}
          position={[w * 0.55, (h * 0.7) / 2, -d * 0.25]}
          scale={[w * 0.55, h * 0.7, d * 0.55]}
        />
      )}
      {/* tháp cho shape 2 */}
      {shape === 2 && (
        <mesh geometry={NB_CYL} material={wall} position={[w * 0.3, h * 0.9, d * 0.3]} scale={[0.55, h * 0.8, 0.55]} />
      )}
      {/* mái */}
      {shape === 3 ? (
        <mesh geometry={NB_BOX} material={roof} position={[0, h + 0.25, 0]} scale={[w + 0.3, 0.5, d + 0.3]} />
      ) : (
        <mesh
          geometry={NB_CONE}
          material={roof}
          position={[0, h + 0.5, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[Math.max(w, d) * 0.75, 1.1, Math.max(w, d) * 0.75]}
        />
      )}
      {/* cửa */}
      <mesh geometry={NB_BOX} material={nbMat("#3b2417")} position={[0, 0.55, d / 2 + 0.02]} scale={[0.55, 1.1, 0.05]} />
      {/* 2 cửa sổ phát sáng nhẹ */}
      <mesh
        geometry={NB_BOX}
        material={nbMat("#fde68a", "#facc15")}
        position={[-w / 3, h * 0.55, d / 2 + 0.02]}
        scale={[0.5, 0.5, 0.05]}
      />
      <mesh
        geometry={NB_BOX}
        material={nbMat("#fde68a", "#facc15")}
        position={[w / 3, h * 0.55, d / 2 + 0.02]}
        scale={[0.5, 0.5, 0.05]}
      />
    </group>
  );
}

function NeighborTree({ seed }: { seed: number }) {
  const h = 1.2 + ((seed * 3) % 5) * 0.3;
  const leafColors = ["#22c55e", "#16a34a", "#15803d", "#65a30d", "#4d7c0f"];
  const c = leafColors[seed % leafColors.length];
  const r = 0.7 + (seed % 3) * 0.15;
  return (
    <group>
      <mesh geometry={NB_CYL} material={nbMat("#5b3318")} position={[0, h * 0.5, 0]} scale={[0.15, h, 0.15]} />
      <mesh geometry={NB_SPH} material={nbMat(c)} position={[0, h + 0.4, 0]} scale={[r, r, r]} />
    </group>
  );
}


function initialLetter(s: string) {
  return (s || "?").trim().charAt(0).toUpperCase();
}

function BuilderFigure() {
  const ref = useRef<THREE.Group>(null!);
  const armRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      // đi vòng nhỏ quanh trước nhà
      ref.current.position.x = Math.cos(t * 1.2) * 1.4;
      ref.current.position.z = 1.8 + Math.sin(t * 1.2) * 0.6;
      ref.current.rotation.y = -t * 1.2 + Math.PI / 2;
    }
    if (armRef.current) armRef.current.rotation.x = Math.sin(t * 5) * 0.8;
  });
  return (
    <group ref={ref} position={[0, 0, 1.8]}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[0.35, 0.6, 0.25]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      {/* mũ bảo hộ */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.12, 12]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
      {/* búa */}
      <mesh ref={armRef} position={[0.22, 0.85, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.08]} />
        <meshStandardMaterial color="#7c3aed" />
      </mesh>
    </group>
  );
}

function FriendNeighborHouse({
  friend,
  seed,
  color,
  roofColor,
  onClick,
}: {
  friend: FriendHouse;
  seed: number;
  color: string;
  roofColor: string;
  onClick?: () => void;
}) {
  const building = friend.is_online && friend.in_house_owner === friend.user_id;
  return (
    <group onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      <NeighborHouse seed={seed} color={color} roofColor={roofColor} />
      {building && <BuilderFigure />}
      <Html position={[0, 4.2, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
        <div
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="pointer-events-auto cursor-pointer flex flex-col items-center gap-0.5 select-none"
        >
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur px-2 py-0.5 rounded-full text-[11px] font-black shadow border-2 border-emerald-300 max-w-[160px]">
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt="" className="w-4 h-4 rounded-full" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-orange-400 text-white grid place-items-center text-[9px] font-black">
                {initialLetter(friend.username)}
              </span>
            )}
            <span className="truncate text-slate-800">{friend.house_name || friend.username}</span>
            <span className={`w-2 h-2 rounded-full ${friend.is_online ? "bg-emerald-500" : "bg-gray-400"}`} />
          </div>
          {building && (
            <div className="bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full text-[10px] font-black shadow border border-amber-600 animate-pulse">
              🔨 Đang xây
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

const Neighborhood = memo(function Neighborhood({
  friends,
  onVisitFriend,
}: {
  friends?: FriendHouse[];
  onVisitFriend?: (ownerId: string) => void;
}) {
  // Mảnh trung tâm (mảnh đất người chơi) cần được chừa lại.
  // half mảnh + đường = 11 ô; thêm một dải an toàn nhỏ.
  const innerHalf = (GRID + PATH * 2) / 2 + 1; // ~12
  // Chỉ dựng hàng xóm trong bán kính nhìn thấy được (sương mù che phần còn lại)
  // ⇒ giảm mạnh số mesh, map mượt hơn nhiều.
  const worldHalf = 72;
  // Khoảng cách giữa các "lô hàng xóm" theo bố cục thành phố nhỏ
  const STEP = 14;

  const palettes = [
    { wall: "#f5e6c8", roof: "#b91c1c" },
    { wall: "#fde68a", roof: "#7f1d1d" },
    { wall: "#fecaca", roof: "#475569" },
    { wall: "#bae6fd", roof: "#0c4a6e" },
    { wall: "#d9f99d", roof: "#365314" },
    { wall: "#fbcfe8", roof: "#831843" },
    { wall: "#e9d5ff", roof: "#4c1d95" },
    { wall: "#fed7aa", roof: "#9a3412" },
    { wall: "#ffffff", roof: "#1f2937" },
  ];
  // Thu thập trước danh sách slot nhà (sorted theo khoảng cách tới trung tâm)
  // để gán nhà bạn bè vào những slot gần nhất trước, đẹp mắt hơn.
  type Slot = {
    gx: number; gz: number; seed: number; s: number;
    jitterX: number; jitterZ: number; rot: number;
    dist2: number;
  };
  const houseSlots: Slot[] = [];
  const treeGroups: ReactNode[] = [];
  let i = 0;
  for (let gx = -worldHalf + STEP / 2; gx < worldHalf; gx += STEP) {
    for (let gz = -worldHalf + STEP / 2; gz < worldHalf; gz += STEP) {
      if (Math.abs(gx) < innerHalf && Math.abs(gz) < innerHalf) continue;
      i++;
      const seed = (Math.floor(gx + 1000) * 73856093) ^ (Math.floor(gz + 1000) * 19349663);
      const s = Math.abs(seed) % 1000;
      const jitterX = ((s % 7) - 3) * 0.6;
      const jitterZ = (((s >> 3) % 7) - 3) * 0.6;
      const rot = ((s >> 6) % 4) * (Math.PI / 2);
      const isHouse = s % 4 !== 0;
      if (isHouse) {
        houseSlots.push({ gx, gz, seed, s, jitterX, jitterZ, rot, dist2: gx * gx + gz * gz });
      } else {
        const tx = (s % 9) - 4;
        const tz = ((s >> 1) % 9) - 4;
        treeGroups.push(
          <group key={`gt-${gx}-${gz}`} position={[gx + tx * 1.2, 0, gz + tz * 1.2]}>
            <NeighborTree seed={s} />
          </group>
        );
      }
    }
    if (i > 120) break;
  }
  houseSlots.sort((a, b) => a.dist2 - b.dist2);

  const houses: ReactNode[] = [];
  const trees = treeGroups;
  const fs = friends ?? [];
  houseSlots.forEach((slot, idx) => {
    const p = palettes[slot.s % palettes.length];
    const friend = fs[idx];
    houses.push(
      <group
        key={`h-${slot.gx}-${slot.gz}`}
        position={[slot.gx + slot.jitterX, 0, slot.gz + slot.jitterZ]}
        rotation={[0, slot.rot, 0]}
      >
        {friend ? (
          <FriendNeighborHouse
            friend={friend}
            seed={slot.s}
            color={p.wall}
            roofColor={p.roof}
            onClick={() => onVisitFriend?.(friend.user_id)}
          />
        ) : (
          <NeighborHouse seed={slot.s} color={p.wall} roofColor={p.roof} />
        )}
      </group>
    );
    if (slot.s % 2 === 0) {
      const tx = (slot.s % 5) - 2;
      const tz = ((slot.s >> 1) % 5) - 2;
      trees.push(
        <group key={`t-${slot.gx}-${slot.gz}`} position={[slot.gx + tx * 1.4, 0, slot.gz + tz * 1.4]}>
          <NeighborTree seed={slot.s + 17} />
        </group>
      );
    }
  });

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <planeGeometry args={[WORLD, WORLD]} />
        <meshStandardMaterial color="#b8b5af" />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[innerHalf + 0.5, innerHalf + 2.5, 64]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      {houses}
      {trees}
    </group>
  );
});

function PlotAndPlacement({
  placed, walls, roofs, floors, wallColor, wallMode, onWallPaint, onWallPlace, wallPickA, roofMode, roofPicks,
  floorMode, floorPicks,
  selectedItemId, rotation, onPlace, onRemove, onPillarClick, onWallRemove, onRoofRemove, onFloorRemove,
  activeFloor, onItemClick, editingId, signLabels, friendHouses, onVisitFriend, dimTown,
  releasedLanterns, onStartRiverQuiz, onReleaseLantern, showFriendLabels,
}: Omit<Props, "onRotate">) {
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  const selected = selectedItemId ? getItem(selectedItemId) : null;
  const half = (GRID * CELL) / 2;
  const buildMode = wallMode || roofMode || floorMode;
  const floorY = activeFloor * WALL_HEIGHT;

  const rotatedFootprint = (it: CatalogItem) => {
    const swap = rotation % 2 === 1;
    return { w: swap ? it.d : it.w, d: swap ? it.w : it.d };
  };

  const handleMove = (e: any) => {
    if (!selected || buildMode) return;
    const p = e.point as THREE.Vector3;
    const gx = Math.floor(p.x + half);
    const gz = Math.floor(p.z + half);
    setHover({ x: gx, z: gz });
  };
  const handleClick = (e: any) => {
    if (buildMode || !selected) return;
    let h = hover;
    if (!h && e?.point) {
      const p = e.point as THREE.Vector3;
      h = { x: Math.floor(p.x + half), z: Math.floor(p.z + half) };
    }
    if (h) onPlace(h.x, h.z);
  };

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[Math.max(400, WORLD + 80), Math.max(400, WORLD + 80)]} />
        <meshStandardMaterial color="#b8b5af" />
      </mesh>
      <HoiAnTown
        friends={friendHouses}
        onVisitFriend={onVisitFriend}
        releasedLanterns={releasedLanterns}
        onStartRiverQuiz={onStartRiverQuiz}
        onReleaseLantern={onReleaseLantern}
        showFriendLabels={showFriendLabels}
        dim={!!dimTown}
      />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[GRID + PATH * 2, GRID + PATH * 2]} />
        <meshStandardMaterial color="#b8b0a4" />
      </mesh>
      {/* Click-plane ở cao độ của tầng đang chọn */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, floorY + 0.012, 0]}
        onPointerMove={handleMove}
        onPointerOut={() => setHover(null)}
        onClick={handleClick}
      >
        <planeGeometry args={[GRID, GRID]} />
        <meshStandardMaterial color="#9bca6f" transparent opacity={activeFloor === 0 ? 1 : 0.25} />
      </mesh>
      <gridHelper args={[GRID, GRID, "#3a5a2a", "#5e8a3f"]} position={[0, floorY + 0.02, 0]} />

      {/* Rào cản 4 cạnh trên các tầng cao để nhân vật không bị té */}
      {activeFloor > 0 && (
        <group position={[0, floorY, 0]}>
          {[
            { p: [0, 0.5, -half] as [number, number, number], s: [GRID, 1, 0.15] as [number, number, number] },
            { p: [0, 0.5, half] as [number, number, number], s: [GRID, 1, 0.15] as [number, number, number] },
            { p: [-half, 0.5, 0] as [number, number, number], s: [0.15, 1, GRID] as [number, number, number] },
            { p: [half, 0.5, 0] as [number, number, number], s: [0.15, 1, GRID] as [number, number, number] },
          ].map((r, i) => (
            <mesh key={i} position={r.p} castShadow>
              <boxGeometry args={r.s} />
              <meshStandardMaterial color="#fde68a" roughness={0.7} />
            </mesh>
          ))}
        </group>
      )}

      {/* 4 cột mốc trắng — chỉ ở tầng trệt */}
      {[-half, half].map((x) =>
        [-half, half].map((z) => (
          <mesh key={`${x}-${z}`} castShadow position={[x, 0.4, z]}>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))
      )}

      {/* Walls */}
      {walls.map((w) => (
        <WallMesh
          key={w.id}
          w={w}
          color={wallColor}
          dim={(w.floor ?? 0) !== activeFloor}
          onRemove={() => onWallRemove(w.id)}
          placed={placed}
          onPaint={onWallPaint ? () => onWallPaint(w.id) : undefined}
          onPlaceAt={onWallPlace && selected && !buildMode && !isDoorItem(selected.id) && !isWindowItem(selected.id) && !isRoof(selected.id) ? (x, y, z) => onWallPlace(w.id, x, y, z) : undefined}
        />
      ))}

      {/* Floors */}
      {floors.map((f) => (
        <FloorMesh
          key={f.id}
          f={f}
          dim={(f.floor ?? 0) !== activeFloor}
          onRemove={() => onFloorRemove(f.id)}
        />
      ))}

      {/* Roofs */}
      {roofs.map((r) => (
        <RoofMesh
          key={r.id}
          r={r}
          dim={(r.floor ?? 0) !== activeFloor}
          onRemove={() => onRoofRemove(r.id)}
        />
      ))}

      {/* Placed items */}
      {placed.map((p) => {
        const it = getItem(p.itemId);
        if (!it) return null;
        const swap = p.rotation % 2 === 1;
        const fw = swap ? it.d : it.w;
        const fd = swap ? it.w : it.d;
        const hasAngle = typeof p.angleRad === "number";
        // Khi cửa sổ snap vào tường xéo: (p.x, p.z) lưu thẳng tọa độ TÂM (đã +10 để vẫn nằm trong hệ lưới).
        // Lúc render thì không cộng thêm fw/2, fd/2 nữa.
        const wx = hasAngle ? p.x - half : p.x - half + fw / 2;
        const wz = hasAngle ? p.z - half : p.z - half + fd / 2;
        const pFloor = p.floor ?? 0;
        const floorOffset = pFloor * WALL_HEIGHT;
        // Khi đặt vật lên nóc surface: bù trừ khoảng đáy sẵn có của model topper
        // để 2 mặt phẳng tiếp xúc trực tiếp thay vì bay lơ lửng.
        const topperBaseInset = (p.stackY ?? 0) > 0 ? topperBottomY(p.itemId) : 0;
        const yOffset = isRoof(p.itemId) ? WALL_HEIGHT : (isWindowItem(p.itemId) ? 1.2 : 0) + (p.stackY ?? 0) - topperBaseInset;
        const isOtherFloor = pFloor !== activeFloor;
        const isWallPickPillar = wallMode && p.itemId === "pillar" && wallPickA === p.id;
        const isRoofPickPillar = roofMode && p.itemId === "pillar" && roofPicks.includes(p.id);
        const isFloorPickPillar = floorMode && p.itemId === "pillar" && floorPicks.includes(p.id);
        const isPickedPillar = isWallPickPillar || isRoofPickPillar || isFloorPickPillar;
        const rotY = hasAngle ? (p.angleRad as number) : (p.rotation * Math.PI) / 2;
        return (
          <group
            key={p.id}
            position={[wx, yOffset + floorOffset, wz]}
            rotation={[0, rotY, 0]}
            onContextMenu={(e) => {
              e.stopPropagation();
              if (!buildMode && !isOtherFloor) onRemove(p.id);
            }}
            onClick={(e) => {
              if (isOtherFloor) return;
              if (buildMode && p.itemId === "pillar") {
                e.stopPropagation();
                onPillarClick(p.id);
                return;
              }
              // Không ở build/place mode → mở panel chỉnh xoay/di chuyển
              if (!buildMode && !selected && onItemClick) {
                e.stopPropagation();
                onItemClick(p.id, { localY: e.point.y - (yOffset + floorOffset) });
              }
            }}
          >
            <ItemModel item={it} placedId={p.id} label={p.itemId === "sign" ? signLabels?.[p.id] : undefined} />
            {editingId === p.id && !isOtherFloor && (
              <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[Math.max(it.w, it.d) * 0.7, Math.max(it.w, it.d) * 0.85, 36]} />
                <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            )}
            {isPickedPillar && !isOtherFloor && (
              <mesh position={[0, 2.5, 0]}>
                <torusGeometry args={[0.6, 0.08, 8, 24]} />
                <meshStandardMaterial color={roofMode ? "#60a5fa" : "#fde047"} emissive={roofMode ? "#3b82f6" : "#fbbf24"} emissiveIntensity={1} />
              </mesh>
            )}
            {buildMode && p.itemId === "pillar" && !isPickedPillar && !isOtherFloor && (
              <mesh position={[0, 5.3, 0]}>
                <sphereGeometry args={[0.18, 12, 12]} />
                <meshStandardMaterial color={roofMode ? "#60a5fa" : "#22c55e"} emissive={roofMode ? "#2563eb" : "#16a34a"} emissiveIntensity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Ghost */}
      {!buildMode && selected && hover && (() => {
        const { w: fw, d: fd } = rotatedFootprint(selected);
        const wx = hover.x - half + fw / 2;
        const wz = hover.z - half + fd / 2;
        const inside = hover.x >= 0 && hover.z >= 0 && hover.x + fw <= GRID && hover.z + fd <= GRID;
        const yOffset = isRoof(selected.id) ? WALL_HEIGHT : (isWindowItem(selected.id) ? 1.2 : 0);
        return (
          <group position={[wx, yOffset + floorY, wz]} rotation={[0, (rotation * Math.PI) / 2, 0]}>
            <mesh position={[0, selected.h / 2, 0]}>
              <boxGeometry args={[selected.w, selected.h, selected.d]} />
              <meshStandardMaterial color={inside ? "#22c55e" : "#ef4444"} transparent opacity={0.45} />
            </mesh>
          </group>
        );
      })()}
    </group>
  );
}


function CameraView({ controlsRef, mode }: { controlsRef: React.MutableRefObject<any>; mode: string }) {
  const { camera } = useThree();
  const { gl } = useThree();
  useEffect(() => {
    fpState.on = mode === "eye";
    if (mode !== "eye") return;
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    fpState.yaw = 0; fpState.pitch = 0; fpState.teleport = true;
    const el = gl.domElement;
    let drag = false, lx = 0, ly = 0;
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      fpState.yaw -= (e.clientX - lx) * 0.005;
      fpState.pitch = Math.max(-1.2, Math.min(1.2, fpState.pitch - (e.clientY - ly) * 0.004));
      lx = e.clientX; ly = e.clientY;
    };
    const up = () => { drag = false; };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      fpState.on = false;
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [mode, camera, gl]);
  useEffect(() => {
    if (mode === "eye") return;
    const c = controlsRef.current;
    const t = c ? c.target as THREE.Vector3 : new THREE.Vector3();
    const off =
      mode === "top" ? [0, 125, 5] :
      mode === "front" ? [0, 5, 16] :
      mode === "wide" ? [22, 26, 26] : [0, 14, 22];
    camera.position.set(t.x + off[0], t.y + off[1], t.z + off[2]);
    camera.lookAt(t);
    c?.update();
  }, [mode, camera, controlsRef]);
  return null;
}

export default function GameWorld(props: Props) {
  const controlsRef = useRef<any>(null);

  const rotateRef = useRef(props.onRotate);
  rotateRef.current = props.onRotate;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") rotateRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Điện thoại / máy yếu: vẫn render nét (dpr cao) nhưng tắt bóng đổ + khử răng cưa
  // để bù chi phí; AdaptiveDpr sẽ tự hạ độ phân giải khi khung hình tụt.
  const isLowEnd = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
        ((navigator as any).hardwareConcurrency ?? 8) <= 4 ||
        ((navigator as any).deviceMemory ?? 8) <= 4),
    []
  );

  const maxDpr = useMemo(() => {
    const device = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    return isLowEnd ? 1 : Math.min(device, 1.25);
  }, [isLowEnd]);

  return (
    <Canvas
      shadows={isLowEnd ? false : true}
      camera={{ position: [0, 18, 28], fov: 55 }}
      dpr={[1, maxDpr]}
      performance={{ min: 0.4 }}
      gl={{ antialias: !isLowEnd, powerPreference: "high-performance", toneMappingExposure: 1.28 }}
    >
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />

      {/* Solid sky-blue background so the canvas never flashes white before Sky finishes loading */}
      <color attach="background" args={["#a7d8f5"]} />

      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#e8f6ff", "#7fae63", 0.95]} />
      <directionalLight
        castShadow
        position={[25, 35, 18]}
        intensity={2.3}
        color="#fffaf0"
        shadow-mapSize-width={isLowEnd ? 512 : 1024}
        shadow-mapSize-height={isLowEnd ? 512 : 1024}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      {/* Bầu trời nhẹ; bỏ HDRI Environment (tải nặng) và mây động trên máy yếu */}
      <Suspense fallback={null}>
        <Sky sunPosition={[100, 60, 100]} turbidity={0.6} rayleigh={0.18} mieCoefficient={0.003} mieDirectionalG={0.9} />
        {!isLowEnd && (
          <Clouds material={THREE.MeshBasicMaterial}>
            <Cloud position={[-15, 18, -10]} speed={0.2} opacity={0.5} />
            <Cloud position={[20, 22, 5]} speed={0.2} opacity={0.45} />
          </Clouds>
        )}
      </Suspense>
      <Character controlsRef={controlsRef} activeFloor={props.activeFloor} pickups={props.pickups} collectedIds={props.collectedIds} onPickup={props.onPickup} walls={props.walls} placed={props.placed} onPlayerPos={props.onPlayerPos} />
      <PlotAndPlacement {...props} />
      {props.pickups && props.pickups.length > 0 && (
        <PickupsField pickups={props.pickups ?? []} collectedIds={props.collectedIds ?? new Set()} showAdminMarkers={!!props.showAdminMarkers} sparkles={props.sparkles} />
      )}
      {!isLowEnd && (
        <ContactShadows position={[0, 0.03, 0]} opacity={0.35} scale={40} blur={2.2} far={10} resolution={256} frames={1} />
      )}
      <fog attach="fog" args={["#eaf6ff", 110, 250]} />

      <CameraView controlsRef={controlsRef} mode={props.viewMode ?? "free"} />
      <OrbitControls
        ref={controlsRef}
        enabled={props.viewMode !== "eye"}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={170}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
