import { useState } from "react";
import { useLocale } from "@/lib/locale";
import { loadGame, saveGame } from "@/lib/game";
import { BOTTOMS, SHOES, TOPS, bottomOf, shoeOf, topOf, type Bottom, type Shoe, type Top } from "@/lib/clothes";
import type { Outfit } from "@/lib/character";
import { ClothesDefs, TopEmblem, bottomFill, topFill } from "./ClothesSvg";

function ShoeThumb({ s }: { s: Shoe }) {
  const c = s.color, c2 = s.color2;
  const sole = <rect x="14" y="42" width="52" height="6" rx="3" fill={c2} />;
  return (
    <svg viewBox="8 8 64 46" className="h-14">
      {s.kind === "sneaker" && (<>
        <path d="M16 40 L16 26 Q16 20 24 20 L34 20 Q44 20 50 30 L62 36 Q66 38 66 42 L16 42 Z" fill={c} stroke="#00000030" />
        <path d="M30 22 L38 34 M36 21 L44 32" stroke={c2} strokeWidth="2.4" />
        {sole}
      </>)}
      {s.kind === "boot" && (<>
        <path d="M18 42 L18 12 L36 12 L38 26 L56 34 Q62 36 62 42 Z" fill={c} stroke="#00000030" />
        <path d="M22 16 L34 16 M22 21 L35 21 M22 26 L36 26" stroke={c2} strokeWidth="2" />
        {sole}
      </>)}
      {s.kind === "tallboot" && (<>
        <path d="M20 42 L20 6 L38 6 L40 26 L58 34 Q64 36 64 42 Z" fill={c} stroke="#00000030" />
        <rect x="20" y="6" width="18" height="5" fill={c2} />
        {sole}
      </>)}
      {s.kind === "flat" && (<>
        <path d="M18 42 L18 34 Q18 28 26 28 L36 28 Q48 28 56 34 L64 38 Q66 40 66 42 Z" fill={c} stroke="#00000030" />
        <circle cx="30" cy="29" r="3" fill={c2} />
        {sole}
      </>)}
      {s.kind === "heel" && (<>
        <path d="M20 42 L20 24 Q30 24 36 32 L60 38 Q64 39 64 42 Z" fill={c} stroke="#00000030" />
        <rect x="18" y="24" width="6" height="20" fill={c2} />
      </>)}
      {s.kind === "sandal" && (<>
        <rect x="16" y="38" width="50" height="6" rx="3" fill={c2} />
        <path d="M22 38 L30 26 M34 38 L42 26 M46 38 L54 30" stroke={c} strokeWidth="3.4" />
      </>)}
      {s.kind === "clogs" && (<>
        <path d="M16 42 L16 28 Q16 20 28 20 L40 20 Q52 20 58 30 L64 36 Q66 38 66 42 Z" fill={c} stroke="#00000030" />
        {[26, 34, 42].map((x) => <circle key={x} cx={x} cy="26" r="2.2" fill={c2} />)}
        {sole}
      </>)}
    </svg>
  );
}

function TopThumb({ t }: { t: Top }) {
  const uid = `th-${t.id}`;
  return (
    <svg viewBox={t.long ? "10 56 60 76" : "10 56 60 48"} className="h-14">
      <ClothesDefs top={t} uid={uid} />
      <rect x="14" y="62" width="10" height="36" rx="4" fill={topFill(t, uid)} />
      <rect x="56" y="62" width="10" height="36" rx="4" fill={topFill(t, uid)} />
      <path d={t.long ? "M24 62 Q40 58 56 62 L58 128 L22 128 Z" : "M24 62 Q40 58 56 62 L56 100 L24 100 Z"} fill={topFill(t, uid)} stroke="#00000030" />
      <TopEmblem t={t} />
    </svg>
  );
}
function BottomThumb({ b }: { b: Bottom }) {
  const uid = `bh-${b.id}`;
  const f = bottomFill(b, uid);
  return (
    <svg viewBox="16 94 48 50" className="h-14">
      <ClothesDefs bottom={b} uid={uid} />
      <BottomShape b={b} fill={f} />
    </svg>
  );
}

export function BottomShape({ b, fill }: { b: Bottom; fill: string }) {
  switch (b.kind) {
    case "skirt": return <path d="M25 98 L55 98 L60 116 L20 116 Z" fill={fill} stroke="#00000030" />;
    case "longskirt": return <path d="M25 98 L55 98 L61 134 L19 134 Z" fill={fill} stroke="#00000030" />;
    case "shorts": return <g fill={fill}><rect x="26" y="98" width="13" height="16" rx="2" /><rect x="41" y="98" width="13" height="16" rx="2" /></g>;
    case "wide": return <g fill={fill}><path d="M25 98 L40 98 L39 140 L25 140 Z" /><path d="M40 98 L55 98 L55 140 L41 140 Z" /></g>;
    default: return <g fill={fill}><rect x="28" y="98" width="10" height="42" rx="3" /><rect x="42" y="98" width="10" height="42" rx="3" /></g>;
  }
}

export function ClothesPicker({ kind, o, onChange }: { kind: "top" | "bottom"; o: Outfit; onChange: (p: Partial<Outfit>) => void }) {
  const en = useLocale() === "en";
  const [money, setMoney] = useState(() => loadGame().money);
  const [msg, setMsg] = useState<string | null>(null);
  const owned = new Set(o.clothesOwned ?? []);
  const items = kind === "top" ? TOPS : BOTTOMS.filter((b) => !b.hidden);
  const current = kind === "top" ? o.topStyle : o.bottomStyle;

  const wear = (id: string, newOwned: string[]) => {
    if (kind === "top") {
      const t = topOf(id)!;
      const patch: Partial<Outfit> = { topStyle: id, shirt: t.color, clothesOwned: newOwned };
      if (t.suit) { const b = bottomOf(t.suit)!; patch.bottomStyle = b.id; patch.pants = b.color; }
      else if (topOf(o.topStyle)?.suit) { patch.bottomStyle = undefined; }
      onChange(patch);
    } else {
      const b = bottomOf(id)!;
      const patch: Partial<Outfit> = { bottomStyle: id, pants: b.color, clothesOwned: newOwned };
      if (topOf(o.topStyle)?.suit) patch.topStyle = undefined;
      onChange(patch);
    }
  };
  const buy = (id: string, price: number) => {
    const g = loadGame();
    if (g.money < price) { setMsg(en ? `Not enough coins (need ${price}).` : `Không đủ xu (cần ${price} xu).`); return; }
    saveGame({ ...g, money: g.money - price });
    setMoney(g.money - price); setMsg(null);
    wear(id, [...owned, id]);
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black">{en ? `Your coins: ${money}` : `Xu của bạn: ${money}`}</div>
        {current && (
          <button type="button" className="toy-button !text-xs py-1 px-3"
            onClick={() => onChange(kind === "top" ? { topStyle: undefined, ...(topOf(o.topStyle)?.suit ? { bottomStyle: undefined } : {}) } : { bottomStyle: undefined })}>
            {en ? "Take off" : "Cởi ra"}
          </button>
        )}
      </div>
      <p className="text-xs font-bold text-muted-foreground">
        {en ? "Buy once, then change for free." : "Mua 1 lần, sau đó thay đổi miễn phí."}
        {kind === "top" && (en ? " Ranger suits include pants and helmet." : " Bộ siêu nhân gồm cả quần và mũ.")}
      </p>
      {msg && <div className="text-sm font-bold text-destructive">{msg}</div>}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((it) => {
          const has = owned.has(it.id) || it.price === 0;
          const on = current === it.id;
          return (
            <div key={it.id} className={`rounded-xl border-2 p-2 bg-card/80 flex flex-col items-center gap-1 ${on ? "border-primary" : "border-border"}`}>
              {kind === "top" ? <TopThumb t={it as Top} /> : <BottomThumb b={it as Bottom} />}
              <div className="text-[11px] font-bold text-center leading-tight">{en ? it.en : it.vi}</div>
              {on ? (
                <span className="text-[11px] font-black text-primary">{en ? "Wearing" : "Đang mặc"}</span>
              ) : has ? (
                <button type="button" onClick={() => wear(it.id, [...owned])} className="toy-button !text-xs py-1 px-2 w-full">{en ? "Wear" : "Mặc"}</button>
              ) : (
                <button type="button" onClick={() => buy(it.id, it.price)} className="toy-button !text-xs py-1 px-2 w-full">{en ? `Buy ${it.price}` : `Mua ${it.price} xu`}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
