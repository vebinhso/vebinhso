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
import { HoiAnRiver, type ReleasedLantern } from "./HoiAnRiver";
import { Button } from "@/components/ui/button";

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
  signGold: new THREE.MeshStandardMaterial({ color: "#d4af37", roughness: 0.35, metalness: 0.55 }),
  signPanel: new THREE.MeshStandardMaterial({ color: "#c9a3e8", roughness: 0.5 }),
  signLeg: new THREE.MeshStandardMaterial({ color: "#e8e8e8", roughness: 0.4, metalness: 0.5 }),
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
// Lồng đèn Hội An: thân lụa có sọc nan tre, chóp/đáy vàng đồng, tua rua
const LANTERN_COLORS = ["#ff5a1f", "#ffc933", "#e8255f", "#8b3fd9", "#1fa3e0", "#3ccf5a", "#fff1d6", "#ff8a1f", "#18b8a8"];
const LANTERN_GEO = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.06 + Math.sin(t * Math.PI) * 0.3, (t - 0.5) * 0.8)); }
  return new THREE.LatheGeometry(pts, 12);
})();
let ribTex: THREE.Texture | null = null;
function getRibTex() {
  if (ribTex || typeof document === "undefined") return ribTex;
  const c = document.createElement("canvas"); c.width = 128; c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; g.fillRect(0, 0, 128, 32);
  g.fillStyle = "rgba(0,0,0,0.28)";
  for (let i = 0; i < 12; i++) g.fillRect(i * (128 / 12), 0, 2, 32);
  ribTex = new THREE.CanvasTexture(c); ribTex.colorSpace = THREE.SRGBColorSpace;
  return ribTex;
}
const LANTERN_MATS = LANTERN_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, map: getRibTex() ?? undefined, side: THREE.DoubleSide }));
const LANTERN_CAP = new THREE.MeshStandardMaterial({ color: "#b8862b", metalness: 0.6, roughness: 0.4 });
const CAP_GEO = new THREE.CylinderGeometry(0.09, 0.09, 0.08, 8);
const TASSEL_GEO = new THREE.CylinderGeometry(0.015, 0.04, 0.35, 6);
function Lantern({ mat, position, scale = 1 }: { mat: THREE.Material; position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh geometry={LANTERN_GEO} material={mat} />
      <mesh geometry={CAP_GEO} material={LANTERN_CAP} position={[0, 0.42, 0]} />
      <mesh geometry={CAP_GEO} material={LANTERN_CAP} position={[0, -0.42, 0]} />
      <mesh geometry={TASSEL_GEO} material={mat} position={[0, -0.62, 0]} />
    </group>
  );
}

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
        return <Lantern key={i} mat={i % 2 ? lm2 : lm} position={[x, 2.2, D / 2 + 1]} />;
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
  if (empty) return <group scale={1.8}><DefaultHouse /></group>;
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

/** Bảng standee nhỏ trước cửa nhà bạn (viền vàng, nền tím nhạt như bảng ngoài phố) */
function FriendSign({ friend, onClick }: { friend: FriendHouse; onClick?: () => void }) {
  const en = useLocale() === "en";
  const name = friend.house_name || friend.display_name || friend.username;
  const building = friend.is_online && friend.in_house_owner === friend.user_id;
  return (
    <group position={[0.95, 0, HD / 2 + 1.05]}>
      <mesh geometry={G.box} material={M.signLeg} position={[-0.42, 0.5, 0]} rotation={[0.16, 0, 0]} scale={[0.06, 1.1, 0.06]} />
      <mesh geometry={G.box} material={M.signLeg} position={[0.42, 0.5, 0]} rotation={[-0.16, 0, 0]} scale={[0.06, 1.1, 0.06]} />
      <mesh geometry={G.box} material={M.signGold} position={[0, 1.2, 0]} scale={[1.15, 1.5, 0.07]} />
      <mesh geometry={G.box} material={M.signPanel} position={[0, 1.2, 0.045]} scale={[1.04, 1.39, 0.02]} />
      <Html position={[0, 1.2, 0.07]} center distanceFactor={6} zIndexRange={[10, 0]}>
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="pointer-events-auto cursor-pointer flex flex-col items-center gap-0.5 select-none w-[124px]"
        >
          <span className="flex items-center gap-1 text-[13px] font-black text-yellow-300 leading-tight" style={{ textShadow: "0 1px 2px rgba(90,30,120,0.55)" }}>
            <span>🏠</span>
            <span className="truncate">{en ? `${name}'s house` : `Nhà của ${name}`}</span>
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold text-purple-900/80 whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full ${friend.is_online ? "bg-emerald-600" : "bg-gray-500"}`} />
            {building ? (en ? "🔨 Building" : "🔨 Đang xây") : (en ? "Tap to visit" : "Bấm để xem nhà")}
          </span>
        </button>
      </Html>
    </group>
  );
}

/** Nhãn lớn chỉ hiện ở góc nhìn khám phá từ trên cao. */
function FriendMapLabel({ friend, onClick }: { friend: FriendHouse; onClick?: () => void }) {
  const en = useLocale() === "en";
  const name = friend.house_name || friend.display_name || friend.username;
  return (
    <Html position={[0, 9.2, 0]} center sprite distanceFactor={15} zIndexRange={[24, 2]}>
      <Button
        size="default"
        onClick={(event) => { event.stopPropagation(); onClick?.(); }}
        className="pointer-events-auto h-11 min-w-40 max-w-64 gap-2 border-2 border-primary-foreground/80 bg-primary px-4 text-sm font-black text-primary-foreground shadow-xl ring-4 ring-primary/35 backdrop-blur-sm animate-pulse sm:text-base"
      >
        <span aria-hidden="true">🏠</span>
        <span className="max-w-52 truncate">{en ? `${name}'s house` : `Nhà của ${name}`}</span>
      </Button>
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
  const n = 6;
  const seed = Math.abs(Math.round(a[0] * 7 + a[1] * 13));
  return (
    <group position={[(a[0] + b[0]) / 2, 5.6, (a[1] + b[1]) / 2]} rotation={[0, ang, 0]}>
      <mesh geometry={G.box} material={M.wire} scale={[0.03, 0.03, len]} />
      {Array.from({ length: n }).map((_, i) => {
        const t = (i + 1) / (n + 1) - 0.5;
        const sag = -0.5 * (1 - (2 * t) ** 2);
        return <Lantern key={i} mat={LANTERN_MATS[(seed + i * 5) % LANTERN_MATS.length]} position={[0, sag - 0.55 - (i % 2) * 0.35, t * len]} scale={0.9} />;
      })}
    </group>
  );
}

// Cột điện + dây điện kiểu phố cổ
const POLE_MATS = {
  rust: new THREE.MeshStandardMaterial({ color: "#7a4a32", roughness: 0.9 }),
  box: new THREE.MeshStandardMaterial({ color: "#d8d4c8", roughness: 0.6 }),
  wire: new THREE.MeshBasicMaterial({ color: "#1d1d1d" }),
  red: new THREE.MeshStandardMaterial({ color: "#c8322b" }),
  white: new THREE.MeshStandardMaterial({ color: "#f2f2f2" }),
};
const POLE_H = 7.5;
function PowerPole({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={G.box} material={POLE_MATS.rust} position={[0, POLE_H / 2, 0]} scale={[0.35, POLE_H, 0.35]} />
      {[2.5, 4.5, 6.3].map((y) => <mesh key={y} geometry={G.box} material={POLE_MATS.rust} position={[0, y, 0]} scale={[0.5, 0.06, 0.5]} />)}
      <mesh geometry={G.box} material={POLE_MATS.rust} position={[0, POLE_H - 0.3, 0]} scale={[0.12, 0.12, 2.2]} />
      <mesh geometry={G.box} material={POLE_MATS.box} position={[0.28, 3.4, 0]} scale={[0.2, 0.7, 0.45]} />
      <mesh geometry={G.box} material={POLE_MATS.box} position={[0.28, 2.6, 0]} scale={[0.2, 0.5, 0.4]} />
    </group>
  );
}
function PowerWires({ a, b }: { a: [number, number]; b: [number, number] }) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
  const segs = 4;
  return (
    <group position={[a[0], 0, a[1]]} rotation={[0, ang, 0]}>
      {[[-0.9, POLE_H - 0.3], [0, POLE_H - 0.3], [0.9, POLE_H - 0.3], [0.2, 5.8], [-0.2, 4.6]].map(([ox, y], w) =>
        Array.from({ length: segs }).map((_, i) => {
          const t0 = i / segs, t1 = (i + 1) / segs;
          const sag = (t: number) => -(0.6 + w * 0.12) * 4 * t * (1 - t);
          const y0 = y + sag(t0), y1 = y + sag(t1);
          const sl = len / segs;
          return <mesh key={w + "-" + i} geometry={G.box} material={POLE_MATS.wire}
            position={[ox, (y0 + y1) / 2, (t0 + t1) / 2 * len]} rotation={[Math.atan2(y0 - y1, sl), 0, 0]} scale={[0.025, 0.025, Math.hypot(sl, y1 - y0)]} />;
        }))}
    </group>
  );
}

// Biển tên đường (xanh dương, cột sọc đỏ trắng)
const streetSignCache = new Map<string, THREE.MeshBasicMaterial>();
function streetSignMat(text: string) {
  let m = streetSignCache.get(text);
  if (m) return m;
  const c = document.createElement("canvas"); c.width = 256; c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f5fbf"; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = "#fff"; g.lineWidth = 6; g.strokeRect(8, 8, 240, 80);
  g.fillStyle = "#fff"; g.font = "bold 38px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  m = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  streetSignCache.set(text, m);
  return m;
}
function StreetSign({ x, z, a, b }: { x: number; z: number; a: string; b?: string }) {
  return (
    <group position={[x, 0, z]}>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} geometry={G.box} material={i % 2 ? POLE_MATS.white : POLE_MATS.red} position={[0, 0.3 + i * 0.6, 0]} scale={[0.14, 0.6, 0.14]} />)}
      <mesh geometry={G.box} material={POLE_MATS.white} position={[0, 3.6, 0]} scale={[0.14, 1.2, 0.14]} />
      <mesh geometry={G.box} material={streetSignMat(a)} position={[0.85, 3.5, 0]} scale={[1.6, 0.6, 0.02]} />
      {b && <mesh geometry={G.box} material={streetSignMat(b)} position={[0, 3.95, 0.85]} rotation={[0, Math.PI / 2, 0]} scale={[1.6, 0.6, 0.02]} />}
    </group>
  );
}

// Bố cục đường: đường chính chạy ngang trước nhà mình, 2 đường dọc 2 bên, 1 đường ngang phía sau
const MAIN_Z = 16;
const BACK_Z = -24;
const SIDE_X = 30;
const EXT = 92;
type FriendSlot = { x: number; z: number; rot: number };

/**
 * Tạo đủ lô 20×20 cho toàn bộ bạn bè trong ranh giới phố.
 * Vị trí gần nhà người chơi được dùng trước, sau đó lan đều sang hai bên và phía sau.
 */
function buildFriendSlots(count: number): FriendSlot[] {
  const candidates: FriendSlot[] = [];
  const xs = [-80, -60, -40, -20, 0, 20, 40, 60, 80];
  const zs = [-54, -34, -14, 6, 32, 54];
  for (const z of zs) {
    for (const x of xs) {
      // Chừa khu đất 20×20 của người chơi và lối vào phía trước.
      if (Math.abs(x) < 15 && z > -15 && z < 15) continue;
      const dx = Math.abs(x - SIDE_X);
      const dl = Math.abs(x + SIDE_X);
      const rot = z >= MAIN_Z
        ? Math.PI
        : z <= BACK_Z
          ? 0
          : dl < dx
            ? Math.PI / 2
            : -Math.PI / 2;
      candidates.push({ x, z, rot });
    }
  }
  candidates.sort((a, b) => {
    const da = a.x * a.x + (a.z - MAIN_Z) * (a.z - MAIN_Z);
    const db = b.x * b.x + (b.z - MAIN_Z) * (b.z - MAIN_Z);
    return da - db;
  });
  return candidates.slice(0, count);
}

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
  releasedLanterns,
  onStartRiverQuiz,
  onReleaseLantern,
  showFriendLabels = false,
  dim = false,
}: {
  friends?: FriendHouse[];
  onVisitFriend?: (ownerId: string) => void;
  releasedLanterns?: ReleasedLantern[];
  onStartRiverQuiz?: () => void;
  onReleaseLantern?: (x: number, z: number) => void;
  showFriendLabels?: boolean;
  dim?: boolean;
}) {
  useEffect(() => {
    const all = [...Object.values(M), ...wallMats, ...roofMats, ...Object.values(DM)];
    for (const m of all) { if (m.transparent) { m.transparent = false; m.opacity = 1; m.depthWrite = true; m.needsUpdate = true; } }
  }, [dim]);
  const slots = useMemo(() => buildSlots(), []);
  const ordered = useMemo(() => [...slots].sort((a, b) => a.d2 - b.d2), [slots]);
  const fs = friends ?? [];
  const activeFriendSlots = useMemo(() => buildFriendSlots(fs.length), [fs.length]);
  // Chừa trọn mảnh đất 20×20 quanh mỗi nhà bạn để nhà phố không đè lên nhau.
  const shopSlots = ordered.filter((s) => !activeFriendSlots.some((friendSlot) => Math.abs(s.x - friendSlot.x) < 13.5 && Math.abs(s.z - friendSlot.z) < 13.5));
  const lanterns: [number, number][][] = [];
  for (let x = -EXT + 6; x < EXT; x += 10) lanterns.push([[x, MAIN_Z - 4.6], [x + 3, MAIN_Z + 4.6]]);
  for (let z = BACK_Z - 26; z < MAIN_Z - 8; z += 12) {
    lanterns.push([[-SIDE_X - 4.6, z], [-SIDE_X + 4.6, z + 3]]);
    lanterns.push([[SIDE_X - 4.6, z], [SIDE_X + 4.6, z + 3]]);
  }

  const poles: [number, number][] = [];
  for (let x = -EXT + 2; x <= EXT; x += 16) if (Math.abs(x) > 18) poles.push([x, MAIN_Z - 4.3]);
  const sidePoles: [number, number][][] = [-1, 1].map((sg) => {
    const arr: [number, number][] = [];
    for (let z = BACK_Z - 30; z < MAIN_Z - 8; z += 16) arr.push([sg * SIDE_X + sg * 4.3, z]);
    return arr;
  });
  const signs: { x: number; z: number; a: string; b?: string }[] = [
    { x: -SIDE_X - 4.3, z: MAIN_Z - 4.3, a: "Trần Phú", b: "Lê Lợi" },
    { x: SIDE_X + 4.3, z: MAIN_Z - 4.3, a: "Trần Phú", b: "Nguyễn Huệ" },
    { x: -SIDE_X + 4.3, z: BACK_Z + 4.3, a: "Bạch Đằng", b: "Lê Lợi" },
    { x: SIDE_X - 4.3, z: BACK_Z + 4.3, a: "Bạch Đằng", b: "Nguyễn Huệ" },
    { x: -EXT + 1, z: MAIN_Z + 4.3, a: "Trần Phú" },
    { x: EXT - 1, z: MAIN_Z + 4.3, a: "Trần Phú" },
    { x: -SIDE_X - 4.3, z: BACK_Z - 32, a: "Lê Lợi" },
    { x: SIDE_X + 4.3, z: BACK_Z - 32, a: "Nguyễn Huệ" },
  ];

  return (
    <group>
      {!dim && poles.map(([x, z], i) => <PowerPole key={"p" + i} x={x} z={z} />)}
      {!dim && poles.slice(1).map((p, i) => (poles[i][0] < 0 && p[0] > 0 ? null : <PowerWires key={"w" + i} a={poles[i]} b={p} />))}
      {!dim && sidePoles.map((arr, k) => arr.map(([x, z], i) => (
        <group key={"sp" + k + i}><PowerPole x={x} z={z} />{i > 0 && <PowerWires a={arr[i - 1]} b={[x, z]} />}</group>
      )))}
      {!dim && signs.map((s, i) => <StreetSign key={"s" + i} {...s} />)}
      <Road dir="x" c={MAIN_Z} from={-EXT - 4} to={EXT + 4} />
      <Road dir="x" c={BACK_Z} from={-SIDE_X} to={SIDE_X} />
      <Road dir="z" c={-SIDE_X} from={BACK_Z - 34} to={MAIN_Z - 3} />
      <Road dir="z" c={SIDE_X} from={BACK_Z - 34} to={MAIN_Z - 3} />
      {/* Lối từ nhà mình ra đường chính */}
      <mesh geometry={G.box} material={M.walk} position={[0, 0.03, 12.5]} scale={[4, 0.04, 3]} />
      {!dim && fs.map((friend, i) => {
        const slot = activeFriendSlots[i];
        if (!slot) return null;
        return (
        <group key={friend.user_id} position={[slot.x, 0, slot.z]} rotation={[0, slot.rot, 0]}
          onClick={(e) => { e.stopPropagation(); onVisitFriend?.(friend.user_id); }}>
          <FriendHousePreview ownerId={friend.user_id} />
          <FriendSign friend={friend} onClick={() => onVisitFriend?.(friend.user_id)} />
          {showFriendLabels && <FriendMapLabel friend={friend} onClick={() => onVisitFriend?.(friend.user_id)} />}
        </group>
        );
      })}
      {!dim && shopSlots.map((s, i) => {
        return (
          <group key={`${s.x}-${s.z}`} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}
          >
            <ShopHouse seed={s.seed} />
          </group>
        );
      })}
      {!dim && lanterns.map(([a, b], i) => <LanternString key={i} a={a} b={b} />)}
      {!dim && (
        <HoiAnRiver
          releasedLanterns={releasedLanterns}
          onStartQuiz={onStartRiverQuiz}
          onReleaseLantern={onReleaseLantern}
        />
      )}
    </group>
  );
});
