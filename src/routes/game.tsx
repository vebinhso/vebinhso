import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
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
  type FloorSegment,
} from "@/lib/game";
import { CATALOG, CATEGORIES, getItem, canStackOn, STACK_SURFACES } from "@/game/catalog";
import { randomQuestion, type Question, loadQuestionsFromDB, hasLoadedQuestions } from "@/game/questions";
import { QuestionView } from "@/game/QuestionView";

const GameWorld = lazy(() => import("@/game/GameWorld"));
import { getActivePowerIds } from "@/lib/powers";
import { useWorldToggles, setToggles } from "@/lib/world-toggles";
import { setBgm, playSfx, startLoopSfx, stopLoopSfx } from "@/lib/audio";
import { loadPickupConfig, resolvePickups, loadCollected, saveCollected, type Pickup } from "@/lib/worldPickups";
import { TouchControls } from "@/game/TouchControls";
import { loadSignLabels, saveSignLabels, SIGN_LABEL_MAX, type SignLabelMap } from "@/lib/sign-labels";

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
  
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activePowers, setActivePowers] = useState<number[]>([]);
  const [questionsReady, setQuestionsReady] = useState(hasLoadedQuestions());
  const wt = useWorldToggles();
  const [playerPos, setPlayerPos] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  // Wall-build flow
  const [wallMode, setWallMode] = useState(false);
  const [wallPickA, setWallPickA] = useState<string | null>(null);

  // Roof-build flow (pick 4 pillars defining a rectangle)
  const [roofMode, setRoofMode] = useState(false);
  const [roofPicks, setRoofPicks] = useState<string[]>([]);
  const [roofStyle, setRoofStyle] = useState<"tile" | "ton">("tile");

  // Floor-build flow (pick 4 pillars defining a rectangle)
  const [floorMode, setFloorMode] = useState(false);
  const [floorPicks, setFloorPicks] = useState<string[]>([]);

  // Palette picker modal
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Multi-floor
  const [activeFloor, setActiveFloor] = useState(0);

  // Undo stack
  const [history, setHistory] = useState<GameState[]>([]);
  const isUndoingRef = useRef(false);
  const lastStateRef = useRef<GameState | null>(null);

  // Pickups (coins + bombs scattered around the house)
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  // Hiệu ứng lấp lánh khi dẫm trúng xu
  const [sparkles, setSparkles] = useState<{ id: string; x: number; z: number; at: number }[]>([]);
  // Boom modal: BẮT BUỘC trả lời đúng mới biến mất. Sai → câu mới.
  const [boom, setBoom] = useState<null | { q: Question; tries: number; correct: number; gained: number }>(null);
  const [boomResult, setBoomResult] = useState<string | null>(null);

  // Chỉnh sửa item đã đặt: xoay tự do 360° + dịch chuyển trong tầng hiện tại
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  // Gợi ý khi mua cửa: hiện lên để nhắc người chơi xoay về 0°
  const [doorHint, setDoorHint] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  // Nhãn bảng tên nhà — lưu localStorage theo user
  const [signLabels, setSignLabels] = useState<SignLabelMap>({});
  // id biển tên đang được sửa text (mở modal)
  const [signEditId, setSignEditId] = useState<string | null>(null);
  const [signDraft, setSignDraft] = useState("");

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
    // Nạp vật phẩm rải trên map (xu + boom) + đã nhặt
    setCollectedIds(loadCollected(u.id));
    setSignLabels(loadSignLabels(u.id));
    loadPickupConfig()
      .then((cfg) => setPickups(resolvePickups(cfg)))
      .catch(() => setPickups([]));
  }, [navigate]);

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  // Tắt gợi ý cửa khi người chơi chọn item khác hoặc đổi mode
  useEffect(() => {
    if (selected !== "door") setDoorHint(false);
  }, [selected]);

  // Track history (snapshot previous state on every change, except undo)
  useEffect(() => {
    if (!state) return;
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
    } else if (lastStateRef.current && lastStateRef.current !== state) {
      const prev = lastStateRef.current;
      setHistory((h) => [...h.slice(-29), prev]);
    }
    lastStateRef.current = state;
  }, [state]);

  const handleUndo = () => {
    setHistory((h) => {
      if (h.length === 0) {
        flash("↩️ Không có gì để hoàn tác");
        return h;
      }
      const prev = h[h.length - 1];
      isUndoingRef.current = true;
      setState(prev);
      flash("↩️ Đã hoàn tác");
      return h.slice(0, -1);
    });
  };

  // Ctrl+Z / Cmd+Z shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, history]);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;
    const tick = () => setActivePowers(getActivePowerIds(u.id));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Bật BGM map nhà; tắt khi rời route.
  useEffect(() => {
    setBgm("house");
    return () => { stopLoopSfx("rain"); stopLoopSfx("tornado"); };
  }, []);

  // Loop âm thanh mưa / lốc xoáy theo quyền năng đang kích hoạt.
  useEffect(() => {
    if (activePowers.includes(1)) startLoopSfx("rain"); else stopLoopSfx("rain");
    if (activePowers.includes(2)) startLoopSfx("tornado"); else stopLoopSfx("tornado");
  }, [activePowers]);


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
      playSfx("purchase", { duck: true });
      flash(`🧱 +${it.qty ?? 10} viên gạch vào kho`);
      return;
    }
    if (kind === "concrete") {
      setState({ ...state, money: state.money - it.price, concrete: state.concrete + (it.qty ?? 1) });
      playSfx("purchase", { duck: true });
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
      playSfx("purchase", { duck: true });
      flash(`🏠 +${qty} gạch mái ${style === "ton" ? "tôn" : "ngói"} vào kho`);
      return;
    }
    if (kind === "palette") {
      if (!state.ownedPalettes.length) {
        setState({ ...state, money: state.money - it.price, ownedPalettes: WALL_PALETTES.map((p) => p.id) });
        playSfx("purchase", { duck: true });
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
    if (it.id === "door") setDoorHint(true);
    setSelected(itemId);
    setShopOpen(false);
  };

  const handlePlace = (x: number, z: number) => {
    // Chế độ DỊCH CHUYỂN: cập nhật vị trí item đang chỉnh, không tạo item mới
    if (editingId && moveMode && state) {
      const target = state.placed.find((p) => p.id === editingId);
      if (target) {
        const it = getItem(target.itemId);
        if (it) {
          const swap = target.rotation % 2 === 1;
          const fw = swap ? it.d : it.w;
          const fd = swap ? it.w : it.d;
          // Đưa về dạng "center-based" (+10 để vẫn nằm trong hệ lưới [0..20])
          const cx = x + fw / 2;
          const cz = z + fd / 2;
          // Chặn ra ngoài mảnh đất
          const clX = Math.max(0, Math.min(20, cx));
          const clZ = Math.max(0, Math.min(20, cz));
          // Lưu angleRad (nếu chưa có thì derive từ rotation)
          const angleRad = typeof target.angleRad === "number" ? target.angleRad : (target.rotation * Math.PI) / 2;
          setState({
            ...state,
            placed: state.placed.map((p) => (p.id === editingId ? { ...p, x: clX, z: clZ, angleRad, rotation: 0 } : p)),
          });
          setMoveMode(false);
          playSfx("place");
        }
      }
      return;
    }
    const it = selected ? getItem(selected) : null;
    if (!it || !state) return;
    const swap = rotation % 2 === 1;
    const fw = swap ? it.d : it.w;
    const fd = swap ? it.w : it.d;
    if (x < 0 || z < 0 || x + fw > 20 || z + fd > 20) return;

    // Cửa sổ & cửa chính: snap vào TƯỜNG GẦN NHẤT bất kể hướng (ngang/dọc/xéo).
    //  - Tìm điểm chiếu của tâm click lên từng đoạn tường, lấy đoạn gần nhất (≤ 0.8m).
    //  - Lưu (x, z) = tâm vật (+10 để vẫn nằm trong hệ lưới), kèm angleRad = góc tường
    //    để cửa nằm phẳng với tường (cùng độ dày 0.25m → khi đóng tạo thành 1 mặt phẳng).
    if (it.id === "window" || it.id === "door") {
      if (state.walls.length === 0) {
        flash(it.id === "door" ? "🚪 Hãy xây tường trước, rồi mới gắn cửa." : "🪟 Hãy xây tường trước, rồi mới gắn cửa sổ.");
        return;
      }
      const cx0 = x + fw / 2 - 10;
      const cz0 = z + fd / 2 - 10;
      let best: { d2: number; cx: number; cz: number; ang: number } | null = null;
      for (const w of state.walls) {
        if ((w.floor ?? 0) !== activeFloor) continue;
        const dx = w.bx - w.ax, dz = w.bz - w.az;
        const len2 = dx * dx + dz * dz;
        if (len2 === 0) continue;
        // Với cửa chính, cần đảm bảo có đủ chiều dài tường (~1m) để khoét lỗ
        const len = Math.sqrt(len2);
        const margin = it.id === "door" ? 0.5 / len : 0;
        let t = ((cx0 - w.ax) * dx + (cz0 - w.az) * dz) / len2;
        t = Math.max(margin, Math.min(1 - margin, t));
        const px = w.ax + t * dx;
        const pz = w.az + t * dz;
        const d2 = (cx0 - px) ** 2 + (cz0 - pz) ** 2;
        if (!best || d2 < best.d2) {
          best = { d2, cx: px, cz: pz, ang: Math.atan2(dx, dz) };
        }
      }
      if (!best || best.d2 > 0.8 * 0.8) {
        flash(it.id === "door" ? "🚪 Đặt cửa ngay trên 1 đoạn tường nhé." : "🪟 Đặt cửa sổ ngay trên 1 đoạn tường nhé.");
        return;
      }
      if (state.money < it.price) return;
      const placedSnap: PlacedItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        itemId: it.id,
        x: best.cx + 10,
        z: best.cz + 10,
        rotation: 0,
        floor: activeFloor,
        angleRad: best.ang,
      };
      setState({
        ...state,
        money: state.money - it.price,
        netWorth: state.netWorth + it.price,
        placed: [...state.placed, placedSnap],
      });
      playSfx("place");
      setDoorHint(false);
      return;
    }

    // Tìm các item bị chồng lấn footprint
    const overlaps = state.placed.filter((p) => {
      if ((p.floor ?? 0) !== activeFloor) return false;
      const pi = getItem(p.itemId);
      if (!pi) return false;
      if (isRoof(pi.id) || isRoof(it.id)) return false;
      if (pi.id === "window" || it.id === "window") return false;
      const ps = p.rotation % 2 === 1;
      const pw = ps ? pi.d : pi.w;
      const pd = ps ? pi.w : pi.d;
      return !(x + fw <= p.x || p.x + pw <= x || z + fd <= p.z || p.z + pd <= z);
    });

    // Tính stackY: nếu item là topper và TẤT CẢ item bị chồng lên đều là surface
    // (và topper nằm gọn trong footprint surface), cho phép đặt lên nóc surface cao nhất.
    let stackY = 0;
    if (overlaps.length > 0) {
      const allSurfaces = overlaps.every((p) => {
        const pi = getItem(p.itemId);
        if (!pi || !STACK_SURFACES.has(pi.id) || !canStackOn(it.id, pi.id)) return false;
        const ps = p.rotation % 2 === 1;
        const pw = ps ? pi.d : pi.w;
        const pd = ps ? pi.w : pi.d;
        // topper phải nằm hoàn toàn trong footprint surface
        return x >= p.x && z >= p.z && x + fw <= p.x + pw && z + fd <= p.z + pd;
      });
      if (!allSurfaces) return;
      stackY = Math.max(
        ...overlaps.map((p) => {
          const pi = getItem(p.itemId)!;
          return (p.stackY ?? 0) + pi.h;
        })
      );
    }
    if (state.money < it.price) return;
    const placed: PlacedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      itemId: it.id,
      x,
      z,
      rotation,
      floor: activeFloor,
      ...(stackY > 0 ? { stackY } : {}),
    };
    setState({
      ...state,
      money: state.money - it.price,
      netWorth: state.netWorth + it.price,
      placed: [...state.placed, placed],
    });
    playSfx("place");
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
    // Chỉ cho phép thao tác với cột thuộc tầng đang chọn
    const clicked = state.placed.find((p) => p.id === placedId);
    if (!clicked || (clicked.floor ?? 0) !== activeFloor) return;

    if (floorMode) {
      if (floorPicks.includes(placedId)) {
        setFloorPicks(floorPicks.filter((x) => x !== placedId));
        return;
      }
      const next = [...floorPicks, placedId];
      if (next.length < 4) {
        setFloorPicks(next);
        flash(`Đã chọn ${next.length}/4 cột trụ cho sàn.`);
        return;
      }
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
      if (state.concrete < tilesNeeded) {
        flash(`❌ Thiếu bê tông! Cần ${tilesNeeded} xô (đang có ${state.concrete}).`, 3000);
        setFloorPicks([]);
        return;
      }
      const value = tilesNeeded * 4;
      const seg: FloorSegment = { id: `f-${Date.now()}`, ax, az, bx, bz, value, floor: activeFloor };
      setState({
        ...state,
        concrete: state.concrete - tilesNeeded,
        floors: [...state.floors, seg],
        netWorth: state.netWorth + value,
      });
      setFloorPicks([]);
      flash(`🟫 Xây sàn ${w}m × ${d}m — tốn ${tilesNeeded} xô bê tông.`, 2500);
      return;
    }

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
        floor: activeFloor,
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
      floor: activeFloor,
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
  };
  const handleAnswer = (picked: number[]) => {
    if (!question || questionResult) return;
    const correctSet = question.correctIndexes && question.correctIndexes.length > 0
      ? question.correctIndexes
      : [question.answer];
    const a = [...correctSet].sort().join(",");
    const b = [...picked].sort().join(",");
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
    playSfx(ok ? "rightHouse" : "wrongHouse", { duck: true });
    setQuestionResult(resultText);

    setTimeout(() => {
      setQuestion(randomQuestion());
      setQuestionResult(null);
    }, 1200);
  };

  // ===== Pickups (xu + boom) =====
  const markCollected = (id: string) => {
    if (!user) return;
    setCollectedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveCollected(user.id, next);
      return next;
    });
  };
  const handlePickup = (p: Pickup) => {
    if (collectedIds.has(p.id)) return;
    markCollected(p.id);
    if (p.kind === "coin") {
      setState((s) => (s ? { ...s, money: s.money + 10 } : s));
      playSfx("rightHouse", { duck: true });
      // Sparkle 1.1s
      const sid = `s-${p.id}-${Date.now()}`;
      setSparkles((arr) => [...arr, { id: sid, x: p.x, z: p.z, at: Date.now() }]);
      setTimeout(() => setSparkles((arr) => arr.filter((s) => s.id !== sid)), 1100);
      flash("✨ +10đ", 900);
    } else {
      // Boom: mở modal trả lời 2 câu hỏi
      playSfx("wrongHouse", { duck: true });
      if (!questionsReady) {
        flash("💣 Đạp trúng boom! (chưa có câu hỏi)", 1500);
        return;
      }
      setBoom({ q: randomQuestion(), tries: 0, correct: 0, gained: 0 });
      setBoomResult(null);
    }
  };
  const handleBoomAnswer = (picked: number[]) => {
    if (!boom || boomResult) return;
    const q = boom.q;
    const correctSet = q.correctIndexes && q.correctIndexes.length > 0 ? q.correctIndexes : [q.answer];
    const ok = [...correctSet].sort().join(",") === [...picked].sort().join(",");
    const delta = ok ? 10 : -5;
    const gained = boom.gained + delta;
    setState((s) => (s ? { ...s, money: Math.max(0, s.money + delta), correctAnswers: ok ? s.correctAnswers + 1 : s.correctAnswers, answerStreak: ok ? s.answerStreak + 1 : 0 } : s));
    playSfx(ok ? "rightHouse" : "wrongHouse", { duck: true });
    setBoomResult(ok ? `✅ Đúng! ${delta >= 0 ? "+" : ""}${delta}đ` : `❌ Sai! ${delta}đ — phải trả lời thêm 1 câu!`);
    setTimeout(() => {
      if (ok) {
        flash(`💣 Đã vô hiệu boom! Tổng: ${gained >= 0 ? "+" : ""}${gained}đ`, 2000);
        setBoom(null);
        setBoomResult(null);
      } else {
        // Sai → câu hỏi mới, modal vẫn mở
        setBoom({ q: randomQuestion(), tries: boom.tries + 1, correct: boom.correct, gained });
        setBoomResult(null);
      }
    }, 1200);
  };

  const pillarsPlaced = state.placed.filter((p) => p.itemId === "pillar" && (p.floor ?? 0) === activeFloor);
  // Tầng trệt (0) miễn phí; tầng 1/2/3 cần đạt cấp tương ứng
  const WALL_LEVEL_REQ = [0, 3, 10, 18];
  const wallLevelReq = WALL_LEVEL_REQ[activeFloor] ?? 99;
  const meetsWallLevel = level >= wallLevelReq;
  const canEnterWallMode = pillarsPlaced.length >= 2 && meetsWallLevel;
  const canEnterRoofMode = pillarsPlaced.length >= 4;
  const canEnterFloorMode = pillarsPlaced.length >= 4;
  const floorOnThisFloor = state.floors.some((f) => (f.floor ?? 0) === activeFloor);

  const canAccessFloor = (f: number) => {
    if (f <= 0) return true;
    for (let i = 0; i < f; i++) {
      // Chỉ cần lợp sàn tầng dưới (không cần mái)
      if (!state.floors.some((fl) => (fl.floor ?? 0) === i)) return false;
    }
    return true;
  };
  const tryGoFloor = (f: number) => {
    if (f === activeFloor) return;
    if (!canAccessFloor(f)) {
      flash(`🏗️ Hãy lợp sàn tầng dưới trước khi lên tầng ${f}!`, 2200);
      return;
    }
    setActiveFloor(f);
    setSelected(null);
    setWallMode(false); setWallPickA(null);
    setRoofMode(false); setRoofPicks([]);
  };
  const floorLabel = (f: number) => (f === 0 ? "Trệt" : String(f));

  return (
    <div className="fixed inset-0 bg-sky-300 overflow-hidden select-none">
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl">Đang tải thế giới 3D...</div>}>
        <GameWorld
          placed={state.placed}
          walls={state.walls}
          roofs={state.roofs}
          floors={state.floors}
          wallColor={state.wallColor}
          wallMode={wallMode}
          wallPickA={wallPickA}
          roofMode={roofMode}
          roofPicks={roofPicks}
          floorMode={floorMode}
          floorPicks={floorPicks}
          selectedItemId={selected}
          rotation={rotation}
          onRotate={() => setRotation((r) => (r + 1) % 4)}
          onPlace={handlePlace}
          onRemove={handleRemove}
          onPillarClick={onPillarClick}
          onWallRemove={removeWall}
          onRoofRemove={removeRoof}
          onFloorRemove={(id) => {
            const f = state.floors.find((x) => x.id === id);
            const refund = f?.value ?? 0;
            setState({
              ...state,
              floors: state.floors.filter((x) => x.id !== id),
              netWorth: Math.max(0, state.netWorth - refund),
            });
            flash("🧹 Đã gỡ sàn");
          }}
          activeFloor={activeFloor}
          pickups={pickups}
          collectedIds={collectedIds}
          onPickup={handlePickup}
          showAdminMarkers={isAdmin(user.email)}
          sparkles={sparkles}
          onPlayerPos={(x, z) => setPlayerPos({ x, z })}
          onItemClick={(id) => {
            const p = state.placed.find((q) => q.id === id);
            if (!p) return;
            if ((p.floor ?? 0) !== activeFloor) return;
            if (p.itemId === "sign") {
              setSignEditId(id);
              setSignDraft(signLabels[id] ?? "");
              return;
            }
            setEditingId(id);
            setMoveMode(false);
          }}
          editingId={editingId}
          signLabels={signLabels}
        />
      </Suspense>

      <WeatherOverlay powers={activePowers} />
      <TouchControls />

      {activePowers.some((id) => [1,2,3].includes(id)) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass-card px-4 py-1.5 pointer-events-none z-40">
          <div className="text-xs font-black">
            {activePowers.includes(1) && "🌧️ Đang mưa "}{activePowers.includes(3) && "☀️ Trời nắng "}{activePowers.includes(2) && "🌪️ Lốc xoáy"}
          </div>
        </div>
      )}

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="glass-card px-3 py-2 pointer-events-auto flex items-center gap-2 max-w-[60vw] sm:max-w-none">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-2 border-white flex items-center justify-center text-lg sm:text-xl shrink-0">🐕</div>
          <div className="text-[11px] sm:text-sm min-w-0">
            <div className="font-black truncate">{user.username} {isAdmin(user.email) && <span className="text-xs text-orange-700">#{user.id}</span>}</div>
            <div className="font-bold text-yellow-700 truncate">💰 {state.money}đ • 🏠 {state.netWorth}đ</div>
            <div className="text-[10px] sm:text-xs font-bold text-blue-700 truncate">Lv.{level} • ✅ {state.correctAnswers} • 🔥 {state.answerStreak}</div>
            <div className="text-[10px] sm:text-xs font-bold text-stone-700 truncate">🧱 {state.bricks} • 🪣 {state.concrete} • 🏠 {state.roofTiles} • 🟥 {state.roofTilesTon}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          {/* Toggle tools (touch only) */}
          <button
            onClick={() => setToolsOpen((v) => !v)}
            className="toy-button !text-xs !py-2 !px-3 [@media(pointer:fine)]:hidden"
            title="Ẩn/hiện công cụ"
          >
            {toolsOpen ? "✖ ẨN MENU" : "☰ MENU"}
          </button>
          <div className={`flex flex-col gap-2 items-end max-h-[78vh] overflow-y-auto overflow-x-hidden pr-1 pb-2 scroll-smooth ${toolsOpen ? "" : "[@media(pointer:coarse)]:hidden"}`} style={{ scrollbarWidth: "thin" }}>
          <Link to="/" className="toy-button text-xs !py-2 !px-3">🏡 Về trang chủ</Link>
          <button onClick={handleUndo} disabled={history.length === 0} className={`toy-button !text-xs !py-2 !px-3 ${history.length === 0 ? "opacity-50" : ""}`}>
            ↩️ HOÀN TÁC (Ctrl+Z){history.length > 0 ? ` · ${history.length}` : ""}
          </button>
          <button onClick={() => setShopOpen(true)} className="toy-button toy-button-primary !text-base !py-2 !px-5">🛒 CỬA HÀNG</button>
          <button onClick={openQuestion} className="toy-button toy-button-green !text-sm !py-2 !px-4">❓ KIẾM TIỀN</button>

          {/* Chọn tầng */}
          <div className="glass-card px-2 py-1.5 flex items-center gap-1">
            <span className="text-[10px] font-black text-stone-700 mr-1">TẦNG:</span>
            {Array.from({ length: MAX_FLOOR + 1 }, (_, f) => {
              const accessible = canAccessFloor(f);
              const active = activeFloor === f;
              return (
                <button
                  key={f}
                  onClick={() => tryGoFloor(f)}
                  className={`toy-button !text-[11px] !py-1 !px-2 ${active ? "toy-button-primary !text-[11px] !py-1 !px-2" : ""} ${!accessible && !active ? "opacity-50" : ""}`}
                  title={accessible ? `Lên tầng ${floorLabel(f)}` : `Cần lợp sàn tầng ${f - 1} trước`}
                >
                  {!accessible && !active ? "🔒 " : ""}{floorLabel(f)}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (!meetsWallLevel) {
                flash(`🔒 Cần đạt CẤP ${wallLevelReq} để xây tường ở tầng ${floorLabel(activeFloor)}.`, 2400);
                return;
              }
              if (!canEnterWallMode) {
                flash("Đặt ít nhất 2 cột bê tông trước khi xây tường.");
                return;
              }
              setWallMode((w) => !w);
              setWallPickA(null);
              setRoofMode(false);
              setRoofPicks([]);
              setFloorMode(false);
              setFloorPicks([]);
              setSelected(null);
            }}
            className={`toy-button !text-sm !py-2 !px-4 ${wallMode ? "toy-button-green" : ""} ${!meetsWallLevel ? "opacity-70" : ""}`}
            title={!meetsWallLevel ? `Cần CẤP ${wallLevelReq} để xây tường tầng ${floorLabel(activeFloor)}` : ""}
          >
            {!meetsWallLevel ? `🔒 XÂY TƯỜNG (CẤP ${wallLevelReq})` : wallMode ? "✅ Đang xây tường" : "🧱 XÂY TƯỜNG"}
          </button>
          <button
            onClick={() => {
              if (!canEnterFloorMode) {
                flash("Đặt ít nhất 4 cột bê tông trước khi xây sàn.");
                return;
              }
              setFloorMode((f) => !f);
              setFloorPicks([]);
              setWallMode(false);
              setWallPickA(null);
              setRoofMode(false);
              setRoofPicks([]);
              setSelected(null);
            }}
            className={`toy-button !text-sm !py-2 !px-4 ${floorMode ? "toy-button-green" : ""}`}
          >
            {floorMode ? `✅ Đang xây sàn (${floorPicks.length}/4)` : "🟫 XÂY SÀN"}
          </button>
          <button
            onClick={() => {
              if (!floorOnThisFloor) {
                flash("Phải xây SÀN trước khi lợp mái cho tầng này.", 2500);
                return;
              }
              if (!canEnterRoofMode) {
                flash("Đặt ít nhất 4 cột bê tông trước khi xây mái nhà.");
                return;
              }
              setRoofMode((r) => !r);
              setRoofPicks([]);
              setWallMode(false);
              setWallPickA(null);
              setFloorMode(false);
              setFloorPicks([]);
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
          : (
            <>
              <span className="hidden [@media(pointer:fine)]:inline">🎮 WASD: Di chuyển • SPACE: Nhảy • R: Xoay • Click: Đặt • Chuột phải: Xóa</span>
              <span className="[@media(pointer:fine)]:hidden">🎮 Joystick để di chuyển • Chạm để đặt • Chạm vật để chỉnh</span>
            </>
          )}
      </div>

      {/* Gợi ý đặt cửa */}
      {doorHint && selected === "door" && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-amber-100 border-2 border-amber-400 text-amber-900 px-5 py-2.5 rounded-2xl shadow-lg text-sm font-black pointer-events-none animate-bounce z-50">
          🚪 Hãy bấm vào cửa và xoay về 0°
        </div>
      )}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 text-[11px] italic font-bold text-amber-900/90 bg-amber-50/80 rounded-full pointer-events-none max-w-[92vw] text-center shadow-sm">
        🪙 Hãy đi xung quanh để kiếm thêm thu nhập nhưng hãy cẩn thận bước chân..
      </div>

      {/* HUD: cửa & đèn — góc dưới phải */}
      {(() => {
        // Tính có cửa nào gần nhân vật không (chỉ tầng trệt, cự ly ≤ 2.2m)
        const nearDoor = state.placed.some((p) => {
          if (p.itemId !== "door") return false;
          if ((p.floor ?? 0) !== 0) return false;
          const it = getItem(p.itemId);
          if (!it) return false;
          const swap = p.rotation % 2 === 1;
          const fw = swap ? it.d : it.w;
          const fd = swap ? it.w : it.d;
          const cx = p.x - 10 + fw / 2;
          const cz = p.z - 10 + fd / 2;
          const dx = playerPos.x - cx;
          const dz = playerPos.z - cz;
          return dx * dx + dz * dz < 2.2 * 2.2;
        });
        const hasAnyDoor = state.placed.some((p) => p.itemId === "door");
        return (
          <div className="absolute bottom-3 right-3 sm:bottom-3 [@media(pointer:coarse)]:bottom-28 flex flex-col gap-2 pointer-events-auto z-30">
            {hasAnyDoor && nearDoor && (
              <button
                onClick={() => { setToggles({ doorsOpen: !wt.doorsOpen }); playSfx("place"); }}
                className={`toy-button !text-sm !py-2 !px-4 ${wt.doorsOpen ? "toy-button-green" : "toy-button-primary"}`}
                title="Mở/đóng tất cả cửa nhà cùng lúc"
              >
                {wt.doorsOpen ? "🚪 ĐÓNG CỬA" : "🚪 MỞ CỬA"}
              </button>
            )}
            <button
              onClick={() => { setToggles({ lightsOn: !wt.lightsOn }); playSfx("place"); }}
              className={`toy-button !text-sm !py-2 !px-4 ${wt.lightsOn ? "toy-button-green" : ""}`}
              title="Bật/tắt tất cả đèn"
            >
              {wt.lightsOn ? "💡 TẮT ĐÈN" : "💡 BẬT ĐÈN"}
            </button>
          </div>
        );
      })()}

      {selected && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-card px-4 py-2 flex items-center gap-3 pointer-events-auto">
          <span className="text-2xl">{getItem(selected)?.icon}</span>
          <div className="text-sm font-black">Đang đặt: {getItem(selected)?.name}</div>
          <button onClick={() => setSelected(null)} className="toy-button !text-xs !py-1 !px-3">Hủy</button>
        </div>
      )}

      {/* Panel chỉnh xoay / dịch chuyển item đã đặt */}
      {editingId && state && (() => {
        const ed = state.placed.find((p) => p.id === editingId);
        if (!ed) return null;
        if ((ed.floor ?? 0) !== activeFloor) return null;
        const it = getItem(ed.itemId);
        if (!it) return null;
        const angleDeg = Math.round(((typeof ed.angleRad === "number" ? ed.angleRad : (ed.rotation * Math.PI) / 2) * 180) / Math.PI);
        const normDeg = ((angleDeg % 360) + 360) % 360;
        const setAngle = (deg: number) => {
          const rad = (deg * Math.PI) / 180;
          setState({
            ...state,
            placed: state.placed.map((p) => {
              if (p.id !== editingId) return p;
              // Khi chuyển sang angleRad lần đầu, đổi (x,z) corner → center
              if (typeof p.angleRad !== "number") {
                const swap = p.rotation % 2 === 1;
                const fw = swap ? it.d : it.w;
                const fd = swap ? it.w : it.d;
                return { ...p, angleRad: rad, rotation: 0, x: p.x + fw / 2, z: p.z + fd / 2 };
              }
              return { ...p, angleRad: rad };
            }),
          });
        };
        const nudge = (dx: number, dz: number) => {
          setState({
            ...state,
            placed: state.placed.map((p) => {
              if (p.id !== editingId) return p;
              if (typeof p.angleRad !== "number") {
                const swap = p.rotation % 2 === 1;
                const fw = swap ? it.d : it.w;
                const fd = swap ? it.w : it.d;
                return {
                  ...p,
                  angleRad: (p.rotation * Math.PI) / 2,
                  rotation: 0,
                  x: Math.max(0, Math.min(20, p.x + fw / 2 + dx)),
                  z: Math.max(0, Math.min(20, p.z + fd / 2 + dz)),
                };
              }
              return { ...p, x: Math.max(0, Math.min(20, p.x + dx)), z: Math.max(0, Math.min(20, p.z + dz)) };
            }),
          });
        };
        return (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-card px-4 py-3 pointer-events-auto z-40 min-w-[280px] max-w-[92vw]">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-2xl">{it.icon}</span>
              <div className="text-sm font-black flex-1 min-w-0 truncate">Chỉnh: {it.name}</div>
              <button
                onClick={() => { handleRemove(editingId); setEditingId(null); setMoveMode(false); flash("🗑 Đã xoá vật"); }}
                className="toy-button !text-xs !py-1 !px-3 bg-rose-500 text-white"
                title="Xoá vật phẩm và hoàn tiền"
              >🗑 Xoá</button>
              <button onClick={() => { setEditingId(null); setMoveMode(false); }} className="toy-button !text-xs !py-1 !px-3">Xong</button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold w-12">Xoay:</span>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={normDeg}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-xs font-black w-12 text-right">{normDeg}°</span>
            </div>
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              <button onClick={() => setAngle(normDeg - 15)} className="toy-button !text-xs !py-1 !px-2">↺ -15°</button>
              <button onClick={() => setAngle(normDeg - 1)} className="toy-button !text-xs !py-1 !px-2">-1°</button>
              <button onClick={() => setAngle(normDeg + 1)} className="toy-button !text-xs !py-1 !px-2">+1°</button>
              <button onClick={() => setAngle(normDeg + 15)} className="toy-button !text-xs !py-1 !px-2">+15° ↻</button>
              <button onClick={() => setAngle(0)} className="toy-button !text-xs !py-1 !px-2">0°</button>
              <button onClick={() => setAngle(90)} className="toy-button !text-xs !py-1 !px-2">90°</button>
              <button onClick={() => setAngle(180)} className="toy-button !text-xs !py-1 !px-2">180°</button>
              <button onClick={() => setAngle(270)} className="toy-button !text-xs !py-1 !px-2">270°</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold w-12">Dịch:</span>
              <div className="grid grid-cols-3 gap-1">
                <span />
                <button onClick={() => nudge(0, -0.5)} className="toy-button !text-xs !py-1 !px-2">↑</button>
                <span />
                <button onClick={() => nudge(-0.5, 0)} className="toy-button !text-xs !py-1 !px-2">←</button>
                <button onClick={() => setMoveMode((m) => !m)} className={`toy-button !text-xs !py-1 !px-2 ${moveMode ? "toy-button-green" : ""}`}>📍</button>
                <button onClick={() => nudge(0.5, 0)} className="toy-button !text-xs !py-1 !px-2">→</button>
                <span />
                <button onClick={() => nudge(0, 0.5)} className="toy-button !text-xs !py-1 !px-2">↓</button>
                <span />
              </div>
              <div className="text-[10px] font-bold text-stone-600 flex-1">
                {moveMode ? "🟢 Click ô mới trên mảnh đất để dời vật tới đó" : "Bấm 📍 rồi click ô trong mảnh để dời, hoặc dùng mũi tên (0.5m)"}
              </div>
            </div>
          </div>
        );
      })()}


      {toast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 glass-card px-5 py-3 font-black text-base animate-bounce pointer-events-none z-40">
          {toast}
        </div>
      )}

      {/* Shop */}
      {shopOpen && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-2 md:p-4" onClick={() => setShopOpen(false)}>
          <div className="glass-card max-w-3xl w-full max-h-[92vh] md:max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-2 md:p-4 border-b-2 border-white/50 flex items-center justify-between gap-2">
              <h2 className="text-lg md:text-2xl font-black">🛒 CỬA HÀNG</h2>
              <div className="font-bold text-yellow-700 text-xs md:text-base">💰 {state.money}đ</div>
              <button onClick={() => setShopOpen(false)} className="toy-button !text-xs !py-1 !px-3">Đóng</button>
            </div>
            <div className="flex flex-wrap gap-1 md:gap-2 p-2 md:p-3 border-b-2 border-white/50">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`toy-button !text-[10px] md:!text-xs !py-1 md:!py-2 !px-2 md:!px-3 ${activeCat === c ? "toy-button-primary !text-[10px] md:!text-xs !py-1 md:!py-2 !px-2 md:!px-3" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
            {activeCat === "Vật liệu" && (
              <div className="px-3 md:px-4 pt-2 md:pt-3 text-[10px] md:text-[11px] font-bold text-stone-700">
                💡 Đặt CỘT BÊ TÔNG trước. Mua GẠCH + BÊ TÔNG, rồi bấm
                {" "}<span className="text-orange-700">🧱 XÂY TƯỜNG</span> (10 gạch + 1 bê tông / 1m×5m).
              </div>
            )}
            <div className="p-2 md:p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2 md:gap-3" style={{ scrollbarWidth: "thin" }}>
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
                  <div key={it.id} className="relative rounded-2xl md:rounded-3xl p-2 md:p-3 text-center border-2 border-amber-200" style={{
                    background: "radial-gradient(circle at 30% 20%, #fffaf0 0%, #ffe8b8 55%, #f7c573 100%)",
                    boxShadow: "0 8px 16px -8px rgba(180,120,0,0.45), inset 0 -4px 0 rgba(0,0,0,0.07), inset 0 3px 0 rgba(255,255,255,0.6)",
                  }}>
                    <div className="mx-auto w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center text-2xl md:text-3xl mb-1" style={{
                      background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #fff3c8 50%, #f0b94f 100%)",
                      boxShadow: "inset 0 -4px 8px rgba(120,60,0,0.25), 0 4px 8px rgba(0,0,0,0.1)",
                    }}>{it.icon}</div>
                    <div className="font-black text-[11px] md:text-sm mt-1 line-clamp-1">{it.name}</div>
                    <div className="text-[9px] md:text-[10px] text-amber-900/70 font-bold">{it.w}×{it.d}</div>
                    <div className="inline-block px-2 py-0.5 mt-1 rounded-full bg-amber-900 text-amber-100 text-[10px] md:text-xs font-black">💰 {it.price}đ</div>
                    <button onClick={() => buyAndSelect(it.id)} disabled={!canAfford}
                      className={`toy-button !text-[10px] md:!text-xs !py-1 !px-2 md:!px-3 mt-2 w-full ${canAfford ? `toy-button-primary !text-[10px] md:!text-xs !py-1 !px-2 md:!px-3` : "opacity-50"}`}>
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
      {question && (
        <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-3 md:p-6">
          <div className="glass-card max-w-2xl w-full p-5 md:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="text-xs md:text-sm font-bold text-orange-700">
                ❓ Trả lời đúng để +{question.reward}đ
              </div>
              <button onClick={closeQuestion} className="toy-button !text-xs !py-1 !px-3 shrink-0">✖ Thoát</button>
            </div>
            <QuestionView question={question} onAnswer={handleAnswer} disabled={!!questionResult} />
            {questionResult && (
              <div className="mt-4 text-center font-black text-xl md:text-2xl">{questionResult}</div>
            )}
          </div>
        </div>
      )}

      {/* Boom modal — BẮT BUỘC trả lời đúng mới biến mất. Sai → câu mới. */}
      {boom && (
        <div className="absolute inset-0 bg-black/70 z-40 flex items-center justify-center p-3 md:p-6">
          <div className="glass-card max-w-2xl w-full p-5 md:p-7 max-h-[90vh] overflow-y-auto border-4 border-red-500">
            <div className="mb-3">
              <div className="text-base md:text-lg font-black text-red-700 animate-pulse">
                💣 BẠN ĐÃ ĐẠP TRÚNG BOOM! Phải trả lời ĐÚNG để thoát (✅ +10đ • ❌ −5đ){boom.tries > 0 ? ` • Lần ${boom.tries + 1}` : ""}
              </div>
            </div>
            <QuestionView question={boom.q} onAnswer={handleBoomAnswer} disabled={!!boomResult} />
            {boomResult && (
              <div className="mt-4 text-center font-black text-xl md:text-2xl">{boomResult}</div>
            )}
          </div>
        </div>
      )}
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

const RAINDROPS = Array.from({ length: 60 }).map((_, i) => ({
  left: `${(i * 137.5) % 100}%`,
  top: `-${(i * 71.3) % 20}%`,
  delay: `${(i * 0.113) % 0.7}s`,
  dur: `${0.5 + (i * 0.017) % 0.4}s`,
}));

function WeatherOverlay({ powers }: { powers: number[] }) {
  const rain = powers.includes(1);
  const tornado = powers.includes(2);
  const sun = powers.includes(3);
  if (!rain && !tornado && !sun) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {sun && (
        <div className="absolute top-6 right-10 w-28 h-28 rounded-full bg-yellow-300 shadow-[0_0_60px_20px_rgba(253,224,71,0.6)] animate-[sunPulse_3s_ease-in-out_infinite] z-10" />
      )}
      {rain && (
        <div className="absolute inset-0 z-20">
          {RAINDROPS.map((d, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-5 bg-blue-200/70 rounded-full animate-[rainFall_0.7s_linear_infinite]"
              style={{
                left: d.left,
                top: d.top,
                animationDelay: d.delay,
                animationDuration: d.dur,
              }}
            />
          ))}
        </div>
      )}
      {tornado && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 animate-[tornadoSpin_2s_linear_infinite]">
          <div className="text-7xl opacity-80">🌪️</div>
        </div>
      )}
      <style>{`
        @keyframes rainFall { to { transform: translateY(120vh); } }
        @keyframes sunPulse { 0%,100% { opacity: 0.8; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.08); } }
        @keyframes tornadoSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
