import { memo, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { FriendHouse } from "@/lib/friend-houses.functions";
import { useLocale } from "@/lib/locale";

// Phố cổ kiểu Hội An: đường xám, dãy nhà vàng sát nhau, mái ngói nâu, đèn lồng.
const ROAD = "#8f8b85";
const SIDEWALK = "#b9b2a6";
const WALLS = ["#e9b93c", "#f0c24b", "#e3ad2f", "#f2cf63", "#dca93a"];
const ROOFS = ["#5b3a29", "#6b4430", "#4a3226"];

const HW = 5; // bề rộng mặt tiền
const HD = 6; // chiều sâu nhà
const HH = 4.2;

// Hình học dùng chung để giảm tải
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  prism: new THREE.CylinderGeometry(1, 1, 1, 3, 1),
  lantern: new THREE.SphereGeometry(0.32, 10, 8),
};
const M = {
  wood: new THREE.MeshStandardMaterial({ color: "#3b2416", roughness: 0.8 }),
  door: new THREE.MeshStandardMaterial({ color: "#2a1a10", roughness: 0.9 }),
  lantern: new THREE.MeshStandardMaterial({ color: "#f05a28", emissive: "#e8461c", emissiveIntensity: 0.5 }),
  road: new THREE.MeshStandardMaterial({ color: ROAD, roughness: 1 }),
  walk: new THREE.MeshStandardMaterial({ color: SIDEWALK, roughness: 1 }),
  wire: new THREE.MeshBasicMaterial({ color: "#2b2b2b" }),
};
const wallMats = WALLS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
const roofMats = ROOFS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));

type Slot = { x: number; z: number; rot: number; seed: number; d2: number };

/** Mặt tiền nhà (local +z là phía đường) */
function ShopHouse({ seed }: { seed: number }) {
  const wm = wallMats[seed % wallMats.length];
  const rm = roofMats[seed % roofMats.length];
  const two = seed % 3 === 0;
  const h = two ? HH + 2 : HH;
  return (
    <group>
      <mesh geometry={G.box} material={wm} position={[0, h / 2, 0]} scale={[HW - 0.1, h, HD]} castShadow receiveShadow />
      {/* Mái ngói 2 mái */}
      <mesh geometry={G.prism} material={rm} position={[0, h + 0.7, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.6, HW + 0.4, HD * 0.62]} castShadow />
      {/* Mái hiên trước */}
      <mesh geometry={G.box} material={rm} position={[0, 2.8, HD / 2 + 0.6]} rotation={[0.35, 0, 0]} scale={[HW, 0.12, 1.4]} />
      {/* Cửa gỗ */}
      <mesh geometry={G.box} material={M.door} position={[0, 1.15, HD / 2 + 0.01]} scale={[HW * 0.62, 2.3, 0.05]} />
      {/* Cột gỗ */}
      <mesh geometry={G.box} material={M.wood} position={[-HW / 2 + 0.25, 1.3, HD / 2 + 1.1]} scale={[0.16, 2.6, 0.16]} />
      <mesh geometry={G.box} material={M.wood} position={[HW / 2 - 0.25, 1.3, HD / 2 + 1.1]} scale={[0.16, 2.6, 0.16]} />
      {/* Cửa sổ tầng trên */}
      {two && <mesh geometry={G.box} material={M.wood} position={[0, h - 1.3, HD / 2 + 0.01]} scale={[HW * 0.5, 1, 0.05]} />}
      {/* Đèn lồng dưới hiên */}
      {seed % 2 === 0 && (
        <>
          <mesh geometry={G.lantern} material={M.lantern} position={[-1.2, 2.2, HD / 2 + 1]} scale={[1, 1.25, 1]} />
          <mesh geometry={G.lantern} material={M.lantern} position={[1.2, 2.2, HD / 2 + 1]} scale={[1, 1.25, 1]} />
        </>
      )}
    </group>
  );
}

function FriendLabel({ friend, onClick }: { friend: FriendHouse; onClick?: () => void }) {
  const en = useLocale() === "en";
  const name = friend.house_name || friend.display_name || friend.username;
  const building = friend.is_online && friend.in_house_owner === friend.user_id;
  return (
    <Html position={[0, HH + 3.2, HD / 2]} center distanceFactor={16} zIndexRange={[10, 0]}>
      <button
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className="pointer-events-auto cursor-pointer flex flex-col items-center gap-0.5 select-none"
      >
        <div className="flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded-full text-[11px] font-black shadow border-2 border-amber-500 max-w-[180px] text-slate-800">
          <span>🏠</span>
          <span className="truncate">{en ? `${name}'s house` : `Nhà của ${name}`}</span>
          <span className={`w-2 h-2 rounded-full ${friend.is_online ? "bg-emerald-500" : "bg-gray-400"}`} />
        </div>
        <span className="text-[10px] font-bold bg-amber-500 text-white px-2 rounded-full shadow">
          {building ? (en ? "🔨 Building" : "🔨 Đang xây") : (en ? "Tap to visit" : "Bấm để xem nhà")}
        </span>
      </button>
    </Html>
  );
}

/** Đoạn đường xám + vỉa hè 2 bên. dir "x": chạy theo trục x tại z=c; "z": theo trục z tại x=c */
function Road({ dir, c, from, to }: { dir: "x" | "z"; c: number; from: number; to: number }) {
  const len = to - from;
  const mid = (from + to) / 2;
  const pos = (off: number, y: number): [number, number, number] => (dir === "x" ? [mid, y, c + off] : [c + off, y, mid]);
  const sc = (w: number): [number, number, number] => (dir === "x" ? [len, 0.04, w] : [w, 0.04, len]);
  return (
    <group>
      <mesh geometry={G.box} material={M.road} position={pos(0, 0.0)} scale={sc(6)} receiveShadow />
      <mesh geometry={G.box} material={M.walk} position={pos(-3.9, 0.06)} scale={sc(1.8)} receiveShadow />
      <mesh geometry={G.box} material={M.walk} position={pos(3.9, 0.06)} scale={sc(1.8)} receiveShadow />
    </group>
  );
}

/** Dây đèn lồng giăng ngang đường */
function LanternString({ a, b }: { a: [number, number]; b: [number, number] }) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const n = 4;
  return (
    <group position={[(a[0] + b[0]) / 2, 5.6, (a[1] + b[1]) / 2]} rotation={[0, ang, 0]}>
      <mesh geometry={G.box} material={M.wire} scale={[0.03, 0.03, len]} />
      {Array.from({ length: n }).map((_, i) => {
        const t = (i + 1) / (n + 1) - 0.5;
        const sag = -0.5 * (1 - (2 * t) ** 2);
        return <mesh key={i} geometry={G.lantern} material={M.lantern} position={[0, sag - 0.4, t * len]} scale={[1, 1.3, 1]} />;
      })}
    </group>
  );
}

// Bố cục đường: đường chính chạy ngang trước nhà mình, 2 đường dọc 2 bên, 1 đường ngang phía sau
const MAIN_Z = 16;
const BACK_Z = -24;
const SIDE_X = 30;
const EXT = 66;

function buildSlots(): Slot[] {
  const slots: Slot[] = [];
  let seed = 7;
  const push = (x: number, z: number, rot: number) => {
    seed = (seed * 9301 + 49297) % 233280;
    slots.push({ x, z, rot, seed, d2: x * x + (z - MAIN_Z) ** 2 });
  };
  const off = 3 + 1.8 + HD / 2 + 1.2; // tâm nhà cách tim đường
  // Đường chính (ngang): 2 bên
  for (let x = -EXT + HW / 2; x < EXT; x += HW) {
    if (Math.abs(x) >= 14 && Math.abs(Math.abs(x) - SIDE_X) >= 6) push(x, MAIN_Z - off, 0);
    push(x, MAIN_Z + off, Math.PI);
  }
  // Đường sau: 2 bên
  for (let x = -SIDE_X + 7.5; x < SIDE_X - 6; x += HW) {
    push(x, BACK_Z - off, 0);
    push(x, BACK_Z + off, Math.PI);
  }
  // 2 đường dọc
  for (const sx of [-SIDE_X, SIDE_X]) {
    for (let z = BACK_Z - 32; z < MAIN_Z - off - HD / 2 - HW / 2; z += HW) {
      if (Math.abs(z - BACK_Z) < 6) continue;
      push(sx - off, z, Math.PI / 2);
      push(sx + off, z, -Math.PI / 2);
    }
  }
  return slots;
}

export const HoiAnTown = memo(function HoiAnTown({
  friends,
  onVisitFriend,
}: {
  friends?: FriendHouse[];
  onVisitFriend?: (ownerId: string) => void;
}) {
  const slots = useMemo(() => buildSlots(), []);
  // Nhà bạn bè ở gần nhà mình nhất, nằm kế nhau dọc đường chính
  const ordered = useMemo(() => [...slots].sort((a, b) => a.d2 - b.d2), [slots]);
  const fs = friends ?? [];
  const lanterns: [number, number][][] = [];
  for (let x = -EXT + 6; x < EXT; x += 10) lanterns.push([[x, MAIN_Z - 4.6], [x + 3, MAIN_Z + 4.6]]);
  for (let z = BACK_Z - 26; z < MAIN_Z - 8; z += 12) {
    lanterns.push([[-SIDE_X - 4.6, z], [-SIDE_X + 4.6, z + 3]]);
    lanterns.push([[SIDE_X - 4.6, z], [SIDE_X + 4.6, z + 3]]);
  }

  return (
    <group>
      <Road dir="x" c={MAIN_Z} from={-EXT - 4} to={EXT + 4} />
      <Road dir="x" c={BACK_Z} from={-SIDE_X} to={SIDE_X} />
      <Road dir="z" c={-SIDE_X} from={BACK_Z - 34} to={MAIN_Z - 3} />
      <Road dir="z" c={SIDE_X} from={BACK_Z - 34} to={MAIN_Z - 3} />
      {/* Lối từ nhà mình ra đường chính */}
      <mesh geometry={G.box} material={M.walk} position={[0, 0.03, 12.5]} scale={[4, 0.04, 3]} />
      {ordered.map((s, i) => {
        const friend = fs[i];
        return (
          <group key={`${s.x}-${s.z}`} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}
            onClick={friend ? (e) => { e.stopPropagation(); onVisitFriend?.(friend.user_id); } : undefined}>
            <ShopHouse seed={s.seed} />
            {friend && <FriendLabel friend={friend} onClick={() => onVisitFriend?.(friend.user_id)} />}
          </group>
        );
      })}
      {lanterns.map(([a, b], i) => <LanternString key={i} a={a} b={b} />)}
    </group>
  );
});
