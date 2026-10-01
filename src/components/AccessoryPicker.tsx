import { useState } from "react";
import { useLocale } from "@/lib/locale";
import { loadGame, saveGame } from "@/lib/game";
import { ACCESSORIES, SLOT_LABELS, cleanAccessoryList, slotOf, type AccessoryId, type AccessorySlot } from "@/lib/accessories";
import { AccessorySvg } from "./AccessorySvg";

export function AccessoryPicker({ owned, equipped, hair, skin, onChange }: {
  owned: unknown; equipped: unknown; hair: string; skin: string;
  onChange: (owned: AccessoryId[], equipped: AccessoryId[]) => void;
}) {
  const en = useLocale() === "en";
  const [money, setMoney] = useState(() => loadGame().money);
  const [msg, setMsg] = useState<string | null>(null);
  const ownedList = cleanAccessoryList(owned);
  const eqList = cleanAccessoryList(equipped);

  const toggle = (id: AccessoryId) => {
    const slot = slotOf(id);
    if (eqList.includes(id)) { onChange(ownedList, eqList.filter((x) => x !== id)); return; }
    onChange(ownedList, [...eqList.filter((x) => slotOf(x) !== slot), id]);
  };
  const buy = (id: AccessoryId, price: number) => {
    const g = loadGame();
    if (g.money < price) { setMsg(en ? `Not enough coins (need ${price}).` : `Không đủ xu (cần ${price} xu).`); return; }
    saveGame({ ...g, money: g.money - price });
    setMoney(g.money - price);
    setMsg(null);
    const slot = slotOf(id);
    onChange([...ownedList, id], [...eqList.filter((x) => slotOf(x) !== slot), id]);
  };

  const slots = Object.keys(SLOT_LABELS) as AccessorySlot[];
  return (
    <div className="mt-4 space-y-4">
      <div className="text-sm font-black">{en ? `Your coins: ${money}` : `Xu của bạn: ${money}`}</div>
      <p className="text-xs font-bold text-muted-foreground">
        {en ? "Buy once, then wear or remove for free. One item per slot." : "Mua 1 lần, sau đó đeo/tháo miễn phí. Mỗi vị trí đeo 1 món."}
      </p>
      {msg && <div className="text-sm font-bold text-destructive">{msg}</div>}
      {slots.map((slot) => (
        <div key={slot}>
          <div className="text-sm font-black mb-2">{en ? SLOT_LABELS[slot].en : SLOT_LABELS[slot].vi}</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ACCESSORIES.filter((a) => a.slot === slot).map((a) => {
              const has = ownedList.includes(a.id);
              const on = eqList.includes(a.id);
              return (
                <div key={a.id} className={`rounded-xl border-2 p-2 bg-card/80 flex flex-col items-center gap-1 ${on ? "border-primary" : "border-border"}`}>
                  <svg viewBox={slot === "wrist" ? "8 85 30 30" : slot === "finger" ? "52 95 20 18" : "14 16 52 70"} className="h-14 w-14">
                    {slot !== "wrist" && slot !== "finger" && <circle cx="40" cy="42" r="18" fill={skin} />}
                    {(slot === "wrist") && <circle cx="19" cy="105" r="5" fill={skin} />}
                    {(slot === "finger") && <circle cx="61" cy="105" r="5" fill={skin} />}
                    <AccessorySvg id={a.id} hair={hair} />
                  </svg>
                  <div className="text-[11px] font-bold text-center leading-tight">{en ? a.en : a.vi}</div>
                  {has ? (
                    <button type="button" onClick={() => toggle(a.id)} className={`toy-button !text-xs py-1 px-2 w-full ${on ? "toy-button-primary" : ""}`}>
                      {on ? (en ? "Remove" : "Tháo") : (en ? "Wear" : "Đeo")}
                    </button>
                  ) : (
                    <button type="button" onClick={() => buy(a.id, a.price)} className="toy-button !text-xs py-1 px-2 w-full">
                      {en ? `Buy ${a.price}` : `Mua ${a.price} xu`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
