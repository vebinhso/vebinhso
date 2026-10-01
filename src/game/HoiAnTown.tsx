import { memo, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVisitableHouse } from "@/lib/friend-houses.functions";
import { getItem, topperBottomY } from "./catalog";
import { isWindowItem } from "./catalog";
import { ItemModel } from "./Models";
import { WallMesh, RoofMesh, FloorMesh } from "./GameWorld";
import { WALL_HEIGHT } from "@/lib/game";
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
const STEP = 9; // khoảng cách giữa các nhà (có khe hở)
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

// Bảng hiệu kiểu Hội An: chữ Hán / tiệm Việt, nền gỗ đen chữ vàng, nền đỏ, nền trắng viền xanh...
const SIGN_TEXTS = ["福建會館", "勝和號", "金山寺", "廣肇會館", "泉昌利", "興生李", "南發", "合元", "昌德", "益維", "Bánh Mì", "Bơ Vàng", "Tiệm Lồng Đèn", "Cà Phê", "Quà Lưu Niệm", "Vải Lụa"];
const SIGN_STYLES = [
  { bg: "#1f140c", fg: "#f2c14e", border: "#8a5a2b" },
  { bg: "#a3201b", fg: "#f7d774", border: "#5a1410" },
  { bg: "#f4efe2", fg: "#1c1c1c", border: "#2f6f8f" },
  { bg: "#2c4a3a", fg: "#f2d57e", border: "#c79a3a" },
  { bg: "#e9c46a", fg: "#7a1d12", border: "#7a1d12" },
];
const signMatCache = new Map<number, THREE.MeshBasicMaterial>();
function signMat(seed: number) {
  const key = seed % (SIGN_TEXTS.length * SIGN_STYLES.length);
  let m = signMatCache.get(key);
  if (m) return m;
  const text = SIGN_TEXTS[key % SIGN_TEXTS.length];
  const st = SIGN_STYLES[Math.floor(key / SIGN_TEXTS.length) % SIGN_STYLES.length];
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = st.border; g.fillRect(0, 0, 256, 64);
  g.fillStyle = st.bg; g.fillRect(6, 6, 244, 52);
  g.fillStyle = st.fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `bold ${text.length > 8 ? 26 : 36}px serif`;
  g.fillText(text, 128, 34, 236);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  m = new THREE.MeshBasicMaterial({ map: tex });
  signMatCache.set(key, m);
  return m;
}
const EXTRA = {
  flower: new THREE.MeshStandardMaterial({ color: "#d9468f", roughness: 0.8 }),
  leaf: new THREE.MeshStandardMaterial({ color: "#3f7d3a", roughness: 0.9 }),
  rail: new THREE.MeshStandardMaterial({ color: "#2a1a10", roughness: 0.8 }),
  shutter: new THREE.MeshStandardMaterial({ color: "#2f6f5f", roughness: 0.8 }),
  tile: new THREE.MeshStandardMaterial({ color: "#c0653a", roughness: 0.85 }),
};
const LANTERN_MATS = ["#f05a28", "#e8b62c", "#c2185b", "#7b3fa0", "#2e86c1"].map(
  (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45 }),
);

/** Mặt tiền nhà Hội An đa dạng (local +z là phía đường): to/nhỏ, 1–3 tầng, ban công, bảng hiệu, đèn lồng, hoa */
function ShopHouse({ seed }: { seed: number }) {
  const wm = wallMats[seed % wallMats.length];
  const rm = roofMats[(seed >> 2) % roofMats.length];
  const type = seed % 4; // 0 nhà ống nhỏ, 1 nhà 2 tầng ban công, 2 nhà rộng thấp, 3 nhà 3 tầng
  const W = [4.2, 5.4, 7, 4.8][type];
  const floors = [1, 2, 1, 3][type];
  const h = floors * 2.6 + 0.6;
  const D = HD;
  const fz = D / 2 + 0.01;
  const lm = LANTERN_MATS[seed % LANTERN_MATS.length];
  const lm2 = LANTERN_MATS[(seed >> 3) % LANTERN_MATS.length];
  const nLantern = 2 + (seed % 3);
  return (
    <group>
      <mesh geometry={G.box} material={wm} position={[0, h / 2, 0]} scale={[W, h, D]} />
      {/* Mái ngói */}
      <mesh geometry={G.prism} material={rm} position={[0, h + 0.6, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.4, W + 0.5, D * 0.6]} />
      {/* Mái hiên tầng trệt */}
      <mesh geometry={G.box} material={type === 1 ? EXTRA.tile : rm} position={[0, 2.75, D / 2 + 0.6]} rotation={[0.35, 0, 0]} scale={[W + 0.2, 0.12, 1.4]} />
      {/* Cửa gỗ / cửa tiệm */}
      <mesh geometry={G.box} material={M.door} position={[0, 1.1, fz]} scale={[W * (type === 2 ? 0.75 : 0.6), 2.2, 0.05]} />
      {/* Cột gỗ */}
      <mesh geometry={G.box} material={M.wood} position={[-W / 2 + 0.25, 1.3, D / 2 + 1.1]} scale={[0.16, 2.6, 0.16]} />
      <mesh geometry={G.box} material={M.wood} position={[W / 2 - 0.25, 1.3, D / 2 + 1.1]} scale={[0.16, 2.6, 0.16]} />
      {/* Bảng hiệu */}
      <mesh geometry={G.box} material={signMat(seed)} position={[0, type === 2 ? 3.35 : 3.25, D / 2 + 0.08]} scale={[Math.min(W - 0.6, 4), 0.8, 0.08]} />
      {/* Tầng trên: cửa chớp + ban công */}
      {Array.from({ length: floors - 1 }).map((_, f) => {
        const y = 2.6 * (f + 1) + 1.3;
        return (
          <group key={f}>
            <mesh geometry={G.box} material={EXTRA.shutter} position={[-W * 0.22, y, fz]} scale={[W * 0.3, 1.2, 0.05]} />
            <mesh geometry={G.box} material={EXTRA.shutter} position={[W * 0.22, y, fz]} scale={[W * 0.3, 1.2, 0.05]} />
            {(type === 1 || f === 1) && (
              <>
                <mesh geometry={G.box} material={M.wood} position={[0, y - 0.7, D / 2 + 0.5]} scale={[W, 0.1, 1]} />
                <mesh geometry={G.box} material={EXTRA.rail} position={[0, y - 0.35, D / 2 + 0.98]} scale={[W, 0.6, 0.05]} />
                <mesh geometry={G.box} material={EXTRA.flower} position={[0, y - 0.15, D / 2 + 1.02]} scale={[W * 0.9, 0.25, 0.22]} />
              </>
            )}
          </group>
        );
      })}
      {/* Giàn hoa giấy trên mặt tiền */}
      {seed % 3 === 0 && (
        <>
          <mesh geometry={G.box} material={EXTRA.leaf} position={[-W / 2 + 0.4, 2.2, D / 2 + 0.12]} scale={[0.6, 2.4, 0.2]} />
          <mesh geometry={G.box} material={EXTRA.flower} position={[-W / 2 + 0.6, 3.2, D / 2 + 0.2]} scale={[1.2, 0.5, 0.25]} />
        </>
      )}
      {/* Đèn lồng nhiều màu dưới hiên */}
      {Array.from({ length: nLantern }).map((_, i) => {
        const x = -W / 2 + 0.6 + (i * (W - 1.2)) / Math.max(1, nLantern - 1);
        return <mesh key={i} geometry={G.lantern} material={i % 2 ? lm2 : lm} position={[x, 2.2, D / 2 + 1]} scale={[1, 1.25, 1]} />;
      })}
      {/* Chậu cây trước nhà */}
      {seed % 2 === 1 && (
        <mesh geometry={G.box} material={EXTRA.leaf} position={[W / 2 - 0.5, 0.4, D / 2 + 1.6]} scale={[0.6, 0.8, 0.6]} />
      )}
    </group>
  );
}


const DM = {
  wall: new THREE.MeshStandardMaterial({ color: "#f2c94c", roughness: 0.9 }),
  roof: new THREE.MeshStandardMaterial({ color: "#b8321f", roughness: 0.8 }),
  trim: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: "#9fd3ef", roughness: 0.2 }),
  door: new THREE.MeshStandardMaterial({ color: "#8a4b25", roughness: 0.8 }),
  brick: new THREE.MeshStandardMaterial({ color: "#a0412b", roughness: 0.9 }),
};

/** Nhà mặc định (chưa trang trí): tường vàng, mái ngói đỏ, ống khói, 3 cửa sổ, 1 cửa */
function DefaultHouse() {
  const W = 6, D = 5, H = 3.4;
  const win = (x: number, y: number) => (
    <group position={[x, y, D / 2 + 0.03]}>
      <mesh geometry={G.box} material={DM.trim} scale={[1.2, 1, 0.06]} />
      <mesh geometry={G.box} material={DM.glass} position={[0, 0, 0.02]} scale={[1, 0.8, 0.05]} />
      <mesh geometry={G.box} material={DM.trim} position={[0, 0, 0.05]} scale={[0.08, 0.8, 0.04]} />
      <mesh geometry={G.box} material={DM.trim} position={[0, 0, 0.05]} scale={[1, 0.08, 0.04]} />
    </group>
  );
  return (
    <group>
      <mesh geometry={G.box} material={DM.wall} position={[0, H / 2, 0]} scale={[W, H, D]} />
      {/* Đầu hồi tam giác */}
      <mesh geometry={G.prism} material={DM.wall} position={[0, H + 0.9, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} scale={[1.8, D - 0.02, W * 0.58]} />
      {/* Mái ngói đỏ 2 mái */}
      <mesh geometry={G.box} material={DM.roof} position={[-W / 4 - 0.1, H + 1.05, 0]} rotation={[0, 0, 0.55]} scale={[W / 2 + 1.1, 0.25, D + 0.8]} />
      <mesh geometry={G.box} material={DM.roof} position={[W / 4 + 0.1, H + 1.05, 0]} rotation={[0, 0, -0.55]} scale={[W / 2 + 1.1, 0.25, D + 0.8]} />
      {/* Ống khói */}
      <mesh geometry={G.box} material={DM.brick} position={[W / 4 + 0.4, H + 1.9, -0.6]} scale={[0.7, 1.6, 0.7]} />
      <mesh geometry={G.box} material={DM.trim} position={[W / 4 + 0.4, H + 2.75, -0.6]} scale={[0.9, 0.15, 0.9]} />
      {/* Cửa + tay nắm */}
      <mesh geometry={G.box} material={DM.door} position={[0, 1.05, D / 2 + 0.03]} scale={[1.1, 2.1, 0.06]} />
      <mesh geometry={G.lantern} material={DM.trim} position={[0.35, 1, D / 2 + 0.08]} scale={0.2} />
      {win(-1.9, 1.6)}
      {win(1.9, 1.6)}
      {win(0, H + 0.7)}
    </group>
  );
}

const PREVIEW_SCALE = 1; // nhà bạn bè cùng kích thước nhà mình (mảnh đất 20x20)

/** Hiện giao diện thật của nhà bạn (thu nhỏ); chưa trang trí → nhà mặc định */
function FriendHousePreview({ ownerId }: { ownerId: string }) {
  const fetchHouse = useServerFn(getVisitableHouse);
  const q = useQuery({
    queryKey: ["friend-house-preview", ownerId],
    queryFn: () => fetchHouse({ data: { ownerId } }),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const h = q.data;
  const empty = !h || (h.placed.length === 0 && h.walls.length === 0 && h.roofs.length === 0 && h.floors.length === 0);
  if (empty) return <DefaultHouse />;
  const half = 10;
  return (
    <group scale={PREVIEW_SCALE} position={[0, 0, 0]}>
      <mesh geometry={G.box} material={M.walk} position={[0, 0.02, 0]} scale={[20, 0.04, 20]} />
      {h.walls.map((w) => <WallMesh key={w.id} w={w} color="#f5e6c8" onRemove={() => {}} placed={h.placed} />)}
      {h.floors.map((f) => <FloorMesh key={f.id} f={f} onRemove={() => {}} />)}
      {h.roofs.map((r) => <RoofMesh key={r.id} r={r} onRemove={() => {}} />)}
      {h.placed.slice(0, 30).map((p) => {
        const it = getItem(p.itemId);
        if (!it) return null;
        const swap = p.rotation % 2 === 1;
        const hasAngle = typeof p.angleRad === "number";
        const wx = hasAngle ? p.x - half : p.x - half + (swap ? it.d : it.w) / 2;
        const wz = hasAngle ? p.z - half : p.z - half + (swap ? it.w : it.d) / 2;
        const inset = (p.stackY ?? 0) > 0 ? topperBottomY(p.itemId) : 0;
        const y = (isWindowItem(p.itemId) ? 1.2 : 0) + (p.stackY ?? 0) - inset + (p.floor ?? 0) * WALL_HEIGHT;
        const rotY = hasAngle ? (p.angleRad as number) : (p.rotation * Math.PI) / 2;
        return (
          <group key={p.id} position={[wx, y, wz]} rotation={[0, rotY, 0]}>
            <ItemModel item={it} placedId={`pv-${p.id}`} />
          </group>
        );
      })}
    </group>
  );
}

function FriendLabel({ friend, onClick }: { friend: FriendHouse; onClick?: () => void }) {
  const en = useLocale() === "en";
  const name = friend.house_name || friend.display_name || friend.username;
  const building = friend.is_online && friend.in_house_owner === friend.user_id;
  return (
    <Html position={[0, HH + 6, 0]} center distanceFactor={16} zIndexRange={[10, 0]}>
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
      <mesh geometry={G.box} material={M.road} position={pos(0, 0.0)} scale={sc(6)} />
      <mesh geometry={G.box} material={M.walk} position={pos(-3.9, 0.06)} scale={sc(1.8)} />
      <mesh geometry={G.box} material={M.walk} position={pos(3.9, 0.06)} scale={sc(1.8)} />
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
const EXT = 92;
// Mảnh đất bạn bè (cùng cỡ nhà mình) bên kia đường chính, quay mặt ra đường
const FRIEND_Z = MAIN_Z + 3 + 1.8 + 10.7;
const FRIEND_XS = [0, -22, 22, -44, 44, -66, 66, -88, 88];

function buildSlots(): Slot[] {
  const slots: Slot[] = [];
  let seed = 7;
  const push = (x: number, z: number, rot: number) => {
    seed = (seed * 9301 + 49297) % 233280;
    slots.push({ x, z, rot, seed, d2: x * x + (z - MAIN_Z) ** 2 });
  };
  const off = 3 + 1.8 + HD / 2 + 2; // tâm nhà cách tim đường
  // Đường chính (ngang): 2 bên
  for (let x = -EXT + HW / 2; x < EXT; x += STEP) {
    if (Math.abs(x) >= 14 && Math.abs(Math.abs(x) - SIDE_X) >= 6) push(x, MAIN_Z - off, 0);
    push(x, MAIN_Z + off, Math.PI);
  }
  // Đường sau: 2 bên
  for (let x = -SIDE_X + 7.5; x < SIDE_X - 6; x += STEP) {
    push(x, BACK_Z - off, 0);
    push(x, BACK_Z + off, Math.PI);
  }
  // 2 đường dọc
  for (const sx of [-SIDE_X, SIDE_X]) {
    for (let z = BACK_Z - 32; z < MAIN_Z - off - HD / 2 - HW / 2; z += STEP) {
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
  dim = false,
}: {
  friends?: FriendHouse[];
  onVisitFriend?: (ownerId: string) => void;
  dim?: boolean;
}) {
  useEffect(() => {
    const all = [...Object.values(M), ...wallMats, ...roofMats, ...Object.values(DM)];
    for (const m of all) { if (m.transparent) { m.transparent = false; m.opacity = 1; m.depthWrite = true; m.needsUpdate = true; } }
  }, [dim]);
  const slots = useMemo(() => buildSlots(), []);
  // Nhà bạn bè ở gần nhà mình nhất, nằm kế nhau dọc đường chính
  const ordered = useMemo(() => [...slots].sort((a, b) => a.d2 - b.d2), [slots]);
  const fs = friends ?? [];
  // Bỏ nhà phố trùng chỗ với mảnh đất bạn bè
  const nFriend = Math.min(fs.length, FRIEND_XS.length);
  const shopSlots = ordered.filter((s) => !FRIEND_XS.slice(0, nFriend).some((fx) => Math.abs(s.x - fx) < 10.5 + HW && Math.abs(s.z - FRIEND_Z) < 10.5 + HD));
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
      {!dim && fs.slice(0, FRIEND_XS.length).map((friend, i) => (
        <group key={friend.user_id} position={[FRIEND_XS[i], 0, FRIEND_Z]} rotation={[0, Math.PI, 0]}
          onClick={(e) => { e.stopPropagation(); onVisitFriend?.(friend.user_id); }}>
          {i < 8 ? <FriendHousePreview ownerId={friend.user_id} /> : <DefaultHouse />}
          <FriendLabel friend={friend} onClick={() => onVisitFriend?.(friend.user_id)} />
        </group>
      ))}
      {!dim && shopSlots.map((s, i) => {
        const friend = fs[FRIEND_XS.length + i];
        return (
          <group key={`${s.x}-${s.z}`} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}
            onClick={friend ? (e) => { e.stopPropagation(); onVisitFriend?.(friend.user_id); } : undefined}>
            {friend ? (i < 8 ? <FriendHousePreview ownerId={friend.user_id} /> : <DefaultHouse />) : <ShopHouse seed={s.seed} />}
            {friend && i < 4 && <FriendLabel friend={friend} onClick={() => onVisitFriend?.(friend.user_id)} />}
          </group>
        );
      })}
      {!dim && lanterns.map(([a, b], i) => <LanternString key={i} a={a} b={b} />)}
    </group>
  );
});
