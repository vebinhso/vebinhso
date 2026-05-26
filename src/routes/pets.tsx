import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { loadGame, saveGame } from "@/lib/game";

export const Route = createFileRoute("/pets")({ component: Powers });

type Power = {
  id: number;
  name: string;
  icon: string;
  scope: string;
  duration: string;
  value: string;
  price: number;
  durationMs: number; // 0 = tức thì, -1 = vĩnh viễn
  note?: string;
};

function parsePrice(v: string): number {
  const m = v.match(/(\d+)\s*đ/);
  return m ? parseInt(m[1], 10) : 0;
}
function parseDuration(d: string): number {
  const s = d.toLowerCase();
  if (s.includes("vĩnh viễn")) return -1;
  if (s.includes("tức thì")) return 0;
  const m = s.match(/(\d+)\s*(giây|phút|giờ|ngày)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit === "giây") return n * 1000;
  if (unit === "phút") return n * 60_000;
  if (unit === "giờ") return n * 3_600_000;
  return n * 86_400_000;
}

const RAW: Omit<Power, "price" | "durationMs">[] = [
  { id: 1,  name: "Thẻ Mưa",            icon: "🌧️",  scope: "Nhà mình / đối phương", duration: "5 phút", value: "200đ", note: "Mưa thì không xây được" },
  { id: 2,  name: "Thẻ Lốc Xoáy",       icon: "🌪️",  scope: "Nhà đối phương",       duration: "30 giây", value: "150đ", note: "Hư hỏng vật tư" },
  { id: 3,  name: "Thẻ Nắng",           icon: "☀️",  scope: "Nhà bản thân",          duration: "5 phút", value: "100đ", note: "2 nắng = 1 mưa" },
  { id: 4,  name: "Tăng Tốc Xây Dựng",  icon: "⚡",  scope: "Nhà bản thân",          duration: "Tức thì", value: "250đ", note: "Không dùng khi mưa" },
  { id: 5,  name: "Gia Cố Móng",        icon: "🧱",  scope: "Nhà bản thân",          duration: "Vĩnh viễn", value: "350đ", note: "Bắt buộc lên tầng 2" },
  { id: 6,  name: "Chống Ngập",         icon: "🛡️",  scope: "Nhà & khu vực",        duration: "1 ngày", value: "300đ", note: "Miễn nhiễm mưa" },
  { id: 7,  name: "Phủ Xanh",           icon: "🌳",  scope: "Xung quanh nhà",        duration: "Vĩnh viễn", value: "150đ", note: "+ uy tín khu phố" },
  { id: 8,  name: "Phá Dỡ",             icon: "🔨",  scope: "Nhà đối phương",        duration: "Tức thì", value: "400đ", note: "Cần bằng chứng" },
  { id: 9,  name: "Đổi Tên Nhà",        icon: "🏷️",  scope: "Nhà bản thân",         duration: "Vĩnh viễn", value: "100đ" },
  { id: 10, name: "Dọn Nhà",            icon: "🧹",  scope: "Nhà bản thân",          duration: "Tức thì", value: "50đ",  note: "Bắt buộc khi lâu không vào" },
  { id: 11, name: "Trì Trệ",            icon: "⏳",  scope: "Nhà đối phương",        duration: "Tức thì", value: "250đ" },
  { id: 12, name: "Khoá Cửa",           icon: "🔒",  scope: "Nhà bản thân",          duration: "1 giờ", value: "180đ" },
  { id: 13, name: "Vận May",            icon: "🍀",  scope: "Bản thân",              duration: "Tức thì", value: "120đ" },
];

const POWERS: Power[] = RAW.map((p) => ({
  ...p,
  price: parsePrice(p.value),
  durationMs: parseDuration(p.duration),
}));

type Inventory = Record<number, number>; // powerId -> qty owned
type ActiveMap = Record<number, number>; // powerId -> expiresAt epoch (or -1 vĩnh viễn)

function ownKey(uid: string) { return `vebinhso_powers_${uid}`; }
function activeKey(uid: string) { return `vebinhso_powers_active_${uid}`; }

function loadInv(uid: string): Inventory {
  try { return JSON.parse(localStorage.getItem(ownKey(uid)) || "{}"); } catch { return {}; }
}
function saveInv(uid: string, inv: Inventory) {
  localStorage.setItem(ownKey(uid), JSON.stringify(inv));
}
function loadActive(uid: string): ActiveMap {
  try { return JSON.parse(localStorage.getItem(activeKey(uid)) || "{}"); } catch { return {}; }
}
function saveActive(uid: string, a: ActiveMap) {
  localStorage.setItem(activeKey(uid), JSON.stringify(a));
}

function fmtRemain(ms: number) {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function PowerCard({
  p, qty, activeUntil, money, onBuy, onSell, onUse, now,
}: {
  p: Power;
  qty: number;
  activeUntil: number | undefined;
  money: number;
  onBuy: () => void;
  onSell: () => void;
  onUse: () => void;
  now: number;
}) {
  const sellPrice = Math.round(p.price * 0.7);
  const isActive =
    activeUntil !== undefined && (activeUntil === -1 || activeUntil > now);
  const remain = activeUntil && activeUntil > 0 ? activeUntil - now : 0;
  const canBuy = money >= p.price;
  const canUse = qty > 0 && !isActive;

  return (
    <div className="relative group">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-[3px] border-amber-300 shadow-[0_8px_24px_-8px_rgba(180,120,0,0.6)] transition-transform group-hover:-translate-y-1">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 25%, #fff4b8 0%, #f5c518 35%, #c98a09 75%, #7a4f00 100%)" }}
        />
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{ background: "conic-gradient(from 220deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.5) 40deg, transparent 80deg, rgba(255,255,255,0.4) 160deg, transparent 200deg, rgba(255,255,255,0.5) 280deg, transparent 320deg)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-xl rotate-45 border-2 border-amber-100/70 bg-amber-200/20" />
        </div>

        <div className="relative h-full w-full flex flex-col items-center justify-between p-2.5">
          <div className="flex w-full justify-between items-center">
            <div className="text-[10px] font-black tracking-wider text-amber-900/80 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-700/30">
              #{p.id.toString().padStart(2, "0")}
            </div>
            {qty > 0 && (
              <div className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                x{qty}
              </div>
            )}
          </div>
          <div className="text-5xl drop-shadow-[0_4px_6px_rgba(120,70,0,0.5)]">{p.icon}</div>
          <div className="w-full text-center bg-gradient-to-r from-amber-900 to-yellow-800 text-yellow-100 rounded-lg px-1.5 py-1 border border-amber-300/60">
            <div className="text-[11px] font-black leading-tight">{p.name}</div>
            <div className="text-[9px] font-bold opacity-80">{p.duration} · {p.value}</div>
            {isActive && (
              <div className="text-[10px] font-black text-emerald-200 mt-0.5">
                ⏱ {activeUntil === -1 ? "VĨNH VIỄN" : fmtRemain(remain)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        <button
          onClick={onBuy}
          disabled={!canBuy}
          className="text-[10px] font-black py-1.5 rounded-lg bg-emerald-500 text-white disabled:bg-gray-400 disabled:cursor-not-allowed shadow"
          title={`Mua: ${p.price}đ`}
        >
          MUA
        </button>
        <button
          onClick={onSell}
          disabled={qty <= 0}
          className="text-[10px] font-black py-1.5 rounded-lg bg-rose-500 text-white disabled:bg-gray-400 disabled:cursor-not-allowed shadow"
          title={`Bán: ${sellPrice}đ`}
        >
          BÁN
        </button>
        <button
          onClick={onUse}
          disabled={!canUse}
          className="text-[10px] font-black py-1.5 rounded-lg bg-amber-500 text-white disabled:bg-gray-400 disabled:cursor-not-allowed shadow"
        >
          DÙNG
        </button>
      </div>
    </div>
  );
}

function Powers() {
  const user = getCurrentUser();
  const uid = user?.id ?? "";
  const [inv, setInv] = useState<Inventory>({});
  const [active, setActive] = useState<ActiveMap>({});
  const [money, setMoney] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!uid) return;
    setInv(loadInv(uid));
    setActive(loadActive(uid));
    setMoney(loadGame().money);
  }, [uid]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const buy = (p: Power) => {
    const g = loadGame();
    if (g.money < p.price) {
      toast.error(`Không đủ tiền! Cần ${p.price}đ`);
      return;
    }
    g.money -= p.price;
    saveGame(g);
    const next = { ...inv, [p.id]: (inv[p.id] || 0) + 1 };
    setInv(next); saveInv(uid, next);
    setMoney(g.money);
    toast.success(`Đã mua ${p.name} (-${p.price}đ)`);
  };

  const sell = (p: Power) => {
    if ((inv[p.id] || 0) <= 0) return;
    const refund = Math.round(p.price * 0.7);
    const g = loadGame();
    g.money += refund;
    saveGame(g);
    const next = { ...inv, [p.id]: inv[p.id] - 1 };
    setInv(next); saveInv(uid, next);
    setMoney(g.money);
    toast.success(`Đã bán ${p.name} (+${refund}đ)`);
  };

  const use = (p: Power) => {
    if ((inv[p.id] || 0) <= 0) return;
    const existing = active[p.id];
    if (existing && (existing === -1 || existing > Date.now())) {
      toast.error("Thẻ đang có hiệu lực!");
      return;
    }
    const next = { ...inv, [p.id]: inv[p.id] - 1 };
    setInv(next); saveInv(uid, next);

    if (p.durationMs === 0) {
      toast.success(`⚡ Kích hoạt ${p.name} (tức thì)`);
      return;
    }
    const until = p.durationMs === -1 ? -1 : Date.now() + p.durationMs;
    const na = { ...active, [p.id]: until };
    setActive(na); saveActive(uid, na);
    toast.success(`▶ Bắt đầu dùng ${p.name}`);
  };

  if (!user) {
    return (
      <GameLayout showBack>
        <div className="p-8 text-center font-black">Vui lòng đăng nhập để xem quyền năng.</div>
      </GameLayout>
    );
  }

  return (
    <GameLayout showBack>
      <div className="p-4 md:p-8 max-w-6xl w-full mx-auto">
        <div
          className="relative rounded-3xl overflow-hidden p-5 md:p-8 border-4 border-amber-300 shadow-2xl"
          style={{ background: "linear-gradient(135deg, #2a1700 0%, #5a3a05 50%, #2a1700 100%)" }}
        >
          <div className="absolute inset-0 opacity-60 pointer-events-none"
            style={{ background: "radial-gradient(circle at 20% 30%, rgba(255,200,40,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,170,0,0.3), transparent 45%)" }}
          />
          <div className="relative text-center mb-4">
            <h1 className="inline-block text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-amber-400 drop-shadow-[0_3px_0_rgba(0,0,0,0.4)]">
              ⚡ QUYỀN NĂNG
            </h1>
            <p className="text-amber-200/90 font-bold text-xs md:text-sm mt-1">
              Mua / Bán / Sử dụng thẻ — Bán lại nhận 70% giá
            </p>
            <div className="inline-block mt-2 bg-amber-100 text-amber-900 font-black px-3 py-1 rounded-full">
              💰 {money}đ
            </div>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {POWERS.map((p) => (
              <PowerCard
                key={p.id}
                p={p}
                qty={inv[p.id] || 0}
                activeUntil={active[p.id]}
                money={money}
                now={now}
                onBuy={() => buy(p)}
                onSell={() => sell(p)}
                onUse={() => use(p)}
              />
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
