import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import {
  loadGame,
  saveGame,
  computeLevel,
  nextLevelInfo,
  wallCost,
  WALL_HEIGHT,
  WALL_PALETTES,
  MAX_FLOOR,
  floorHasRoof,
  type GameState,
  type PlacedItem,
  type WallSegment,
  type RoofSegment,
} from "@/lib/game";
import { CATALOG, CATEGORIES, getItem } from "@/game/catalog";
import { randomQuestion, type Question, loadQuestionsFromDB, hasLoadedQuestions } from "@/game/questions";

const GameWorld = lazy(() => import("@/game/GameWorld"));

export const Route = createFileRoute("/game")({ component: GamePage });

function GamePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<typeof CATEGORIES[number]>("Vật liệu");
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionResult, setQuestionResult] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [questionsReady, setQuestionsReady] = useState(hasLoadedQuestions());

  // Wall-build flow
  const [wallMode, setWallMode] = useState(false);
  const [wallPickA, setWallPickA] = useState<string | null>(null);

  // Roof-build flow (pick 4 pillars defining a rectangle)
  const [roofMode, setRoofMode] = useState(false);
  const [roofPicks, setRoofPicks] = useState<string[]>([]);
  const [roofStyle, setRoofStyle] = useState<"tile" | "ton">("tile");

  // Palette picker modal
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Multi-floor
  const [activeFloor, setActiveFloor] = useState(0);

  useEffect(() => {
    setMounted(true);
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
    setState(loadGame());
    // Nạp câu hỏi từ DB (lọc theo map hiện tại — tạm 'rural')
    loadQuestionsFromDB("rural")
      .then(() => setQuestionsReady(true))
      .catch(() => setQuestionsReady(true));
  }, [navigate]);

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  if (!mounted || !user || !state) return null;

  const level = computeLevel(state);
  const lvlInfo = nextLevelInfo(state);

  const flash = (msg: string, ms = 1800) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const buyAndSelect = (itemId: string) => {
    const it = getItem(itemId);
    if (!it || !state) return;
    if (state.money < it.price) {
      flash("❌ Không đủ tiền! Trả lời câu hỏi để kiếm thêm.");
      return;
    }
    const kind = it.kind ?? "place";
    if (kind === "brick") {
      setState({ ...state, money: state.money - it.price, bricks: state.bricks + (it.qty ?? 10) });
      flash(`🧱 +${it.qty ?? 10} viên gạch vào kho`);
      return;
    }
    if (kind === "concrete") {
      setState({ ...state, money: state.money - it.price, concrete: state.concrete + (it.qty ?? 1) });
      flash(`🪣 +${it.qty ?? 1} xô bê tông tươi vào kho`);
      return;
    }
    if (kind === "rooftile") {
      const qty = it.qty ?? 10;
      const style = it.roofStyle ?? "tile";
      setState({
        ...state,
        money: state.money - it.price,
        roofTiles: style === "tile" ? state.roofTiles + qty : state.roofTiles,
        roofTilesTon: style === "ton" ? state.roofTilesTon + qty : state.roofTilesTon,
      });
      flash(`🏠 +${qty} gạch mái ${style === "ton" ? "tôn" : "ngói"} vào kho`);
      return;
    }
    if (kind === "palette") {
      if (!state.ownedPalettes.length) {
        // mua lần đầu: trừ tiền & mở tất cả palette
        setState({ ...state, money: state.money - it.price, ownedPalettes: WALL_PALETTES.map((p) => p.id) });
      }
      setPaletteOpen(true);
      setShopOpen(false);
      return;
    }
    // Cửa sổ: phải có ít nhất 1 tường để gắn
    if (it.id === "window" && state.walls.length === 0) {
      flash("⚠️ Hãy xây tường trước, rồi mới gắn cửa sổ.");
      return;
    }
    setSelected(itemId);
    setShopOpen(false);
  };

  const handlePlace = (x: number, z: number) => {
    const it = selected ? getItem(selected) : null;
    if (!it || !state) return;
    const swap = rotation % 2 === 1;
    const fw = swap ? it.d : it.w;
    const fd = swap ? it.w : it.d;
    if (x < 0 || z < 0 || x + fw > 20 || z + fd > 20) return;

    // Cửa sổ: chỉ cho phép đặt nếu nằm trên 1 tường (kiểm tra khoảng cách điểm tới đoạn tường)
    if (it.id === "window") {
      const cx = x + fw / 2 - 10;
      const cz = z + fd / 2 - 10;
      const ok = state.walls.some((w) => pointOnSegment(cx, cz, w, 0.6));
      if (!ok) {
        flash("🪟 Đặt cửa sổ ngay trên 1 đoạn tường nhé.");
        return;
      }
    }

    const collides = state.placed.some((p) => {
      if ((p.floor ?? 0) !== activeFloor) return false;
      const pi = getItem(p.itemId);
      if (!pi) return false;
      // Mái không kiểm tra va chạm sàn (đặt trên đỉnh tường)
      if (isRoof(pi.id) || isRoof(it.id)) return false;
      if (pi.id === "window" || it.id === "window") return false;
      const ps = p.rotation % 2 === 1;
      const pw = ps ? pi.d : pi.w;
      const pd = ps ? pi.w : pi.d;
      return !(x + fw <= p.x || p.x + pw <= x || z + fd <= p.z || p.z + pd <= z);
    });
    if (collides) return;
    if (state.money < it.price) return;
    const placed: PlacedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      itemId: it.id,
      x,
      z,
      rotation,
      floor: activeFloor,
    };
    setState({
      ...state,
      money: state.money - it.price,
      netWorth: state.netWorth + it.price,
      placed: [...state.placed, placed],
    });
  };

  const handleRemove = (id: string) => {
    const p = state.placed.find((x) => x.id === id);
    if (!p) return;
    const it = getItem(p.itemId);
    const refund = it ? it.price : 0;
    setState({
      ...state,
      money: state.money + refund,
      netWorth: Math.max(0, state.netWorth - (it?.price ?? 0)),
      placed: state.placed.filter((x) => x.id !== id),
    });
  };

  const removeWall = (id: string) => {
    const w = state.walls.find((x) => x.id === id);
    const refundNW = w?.value ?? 0;
    setState({
      ...state,
      walls: state.walls.filter((x) => x.id !== id),
      netWorth: Math.max(0, state.netWorth - refundNW),
    });
    flash("🧹 Đã gỡ tường");
  };

  const removeRoof = (id: string) => {
    const r = state.roofs.find((x) => x.id === id);
    const refundNW = r?.value ?? 0;
    setState({
      ...state,
      roofs: state.roofs.filter((x) => x.id !== id),
      netWorth: Math.max(0, state.netWorth - refundNW),
    });
    flash("🧹 Đã gỡ mái nhà");
  };

  // Build wall between 2 pillars, or build roof from 4 pillars
  const onPillarClick = (placedId: string) => {
    if (roofMode) {
      // Toggle pick: deselect if already chosen
      if (roofPicks.includes(placedId)) {
        setRoofPicks(roofPicks.filter((x) => x !== placedId));
        return;
      }
      const next = [...roofPicks, placedId];
      if (next.length < 4) {
        setRoofPicks(next);
        flash(`Đã chọn ${next.length}/4 cột trụ chính cho mái nhà.`);
        return;
      }
      // 4 pillars chosen → compute bounding box
      const corners = next
        .map((id) => state.placed.find((p) => p.id === id))
        .filter(Boolean) as PlacedItem[];
      const xs = corners.map((p) => p.x - 10 + 0.5);
      const zs = corners.map((p) => p.z - 10 + 0.5);
      const ax = Math.min(...xs), bx = Math.max(...xs);
      const az = Math.min(...zs), bz = Math.max(...zs);
      const w = Math.max(1, Math.round(bx - ax));
      const d = Math.max(1, Math.round(bz - az));
      const tilesNeeded = w * d;
      const inv = roofStyle === "ton" ? state.roofTilesTon : state.roofTiles;
      if (inv < tilesNeeded) {
        flash(`❌ Thiếu gạch mái ${roofStyle === "ton" ? "tôn" : "ngói"}! Cần ${tilesNeeded} (đang có ${inv}).`, 3000);
        setRoofPicks([]);
        return;
      }
      const it = getItem(roofStyle === "ton" ? "roof_ton" : "roof");
      const unitPrice = it ? it.price / (it.qty ?? 10) : 5;
      const value = Math.round(unitPrice * tilesNeeded);
      const seg: RoofSegment = {
        id: `r-${Date.now()}`,
        ax, az, bx, bz,
        style: roofStyle,
        value,
        floor: 0,
      };
      setState({
        ...state,
        roofTiles: roofStyle === "tile" ? state.roofTiles - tilesNeeded : state.roofTiles,
        roofTilesTon: roofStyle === "ton" ? state.roofTilesTon - tilesNeeded : state.roofTilesTon,
        roofs: [...state.roofs, seg],
        netWorth: state.netWorth + value,
      });
      setRoofPicks([]);
      flash(`🏠 Xây mái nhà ${w}m × ${d}m — tốn ${tilesNeeded} gạch mái.`, 2500);
      return;
    }
    if (!wallMode) return;
    if (!wallPickA) {
      setWallPickA(placedId);
      flash("Đã chọn cột A — chọn cột B để xây.");
      return;
    }
    if (wallPickA === placedId) {
      setWallPickA(null);
      flash("Đã huỷ chọn cột A");
      return;
    }
    const A = state.placed.find((p) => p.id === wallPickA);
    const B = state.placed.find((p) => p.id === placedId);
    if (!A || !B) {
      setWallPickA(null);
      return;
    }
    const ax = A.x - 10 + 0.5;
    const az = A.z - 10 + 0.5;
    const bx = B.x - 10 + 0.5;
    const bz = B.z - 10 + 0.5;
    const dist = Math.hypot(bx - ax, bz - az);
    const cost = wallCost(dist);
    if (state.bricks < cost.bricks || state.concrete < cost.concrete) {
      flash(`❌ Thiếu vật liệu! Cần ${cost.bricks} gạch + ${cost.concrete} xô bê tông (đang có ${state.bricks}/${state.concrete}).`, 3000);
      setWallPickA(null);
      return;
    }
    const brickUnit = getItem("brick_pack");
    const concreteUnit = getItem("concrete");
    const wallValue = Math.round(
      (brickUnit ? (brickUnit.price / (brickUnit.qty ?? 10)) * cost.bricks : 0) +
      (concreteUnit ? (concreteUnit.price / (concreteUnit.qty ?? 1)) * cost.concrete : 0)
    );
    const seg: WallSegment = {
      id: `w-${Date.now()}`,
      ax, az, bx, bz,
      color: state.wallColor,
      value: wallValue,
      floor: 0,
    };
    setState({
      ...state,
      bricks: state.bricks - cost.bricks,
      concrete: state.concrete - cost.concrete,
      walls: [...state.walls, seg],
      netWorth: state.netWorth + wallValue,
    });
    setWallPickA(null);
    flash(`🧱 Xây tường ${cost.length}m × ${WALL_HEIGHT}m — tốn ${cost.bricks} gạch + ${cost.concrete} bê tông.`, 2500);
  };

  const pickPaletteColor = (hex: string) => {
    setState({ ...state, wallColor: hex });
    setPaletteOpen(false);
    flash(`🎨 Màu tường mới: ${hex}`);
  };

  const openQuestion = () => {
    if (!questionsReady) {
      flash("⏳ Đang tải câu hỏi...");
      return;
    }
    setQuestion(randomQuestion());
    setQuestionResult(null);
  };
  const closeQuestion = () => {
    setQuestion(null);
    setQuestionResult(null);
    setPicked([]);
  };
  const gradeAnswer = (correctSet: number[], pickedSet: number[]) => {
    if (!question) return;
    const a = [...correctSet].sort().join(",");
    const b = [...pickedSet].sort().join(",");
    const ok = a === b;
    let next: GameState;
    let resultText: string;
    if (ok) {
      next = {
        ...state,
        money: state.money + question.reward,
        correctAnswers: state.correctAnswers + 1,
        answerStreak: state.answerStreak + 1,
      };
      resultText = `✅ Chính xác! +${question.reward}đ (🔥 streak ${state.answerStreak + 1})`;
    } else {
      next = { ...state, answerStreak: 0 };
      const correctLabels = correctSet.map((i) => `${String.fromCharCode(65 + i)}. ${question.options[i]}`).join(" | ");
      resultText = `❌ Sai rồi! Đáp án đúng: ${correctLabels}`;
    }
    setState(next);
    setQuestionResult(resultText);
    setTimeout(() => {
      setQuestion(randomQuestion());
      setQuestionResult(null);
      setPicked([]);
    }, 1200);
  };
  const answerQuestion = (idx: number) => {
    if (!question || questionResult) return;
    const correctSet = question.correctIndexes && question.correctIndexes.length > 0
      ? question.correctIndexes
      : [question.answer];
    const isMulti = correctSet.length > 1;
    if (isMulti) {
      setPicked((prev) => prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]);
      return;
    }
    gradeAnswer(correctSet, [idx]);
  };
  const confirmMultiAnswer = () => {
    if (!question || questionResult || picked.length === 0) return;
    const correctSet = question.correctIndexes && question.correctIndexes.length > 0
      ? question.correctIndexes
      : [question.answer];
    gradeAnswer(correctSet, picked);
  };

  const pillarsPlaced = state.placed.filter((p) => p.itemId === "pillar");
  const canEnterWallMode = pillarsPlaced.length >= 2;
  const canEnterRoofMode = pillarsPlaced.length >= 4;

  return (
    <div className="fixed inset-0 bg-sky-300 overflow-hidden select-none">
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl">Đang tải thế giới 3D...</div>}>
        <GameWorld
          placed={state.placed}
          walls={state.walls}
          roofs={state.roofs}
          wallColor={state.wallColor}
          wallMode={wallMode}
          wallPickA={wallPickA}
          roofMode={roofMode}
          roofPicks={roofPicks}
          selectedItemId={selected}
          rotation={rotation}
          onRotate={() => setRotation((r) => (r + 1) % 4)}
          onPlace={handlePlace}
          onRemove={handleRemove}
          onPillarClick={onPillarClick}
          onWallRemove={removeWall}
          onRoofRemove={removeRoof}
        />
      </Suspense>

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="glass-card px-4 py-2 pointer-events-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-2 border-white flex items-center justify-center text-xl">🐕</div>
          <div className="text-sm">
            <div className="font-black">{user.username} <span className="text-xs text-orange-700">#{user.id}</span></div>
            <div className="font-bold text-yellow-700">💰 {state.money}đ • 🏠 {state.netWorth}đ</div>
            <div className="text-xs font-bold text-blue-700">Lv.{level} • ✅ {state.correctAnswers} câu • 🔥 streak {state.answerStreak}</div>
            <div className="text-xs font-bold text-stone-700">🧱 Gạch: {state.bricks} • 🪣 Bê tông: {state.concrete} • 🏠 Mái ngói: {state.roofTiles} • 🟥 Mái tôn: {state.roofTilesTon}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <Link to="/" className="toy-button text-xs !py-2 !px-3">🏡 Về trang chủ</Link>
          <button onClick={() => setShopOpen(true)} className="toy-button toy-button-primary !text-base !py-2 !px-5">🛒 CỬA HÀNG</button>
          <button onClick={openQuestion} className="toy-button toy-button-green !text-sm !py-2 !px-4">❓ KIẾM TIỀN</button>
          <button
            onClick={() => {
              if (!canEnterWallMode) {
                flash("Đặt ít nhất 2 cột bê tông trước khi xây tường.");
                return;
              }
              setWallMode((w) => !w);
              setWallPickA(null);
              setRoofMode(false);
              setRoofPicks([]);
              setSelected(null);
            }}
            className={`toy-button !text-sm !py-2 !px-4 ${wallMode ? "toy-button-green" : ""}`}
          >
            {wallMode ? "✅ Đang xây tường" : "🧱 XÂY TƯỜNG"}
          </button>
          <button
            onClick={() => {
              if (!canEnterRoofMode) {
                flash("Đặt ít nhất 4 cột bê tông trước khi xây mái nhà.");
                return;
              }
              setRoofMode((r) => !r);
              setRoofPicks([]);
              setWallMode(false);
              setWallPickA(null);
              setSelected(null);
            }}
            className={`toy-button !text-sm !py-2 !px-4 ${roofMode ? "toy-button-green" : ""}`}
          >
            {roofMode ? `✅ Mái ${roofStyle === "ton" ? "tôn" : "ngói"} (${roofPicks.length}/4)` : "🏠 XÂY MÁI NHÀ"}
          </button>
          {roofMode && (
            <div className="flex gap-1">
              <button
                onClick={() => setRoofStyle("tile")}
                className={`toy-button !text-[10px] !py-1 !px-2 ${roofStyle === "tile" ? "toy-button-primary !text-[10px] !py-1 !px-2" : ""}`}
              >Ngói</button>
              <button
                onClick={() => setRoofStyle("ton")}
                className={`toy-button !text-[10px] !py-1 !px-2 ${roofStyle === "ton" ? "toy-button-primary !text-[10px] !py-1 !px-2" : ""}`}
              >Tôn</button>
            </div>
          )}
          {state.ownedPalettes.length > 0 && (
            <button onClick={() => setPaletteOpen(true)} className="toy-button !text-xs !py-2 !px-3" style={{ background: state.wallColor }}>
              🎨 Đổi màu tường
            </button>
          )}
        </div>
      </div>


      {/* Level progress */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 glass-card px-4 py-2 pointer-events-none hidden md:block">
        <div className="text-xs font-black text-center">CẤP {level} → CẤP {lvlInfo.next}</div>
        <div className="text-[10px] font-bold text-muted-foreground">
          🏠 {state.netWorth}/{lvlInfo.netWorthNeeded}đ • ✅ {state.correctAnswers}/{lvlInfo.questionsNeeded}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-xs font-bold pointer-events-none max-w-[92vw] text-center">
        {wallMode
          ? "🧱 CHẾ ĐỘ XÂY TƯỜNG • Click 2 cột bê tông để hệ thống tự xây tường giữa chúng • Quy đổi: 1m × 5m = 10 gạch + 1 bê tông"
          : roofMode
          ? `🏠 CHẾ ĐỘ XÂY MÁI NHÀ • Click 4 cột bê tông là 4 góc nhà • 1m² = 1 gạch mái ${roofStyle === "ton" ? "tôn" : "ngói"}`
          : "🎮 WASD: Di chuyển • SPACE: Nhảy • R: Xoay • Click: Đặt • Chuột phải: Xóa"}
      </div>

      {selected && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-card px-4 py-2 flex items-center gap-3 pointer-events-auto">
          <span className="text-2xl">{getItem(selected)?.icon}</span>
          <div className="text-sm font-black">Đang đặt: {getItem(selected)?.name}</div>
          <button onClick={() => setSelected(null)} className="toy-button !text-xs !py-1 !px-3">Hủy</button>
        </div>
      )}

      {toast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 glass-card px-5 py-3 font-black text-base animate-bounce pointer-events-none z-40">
          {toast}
        </div>
      )}

      {/* Shop */}
      {shopOpen && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4" onClick={() => setShopOpen(false)}>
          <div className="glass-card max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b-2 border-white/50 flex items-center justify-between">
              <h2 className="text-2xl font-black">🛒 CỬA HÀNG</h2>
              <div className="font-bold text-yellow-700">💰 {state.money}đ</div>
              <button onClick={() => setShopOpen(false)} className="toy-button !text-xs !py-1 !px-3">Đóng</button>
            </div>
            <div className="flex flex-wrap gap-2 p-3 border-b-2 border-white/50">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`toy-button !text-xs !py-2 !px-3 ${activeCat === c ? "toy-button-primary !text-xs !py-2 !px-3" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
            {activeCat === "Vật liệu" && (
              <div className="px-4 pt-3 text-[11px] font-bold text-stone-700">
                💡 Đặt CỘT BÊ TÔNG trước để giới hạn bề ngang. Mua GẠCH + BÊ TÔNG TƯƠI, rồi bấm
                {" "}<span className="text-orange-700">🧱 XÂY TƯỜNG</span> để hệ thống tự quy đổi (10 gạch + 1 bê tông cho 1m × 5m).
              </div>
            )}
            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {CATALOG.filter((c) => c.category === activeCat).map((it) => {
                const canAfford = state.money >= it.price;
                const kind = it.kind ?? "place";
                const label =
                  kind === "brick" ? "MUA GẠCH" :
                  kind === "concrete" ? "MUA BÊ TÔNG" :
                  kind === "rooftile" ? "MUA GẠCH MÁI" :
                  kind === "palette" ? "MỞ PALETTE" :
                  "MUA & ĐẶT";
                return (
                  <div key={it.id} className="relative rounded-3xl p-3 text-center border-2 border-amber-200" style={{
                    background: "radial-gradient(circle at 30% 20%, #fffaf0 0%, #ffe8b8 55%, #f7c573 100%)",
                    boxShadow: "0 12px 22px -10px rgba(180,120,0,0.55), inset 0 -6px 0 rgba(0,0,0,0.07), inset 0 4px 0 rgba(255,255,255,0.6)",
                  }}>
                    <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-1" style={{
                      background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #fff3c8 50%, #f0b94f 100%)",
                      boxShadow: "inset 0 -4px 8px rgba(120,60,0,0.25), 0 4px 8px rgba(0,0,0,0.1)",
                    }}>{it.icon}</div>
                    <div className="font-black text-sm mt-1 line-clamp-1">{it.name}</div>
                    <div className="text-[10px] text-amber-900/70 font-bold">{it.w}×{it.d} ô</div>
                    <div className="inline-block px-2 py-0.5 mt-1 rounded-full bg-amber-900 text-amber-100 text-xs font-black">💰 {it.price}đ</div>
                    <button onClick={() => buyAndSelect(it.id)} disabled={!canAfford}
                      className={`toy-button !text-xs !py-1 !px-3 mt-2 w-full ${canAfford ? "toy-button-primary !text-xs !py-1 !px-3" : "opacity-50"}`}>
                      {canAfford ? label : "Hết tiền"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Palette modal */}
      {paletteOpen && (
        <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={() => setPaletteOpen(false)}>
          <div className="glass-card max-w-4xl w-full max-h-[85vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-black">🎨 PALETTE MÀU TƯỜNG</h2>
              <button onClick={() => setPaletteOpen(false)} className="toy-button !text-xs !py-1 !px-3">Đóng</button>
            </div>
            <p className="text-xs font-bold text-stone-700 mb-3">Chọn 1 ô màu bất kỳ để sơn cho các tường (tường mới và sẵn có).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {WALL_PALETTES.map((p) => (
                <div key={p.id} className="rounded-2xl p-3 bg-white/70 border border-white/80">
                  <div className="text-sm font-black mb-2">{p.name}</div>
                  <div className="flex rounded-xl overflow-hidden shadow-inner">
                    {p.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => pickPaletteColor(c)}
                        className="flex-1 h-14 hover:scale-110 transition-transform border-r last:border-r-0 border-white/40 relative group"
                        style={{ background: c }}
                        title={c}
                      >
                        <span className="absolute inset-x-0 bottom-0 text-[9px] font-black text-white/90 mix-blend-difference">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Question modal */}
      {question && (() => {
        const correctSet = question.correctIndexes && question.correctIndexes.length > 0
          ? question.correctIndexes
          : [question.answer];
        const isMulti = correctSet.length > 1;
        const optImages = question.optionImages || [];
        const hasOptionImages = optImages.some((u) => u && u.length > 0);
        return (
          <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-3 md:p-6">
            <div className="glass-card max-w-2xl w-full p-5 md:p-7 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="text-xs md:text-sm font-bold text-orange-700">
                  {isMulti
                    ? `❓ Chọn TẤT CẢ đáp án đúng rồi bấm Xác nhận (+${question.reward}đ)`
                    : `❓ Trả lời đúng để +${question.reward}đ`}
                </div>
                <button onClick={closeQuestion} className="toy-button !text-xs !py-1 !px-3 shrink-0">✖ Thoát</button>
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-4 text-center leading-snug">{question.q}</h3>
              {question.imageUrl && (
                <div className="flex justify-center mb-4">
                  <img src={question.imageUrl} alt="" className="max-h-48 md:max-h-64 w-auto rounded-xl object-contain border-2 border-orange-200" />
                </div>
              )}
              <div className={hasOptionImages ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-2"}>
                {question.options.map((opt, i) => {
                  const isPicked = picked.includes(i);
                  const baseClass = hasOptionImages
                    ? "rounded-xl border-2 p-2 text-left flex flex-col items-stretch gap-2 transition-all"
                    : "rounded-xl border-2 px-4 py-3 text-left transition-all w-full";
                  const stateClass = isMulti && isPicked
                    ? "bg-green-100 border-green-600 ring-2 ring-green-400"
                    : "bg-white border-gray-300 hover:border-orange-400 hover:bg-orange-50";
                  const disabled = !!questionResult;
                  return (
                    <button
                      key={i}
                      onClick={() => answerQuestion(i)}
                      disabled={disabled}
                      className={`${baseClass} ${stateClass} ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {hasOptionImages && optImages[i] && (
                        <img src={optImages[i]} alt="" className="max-h-32 w-full object-contain rounded-md bg-gray-50" />
                      )}
                      <div className="text-base md:text-lg font-bold flex items-center gap-2">
                        {isMulti && (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-xs ${isPicked ? "bg-green-600 border-green-700 text-white" : "border-gray-400"}`}>
                            {isPicked ? "✓" : ""}
                          </span>
                        )}
                        <span>{String.fromCharCode(65 + i)}. {opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {isMulti && (
                <button
                  onClick={confirmMultiAnswer}
                  disabled={!!questionResult || picked.length === 0}
                  className="toy-button-green w-full mt-4 !text-lg !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓ XÁC NHẬN ({picked.length})
                </button>
              )}
              {questionResult && (
                <div className="mt-4 text-center font-black text-xl md:text-2xl">{questionResult}</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function isRoof(id: string) {
  return id === "roof" || id === "roof_ton";
}

function pointOnSegment(px: number, pz: number, w: WallSegment, tol: number) {
  // distance from point to segment AB
  const ax = w.ax, az = w.az, bx = w.bx, bz = w.bz;
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return Math.hypot(px - ax, pz - az) <= tol;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cz = az + t * dz;
  return Math.hypot(px - cx, pz - cz) <= tol;
}
