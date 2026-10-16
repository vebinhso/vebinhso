import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Droplets, Ticket, ShoppingBasket, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { flushGameBeforeGardenPurchase } from "@/lib/game";
import { readGarden, buyGardenItem, plantGardenSeed, waterGardenPlant } from "@/lib/garden.functions";
import { gardenGoods, rideNames, ridePose, type GardenGoodId, type RideKind } from "@/lib/neighborhood";
import { clearInput } from "@/lib/player-input";
import { randomQuestion, gradeAnswer, reportAnswerResult, type Question } from "./questions";
import { QuestionView } from "./QuestionView";
import { useLocale } from "@/lib/locale";

export function useNeighborhoodActivities(userId: string | undefined, questionsReady: boolean, applyBalance: (money: number, spent: number) => void) {
  const en = useLocale() === "en";
  const [panel, setPanel] = useState<"park" | "garden" | null>(null);
  const [slot, setSlot] = useState<number | undefined>();
  const [seed, setSeed] = useState<GardenGoodId>("seed_rose");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState("");
  const [tickets, setTickets] = useState(0);
  const [quiz, setQuiz] = useState<Question | null>(null);
  const [ride, setRide] = useState<{ kind: RideKind; id: number } | null>(null);
  const readFn = useServerFn(readGarden), buyFn = useServerFn(buyGardenItem), plantFn = useServerFn(plantGardenSeed), waterFn = useServerFn(waterGardenPlant);
  const garden = useQuery({ queryKey: ["shared-garden", userId], queryFn: () => readFn(), enabled: !!userId, staleTime: 15000, retry: 1 });
  useEffect(() => {
    if (!userId) return;
    setTickets(Math.max(0, Number(localStorage.getItem(`vbs-park-tickets-${userId}`)) || 0));
    const channel = supabase.channel(`garden:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "garden_plants" }, () => { void garden.refetch(); }).subscribe();
    const focus = () => { void garden.refetch(); };
    window.addEventListener("focus", focus);
    return () => { supabase.removeChannel(channel); window.removeEventListener("focus", focus); ridePose.active = false; };
  }, [userId]);
  useEffect(() => {
    if (!garden.data || panel !== "garden") return;
    // Only arm one timer at the next Vietnamese midnight while this view is open.
    const now = Date.now(), day = 86400000;
    const next = (Math.floor((now + 7 * 3600000) / day) + 1) * day - 7 * 3600000;
    const t = window.setTimeout(() => { void garden.refetch(); }, next - now + 1000);
    return () => clearTimeout(t);
  }, [garden.data, panel]);
  const changeTickets = (n: number) => {
    setTickets(n); if (userId) localStorage.setItem(`vbs-park-tickets-${userId}`, String(n));
  };
  const run = async (action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice(""); clearInput();
    try { await action(); await garden.refetch(); }
    catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setNotice(/Not enough coins/i.test(msg) ? (en ? "Not enough coins." : "Không đủ tiền.") : /occupied/i.test(msg) ? (en ? "This plot is occupied. Choose another." : "Ô này đã có cây. Chọn ô khác nhé.") : /Buy seeds/i.test(msg) ? (en ? "Buy seeds first." : "Bạn cần mua hạt giống trước.") : /Maximum 12/i.test(msg) ? (en ? "Maximum 12 plants per player." : "Mỗi người trồng tối đa 12 cây.") : /watering use/i.test(msg) ? (en ? "Buy a watering use first." : "Bạn cần mua một lượt tưới.") : /Already watered/i.test(msg) ? (en ? "Already watered; wait for the next day." : "Cây đã tưới; chờ qua ngày nhé.") : (en ? "Unable to save. Check your connection and try again." : "Chưa lưu được. Kiểm tra mạng rồi thử lại."));
    } finally { lock.current = false; setBusy(false); }
  };
  const purchase = (item: GardenGoodId, amount = 1) => run(async () => {
    await flushGameBeforeGardenPurchase();
    const result = await buyFn({ data: { item, amount } });
    applyBalance(result.money, result.garden_spent);
    setNotice(en ? "Added to garden inventory." : "Đã thêm vào kho vườn chung.");
  });
  const openPark = useCallback(() => { clearInput(); setPanel("park"); setNotice(""); }, []);
  const openGarden = useCallback((cell?: number) => { clearInput(); setSlot(cell); setPanel("garden"); setNotice(""); }, []);
  const endRide = useCallback(() => { ridePose.active = false; setRide(null); setPanel("park"); clearInput(); }, []);
  const answer = async (picked: number[]) => {
    if (!quiz || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const result = await gradeAnswer(quiz, picked[0] ?? -1);
      const expected = result.correctIndexes;
      const correct = expected.length > 1 ? picked.length === expected.length && picked.every(i => expected.includes(i)) : result.isCorrect;
      reportAnswerResult(quiz, correct);
      if (correct) { changeTickets(tickets + 1); setQuiz(null); setNotice(en ? "Correct! +1 ride ticket." : "Chính xác! +1 lượt chơi."); }
      else { setNotice(en ? "Not correct yet. Try another question." : "Chưa đúng. Thử câu tiếp theo nhé."); setQuiz(randomQuestion()); }
    } catch { setNotice(en ? "Cannot check answer. Try again." : "Chưa kiểm tra được đáp án. Thử lại nhé."); }
    finally { lock.current = false; setBusy(false); }
  };
  const selectedPlant = garden.data?.plants.find(p => p.slot === slot);
  const selectedGood = selectedPlant ? gardenGoods.find(g => g.id === selectedPlant.species) : null;
  const close = () => { if (busy) return; setPanel(null); setQuiz(null); clearInput(); };
  const panelUi = <>
    {ride && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"><Button onClick={endRide} variant="secondary"><X />{en ? "Leave ride" : "Rời trò chơi"}</Button></div>}
    {panel && <div className="fixed inset-0 z-[70] bg-foreground/25 flex items-center justify-center p-3" onClick={close}>
      <section role="dialog" aria-modal="true" aria-label={panel === "park" ? (en ? "Amusement park" : "Khu vui chơi") : (en ? "Shared garden" : "Vườn chung")} className="bg-card text-card-foreground border border-border rounded-lg shadow-xl w-full max-w-xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 mb-4"><h2 className="text-xl font-black">{panel === "park" ? (en ? "🎢 AMUSEMENT PARK" : "🎢 KHU VUI CHƠI") : (en ? "🌱 SHARED GARDEN" : "🌱 VƯỜN CHUNG")}</h2><Button variant="ghost" size="icon" title={en ? "Close" : "Đóng"} aria-label={en ? "Close activity" : "Đóng hoạt động"} onClick={close} disabled={busy}><X /></Button></header>
        {panel === "park" ? <>
          <div className="flex items-center justify-between gap-2 mb-4"><span className="font-bold flex items-center gap-2"><Ticket />{tickets} {en ? "tickets" : "lượt chơi"}</span><Button disabled={busy || !questionsReady} onClick={() => { setQuiz(randomQuestion()); setNotice(""); }}><Ticket />{en ? "Answer for a ticket" : "Trả lời nhận lượt chơi"}</Button></div>
          {quiz ? <QuestionView question={quiz} onAnswer={answer} disabled={busy} compact /> : <div className="grid gap-3">{(Object.keys(rideNames) as RideKind[]).map(kind => <Button key={kind} variant="secondary" className="h-12 justify-between" disabled={!tickets || busy} onClick={() => { changeTickets(tickets - 1); setPanel(null); setRide({ kind, id: Date.now() }); clearInput(); }}><span>{rideNames[kind][en ? "en" : "vi"]}</span><span>1 🎟️</span></Button>)}</div>}
        </> : <>
          {garden.isPending && <p>{en ? "Loading garden…" : "Đang tải vườn…"}</p>}
          {garden.isError && <div role="alert" className="text-destructive mb-3">{en ? "Cannot load garden. Check your connection." : "Không tải được vườn. Kiểm tra kết nối mạng."}<Button onClick={() => garden.refetch()} variant="outline">{en ? "Retry" : "Thử lại"}</Button></div>}
          {garden.data && <>
            <div className="grid grid-cols-8 gap-1 mb-4">{Array.from({ length: 40 }, (_, i) => { const p = garden.data.plants.find(p => p.slot === i); const good = gardenGoods.find(g => g.id === p?.species); return <Button key={i} size="icon" variant={slot === i ? "default" : "secondary"} className="w-full h-auto aspect-square" aria-label={`${en ? "Plot" : "Ô đất"} ${i + 1}${p ? `: ${p.owner_name}` : ""}`} title={p ? p.owner_name : (en ? "Empty plot" : "Ô trống")} onClick={() => { setSlot(i); setNotice(""); }}>{p ? good?.icon : <Sprout />}</Button>; })}</div>
            {slot !== undefined && <div className="border-t border-border py-3 mb-3">
              <h3 className="font-bold mb-2">{en ? "Plot" : "Ô đất"} {slot + 1}{selectedPlant ? ` · ${selectedGood?.[en ? "en" : "vi"]}` : ""}</h3>
              {selectedPlant ? <><p className="text-sm mb-2">{selectedPlant.owner_name} · {selectedPlant.watered_at ? (selectedPlant.growth >= selectedPlant.grow_days ? (en ? "Fully grown" : "Đã trưởng thành") : (en ? `Growing: ${selectedPlant.growth}/${selectedPlant.grow_days} days` : `Đang lớn: ${selectedPlant.growth}/${selectedPlant.grow_days} ngày`)) : (en ? "Needs watering" : "Cần tưới nước")}</p><Button onClick={() => run(async () => { await waterFn({ data: { plant: selectedPlant.id } }); setNotice(en ? "Watered! Growth begins next day." : "Đã tưới! Qua ngày cây sẽ lớn dần."); })} disabled={busy || !!selectedPlant.watered_at || !(garden.data.inventory.watering_use > 0)}><Droplets />{en ? "Water (1 use)" : "Tưới (1 lượt)"}</Button></> : <div className="flex flex-wrap items-center gap-2"><select aria-label={en ? "Choose seed" : "Chọn hạt giống"} className="bg-secondary text-secondary-foreground rounded-md p-2 min-w-0 text-sm" value={seed} onChange={e => setSeed(e.target.value as GardenGoodId)}>{gardenGoods.filter(g => g.days > 0).map(g => <option key={g.id} value={g.id}>{g.icon} {g[en ? "en" : "vi"]} ({garden.data.inventory[g.id] ?? 0})</option>)}</select><Button disabled={busy || !(garden.data.inventory[seed] > 0)} onClick={() => run(async () => { if (seed === "watering_use") return; await plantFn({ data: { item: seed, cell: slot } }); setNotice(en ? "Seed planted." : "Đã gieo hạt."); })}><Sprout />{en ? "Plant" : "Gieo hạt"}</Button></div>}
            </div>}
            <h3 className="font-bold mb-2 flex items-center gap-2"><ShoppingBasket />{en ? "Garden shop" : "Cửa hàng vườn"}</h3>
            <div className="divide-y divide-border">{gardenGoods.map(g => <div key={g.id} className="flex items-center justify-between gap-3 py-2"><div className="text-sm"><span>{g.icon} {g[en ? "en" : "vi"]}</span><span className="block text-muted-foreground">{en ? "Owned" : "Trong kho"}: {garden.data.inventory[g.id] ?? 0}</span></div><Button size="sm" onClick={() => purchase(g.id)} disabled={busy}>{g.price} {en ? "coins" : "đ"}</Button></div>)}</div>
          </>}
        </>}
        {notice && <p role="status" className="mt-4 font-bold text-sm">{notice}</p>}
      </section>
    </div>}
  </>;
  return { zoneProps: { plants: garden.data?.plants, ride, onRideEnd: endRide, onOpenPark: openPark, onOpenGarden: openGarden }, panelUi, purchase, activeRide: !!ride };
}