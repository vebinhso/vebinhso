import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Droplets, Ticket, ShoppingBasket, Sprout, Shovel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { flushGameBeforeGardenPurchase } from "@/lib/game";
import { readGarden, buyGardenItem, plantGardenSeed, waterGardenPlant, removeWiltedGardenPlant, startGardenChallenge, answerGardenChallenge, purchaseGardenChallenge } from "@/lib/garden.functions";
import { gardenGoods, rideNames, ridePose, neighborhoodTravel, type GardenGoodId, type RideKind } from "@/lib/neighborhood";
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
  const [gardenQuiz, setGardenQuiz] = useState<{kind:"water"|"boost"; plant:string|null; streak:number}|null>(null);
  const [gardenQuestion,setGardenQuestion] = useState<Question|null>(null);
  const [parkEntered, setParkEntered] = useState(false);
  const [entryPrompt, setEntryPrompt] = useState(false);
  const [selectedRide, setSelectedRide] = useState<RideKind | null>(null);
  const [rideReady, setRideReady] = useState(false);
  const [ride, setRide] = useState<{ kind: RideKind; id: number } | null>(null);
  const readFn = useServerFn(readGarden), buyFn = useServerFn(buyGardenItem), plantFn = useServerFn(plantGardenSeed), waterFn = useServerFn(waterGardenPlant), removeFn = useServerFn(removeWiltedGardenPlant), startChallengeFn = useServerFn(startGardenChallenge), answerChallengeFn = useServerFn(answerGardenChallenge), purchaseChallengeFn = useServerFn(purchaseGardenChallenge);
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
  useEffect(() => {
    if (!userId || !garden.data) return;
    const messages:string[]=[];
    for (const plant of garden.data.plants.filter(p => p.owner_id===userId)) {
      const label=gardenGoods.find(g=>g.id===plant.species)?.[en?"en":"vi"] ?? plant.species;
      const state=plant.wilted ? "wilted" : String(plant.level ?? 0);
      const key=`vbs-garden-notified-${userId}-${plant.id}`;
      const previous=localStorage.getItem(key);
      if (previous!==null && previous!==state) {
        messages.push(plant.wilted ? (en ? `${label} has wilted. Use a shovel to remove it.` : `${label} đã héo! Hãy dùng xẻng để dọn.`) : (en ? `${label} reached level ${plant.level}/5!` : `${label} đã đạt cấp ${plant.level}/5!`));
      }
      localStorage.setItem(key,state);
    }
    if (messages.length) setNotice(messages.slice(0,3).join(" • "));
  }, [garden.data, userId, en]);
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
  const openPark = useCallback(() => { clearInput(); setEntryPrompt(true); setNotice(""); }, []);
  const enterPark = () => { neighborhoodTravel.destination = "park"; setParkEntered(true); setEntryPrompt(false); setPanel(null); clearInput(); };
  const chooseRide = (kind: RideKind) => { setSelectedRide(kind); setRideReady(false); setQuiz(randomQuestion()); setPanel("park"); clearInput(); };
  const beginRide = () => { if (!selectedRide || !rideReady) return; setPanel(null); setRide({ kind: selectedRide, id: Date.now() }); setRideReady(false); clearInput(); };
  const beginGardenQuiz = async (kind:"water"|"boost", plant:string|null) => {
    if (busy) return;
    if (!questionsReady) { setNotice(en ? "Questions are loading." : "Đang tải câu hỏi."); return; }
    const q=randomQuestion();
    if (!q.id || !q.options.length) { setNotice(en ? "No questions available." : "Chưa có câu hỏi."); return; }
    setBusy(true);
    try { await startChallengeFn({data:{kind,plant}}); setGardenQuiz({kind,plant,streak:0}); setGardenQuestion(q); setNotice(""); }
    catch { setNotice(en ? "Unable to start challenge." : "Không thể bắt đầu thử thách."); }
    finally { setBusy(false); }
  };
  const answerGardenQuiz = async (picked:number[]) => {
    if (!gardenQuiz || !gardenQuestion?.id || busy) return;
    if (picked.length!==1) { setNotice(en ? "Choose one answer." : "Hãy chọn một đáp án."); return; }
    setBusy(true);
    try {
      const original = gardenQuestion.optionOrder?.[picked[0]] ?? picked[0];
      const result=await answerChallengeFn({data:{qid:gardenQuestion.id,selected:original}});
      reportAnswerResult(gardenQuestion,result.correct);
      if (result.completed) {
        await flushGameBeforeGardenPurchase();
        const purchase=await purchaseChallengeFn({data:{item:gardenQuiz.kind==="water"?"watering_use":"boost",plant:gardenQuiz.plant}});
        applyBalance(purchase.money,purchase.garden_spent);
        await garden.refetch();
        setGardenQuiz(null);setGardenQuestion(null);
        setNotice(en ? "Challenge complete! Purchase successful." : "Đã trả lời đủ và mua thành công!");
      } else {
        setGardenQuiz({...gardenQuiz,streak:result.streak});
        const next=randomQuestion();
        if (!next.id) throw new Error("No next question");
        setGardenQuestion(next);
        setNotice(result.correct ? (en ? `Correct: ${result.streak}/5` : `Đúng liên tiếp: ${result.streak}/5`) : (en ? "Incorrect. Streak reset." : "Sai rồi! Chuỗi đúng trở về 0."));
      }
    } catch { setNotice(en ? "Could not complete purchase or answer. Try again." : "Không thể xác nhận đáp án hoặc giao dịch. Thử lại."); }
    finally { setBusy(false); }
  };
  const openGarden = useCallback((cell?: number) => { neighborhoodTravel.destination = "garden"; clearInput(); setSlot(cell); setPanel("garden"); setNotice(""); }, []);
  const endRide = useCallback(() => { ridePose.active = false; setRide(null); setPanel(null); clearInput(); }, []);
  const answer = async (picked: number[]) => {
    if (!quiz || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const result = await gradeAnswer(quiz, picked[0] ?? -1);
      const expected = result.correctIndexes;
      const correct = expected.length > 1 ? picked.length === expected.length && picked.every(i => expected.includes(i)) : result.isCorrect;
      reportAnswerResult(quiz, correct);
      if (correct) { setRideReady(true); setQuiz(null); setNotice(en ? "Correct! You can start the ride." : "Chính xác! Bạn có thể bắt đầu trò chơi."); }
      else { setNotice(en ? "Not correct yet. Try another question." : "Chưa đúng. Thử câu tiếp theo nhé."); setQuiz(randomQuestion()); }
    } catch { setNotice(en ? "Cannot check answer. Try again." : "Chưa kiểm tra được đáp án. Thử lại nhé."); }
    finally { lock.current = false; setBusy(false); }
  };
  const selectedPlant = garden.data?.plants.find(p => p.slot === slot);
  const selectedGood = selectedPlant ? gardenGoods.find(g => g.id === selectedPlant.species) : null;
  const close = () => { if (busy) return; setPanel(null); setQuiz(null); setGardenQuiz(null); setGardenQuestion(null); setSelectedRide(null); clearInput(); };
  const panelUi = <>
    {entryPrompt && <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" className="bg-card text-card-foreground rounded-xl p-6 max-w-sm w-full shadow-xl"><h2 className="font-bold text-xl mb-4">{en ? "Enter the amusement park?" : "Bạn muốn vào khu trò chơi?"}</h2><div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setEntryPrompt(false)}>{en ? "Cancel" : "Không"}</Button><Button onClick={enterPark}>{en ? "Enter" : "Vào chơi"}</Button></div></section></div>}
    {parkEntered && !ride && !panel && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-2"><Button variant="secondary" onClick={() => { setParkEntered(false); clearInput(); }}><X />{en ? "Exit park" : "Thoát khu vui chơi"}</Button><Button onClick={() => chooseRide("coaster")}>{en ? "Roller coaster" : "Tàu lượn"}</Button><Button onClick={() => chooseRide("wheel")}>{en ? "Ferris wheel" : "Vòng quay"}</Button><Button onClick={() => chooseRide("carousel")}>{en ? "Carousel" : "Đu quay"}</Button></div>}
    {ride && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"><Button onClick={endRide} variant="secondary"><X />{en ? "Leave ride" : "Rời trò chơi"}</Button></div>}
    {panel && <div className="fixed inset-0 z-[70] bg-foreground/25 flex items-center justify-center p-3" onClick={close}>
      <section role="dialog" aria-modal="true" aria-label={panel === "park" ? (en ? "Amusement park" : "Khu vui chơi") : (en ? "Shared garden" : "Vườn chung")} className="bg-card text-card-foreground border border-border rounded-lg shadow-xl w-full max-w-xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 mb-4"><h2 className="text-xl font-black">{panel === "park" ? (en ? "🎢 AMUSEMENT PARK" : "🎢 KHU VUI CHƠI") : (en ? "🌱 SHARED GARDEN" : "🌱 VƯỜN CHUNG")}</h2><Button variant="ghost" size="icon" title={en ? "Close" : "Đóng"} aria-label={en ? "Close activity" : "Đóng hoạt động"} onClick={close} disabled={busy}><X /></Button></header>
        {panel === "garden" && gardenQuiz && gardenQuestion ? <><p className="mb-2 font-semibold">{gardenQuiz.kind==="boost" ? (en ? `Boost quiz: ${gardenQuiz.streak}/5 correct in a row` : `Thuốc tăng trưởng: ${gardenQuiz.streak}/5 câu đúng liên tiếp`) : (en ? "Answer correctly to buy water" : "Trả lời đúng 1 câu để mua nước")}</p><QuestionView question={gardenQuestion} onAnswer={answerGardenQuiz} disabled={busy} compact /><Button variant="outline" className="mt-3" onClick={() => {setGardenQuiz(null);setGardenQuestion(null);}}>{en ? "Cancel challenge" : "Hủy thử thách"}</Button></> : panel === "park" ? <>
          <p className="mb-3 font-semibold">{selectedRide ? rideNames[selectedRide][en ? "en" : "vi"] : ""}</p>
          {quiz ? <QuestionView question={quiz} onAnswer={answer} disabled={busy} compact /> : rideReady ? <Button onClick={beginRide}>{en ? "Start ride" : "Bắt đầu"}</Button> : <Button onClick={() => selectedRide && chooseRide(selectedRide)}>{en ? "Try question" : "Trả lời câu hỏi"}</Button>}
        </> : <>
          {garden.isPending && <p>{en ? "Loading garden…" : "Đang tải vườn…"}</p>}
          {garden.isError && <div role="alert" className="text-destructive mb-3">{en ? "Cannot load garden. Check your connection." : "Không tải được vườn. Kiểm tra kết nối mạng."}<Button onClick={() => garden.refetch()} variant="outline">{en ? "Retry" : "Thử lại"}</Button></div>}
          {garden.data && <>
            <div className="grid grid-cols-8 gap-1 mb-4">{Array.from({ length: 40 }, (_, i) => { const p = garden.data.plants.find(p => p.slot === i); const good = gardenGoods.find(g => g.id === p?.species); return <Button key={i} size="icon" variant={slot === i ? "default" : "secondary"} className="w-full h-auto aspect-square" aria-label={`${en ? "Plot" : "Ô đất"} ${i + 1}${p ? `: ${p.owner_name}` : ""}`} title={p ? p.owner_name : (en ? "Empty plot" : "Ô trống")} onClick={() => { setSlot(i); setNotice(""); }}>{p ? good?.icon : <Sprout />}</Button>; })}</div>
            {slot !== undefined && <div className="border-t border-border py-3 mb-3">
              <h3 className="font-bold mb-2">{en ? "Plot" : "Ô đất"} {slot + 1}{selectedPlant ? ` · ${selectedGood?.[en ? "en" : "vi"]}` : ""}</h3>
              {selectedPlant ? <><p className="text-sm mb-2">{selectedPlant.owner_name} · {selectedPlant.wilted ? (en ? "Wilted after 3 dry days" : "Cây đã héo sau 3 ngày thiếu nước") : selectedPlant.watered_at ? (selectedPlant.growth >= selectedPlant.grow_days ? (en ? "Fully grown" : "Đã trưởng thành") : (en ? `Growing: ${selectedPlant.growth}/${selectedPlant.grow_days} days` : `Đang lớn: ${selectedPlant.growth}/${selectedPlant.grow_days} ngày`)) : (en ? "Needs watering" : "Cần tưới nước")}</p><Button onClick={() => run(async () => { await waterFn({ data: { plant: selectedPlant.id } }); setNotice(en ? "Watered! Growth begins next day." : "Đã tưới! Qua ngày cây sẽ lớn dần."); })} disabled={busy || !selectedPlant.can_water_today || !(garden.data.inventory.watering_use > 0)}><Droplets />{en ? "Water (1 use)" : "Tưới (1 lượt)"}</Button>{selectedPlant.wilted && <Button className="ml-2" variant="destructive" disabled={busy || garden.data.money < 20} onClick={() => run(async () => { await flushGameBeforeGardenPurchase(); const result = await removeFn({ data: { plant: selectedPlant.id } }); applyBalance(result.money, result.garden_spent); setNotice(en ? "Wilted plant removed." : "Đã dùng xẻng dọn cây héo."); })}><Shovel />{en ? "Remove wilted plant · 20 coins" : "Dùng xẻng dọn cây · 20đ"}</Button>}{!selectedPlant.wilted && <><p className="text-sm mt-2">{en ? `Growth level: ${selectedPlant.level ?? 0}/5` : `Cấp độ phát triển: ${selectedPlant.level ?? 0}/5`}</p>{!selectedPlant.boosted && <Button className="mt-2" disabled={busy || garden.data.money<30} onClick={() => beginGardenQuiz("boost",selectedPlant.id)}>{en ? "Growth booster · 30 coins (5 correct)" : "Thuốc tăng trưởng +30% · 30đ (5 câu đúng liên tiếp)"}</Button>}</>}</> : <div className="flex flex-wrap items-center gap-2"><select aria-label={en ? "Choose seed" : "Chọn hạt giống"} className="bg-secondary text-secondary-foreground rounded-md p-2 min-w-0 text-sm" value={seed} onChange={e => setSeed(e.target.value as GardenGoodId)}>{gardenGoods.filter(g => g.days > 0).map(g => <option key={g.id} value={g.id}>{g.icon} {g[en ? "en" : "vi"]} ({garden.data.inventory[g.id] ?? 0})</option>)}</select><Button disabled={busy || !(garden.data.inventory[seed] > 0)} onClick={() => run(async () => { if (seed === "watering_use") return; await plantFn({ data: { item: seed, cell: slot } }); setNotice(en ? "Seed planted." : "Đã gieo hạt."); })}><Sprout />{en ? "Plant" : "Gieo hạt"}</Button></div>}
            </div>}
            <h3 className="font-bold mb-2 flex items-center gap-2"><ShoppingBasket />{en ? "Garden shop" : "Cửa hàng vườn"}</h3>
            <div className="divide-y divide-border">{gardenGoods.map(g => <div key={g.id} className="flex items-center justify-between gap-3 py-2"><div className="text-sm"><span>{g.icon} {g[en ? "en" : "vi"]}</span><span className="block text-muted-foreground">{en ? "Owned" : "Trong kho"}: {garden.data.inventory[g.id] ?? 0}</span></div><Button size="sm" onClick={() => g.id==="watering_use" ? beginGardenQuiz("water",null) : purchase(g.id)} disabled={busy}>{g.price} {en ? "coins" : "đ"}</Button></div>)}</div>
          </>}
        </>}
        {notice && <p role="status" className="mt-4 font-bold text-sm">{notice}</p>}
      </section>
    </div>}
  </>;
  return { zoneProps: { plants: garden.data?.plants, ride, onRideEnd: endRide, onOpenPark: openPark, parkEntered, onSelectRide: chooseRide, onOpenGarden: openGarden }, panelUi, purchase, activeRide: !!ride };
}