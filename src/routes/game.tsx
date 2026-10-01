import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import houseAvatar from "@/assets/house-avatar.png.asset.json";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import RouteLoading from "@/components/RouteLoading";
import { getCurrentUser, hydrateFromSession, recordLoginDay, type Account } from "@/lib/auth";
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
import { CATALOG, CATEGORIES, getItem, catalogLabel, canStackOn, isFlatMat, STACK_SURFACES, STACK_TOPPERS, surfaceTopY } from "@/game/catalog";
import { isDoorItem, isWindowItem } from "@/game/catalog";
import { ItemThumb, ThumbnailBaker, matchItem } from "@/game/ItemThumbs";
import { randomQuestion, type Question, loadQuestionsFromDB, hasLoadedQuestions, gradeAnswer, reportAnswerResult } from "@/game/questions";
import { QuestionView } from "@/game/QuestionView";

const GameWorld = lazy(() => import("@/game/GameWorld"));
import LoadingPercent from "@/components/LoadingPercent";
import { WorldLoadingOverlay } from "@/game/WorldLoadingOverlay";
import { getActivePowerIds } from "@/lib/powers";
import { useWorldToggles, setToggles } from "@/lib/world-toggles";
import { setBgm, playSfx, startLoopSfx, stopLoopSfx } from "@/lib/audio";
import { loadPickupConfig, resolvePickups, loadCollected, saveCollected, type Pickup } from "@/lib/worldPickups";
import { TouchControls } from "@/game/TouchControls";
import { loadSignLabels, saveSignLabels, SIGN_LABEL_MAX, type SignLabelMap } from "@/lib/sign-labels";
import { listFriendHouses, getUsername, setPresence, type FriendHouse } from "@/lib/friend-houses.functions";
import { DuelController } from "@/components/DuelController";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLocale } from "@/lib/locale";
import { mixPaint, isWhite, colorName } from "@/lib/paint-mix";
import { PaintBucketIcon } from "@/components/PaintBucketIcon";
import { Button } from "@/components/ui/button";
import { HouseAccessSettings } from "@/components/HouseAccessSettings";
import { RIVER_BOARD_POSITION, RIVER_NEAR_BANK_Z, riverPoseState, type ReleasedLantern } from "@/game/HoiAnRiver";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Khu phố Hội An — VỆ BINH SỐ" },
      { name: "description", content: "Khám phá khu phố Hội An, xây nhà và tham gia thử thách thả hoa đăng." },
      { property: "og:title", content: "Khu phố Hội An — VỆ BINH SỐ" },
      { property: "og:description", content: "Khám phá khu phố Hội An, xây nhà và tham gia thử thách thả hoa đăng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GamePage,
});


function GamePage() {
  const en = useLocale() === "en";
  const navigate = useNavigate();
  const [user, setUser] = useState<Account | null>(null);
  const [state, setState] = useState<GameState | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [houseAccessOpen, setHouseAccessOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<typeof CATEGORIES[number]>("Vật liệu");
  const [shopQuery, setShopQuery] = useState("");
  const [buyQty, setBuyQty] = useState<Record<string, number>>({});
  const [placeQueue, setPlaceQueue] = useState<number>(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionResult, setQuestionResult] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activePowers, setActivePowers] = useState<number[]>([]);
  const [questionsReady, setQuestionsReady] = useState(hasLoadedQuestions());
  const wt = useWorldToggles();
  // Chỉ lưu KẾT QUẢ ở gần (cửa/đèn) thay vì toạ độ → nhân vật di chuyển không làm cả trang render lại
  const [nearby, setNearby] = useState<{ doorId: string | null; lamp: boolean; riverBoard: boolean; riverBank: boolean }>({ doorId: null, lamp: false, riverBoard: false, riverBank: false });
  const playerPosRef = useRef({ x: 0, z: 0 });
  const placedRef = useRef<PlacedItem[]>([]);
  placedRef.current = state?.placed ?? [];
  const handlePlayerPos = useCallback((px: number, pz: number) => {
    playerPosRef.current = { x: px, z: pz };
    const placed = placedRef.current;
    let nearest: { id: string; d2: number } | null = null;
    let lamp = false;
    for (const p of placed) {
      if (isDoorItem(p.itemId) && (p.floor ?? 0) === 0) {
        const it = getItem(p.itemId);
        if (!it) continue;
        const swap = p.rotation % 2 === 1;
        const fw = swap ? it.d : it.w;
        const fd = swap ? it.w : it.d;
        const hasAngle = typeof p.angleRad === "number";
        const cx = hasAngle ? p.x - 10 : p.x - 10 + fw / 2;
        const cz = hasAngle ? p.z - 10 : p.z - 10 + fd / 2;
        const d2 = (px - cx) ** 2 + (pz - cz) ** 2;
        if (d2 < 2.5 * 2.5 && (!nearest || d2 < nearest.d2)) nearest = { id: p.id, d2 };
      } else if (!lamp && (p.itemId === "lamp" || p.itemId === "gardenlamp")) {
        const d2 = (px - (p.x - 10 + 0.5)) ** 2 + (pz - (p.z - 10 + 0.5)) ** 2;
        if (d2 < 9) lamp = true;
      }
    }
    const doorId = nearest?.id ?? null;
    const riverBoard = Math.hypot(px - RIVER_BOARD_POSITION[0], pz - RIVER_BOARD_POSITION[1]) <= 6;
    const riverBank = pz <= RIVER_NEAR_BANK_Z + 7;
    setNearby((prev) => (prev.doorId === doorId && prev.lamp === lamp && prev.riverBoard === riverBoard && prev.riverBank === riverBank ? prev : { doorId, lamp, riverBoard, riverBank }));
  }, []);
  const listFriendsFn = useServerFn(listFriendHouses);
  const friendHousesQ = useQuery({
    queryKey: ["friend-houses"],
    queryFn: () => listFriendsFn(),
    enabled: !!user,
    refetchInterval: 20_000,
    staleTime: 15_000,
  });

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
  const [paintColor, setPaintColor] = useState<string | null>(null);
  const [mixNote, setMixNote] = useState<string | null>(null);

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
  const [riverQuiz, setRiverQuiz] = useState<null | { question: Question; number: number; correct: number }>(null);
  const [riverQuizResult, setRiverQuizResult] = useState<string | null>(null);
  const [lanternCount, setLanternCount] = useState(0);
  const [releasedLanterns, setReleasedLanterns] = useState<ReleasedLantern[]>([]);
  const [pendingLantern, setPendingLantern] = useState<{ x: number; z: number } | null>(null);
  const [wishText, setWishText] = useState("");

  // Chỉnh sửa item đã đặt: xoay tự do 360° + dịch chuyển trong tầng hiện tại
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  const [ceilingMount, setCeilingMount] = useState(false);
  const [viewMode, setViewMode] = useState<"free" | "top" | "front" | "wide">("free");
  const [playMode, setPlayMode] = useState<"overview" | "edit" | "view">("overview");
  const [exploreView, setExploreView] = useState<"eye" | "free" | "top" | "front" | "wide">("eye");
  const enterViewMode = () => {
    setPlayMode("view"); setSelected(null); setShopOpen(false);
    setWallMode(false); setFloorMode(false); setRoofMode(false); setPaintColor(null);
  };
  // Gợi ý khi mua cửa: hiện lên để nhắc người chơi xoay về 0°
  const [doorHint, setDoorHint] = useState(false);
  const [thaoTacOpen, setThaoTacOpen] = useState(false);
  const [thucHienOpen, setThucHienOpen] = useState(false);
  // Nhãn bảng tên nhà — lưu localStorage theo user
  const [signLabels, setSignLabels] = useState<SignLabelMap>({});
  // id biển tên đang được sửa text (mở modal)
  const [signEditId, setSignEditId] = useState<string | null>(null);
  const [visitConfirm, setVisitConfirm] = useState<{ ownerId: string; name: string } | null>(null);
  const [signDraft, setSignDraft] = useState("");

  const readyRef = useRef(false);
  useEffect(() => {
    setMounted(true);
    const laptopLayout = window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
    if (laptopLayout) {
      setThaoTacOpen(true);
      setThucHienOpen(true);
    }
    const u = getCurrentUser();
    if (!u) {
      // Máy mới / chưa có bộ nhớ đệm: thử khôi phục phiên đăng nhập trước khi chuyển sang trang đăng nhập.
      hydrateFromSession().then((acc) => {
        if (acc) window.location.reload();
        else navigate({ to: "/login" });
      }).catch(() => navigate({ to: "/login" }));
      return;
    }
    setUser(u);
    const lanternKey = `vebinhso_river_lanterns_${u.id}`;
    const releasedKey = `vebinhso_released_lanterns_${u.id}`;
    setLanternCount(Math.max(0, Number(window.localStorage.getItem(lanternKey) ?? 0) || 0));
    try {
      const stored = JSON.parse(window.localStorage.getItem(releasedKey) ?? "[]");
      if (Array.isArray(stored)) setReleasedLanterns(stored.slice(-40));
    } catch { setReleasedLanterns([]); }
    try { recordLoginDay(u.id); } catch {}
    setState(loadGame());
    // Khi cache đã được refresh từ DB, đồng bộ lại state React
    const onGameChange = () => {
      readyRef.current = true;
      setState({ ...loadGame() });
    };
    window.addEventListener("game-change", onGameChange);
    // Fallback: cho phép ghi lại sau 1.5s nếu DB không phản hồi
    const t = setTimeout(() => { readyRef.current = true; }, 800);
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
    return () => {
      window.removeEventListener("game-change", onGameChange);
      clearTimeout(t);
    };
  }, [navigate]);

  useEffect(() => {
    if (state && readyRef.current) saveGame(state);
  }, [state]);

  // Toast khi có ai đó vào thăm nhà mình
  const getUsernameFn = useServerFn(getUsername);
  useEffect(() => {
    if (!user) return;
    const seen = new Set<string>();
    const channel = supabase
      .channel(`visitors:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presence" },
        async (payload: any) => {
          const row = (payload.new ?? payload.old) as { user_id?: string; in_house_owner?: string | null } | null;
          if (!row) return;
          if (row.user_id === user.id) return;
          if (row.in_house_owner !== user.id) {
            seen.delete(row.user_id ?? "");
            return;
          }
          if (seen.has(row.user_id ?? "")) return;
          seen.add(row.user_id ?? "");
          try {
            const info = await getUsernameFn({ data: { userId: row.user_id! } });
            const name = info?.display_name || info?.username || (en ? "Someone" : "Một ai đó");
            setToast(en ? `👋 ${name} is visiting your home!` : `👋 ${name} đang tham quan nhà bạn!`);
            setTimeout(() => setToast(null), 3500);
          } catch { /* noop */ }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, getUsernameFn]);

  // Announce presence: I'm inside my own house (enables duel matchmaking).
  const setPresenceFn = useServerFn(setPresence);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const call = async (payload: { online?: boolean; in_house_owner?: string | null }) => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled || !data.session?.access_token) return;
        await setPresenceFn({ data: payload });
      } catch { /* ignore */ }
    };
    call({ online: true, in_house_owner: user.id });
    const beat = setInterval(() => { call({ online: true, in_house_owner: user.id }); }, 30_000);
    const clear = () => { call({ in_house_owner: null }); };
    window.addEventListener("beforeunload", clear);
    return () => {
      cancelled = true;
      clearInterval(beat);
      window.removeEventListener("beforeunload", clear);
      clear();
    };
  }, [user, setPresenceFn]);


  // Tắt gợi ý cửa khi người chơi chọn item khác hoặc đổi mode
  useEffect(() => {
    if (!isDoorItem(selected)) setDoorHint(false);
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
        flash(en ? "↩️ Nothing to undo" : "↩️ Không có gì để hoàn tác");
        return h;
      }
      const prev = h[h.length - 1];
      isUndoingRef.current = true;
      setState(prev);
      flash(en ? "↩️ Undone" : "↩️ Đã hoàn tác");
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

  // Ghi chú pha màu: tự ẩn sau vài giây (không cần bấm OK).
  const toastTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!mixNote) return;
    const t = window.setTimeout(() => setMixNote(null), 6000);
    return () => clearTimeout(t);
  }, [mixNote]);

  if (!mounted || !user || !state) return <RouteLoading />;


  const level = computeLevel(state);
  const lvlInfo = nextLevelInfo(state);

  const flash = (msg: string, ms = 1800) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  const buyAndSelect = (itemId: string, bulkTimes: number = 1) => {
    const it = getItem(itemId);
    if (!it || !state) return;
    const times = Math.max(1, Math.floor(bulkTimes));
    const totalPrice = it.price * times;
    if (state.money < totalPrice) {
      flash(en ? "❌ Not enough coins! Answer questions to earn more." : "❌ Không đủ tiền! Trả lời câu hỏi để kiếm thêm.");
      return;
    }
    const kind = it.kind ?? "place";
    if (kind === "brick") {
      const add = (it.qty ?? 10) * times;
      setState({ ...state, money: state.money - totalPrice, bricks: state.bricks + add });
      playSfx("purchase", { duck: true });
      flash(en ? `🧱 +${add} bricks added to inventory` : `🧱 +${add} viên gạch vào kho`);
      return;
    }
    if (kind === "concrete") {
      const add = (it.qty ?? 1) * times;
      setState({ ...state, money: state.money - totalPrice, concrete: state.concrete + add });
      playSfx("purchase", { duck: true });
      flash(en ? `🪣 +${add} buckets of concrete added to inventory` : `🪣 +${add} xô bê tông tươi vào kho`);
      return;
    }
    if (kind === "rooftile") {
      const qty = (it.qty ?? 10) * times;
      const style = it.roofStyle ?? "tile";
      setState({
        ...state,
        money: state.money - totalPrice,
        roofTiles: style === "tile" ? state.roofTiles + qty : state.roofTiles,
        roofTilesTon: style === "ton" ? state.roofTilesTon + qty : state.roofTilesTon,
      });
      playSfx("purchase", { duck: true });
      flash(en ? `🏠 +${qty} ${style === "ton" ? "metal" : "tile"} roof pieces added to inventory` : `🏠 +${qty} gạch mái ${style === "ton" ? "tôn" : "ngói"} vào kho`);
      return;
    }
    if (kind === "paint") {
      const add = (it.qty ?? 1) * times;
      setState({ ...state, money: state.money - totalPrice, paint: state.paint + add });
      playSfx("purchase", { duck: true });
      flash(en ? `🎨 +${add} paint buckets added — use them to match floors to the wall color` : `🎨 +${add} xô sơn vào kho — dùng để nhuộm sàn theo màu tường`);
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
    if (isWindowItem(it.id) && state.walls.length === 0) {
      flash(en ? "⚠️ Build a wall before attaching a window." : "⚠️ Hãy xây tường trước, rồi mới gắn cửa sổ.");
      return;
    }
    if (isDoorItem(it.id)) setDoorHint(true);
    // Đang xây tường/sàn → nhắc hoàn thiện hoặc thoát trước khi đặt vật
    if (wallMode || floorMode) {
      flash(
        en
          ? `⚠️ You are ${wallMode ? "building a wall" : "building a floor"} — finish it or press ✖ to exit before placing items.`
          : `⚠️ Bạn đang ${wallMode ? "xây tường" : "xây sàn"} — hãy hoàn thiện hoặc bấm ✖ để thoát trước khi đặt vật.`,
      );
      return;
    }
    setSelected(itemId);
    setPlaceQueue(times > 1 ? times : 0);
    if (times > 1) flash(en ? `🛒 Purchased ${times} × ${catalogLabel(it.name, true)} — tap the ground to place each item.` : `🛒 Đã mua ${times} × ${it.name} — bấm vào đất để đặt lần lượt.`);
    setShopOpen(false);
  };

  const handleWallPlace = (wallId: string, px: number, py: number, pz: number) => {
    const it = selected ? getItem(selected) : null;
    if (!it || !state) return;
    if (wallMode || floorMode) return;
    const w = state.walls.find((ww) => ww.id === wallId);
    if (!w) return;
    if (state.money < it.price) { flash(en ? "❌ Not enough coins." : "❌ Không đủ xu."); return; }
    const cx0 = px - 10, cz0 = pz - 10;
    const dx = w.bx - w.ax, dz = w.bz - w.az;
    const len2 = dx * dx + dz * dz;
    if (len2 === 0) return;
    const len = Math.sqrt(len2);
    let t = ((cx0 - w.ax) * dx + (cz0 - w.az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = w.ax + t * dx, qz = w.az + t * dz;
    // Pháp tuyến hướng về phía người bấm
    let nx = dz / len, nz = -dx / len;
    if ((cx0 - qx) * nx + (cz0 - qz) * nz < 0) { nx = -nx; nz = -nz; }
    const off = 0.125 + it.d / 2 + 0.01;
    const base = (w.floor ?? 0) * WALL_HEIGHT;
    const y = Math.max(0, Math.min(WALL_HEIGHT - it.h, py - base - it.h / 2));
    const item: PlacedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      itemId: it.id,
      x: qx + nx * off + 10,
      z: qz + nz * off + 10,
      rotation: 0,
      floor: w.floor ?? 0,
      angleRad: Math.atan2(nx, nz),
      ...(y > 0 ? { stackY: y } : {}),
    };
    setState({ ...state, money: state.money - it.price, netWorth: state.netWorth + it.price, placed: [...state.placed, item] });
    playSfx("place");
    if (placeQueue > 0) {
      const remain = placeQueue - 1;
      setPlaceQueue(remain);
      if (remain <= 0) setSelected(null);
    }
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
    if (isWindowItem(it.id) || isDoorItem(it.id)) {
      if (state.walls.length === 0) {
        flash(isDoorItem(it.id) ? (en ? "🚪 Build a wall before attaching a door." : "🚪 Hãy xây tường trước, rồi mới gắn cửa.") : (en ? "🪟 Build a wall before attaching a window." : "🪟 Hãy xây tường trước, rồi mới gắn cửa sổ."));
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
        const margin = isDoorItem(it.id) ? 0.5 / len : 0;
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
        flash(isDoorItem(it.id) ? (en ? "🚪 Place the door directly on a wall." : "🚪 Đặt cửa ngay trên 1 đoạn tường nhé.") : (en ? "🪟 Place the window directly on a wall." : "🪟 Đặt cửa sổ ngay trên 1 đoạn tường nhé."));
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
      if (placeQueue > 0) {
        const remain = placeQueue - 1;
        setPlaceQueue(remain);
        if (remain <= 0) setSelected(null);
      }
      return;
    }

    // Tìm các item bị chồng lấn footprint
    const overlaps = state.placed.filter((p) => {
      if ((p.floor ?? 0) !== activeFloor) return false;
      const pi = getItem(p.itemId);
      if (!pi) return false;
      if (isRoof(pi.id) || isRoof(it.id)) return false;
      if (isWindowItem(pi.id) || isWindowItem(it.id)) return false;
      // Thảm / bãi cỏ / gạch lát: cho phép đặt vật khác lên trên cùng vị trí
      if (isFlatMat(pi.id) || isFlatMat(it.id)) return false;
      const ps = p.rotation % 2 === 1;
      const pw = ps ? pi.d : pi.w;
      const pd = ps ? pi.w : pi.d;
      return !(x + fw <= p.x || p.x + pw <= x || z + fd <= p.z || p.z + pd <= z);
    });

    // Tính stackY: nếu item là topper và TẤT CẢ item bị chồng lên đều là surface
    // (và topper nằm gọn trong footprint surface), cho phép đặt lên nóc surface cao nhất.
    let stackY = 0;
    if (ceilingMount) {
      stackY = Math.max(0, WALL_HEIGHT - it.h - 0.02);
    } else if (overlaps.length > 0) {
      const allSurfaces = overlaps.every((p) => {
        const pi = getItem(p.itemId);
        if (!pi || !STACK_SURFACES.has(pi.id) || !canStackOn(it.id, pi.id)) return false;
        const ps = p.rotation % 2 === 1;
        const pw = ps ? pi.d : pi.w;
        const pd = ps ? pi.w : pi.d;
        // topper phải nằm hoàn toàn trong footprint surface
        return x >= p.x && z >= p.z && x + fw <= p.x + pw && z + fd <= p.z + pd;
      });
      if (!allSurfaces) {
        // Đặt chồng lên vật cao nhất bên dưới
        stackY = Math.max(...overlaps.map((p) => (p.stackY ?? 0) + (getItem(p.itemId)?.h ?? 0)));
        if (stackY + it.h > WALL_HEIGHT * 1.6) { flash(en ? "⚠️ Stack is too high." : "⚠️ Chồng quá cao rồi."); return; }
      } else stackY = Math.max(
        ...overlaps.map((p) => {
          return (p.stackY ?? 0) + surfaceTopY(p.itemId);
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
    if (placeQueue > 0) {
      const remain = placeQueue - 1;
      setPlaceQueue(remain);
      if (remain <= 0) setSelected(null);
    }
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
    flash(en ? "🧹 Wall removed" : "🧹 Đã gỡ tường");
  };

  const removeRoof = (id: string) => {
    const r = state.roofs.find((x) => x.id === id);
    const refundNW = r?.value ?? 0;
    setState({
      ...state,
      roofs: state.roofs.filter((x) => x.id !== id),
      netWorth: Math.max(0, state.netWorth - refundNW),
    });
    flash(en ? "🧹 Roof removed" : "🧹 Đã gỡ mái nhà");
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
        flash(en ? `Selected ${next.length}/4 pillars for the floor.` : `Đã chọn ${next.length}/4 cột trụ cho sàn.`);
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
        flash(en ? `❌ Not enough concrete! Need ${tilesNeeded} buckets (${state.concrete} available).` : `❌ Thiếu bê tông! Cần ${tilesNeeded} xô (đang có ${state.concrete}).`, 3000);
        setFloorPicks([]);
        return;
      }
      const value = tilesNeeded * 4;
      const paintUsed = Math.min(tilesNeeded, state.paint);
      const painted = paintUsed >= tilesNeeded;
      const seg: FloorSegment = {
        id: `f-${Date.now()}`, ax, az, bx, bz, value, floor: activeFloor,
        ...(painted ? { color: state.wallColor } : {}),
      };
      setState({
        ...state,
        concrete: state.concrete - tilesNeeded,
        paint: state.paint - paintUsed,
        floors: [...state.floors, seg],
        netWorth: state.netWorth + value,
      });
      setFloorPicks([]);
      flash(
        painted
          ? (en ? `🎨 Built a ${w}m × ${d}m floor — used ${tilesNeeded} concrete + ${tilesNeeded} paint buckets (${state.wallColor}).` : `🎨 Xây sàn ${w}m × ${d}m — tốn ${tilesNeeded} xô bê tông + ${tilesNeeded} xô sơn (màu ${state.wallColor}).`)
          : (en ? `🟫 Built a ${w}m × ${d}m floor — used ${tilesNeeded} concrete buckets.${state.paint > 0 ? ` (Not enough paint: need ${tilesNeeded}, ${state.paint} available)` : ""}` : `🟫 Xây sàn ${w}m × ${d}m — tốn ${tilesNeeded} xô bê tông.${state.paint > 0 ? ` (Thiếu sơn: cần ${tilesNeeded}, đang có ${state.paint})` : ""}`),
        2800,
      );
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
        flash(en ? `Selected ${next.length}/4 main pillars for the roof.` : `Đã chọn ${next.length}/4 cột trụ chính cho mái nhà.`);
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
        flash(en ? `❌ Not enough ${roofStyle === "ton" ? "metal" : "tile"} roofing! Need ${tilesNeeded} (${inv} available).` : `❌ Thiếu gạch mái ${roofStyle === "ton" ? "tôn" : "ngói"}! Cần ${tilesNeeded} (đang có ${inv}).`, 3000);
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
      flash(en ? `🏠 Built a ${w}m × ${d}m roof — used ${tilesNeeded} roof pieces.` : `🏠 Xây mái nhà ${w}m × ${d}m — tốn ${tilesNeeded} gạch mái.`, 2500);
      return;
    }
    if (!wallMode) return;
    if (!wallPickA) {
      setWallPickA(placedId);
      flash(en ? "Pillar A selected — select pillar B to build." : "Đã chọn cột A — chọn cột B để xây.");
      return;
    }
    if (wallPickA === placedId) {
      setWallPickA(null);
      flash(en ? "Pillar A selection cleared" : "Đã huỷ chọn cột A");
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
      flash(en ? `❌ Not enough materials! Need ${cost.bricks} bricks + ${cost.concrete} concrete buckets (${state.bricks}/${state.concrete} available).` : `❌ Thiếu vật liệu! Cần ${cost.bricks} gạch + ${cost.concrete} xô bê tông (đang có ${state.bricks}/${state.concrete}).`, 3000);
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
    flash(en ? `🧱 Built a ${cost.length}m × ${WALL_HEIGHT}m wall — used ${cost.bricks} bricks + ${cost.concrete} concrete.` : `🧱 Xây tường ${cost.length}m × ${WALL_HEIGHT}m — tốn ${cost.bricks} gạch + ${cost.concrete} bê tông.`, 2500);
  };

  const pickPaletteColor = (hex: string) => {
    setPaintColor(hex);
    setPaletteOpen(false);
    flash(en ? `🪣 Bucket filled (${colorName(hex, en)}) — click a wall to pour it (30 coins per pour)` : `🪣 Đã chọn xô màu ${colorName(hex, en)} — bấm vào tường để đổ (30 xu mỗi lần đổ)`, 2500);
  };

  const PAINT_POUR_COST = 30;

  const paintWall = (id: string) => {
    if (!paintColor) return;
    if (state.money < PAINT_POUR_COST) {
      flash(en ? `❌ Not enough coins — each pour costs ${PAINT_POUR_COST} coins` : `❌ Không đủ xu — mỗi lần đổ tốn ${PAINT_POUR_COST} xu`, 2500);
      return;
    }
    const w = state.walls.find((x) => x.id === id);
    if (!w) return;
    const white = isWhite(paintColor);
    const base = w.painted ? w.color : null;
    let next = paintColor;
    let note: string | null = null;
    if (base && !white && base.toLowerCase() !== paintColor.toLowerCase()) {
      next = mixPaint(base, paintColor);
      const a = colorName(base, en), b = colorName(paintColor, en), c = colorName(next, en);
      note = en
        ? `${a} + ${b} = ${c}. If you want ${b}, use white first to return the wall to its original state, then try again.`
        : `${a} + ${b} ra ${c}. Nếu bạn muốn màu ${b}, hãy sử dụng màu trắng để trở lại trạng thái ban đầu và thử lại.`;
    }
    setState({
      ...state,
      money: state.money - PAINT_POUR_COST,
      walls: state.walls.map((x) => x.id === id
        ? (white ? { ...x, color: "#f5e6c8", painted: false } : { ...x, color: next, painted: true })
        : x),
    });
    if (note) setMixNote(note);
    else flash(white
      ? (en ? "⚪ Wall returned to its original color" : "⚪ Tường đã trở lại trạng thái ban đầu")
      : (en ? `🎨 Wall painted ${colorName(next, en)}` : `🎨 Đã tô tường màu ${colorName(next, en)}`));
  };

  const openQuestion = async () => {
    if (!questionsReady) {
      flash(en ? "⏳ Loading questions..." : "⏳ Đang tải câu hỏi từ ngân hàng...");
      try { await loadQuestionsFromDB("rural"); setQuestionsReady(true); } catch {}
    }
    const q = randomQuestion();
    if (!q || !q.q) { flash(en ? "⚠️ No questions are available yet." : "⚠️ Chưa có câu hỏi trong ngân hàng admin.", 2000); return; }
    setQuestion(q);
    setQuestionResult(null);
  };
  const closeQuestion = () => {
    setQuestion(null);
    setQuestionResult(null);
  };
  const handleAnswer = async (picked: number[]) => {
    if (!question || questionResult) return;
    const sel = picked[0] ?? -1;
    const graded = await gradeAnswer(question, sel);
    const correctSet = graded.correctIndexes.length > 0 ? graded.correctIndexes : [];
    // For multi-select we grade the first pick; multi-answer questions are rare in this project.
    const ok = graded.isCorrect && picked.length === correctSet.length &&
      [...correctSet].sort().join(",") === [...picked].sort().join(",");
    reportAnswerResult(question, ok);
    let next: GameState;
    let resultText: string;
    if (ok) {
      next = {
        ...state,
        money: state.money + graded.reward,
        correctAnswers: state.correctAnswers + 1,
        totalAnswered: state.totalAnswered + 1,
        answerStreak: state.answerStreak + 1,
      };
      resultText = `✅ Chính xác! +${graded.reward}đ (🔥 streak ${state.answerStreak + 1})`;
    } else {
      const penalty = (question.retryCount ?? 0) > 0 ? 10 : 5;
      next = {
        ...state,
        money: Math.max(0, state.money - penalty),
        answerStreak: 0,
        totalAnswered: state.totalAnswered + 1,
      };
      const correctLabels = correctSet.map((i: number) => `${String.fromCharCode(65 + i)}. ${question.options[i]}`).join(" | ");
      resultText = `❌ Sai rồi! -${penalty}đ — Đáp án đúng: ${correctLabels}`;
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
  const handlePickup = async (p: Pickup) => {
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
      // Boom: mở modal trả lời câu hỏi từ ngân hàng admin
      playSfx("wrongHouse", { duck: true });
      if (!questionsReady) {
        try { await loadQuestionsFromDB("rural"); setQuestionsReady(true); } catch {}
      }
      const bq = randomQuestion();
      if (!bq || !bq.q) {
        flash("💣 Đạp trúng boom! (chưa có câu hỏi trong ngân hàng admin)", 1800);
        return;
      }
      setBoom({ q: bq, tries: 0, correct: 0, gained: 0 });
      setBoomResult(null);
    }
  };
  const handleBoomAnswer = async (picked: number[]) => {
    if (!boom || boomResult) return;
    const q = boom.q;
    const sel = picked[0] ?? -1;
    const graded = await gradeAnswer(q, sel);
    const correctSet = graded.correctIndexes;
    const ok = graded.isCorrect && picked.length === correctSet.length &&
      [...correctSet].sort().join(",") === [...picked].sort().join(",");
    reportAnswerResult(q, ok);
    const delta = ok ? 10 : ((q.retryCount ?? 0) > 0 ? -10 : -5);
    const gained = boom.gained + delta;
    setState((s) => (s ? {
      ...s,
      money: Math.max(0, s.money + delta),
      correctAnswers: ok ? s.correctAnswers + 1 : s.correctAnswers,
      totalAnswered: s.totalAnswered + 1,
      answerStreak: ok ? s.answerStreak + 1 : 0,
    } : s));
    playSfx(ok ? "rightHouse" : "wrongHouse", { duck: true });
    setBoomResult(ok ? `✅ Đúng! ${delta >= 0 ? "+" : ""}${delta}đ` : `❌ Sai! ${delta}đ — phải trả lời thêm 1 câu!`);
    setTimeout(() => {
      if (ok) {
        flash(en ? `💣 Bomb defused! Total: ${gained >= 0 ? "+" : ""}${gained} coins` : `💣 Đã vô hiệu boom! Tổng: ${gained >= 0 ? "+" : ""}${gained}đ`, 2000);
        setBoom(null);
        setBoomResult(null);
      } else {
        setBoom({ q: randomQuestion(), tries: boom.tries + 1, correct: boom.correct, gained });
        setBoomResult(null);
      }
    }, 1200);
  };

  const startRiverQuiz = async () => {
    if (!nearby.riverBoard) {
      flash(en ? "🏮 Walk closer to the lantern challenge board." : "🏮 Hãy đi đến gần bảng thử thách hoa đăng.", 2200);
      return;
    }
    if (!questionsReady) {
      try { await loadQuestionsFromDB("rural"); setQuestionsReady(true); } catch {}
    }
    const q = randomQuestion();
    if (!q?.q) { flash(en ? "⚠️ No questions are available yet." : "⚠️ Chưa có câu hỏi trong ngân hàng."); return; }
    setRiverQuiz({ question: q, number: 1, correct: 0 });
    setRiverQuizResult(null);
  };

  const handleRiverQuizAnswer = async (picked: number[]) => {
    if (!riverQuiz || riverQuizResult) return;
    const selectedIndex = picked[0] ?? -1;
    const graded = await gradeAnswer(riverQuiz.question, selectedIndex);
    const correctSet = graded.correctIndexes;
    const ok = graded.isCorrect && picked.length === correctSet.length && [...correctSet].sort().join(",") === [...picked].sort().join(",");
    reportAnswerResult(riverQuiz.question, ok);
    const correct = riverQuiz.correct + (ok ? 1 : 0);
    setState((current) => current ? {
      ...current,
      correctAnswers: current.correctAnswers + (ok ? 1 : 0),
      totalAnswered: current.totalAnswered + 1,
      answerStreak: ok ? current.answerStreak + 1 : 0,
    } : current);
    playSfx(ok ? "rightHouse" : "wrongHouse", { duck: true });
    setRiverQuizResult(ok ? (en ? "✅ Correct!" : "✅ Chính xác!") : (en ? "❌ Not quite." : "❌ Chưa đúng rồi."));
    window.setTimeout(() => {
      if (riverQuiz.number >= 7) {
        if (correct >= 7 && user) {
          const nextCount = lanternCount + 1;
          setLanternCount(nextCount);
          window.localStorage.setItem(`vebinhso_river_lanterns_${user.id}`, String(nextCount));
          flash(en ? `🏮 You got ${correct}/7 correct and earned one lantern!` : `🏮 Bạn đúng ${correct}/7 câu và nhận được 1 hoa đăng!`, 3500);
        } else {
          flash(en ? `You got ${correct}/7. Get all 7 correct to earn a lantern.` : `Bạn đúng ${correct}/7 câu. Cần đúng cả 7 câu để nhận hoa đăng.`, 3500);
        }
        setRiverQuiz(null);
        setRiverQuizResult(null);
        return;
      }
      setRiverQuiz({ question: randomQuestion(), number: riverQuiz.number + 1, correct });
      setRiverQuizResult(null);
    }, 850);
  };

  const releaseRiverLantern = (x: number, z: number) => {
    if (!user) return;
    if (playMode !== "view") { flash(en ? "🏮 Enter Explore mode to release lanterns." : "🏮 Hãy vào chế độ Xem nhà để thả hoa đăng."); return; }
    if (!nearby.riverBank) { flash(en ? "🏮 Walk closer to the riverbank first." : "🏮 Hãy đi đến gần bờ sông trước."); return; }
    if (lanternCount <= 0) { flash(en ? "🏮 Complete the 7-question challenge to earn a lantern." : "🏮 Hãy hoàn thành thử thách 7 câu để nhận hoa đăng.", 2600); return; }
    setPendingLantern({ x, z });
    setWishText("");
  };

  const confirmReleaseLantern = () => {
    if (!user || !pendingLantern) return;
    const { x, z } = pendingLantern;
    const wish = wishText.trim().slice(0, 120);
    setPendingLantern(null);
    const safeZ = Math.min(RIVER_NEAR_BANK_Z - 2.5, Math.max(-82, z));
    const next: ReleasedLantern = { id: `lantern-${Date.now()}`, x, z: safeZ, wish: wish || undefined, color: ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#ec4899"][releasedLanterns.length % 5] };
    riverPoseState.kneelingUntil = Date.now() + 1800;
    riverPoseState.targetX = x;
    riverPoseState.targetZ = safeZ;
    const nextReleased = [...releasedLanterns, next].slice(-40);
    const nextCount = lanternCount - 1;
    setReleasedLanterns(nextReleased);
    setLanternCount(nextCount);
    window.localStorage.setItem(`vebinhso_river_lanterns_${user.id}`, String(nextCount));
    window.localStorage.setItem(`vebinhso_released_lanterns_${user.id}`, JSON.stringify(nextReleased));
    playSfx("rightHouse", { duck: true });
    flash(en ? "🏮 Your lantern is drifting down the river…" : "🏮 Hoa đăng của bạn đang trôi theo dòng sông…", 2600);
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

  // Khoá tầng theo CẤP — giống cách khoá xây tường
  const floorLevelReq = (f: number) => WALL_LEVEL_REQ[f] ?? 99;
  const meetsFloorLevel = level >= floorLevelReq(activeFloor);
  const canAccessFloor = (f: number) => {
    if (f <= 0) return true;
    if (level < floorLevelReq(f)) return false;
    for (let i = 0; i < f; i++) {
      // Chỉ cần lợp sàn tầng dưới (không cần mái)
      if (!state.floors.some((fl) => (fl.floor ?? 0) === i)) return false;
    }
    return true;
  };
  const tryGoFloor = (f: number) => {
    if (f === activeFloor) return;
    if (level < floorLevelReq(f)) {
      flash(en ? `🔒 Reach LEVEL ${floorLevelReq(f)} to unlock floor ${f}.` : `🔒 Cần đạt CẤP ${floorLevelReq(f)} để mở tầng ${f}.`, 2400);
      return;
    }
    if (!canAccessFloor(f)) {
      flash(en ? `🏗️ Build the lower floor before going to floor ${f}!` : `🏗️ Hãy lợp sàn tầng dưới trước khi lên tầng ${f}!`, 2200);
      return;
    }
    setActiveFloor(f);
    setSelected(null);
    setWallMode(false); setWallPickA(null);
    setRoofMode(false); setRoofPicks([]);
  };
  const floorLabel = (f: number) => (f === 0 ? (en ? "G" : "Trệt") : String(f));

  return (
    <div className="fixed inset-0 bg-sky-300 overflow-hidden select-none">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-sky-300 to-sky-500">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/50 border-t-white" />
             <div className="text-white font-black text-xl">{en ? "Loading home map…" : "Đang tải bản đồ nhà..."}</div>
            <LoadingPercent />
          </div>
        }
      >
        <GameWorld
          placed={state.placed}
          walls={state.walls}
          roofs={state.roofs}
          floors={state.floors}
          wallColor={state.wallColor}
          wallMode={wallMode}
          onWallPaint={paintColor ? paintWall : undefined}
          wallPickA={wallPickA}
          roofMode={roofMode}
          roofPicks={roofPicks}
          floorMode={floorMode}
          floorPicks={floorPicks}
          selectedItemId={selected}
          rotation={rotation}
          onRotate={() => setRotation((r) => (r + 1) % 4)}
          onPlace={handlePlace}
          onWallPlace={handleWallPlace}
          viewMode={playMode === "view" ? exploreView : playMode === "overview" ? "top" : viewMode}
          dimTown={playMode === "edit"}
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
            flash(en ? "🧹 Floor removed" : "🧹 Đã gỡ sàn");
          }}
          activeFloor={activeFloor}
          pickups={pickups}
          collectedIds={collectedIds}
          onPickup={handlePickup}
          showAdminMarkers={isAdmin(user.email)}
          sparkles={sparkles}
          onPlayerPos={handlePlayerPos}
          friendHouses={friendHousesQ.data as FriendHouse[] | undefined}
          showFriendLabels={playMode !== "edit"}
          onVisitFriend={(ownerId) => {
            const f = (friendHousesQ.data as FriendHouse[] | undefined)?.find((x) => x.user_id === ownerId);
             setVisitConfirm({ ownerId, name: f?.house_name || f?.display_name || f?.username || (en ? "friend's house" : "nhà bạn") });
          }}
          releasedLanterns={releasedLanterns}
          onStartRiverQuiz={startRiverQuiz}
          onReleaseLantern={releaseRiverLantern}
          onItemClick={(id, opts) => {
            if (playMode !== "edit") return;
            const p = state.placed.find((q) => q.id === id);
            if (!p) return;
            if ((p.floor ?? 0) !== activeFloor) return;
            if (p.itemId === "sign") {
              // Bấm đúng vào mặt bảng (phần chữ) → đổi tên.
              // Bấm chỗ khác (cột, chân) → mở panel di chuyển / xoay.
              const ly = opts?.localY;
              if (ly == null || (ly >= 0.85 && ly <= 1.6)) {
                setSignEditId(id);
                setSignDraft(signLabels[id] ?? "");
                return;
              }
              setEditingId(id);
              setMoveMode(false);
              return;
            }
            setEditingId(id);
            setMoveMode(false);
          }}
          editingId={editingId}
          signLabels={signLabels}
        />
      </Suspense>
      <WorldLoadingOverlay />

      <WeatherOverlay powers={activePowers} />
      <TouchControls />

      {visitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setVisitConfirm(null)}>
          <div className="glass-card p-6 max-w-sm w-full rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl font-black mb-2 text-center">🏠 {visitConfirm.name}</div>
            <div className="text-sm text-center opacity-70 mb-5">{en ? "Would you like to visit this house?" : "Bạn có muốn vào thăm ngôi nhà này không?"}</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="toy-button toy-button-primary min-w-0 !animate-none !rounded-2xl !border-b-4 !px-2 sm:!px-4 !py-2 !text-sm sm:!text-base !leading-none"
                onClick={() => {
                  const id = visitConfirm.ownerId;
                  setVisitConfirm(null);
                  navigate({ to: "/visit/$ownerId", params: { ownerId: id } });
                }}
              >🚪 {en ? "Enter" : "Vào nhà"}</button>
              <button
                className="toy-button min-w-0 !animate-none !rounded-2xl !border-b-4 !px-2 sm:!px-4 !py-2 !text-sm sm:!text-base !leading-none"
                onClick={() => setVisitConfirm(null)}
              >❌ {en ? "Cancel" : "Thoát"}</button>
            </div>
          </div>
        </div>
      )}

      <DuelController
        ownerId={user.id}
        me={{ userId: user.id, username: user.username, displayName: user.username, avatarUrl: user.avatarUrl ?? null }}
        onPayout={(delta) => {
          setState((s) => s ? {
            ...s,
            money: Math.max(0, s.money + delta),
            netWorth: Math.max(0, s.netWorth + delta),
          } : s);
        }}
      />

      {activePowers.some((id) => [1,2,3].includes(id)) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass-card px-4 py-1.5 pointer-events-none z-40">
          <div className="text-xs font-black">
            {activePowers.includes(1) && (en ? "🌧️ Raining " : "🌧️ Đang mưa ")}{activePowers.includes(3) && (en ? "☀️ Sunny " : "☀️ Trời nắng ")}{activePowers.includes(2) && (en ? "🌪️ Tornado" : "🌪️ Lốc xoáy")}
          </div>
        </div>
      )}

      {/* Nút 🏡 về trang chủ + ⚙️ Cài đặt + VI/EN nằm trong hàng nút cố định ở __root */}


      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="glass-card px-3 py-2 pointer-events-auto flex items-center gap-2 max-w-[60vw] sm:max-w-none mt-12 sm:mt-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-2 border-white flex items-center justify-center text-lg sm:text-xl shrink-0 overflow-hidden">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <img src={houseAvatar.url} alt="Vệ Binh Số" className="w-full h-full object-contain" />}
          </div>
          <div className="text-[11px] sm:text-sm min-w-0">
            <div className="font-black truncate">{user.username}</div>
            <div className="font-bold text-yellow-700 truncate">💰 {state.money}đ • 🏠 {state.netWorth}đ</div>
            <div className="text-[10px] sm:text-xs font-bold text-blue-700 truncate">Lv.{level} • ✅ {state.correctAnswers} • 🔥 {state.answerStreak}</div>
            <div className="text-[10px] sm:text-xs font-bold text-stone-700 truncate">🧱 {state.bricks} • 🪣 {state.concrete} • 🏠 {state.roofTiles} • 🟥 {state.roofTilesTon}</div>
            <div className="text-[10px] sm:text-xs font-black text-rose-700 truncate">🏮 {en ? "Lanterns" : "Hoa đăng"}: {lanternCount}</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHouseAccessOpen(true)}
              className="mt-1 h-7 gap-1 px-2 text-[10px] font-black sm:text-xs"
            >
              🔐 {en ? "Home access" : "Quyền vào nhà"}
            </Button>
          </div>
        </div>

        <div className={`flex flex-col gap-2 pointer-events-auto items-end mt-12 ${playMode !== "edit" ? "hidden" : ""}`}>
          {/* THAO TÁC — luôn có toggle; desktop mặc định mở khi thaoTacOpen=true; trên mobile bắt đầu đóng */}
          <button
            onClick={() => setThaoTacOpen((v) => !v)}
            className={`toy-button !animate-none !min-w-36 !border-b-4 !px-4 !py-2.5 !text-sm shadow-lg ring-2 ring-background/90 ${thaoTacOpen ? "toy-button-primary !animate-none !border-b-4 !px-4 !py-2.5 !text-sm" : "bg-background/95"}`}
            title={en ? "Open/close actions" : "Mở/đóng nhóm Thao tác"}
          >
            {thaoTacOpen ? `✖ ⚙️ ${en ? "ACTIONS" : "THAO TÁC"}` : `⚙️ ${en ? "ACTIONS" : "THAO TÁC"}`}
          </button>
          {thaoTacOpen && (
            <div className="flex flex-col gap-2 items-end max-h-[40vh] overflow-y-auto overflow-x-hidden pr-1 scroll-smooth" style={{ scrollbarWidth: "thin" }}>
              <button onClick={handleUndo} disabled={history.length === 0} className={`toy-button !text-xs !py-2 !px-3 ${history.length === 0 ? "opacity-50" : ""}`}>
                ↩️ {en ? "UNDO" : "HOÀN TÁC"} (Ctrl+Z){history.length > 0 ? ` · ${history.length}` : ""}
              </button>
              <button onClick={() => setShopOpen(true)} className="toy-button toy-button-primary !text-base !py-2 !px-5">🛒 {en ? "SHOP" : "CỬA HÀNG"}</button>
              <button onClick={openQuestion} className="toy-button toy-button-green !text-sm !py-2 !px-4">❓ {en ? "EARN COINS" : "KIẾM TIỀN"}</button>
            </div>
          )}

          {/* THỰC HIỆN */}
          <button
            onClick={() => setThucHienOpen((v) => !v)}
            className={`toy-button !animate-none !min-w-36 !border-b-4 !px-4 !py-2.5 !text-sm shadow-lg ring-2 ring-background/90 mt-1 ${thucHienOpen ? "toy-button-primary !animate-none !border-b-4 !px-4 !py-2.5 !text-sm" : "bg-background/95"}`}
            title={en ? "Open/close building tools" : "Mở/đóng nhóm Thực hiện"}
          >
            {thucHienOpen ? `✖ 🏗️ ${en ? "BUILD" : "THỰC HIỆN"}` : `🏗️ ${en ? "BUILD" : "THỰC HIỆN"}`}
          </button>
          {thucHienOpen && (
            <div className="flex flex-col gap-2 items-end max-h-[50vh] overflow-y-auto overflow-x-hidden pr-1 pb-2 scroll-smooth" style={{ scrollbarWidth: "thin" }}>

          {/* Chọn tầng */}
          <div className="glass-card px-2 py-1.5 flex flex-wrap items-center gap-1 max-w-[85vw] sm:max-w-[360px]">
            <span className="text-[10px] font-black text-stone-700 mr-1 shrink-0">{en ? "FLOOR" : "TẦNG"}:</span>
            {Array.from({ length: MAX_FLOOR + 1 }, (_, f) => {
              const accessible = canAccessFloor(f);
              const active = activeFloor === f;
              return (
                <button
                  key={f}
                  onClick={() => tryGoFloor(f)}
                  className={`toy-button !text-[11px] !py-1 !px-2 shrink-0 ${active ? "toy-button-primary !text-[11px] !py-1 !px-2" : ""} ${!accessible && !active ? "opacity-50" : ""}`}
                  title={accessible ? (en ? `Go to floor ${floorLabel(f)}` : `Lên tầng ${floorLabel(f)}`) : level < floorLevelReq(f) ? (en ? `Reach LEVEL ${floorLevelReq(f)} to unlock floor ${f}` : `Cần CẤP ${floorLevelReq(f)} để mở tầng ${f}`) : (en ? `Build floor ${f - 1} first` : `Cần lợp sàn tầng ${f - 1} trước`)}
                >
                  {!accessible && !active ? "🔒 " : ""}{floorLabel(f)}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (!meetsWallLevel) {
                flash(en ? `🔒 Reach LEVEL ${wallLevelReq} to build walls on floor ${floorLabel(activeFloor)}.` : `🔒 Cần đạt CẤP ${wallLevelReq} để xây tường ở tầng ${floorLabel(activeFloor)}.`, 2400);
                return;
              }
              if (!canEnterWallMode) {
                flash(en ? "Place at least 2 concrete pillars before building a wall." : "Đặt ít nhất 2 cột bê tông trước khi xây tường.");
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
            title={!meetsWallLevel ? (en ? `Reach LEVEL ${wallLevelReq} to build walls on floor ${floorLabel(activeFloor)}` : `Cần CẤP ${wallLevelReq} để xây tường tầng ${floorLabel(activeFloor)}`) : ""}
          >
            {!meetsWallLevel ? `🔒 ${en ? "BUILD WALL" : "XÂY TƯỜNG"} (${en ? "LEVEL" : "CẤP"} ${wallLevelReq})` : wallMode ? (en ? "✅ Building walls" : "✅ Đang xây tường") : (en ? "🧱 BUILD WALL" : "🧱 XÂY TƯỜNG")}
          </button>
          <button
            onClick={() => {
              if (!meetsFloorLevel) {
                flash(en ? `🔒 Reach LEVEL ${floorLevelReq(activeFloor)} to build the floor on level ${floorLabel(activeFloor)}.` : `🔒 Cần đạt CẤP ${floorLevelReq(activeFloor)} để xây sàn ở tầng ${floorLabel(activeFloor)}.`, 2400);
                return;
              }
              if (!canEnterFloorMode) {
                flash(en ? "Place at least 4 concrete pillars before building a floor." : "Đặt ít nhất 4 cột bê tông trước khi xây sàn.");
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
            className={`toy-button !text-sm !py-2 !px-4 ${floorMode ? "toy-button-green" : ""} ${!meetsFloorLevel ? "opacity-70" : ""}`}
            title={!meetsFloorLevel ? (en ? `Reach LEVEL ${floorLevelReq(activeFloor)} to build floor ${floorLabel(activeFloor)}` : `Cần CẤP ${floorLevelReq(activeFloor)} để xây sàn tầng ${floorLabel(activeFloor)}`) : ""}
          >
            {!meetsFloorLevel ? `🔒 ${en ? "BUILD FLOOR" : "XÂY SÀN"} (${en ? "LEVEL" : "CẤP"} ${floorLevelReq(activeFloor)})` : floorMode ? `✅ ${en ? "Building floor" : "Đang xây sàn"} (${floorPicks.length}/4)` : (en ? "🟫 BUILD FLOOR" : "🟫 XÂY SÀN")}
          </button>

          <button
            onClick={() => {
              if (!floorOnThisFloor) {
                flash(en ? "Build the FLOOR before adding a roof to this level." : "Phải xây SÀN trước khi lợp mái cho tầng này.", 2500);
                return;
              }
              if (!canEnterRoofMode) {
                flash(en ? "Place at least 4 concrete pillars before building a roof." : "Đặt ít nhất 4 cột bê tông trước khi xây mái nhà.");
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
            {roofMode ? `✅ ${en ? "Roof" : "Mái"} ${en ? (roofStyle === "ton" ? "metal" : "tile") : (roofStyle === "ton" ? "tôn" : "ngói")} (${roofPicks.length}/4)` : (en ? "🏠 BUILD ROOF" : "🏠 XÂY MÁI NHÀ")}
          </button>
          {roofMode && (
            <div className="flex gap-1">
              <button
                onClick={() => setRoofStyle("tile")}
                className={`toy-button !text-[10px] !py-1 !px-2 ${roofStyle === "tile" ? "toy-button-primary !text-[10px] !py-1 !px-2" : ""}`}
              >{en ? "Tile" : "Ngói"}</button>
              <button
                onClick={() => setRoofStyle("ton")}
                className={`toy-button !text-[10px] !py-1 !px-2 ${roofStyle === "ton" ? "toy-button-primary !text-[10px] !py-1 !px-2" : ""}`}
              >{en ? "Metal" : "Tôn"}</button>
            </div>
          )}
          {true && (
            <button onClick={() => setPaletteOpen(true)} className="toy-button !text-xs !py-2 !px-3 inline-flex items-center gap-1">
              <PaintBucketIcon color={paintColor ?? "#f5e6c8"} size={20} /> {en ? "Wall color" : "Đổi màu tường"}
            </button>
          )}
            </div>
          )}
        </div>
      </div>

      <HouseAccessSettings open={houseAccessOpen} onOpenChange={setHouseAccessOpen} />


      {/* Level progress */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 glass-card px-4 py-2 pointer-events-none hidden md:block">
        <div className="text-xs font-black text-center">{en ? "LEVEL" : "CẤP"} {level} → {en ? "LEVEL" : "CẤP"} {lvlInfo.next}</div>
        <div className="text-[10px] font-bold text-muted-foreground">
          🏠 {state.netWorth}/{lvlInfo.netWorthNeeded}đ • ✅ {state.correctAnswers}/{lvlInfo.questionsNeeded}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-xs font-bold pointer-events-none max-w-[92vw] text-center [@media(pointer:coarse)]:hidden">
        {wallMode
          ? (en ? "🧱 WALL MODE • Click 2 concrete pillars to build a wall between them • 1m × 5m uses 10 bricks + 1 concrete" : "🧱 CHẾ ĐỘ XÂY TƯỜNG • Click 2 cột bê tông để hệ thống tự xây tường giữa chúng • Quy đổi: 1m × 5m = 10 gạch + 1 bê tông")
          : roofMode
          ? (en ? `🏠 ROOF MODE • Click 4 concrete pillars at the house corners • 1m² uses 1 ${roofStyle === "ton" ? "metal" : "tile"} roof piece` : `🏠 CHẾ ĐỘ XÂY MÁI NHÀ • Click 4 cột bê tông là 4 góc nhà • 1m² = 1 gạch mái ${roofStyle === "ton" ? "tôn" : "ngói"}`)
          : (
            <>
              <span className="hidden [@media(pointer:fine)]:inline">🎮 {en ? "WASD: Move • SPACE: Jump • R: Rotate • Click: Place • Right click: Remove" : "WASD: Di chuyển • SPACE: Nhảy • R: Xoay • Click: Đặt • Chuột phải: Xóa"}</span>
              <span className="[@media(pointer:fine)]:hidden">🎮 {en ? "Joystick to move • Tap to place • Tap an item to edit" : "Joystick để di chuyển • Chạm để đặt • Chạm vật để chỉnh"}</span>
            </>
          )}
      </div>

      {/* Gợi ý đặt cửa */}
      {doorHint && isDoorItem(selected) && (
        <div className="absolute bottom-16 [@media(pointer:coarse)]:bottom-36 left-1/2 -translate-x-1/2 bg-amber-100 border-2 border-amber-400 text-amber-900 px-5 py-2.5 rounded-2xl shadow-lg text-sm font-black pointer-events-none animate-bounce z-50">
          🚪 {en ? "Select the door and rotate it to 0°" : "Hãy bấm vào cửa và xoay về 0°"}
        </div>
      )}
      <div className="absolute bottom-14 [@media(pointer:coarse)]:bottom-28 left-1/2 -translate-x-1/2 px-3 py-1 text-[11px] italic font-bold text-amber-900/90 bg-amber-50/80 rounded-full pointer-events-none max-w-[92vw] text-center shadow-sm">
        🪙 {en ? "Explore to find more coins, but watch your step…" : "Hãy đi xung quanh để kiếm thêm thu nhập nhưng hãy cẩn thận bước chân.."}
      </div>

      {/* HUD: cửa & đèn — chỉ hiện khi tới gần và đã có đặt vật tương ứng */}
      {(() => {
        const nearest = nearby.doorId ? { id: nearby.doorId } : null;
        const nearLamp = nearby.lamp;
        if (!nearest && !nearLamp) return null;
        const isOpen = nearest ? (wt.doorsOpen || wt.openDoorIds?.includes(nearest.id)) : false;
        return (
          <div className="absolute bottom-3 right-3 sm:bottom-3 [@media(pointer:coarse)]:bottom-28 flex flex-col gap-2 pointer-events-auto z-30">

            {nearest && (
              <button
                onClick={() => {
                  const cur = new Set(wt.openDoorIds ?? []);
                  if (cur.has(nearest!.id)) cur.delete(nearest!.id); else cur.add(nearest!.id);
                  setToggles({ openDoorIds: Array.from(cur), doorsOpen: false });
                  playSfx("place");
                }}
                className={`toy-button !text-sm !py-2 !px-4 ${isOpen ? "toy-button-green" : "toy-button-primary"}`}
                title={en ? "Open or close the nearest door" : "Mở/đóng cửa gần nhất"}
              >
                {isOpen ? (en ? "🚪 CLOSE DOOR" : "🚪 ĐÓNG CỬA") : (en ? "🚪 OPEN DOOR" : "🚪 MỞ CỬA")}
              </button>
            )}
            {nearLamp && (
              <button
                onClick={() => { setToggles({ lightsOn: !wt.lightsOn }); playSfx("place"); }}
                className={`toy-button !text-sm !py-2 !px-4 ${wt.lightsOn ? "toy-button-green" : ""}`}
                title={en ? "Turn all lights on or off" : "Bật/tắt tất cả đèn"}
              >
                {wt.lightsOn ? (en ? "💡 LIGHTS OFF" : "💡 TẮT ĐÈN") : (en ? "💡 LIGHTS ON" : "💡 BẬT ĐÈN")}
              </button>
            )}
          </div>
        );
      })()}

      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <div className="glass-card p-1 flex flex-col gap-1 mb-1">
          <button onClick={() => setPlayMode("overview")} className={`toy-button !text-[11px] !py-1 !px-2 ${playMode === "overview" ? "toy-button-primary" : ""}`}>🗺️ {en ? "Map" : "Bản đồ"}</button>
          <button onClick={() => setPlayMode("edit")} className={`toy-button !text-[11px] !py-1 !px-2 ${playMode === "edit" ? "toy-button-primary" : ""}`}>🛠️ {en ? "Edit" : "Sửa nhà"}</button>
          <button onClick={enterViewMode} className={`toy-button !text-[11px] !py-1 !px-2 ${playMode === "view" ? "toy-button-primary" : ""}`}>👀 {en ? "Explore" : "Xem nhà"}</button>
        </div>
        {playMode === "view" && (
          <>
            {([
              ["eye", "🚶", en ? "Character" : "Nhân vật"],
              ["free", "🎥", en ? "Free" : "Tự do"],
              ["top", "🗺️", en ? "Top" : "Từ trên"],
              ["front", "🏮", en ? "Front" : "Trực diện"],
              ["wide", "🏘️", en ? "Wide" : "Toàn cảnh"],
            ] as const).map(([m, ic, lb]) => (
              <button key={m} onClick={() => setExploreView(m)} title={lb}
                className={`glass-card px-2 py-1 text-[11px] font-black flex flex-col items-center w-14 ${exploreView === m ? "ring-2 ring-primary" : ""}`}>
                <span className="text-lg leading-none">{ic}</span>{lb}
              </button>
            ))}
            {exploreView === "eye" && (
              <div className="glass-card px-2 py-1 text-[10px] font-bold w-28">{en ? "First-person view. Drag to look, WASD to walk." : "Góc nhìn nhân vật. Kéo chuột để nhìn, WASD để đi."}</div>
            )}
          </>
        )}
        {playMode === "edit" && ([
          ["free", "🎥", en ? "Free" : "Tự do"],
          ["top", "🗺️", en ? "Top" : "Từ trên"],
          ["front", "🏮", en ? "Front" : "Trực diện"],
          ["wide", "🏘️", en ? "Wide" : "Toàn cảnh"],
        ] as const).map(([m, ic, lb]) => (
          <button key={m} onClick={() => setViewMode(m)} title={lb}
            className={`glass-card px-2 py-1 text-[11px] font-black flex flex-col items-center w-14 ${viewMode === m ? "ring-2 ring-primary" : ""}`}>
            <span className="text-lg leading-none">{ic}</span>{lb}
          </button>
        ))}
      </div>

      {selected && (
        <div className="absolute bottom-20 [@media(pointer:coarse)]:bottom-44 left-1/2 -translate-x-1/2 glass-card px-4 py-2 flex items-center gap-3 pointer-events-auto">
          <span className="text-2xl">{getItem(selected)?.icon}</span>
          <div className="text-sm font-black">{en ? "Placing" : "Đang đặt"}: {catalogLabel(getItem(selected)?.name ?? "", en)}</div>
          <button onClick={() => setCeilingMount((v) => !v)} className={`toy-button !text-xs !py-1 !px-3 ${ceilingMount ? "ring-2 ring-primary" : ""}`}>{ceilingMount ? (en ? "💡 Ceiling: ON" : "💡 Gắn trần: BẬT") : (en ? "💡 Ceiling: OFF" : "💡 Gắn trần: TẮT")}</button>
          <span className="hidden [@media(pointer:fine)]:inline text-xs opacity-70">{en ? "Click a wall to stick it on" : "Bấm vào tường để dán lên"}</span>
          <button onClick={() => setSelected(null)} className="toy-button !text-xs !py-1 !px-3">{en ? "Cancel" : "Hủy"}</button>
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
        // Tìm surface đang nằm dưới topper (footprint chồng lấn + cùng tầng)
        const isWallMounted = typeof ed.angleRad === "number" && !isWindowItem(ed.itemId) && !isDoorItem(ed.itemId);
        const edSwap = ed.rotation % 2 === 1;
        const edW = edSwap ? it.d : it.w;
        const edD = edSwap ? it.w : it.d;
        const edCX = typeof ed.angleRad === "number" ? ed.x : ed.x + edW / 2;
        const edCZ = typeof ed.angleRad === "number" ? ed.z : ed.z + edD / 2;
        // Vật gần nhất bên dưới/cạnh (footprint chồng lấn hoặc trong ~1m) — bất kỳ loại đồ nào
        const topOf = (p: PlacedItem) => (p.stackY ?? 0) + (STACK_SURFACES.has(p.itemId) ? surfaceTopY(p.itemId) : (getItem(p.itemId)?.h ?? 0));
        const candidates = isWallMounted ? [] : state.placed.filter((p) => {
          if (p.id === ed.id) return false;
          if ((p.floor ?? 0) !== (ed.floor ?? 0)) return false;
          if (isRoof(p.itemId) || isWindowItem(p.itemId) || isDoorItem(p.itemId) || isFlatMat(p.itemId)) return false;
          const pi = getItem(p.itemId);
          if (!pi) return false;
          const ps = p.rotation % 2 === 1;
          const pw = ps ? pi.d : pi.w;
          const pd = ps ? pi.w : pi.d;
          const pCX = typeof p.angleRad === "number" ? p.x : p.x + pw / 2;
          const pCZ = typeof p.angleRad === "number" ? p.z : p.z + pd / 2;
          return Math.abs(edCX - pCX) <= pw / 2 + 1 && Math.abs(edCZ - pCZ) <= pd / 2 + 1;
        });
        const surfaceUnder = candidates.length
          ? candidates.reduce((a, b) => {
              const da = Math.hypot(a.x - ed.x, a.z - ed.z), db = Math.hypot(b.x - ed.x, b.z - ed.z);
              return db < da ? b : a;
            })
          : null;
        const surfaceItem = surfaceUnder ? getItem(surfaceUnder.itemId) : null;
        const snapOnto = () => {
          if (!surfaceUnder || !surfaceItem) return;
          const newStackY = topOf(surfaceUnder);
          if (newStackY + it.h > WALL_HEIGHT * 1.6) { flash(en ? "⚠️ Stack is too high." : "⚠️ Chồng quá cao rồi."); return; }
          const si = surfaceItem;
          const ss = surfaceUnder.rotation % 2 === 1;
          const sw = ss ? si.d : si.w, sd = ss ? si.w : si.d;
          const sCX = typeof surfaceUnder.angleRad === "number" ? surfaceUnder.x : surfaceUnder.x + sw / 2;
          const sCZ = typeof surfaceUnder.angleRad === "number" ? surfaceUnder.z : surfaceUnder.z + sd / 2;
          const nx = typeof ed.angleRad === "number" ? sCX : sCX - edW / 2;
          const nz = typeof ed.angleRad === "number" ? sCZ : sCZ - edD / 2;
          setState({
            ...state,
            placed: state.placed.map((p) => (p.id === editingId ? { ...p, x: nx, z: nz, stackY: newStackY } : p)),
          });
          flash(en ? `✅ Placed on ${catalogLabel(surfaceItem.name, true)}` : `✅ Đã đặt lên ${surfaceItem.name}`);
        };
        const setEdY = (y: number) => setState({
          ...state,
          placed: state.placed.map((p) => (p.id === editingId ? { ...p, stackY: y } : p)),
        });
        const maxWallY = Math.max(0, WALL_HEIGHT - it.h - 0.02);
        return (
          <div className="absolute bottom-20 [@media(pointer:coarse)]:bottom-48 left-1/2 -translate-x-1/2 glass-card px-4 py-3 pointer-events-auto z-40 min-w-[280px] max-w-[92vw]">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-2xl">{it.icon}</span>
              <div className="text-sm font-black flex-1 min-w-0 truncate">{en ? "Edit" : "Chỉnh"}: {catalogLabel(it.name, en)}</div>
              <button
                onClick={() => { handleRemove(editingId); setEditingId(null); setMoveMode(false); flash(en ? "🗑 Item removed" : "🗑 Đã xoá vật"); }}
                className="toy-button !text-xs !py-1 !px-3 bg-rose-500 text-white"
                title={en ? "Remove item and refund" : "Xoá vật phẩm và hoàn tiền"}
              >🗑 {en ? "Remove" : "Xoá"}</button>
              <button onClick={() => { setEditingId(null); setMoveMode(false); }} className="toy-button !text-xs !py-1 !px-3">{en ? "Done" : "Xong"}</button>
            </div>
            {!isWallMounted && (surfaceItem || (ed.stackY ?? 0) > 0) && (
              <div className="mb-2 flex gap-2">
                {surfaceItem && (
                  <button
                    onClick={snapOnto}
                    className="toy-button toy-button-green !text-xs !py-1 !px-3 flex-1"
                    title={en ? "Stack this item on top of the nearby item" : "Chồng vật này lên trên đồ vật gần đó"}
                  >📦 {en ? "Place on" : "Đặt lên"} {catalogLabel(surfaceItem.name, en)}</button>
                )}
                {(ed.stackY ?? 0) > 0 && (
                  <button onClick={() => setEdY(0)} className="toy-button !text-xs !py-1 !px-3">
                    ⬇️ {en ? "To floor" : "Xuống sàn"}
                  </button>
                )}
              </div>
            )}
            {isWallMounted && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold w-12 shrink-0">{en ? "Height" : "Độ cao"}:</span>
                <span className="text-[10px] font-bold">{en ? "Floor" : "Sàn"}</span>
                <input
                  type="range" min={0} max={maxWallY} step={0.05}
                  value={Math.min(maxWallY, ed.stackY ?? 0)}
                  onChange={(e) => setEdY(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-[10px] font-bold">{en ? "Ceiling" : "Trần"}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold w-12 shrink-0">{en ? "Rotate" : "Xoay"}:</span>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={normDeg}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="flex-1 min-w-0 accent-cyan-500"
              />
              <span className="text-xs font-black w-12 text-right shrink-0">{normDeg}°</span>
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
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-xs font-bold w-12 shrink-0">{en ? "Move" : "Dịch"}:</span>
              <div className="grid grid-cols-3 gap-1 shrink-0">
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
              <div className="text-[10px] font-bold text-stone-600 flex-1 min-w-0 basis-full sm:basis-0">
                {moveMode ? (en ? "🟢 Click a new spot on the plot to move this item" : "🟢 Click ô mới trên mảnh đất để dời vật tới đó") : (en ? "Press 📍 then click a spot, or use the arrows (0.5m)" : "Bấm 📍 rồi click ô trong mảnh để dời, hoặc dùng mũi tên (0.5m)")}
              </div>
            </div>
          </div>
        );
      })()}


      {(toast || mixNote) && (
        <div className="absolute bottom-28 [@media(pointer:coarse)]:bottom-52 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none w-max max-w-[92vw]">
          {mixNote && (
            <div className="glass-card px-4 py-2.5 flex items-start gap-2 text-xs md:text-sm font-bold max-w-[92vw] shadow-lg">
              <span className="text-lg leading-none">🎨</span>
              <span>{mixNote}</span>
            </div>
          )}
          {toast && (
            <div className="glass-card px-4 py-2 text-xs md:text-sm font-black max-w-[92vw] text-center shadow-lg">
              {toast}
            </div>
          )}
        </div>
      )}

      {/* Shop */}
      {shopOpen && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-2 md:p-4" onClick={() => setShopOpen(false)}>
          <div className="glass-card max-w-3xl w-full max-h-[92vh] md:max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-2 md:p-4 border-b-2 border-white/50 flex flex-wrap items-center justify-between gap-2 min-w-0">
               <h2 className="text-base md:text-2xl font-black truncate min-w-0">🛒 {en ? "SHOP" : "CỬA HÀNG"}</h2>
              <div className="font-bold text-yellow-700 text-xs md:text-base whitespace-nowrap">💰 {state.money}đ</div>
               <button onClick={() => setShopOpen(false)} className="toy-button !text-xs !py-1 !px-3 shrink-0">{en ? "Close" : "Đóng"}</button>
            </div>
            <div className="px-2 md:px-3 pt-2 md:pt-3">
              <input
                type="search"
                value={shopQuery}
                onChange={(e) => setShopQuery(e.target.value)}
                placeholder={en ? "🔍 Search items (sofa, TV, fan...)" : "🔍 Tìm đồ (sofa, tivi, quạt...)"}
                className="w-full rounded-full border-2 border-amber-300 bg-white px-4 py-2 text-sm font-bold outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex flex-wrap gap-1 md:gap-2 p-2 md:p-3 border-b-2 border-white/50">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`toy-button !text-[10px] md:!text-xs !py-1 md:!py-2 !px-2 md:!px-3 ${activeCat === c ? "toy-button-primary !text-[10px] md:!text-xs !py-1 md:!py-2 !px-2 md:!px-3" : ""}`}
                >
                  {catalogLabel(c, en)}
                </button>
              ))}
            </div>
            {activeCat === "Vật liệu" && (
              <div className="px-3 md:px-4 pt-2 md:pt-3 text-[10px] md:text-[11px] font-bold text-stone-700">
                 💡 {en ? "Place CONCRETE PILLARS first. Buy BRICKS + CONCRETE, then press" : "Đặt CỘT BÊ TÔNG trước. Mua GẠCH + BÊ TÔNG, rồi bấm"}
                 {" "}<span className="text-orange-700">🧱 {en ? "BUILD WALL" : "XÂY TƯỜNG"}</span> ({en ? "10 bricks + 1 concrete" : "10 gạch + 1 bê tông"} / 1m×5m).
              </div>
            )}
            <ThumbnailBaker />
            <div className="p-2 md:p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2 md:gap-3" style={{ scrollbarWidth: "thin" }}>
              {(shopQuery.trim()
                ? CATALOG.filter((c) => matchItem(c, shopQuery, catalogLabel(c.name, en)))
                : CATALOG.filter((c) => c.category === activeCat)
              ).length === 0 && (
                <div className="col-span-full text-center py-8 font-bold text-stone-600">{en ? "No items found" : "Không tìm thấy món đồ nào"}</div>
              )}
              {(shopQuery.trim()
                ? CATALOG.filter((c) => matchItem(c, shopQuery, catalogLabel(c.name, en)))
                : CATALOG.filter((c) => c.category === activeCat)
              ).map((it) => {
                const kind = it.kind ?? "place";
                const isBulk = kind === "brick" || kind === "concrete" || kind === "rooftile";
                const isPalette = kind === "palette";
                const showQty = !isPalette;
                const qty = Math.max(1, buyQty[it.id] ?? 1);
                const effQty = showQty ? qty : 1;
                const totalPrice = it.price * effQty;
                const canAfford = state.money >= totalPrice;
                const label =
                   kind === "brick" ? (en ? "BUY BRICKS" : "MUA GẠCH") :
                   kind === "concrete" ? (en ? "BUY CONCRETE" : "MUA BÊ TÔNG") :
                   kind === "rooftile" ? (en ? "BUY ROOFING" : "MUA GẠCH MÁI") :
                   kind === "palette" ? (en ? "OPEN PALETTE" : "MỞ PALETTE") :
                   (en ? "BUY & PLACE" : "MUA & ĐẶT");
                const setQ = (n: number) => setBuyQty((prev) => ({ ...prev, [it.id]: Math.max(1, Math.min(99, n)) }));
                return (
                  <div key={it.id} className="relative rounded-2xl md:rounded-3xl p-2 md:p-3 text-center border-2 border-amber-200" style={{
                    background: "radial-gradient(circle at 30% 20%, #fffaf0 0%, #ffe8b8 55%, #f7c573 100%)",
                    boxShadow: "0 8px 16px -8px rgba(180,120,0,0.45), inset 0 -4px 0 rgba(0,0,0,0.07), inset 0 3px 0 rgba(255,255,255,0.6)",
                  }}>
                    <div className="mx-auto w-full aspect-square max-w-[120px] rounded-2xl flex items-center justify-center text-3xl md:text-4xl mb-1 overflow-hidden" style={{
                      background: "radial-gradient(circle at 50% 40%, #ffffff 0%, #fff6dc 60%, #f6dca0 100%)",
                      boxShadow: "inset 0 -4px 8px rgba(120,60,0,0.15)",
                    }}><ItemThumb item={it} className="w-full h-full" /></div>
                    <div className="font-black text-[11px] md:text-sm mt-1 line-clamp-1">{catalogLabel(it.name, en)}</div>
                    <div className="text-[9px] md:text-[10px] text-amber-900/70 font-bold">{it.w}×{it.d}</div>
                    <div className="inline-block px-2 py-0.5 mt-1 rounded-full bg-amber-900 text-amber-100 text-[10px] md:text-xs font-black">
                      💰 {totalPrice}đ{showQty && effQty > 1 ? ` (${it.price}×${effQty})` : ""}
                    </div>
                    {showQty && (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <button onClick={() => setQ(qty - 1)} disabled={qty <= 1}
                          className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-amber-700 text-white font-black text-sm md:text-base disabled:opacity-40 leading-none">−</button>
                        <input
                          type="number" min={1} max={99} value={qty}
                          onChange={(e) => setQ(parseInt(e.target.value) || 1)}
                          className="w-9 md:w-11 text-center rounded-md border-2 border-amber-300 bg-white font-black text-[11px] md:text-sm py-0.5"
                        />
                        <button onClick={() => setQ(qty + 1)}
                          className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-amber-700 text-white font-black text-sm md:text-base leading-none">+</button>
                      </div>
                    )}
                    <button onClick={() => buyAndSelect(it.id, isBulk || !isPalette ? qty : 1)} disabled={!canAfford}
                      className={`toy-button !text-[10px] md:!text-xs !py-1 !px-2 md:!px-3 mt-2 w-full ${canAfford ? `toy-button-primary !text-[10px] md:!text-xs !py-1 !px-2 md:!px-3` : "opacity-50"}`}>
                       {canAfford ? (showQty && effQty > 1 ? `${label} ×${effQty}` : label) : (en ? "Not enough coins" : "Hết tiền")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {paintColor && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 glass-card px-3 py-2 flex items-center gap-2 text-xs font-bold max-w-[92vw]">
          <PaintBucketIcon color={paintColor} size={40} />
          <div>
            <div>{en ? `Bucket: ${colorName(paintColor, en)}` : `Xô màu: ${colorName(paintColor, en)}`} • 💰 30{en ? " coins/pour" : " xu/lần đổ"}</div>
            <div className="opacity-80">{en ? "Click a wall to pour paint" : "Bấm vào tường để đổ màu"}</div>
          </div>
          <button onClick={() => setPaletteOpen(true)} className="toy-button !text-[10px] !py-1 !px-2">{en ? "Change" : "Đổi"}</button>
          <button onClick={() => setPaintColor(null)} className="toy-button !text-[10px] !py-1 !px-2">✖</button>
        </div>
      )}


      {/* Palette modal */}
      {paletteOpen && (
        <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={() => setPaletteOpen(false)}>
          <div className="glass-card max-w-4xl w-full max-h-[85vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
               <h2 className="text-2xl font-black">🎨 {en ? "WALL COLOR PALETTE" : "PALETTE MÀU TƯỜNG"}</h2>
               <button onClick={() => setPaletteOpen(false)} className="toy-button !text-xs !py-1 !px-3">{en ? "Close" : "Đóng"}</button>
            </div>
             <p className="text-xs font-bold text-stone-700 mb-3">{en ? "Pick a color to fill your bucket, then click a wall to pour it. Each pour costs 30 coins." : "Chọn màu cho xô sơn, rồi bấm vào tường để đổ màu. Mỗi lần đổ tốn 30 xu."}</p>
            <button onClick={() => pickPaletteColor("#ffffff")} className="toy-button !text-xs !py-2 !px-3 mb-3 inline-flex items-center gap-2">
              <PaintBucketIcon color="#ffffff" size={24} /> {en ? "White — reset wall to original" : "Màu trắng — đưa tường về ban đầu"}
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {WALL_PALETTES.map((p) => (
                <div key={p.id} className="rounded-2xl p-3 bg-white/70 border border-white/80">
                  <div className="text-sm font-black mb-2">{catalogLabel(p.name, en)}</div>
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
                 ❓ {en ? `Answer correctly to earn +${question.reward} coins` : `Trả lời đúng để +${question.reward}đ`}
              </div>
               <button onClick={closeQuestion} className="toy-button !text-xs !py-1 !px-3 shrink-0">✖ {en ? "Exit" : "Thoát"}</button>
            </div>
            <QuestionView question={question} onAnswer={handleAnswer} disabled={!!questionResult} />
            {questionResult && (
              <div className="mt-4 text-center font-black text-xl md:text-2xl">{questionResult}</div>
            )}
          </div>
        </div>
      )}

      {pendingLantern && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 p-4" onClick={() => setPendingLantern(null)}>
          <div className="w-full max-w-sm rounded-2xl border-2 border-primary bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black">🏮 {en ? "Write your wish" : "Viết lời ước lên hoa đăng"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{en ? "Tap the lantern on the river later to read it." : "Chạm vào đèn đang trôi để xem lại lời ước."}</p>
            <textarea autoFocus maxLength={120} value={wishText} onChange={(e) => setWishText(e.target.value)}
              placeholder={en ? "I wish…" : "Con ước…"}
              className="mt-3 h-24 w-full resize-none rounded-lg border border-input bg-background p-2 text-sm" />
            <div className="text-right text-[10px] text-muted-foreground">{wishText.length}/120</div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingLantern(null)}>{en ? "Cancel" : "Hủy"}</Button>
              <Button onClick={confirmReleaseLantern}>{en ? "Release lantern" : "Thả hoa đăng"}</Button>
            </div>
          </div>
        </div>
      )}
      {riverQuiz && (
        <div className="absolute inset-0 bg-foreground/55 z-40 flex items-center justify-center p-3 md:p-6">
          <div className="glass-card max-w-2xl w-full p-5 md:p-7 max-h-[90vh] overflow-y-auto border-4 border-amber-400">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-lg font-black text-amber-800">🏮 {en ? "Lantern challenge" : "Thử thách hoa đăng"}</div>
                <div className="text-xs font-bold text-stone-700">{en ? `Question ${riverQuiz.number}/7 • Correct: ${riverQuiz.correct} • Need 5` : `Câu ${riverQuiz.number}/7 • Đúng: ${riverQuiz.correct} • Cần 5`}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setRiverQuiz(null); setRiverQuizResult(null); }}>✖ {en ? "Exit" : "Thoát"}</Button>
            </div>
            <QuestionView question={riverQuiz.question} onAnswer={handleRiverQuizAnswer} disabled={!!riverQuizResult} />
            {riverQuizResult && <div className="mt-4 text-center text-xl font-black">{riverQuizResult}</div>}
          </div>
        </div>
      )}

      {/* Boom modal — BẮT BUỘC trả lời đúng mới biến mất. Sai → câu mới. */}
      {boom && (
        <div className="absolute inset-0 bg-black/70 z-40 flex items-center justify-center p-3 md:p-6">
          <div className="glass-card max-w-2xl w-full p-5 md:p-7 max-h-[90vh] overflow-y-auto border-4 border-red-500">
            <div className="mb-3">
              <div className="text-base md:text-lg font-black text-red-700 animate-pulse">
                 💣 {en ? `YOU STEPPED ON A BOMB! Answer CORRECTLY to escape (✅ +10 coins • ❌ −5 coins)${boom.tries > 0 ? ` • Attempt ${boom.tries + 1}` : ""}` : `BẠN ĐÃ ĐẠP TRÚNG BOOM! Phải trả lời ĐÚNG để thoát (✅ +10đ • ❌ −5đ)${boom.tries > 0 ? ` • Lần ${boom.tries + 1}` : ""}`}
              </div>
            </div>
            <QuestionView question={boom.q} onAnswer={handleBoomAnswer} disabled={!!boomResult} />
            {boomResult && (
              <div className="mt-4 text-center font-black text-xl md:text-2xl">{boomResult}</div>
            )}
          </div>
        </div>
      )}

      {/* Modal chỉnh nội dung bảng tên nhà */}
      {signEditId && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-3 md:p-6" onClick={() => setSignEditId(null)}>
          <div className="glass-card max-w-md w-full p-4 md:p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 gap-2">
               <h3 className="text-lg md:text-xl font-black">🪧 {en ? "House sign" : "Bảng tên nhà"}</h3>
               <button onClick={() => setSignEditId(null)} className="toy-button !text-xs !py-1 !px-3">✖ {en ? "Close" : "Đóng"}</button>
            </div>
             <p className="text-xs text-stone-700 mb-2">{en ? `Up to ${SIGN_LABEL_MAX} characters. You can use emoji 🏠✨🐶.` : `Tối đa ${SIGN_LABEL_MAX} ký tự. Bạn có thể dùng emoji 🏠✨🐶.`}</p>
            <input
              autoFocus
              value={signDraft}
              onChange={(e) => setSignDraft(e.target.value.slice(0, SIGN_LABEL_MAX))}
              maxLength={SIGN_LABEL_MAX}
               placeholder={en ? "Home of…" : "Nhà của ..."}
              className="w-full px-3 py-2 rounded-xl border-2 border-amber-300 focus:border-amber-500 outline-none font-bold mb-2"
            />
            <div className="text-[11px] text-stone-500 mb-3 text-right">{signDraft.length}/{SIGN_LABEL_MAX}</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!user || !signEditId) return;
                  const next = { ...signLabels };
                  if (next[signEditId]) delete next[signEditId];
                  setSignLabels(next);
                  saveSignLabels(user.id, next);
                  setSignEditId(null);
                  flash(en ? "🪧 Sign text cleared" : "🪧 Đã xoá nội dung bảng");
                }}
                className="toy-button !text-xs !py-2 !px-3"
               >{en ? "Clear" : "Xoá nội dung"}</button>
              <button
                onClick={() => {
                  if (!user || !signEditId) return;
                  const next = { ...signLabels, [signEditId]: signDraft.trim() };
                  setSignLabels(next);
                  saveSignLabels(user.id, next);
                  setSignEditId(null);
                  flash(en ? "✅ House sign updated" : "✅ Đã cập nhật bảng tên");
                }}
                className="toy-button toy-button-primary !text-sm !py-2 !px-4 flex-1"
               >{en ? "Save" : "Lưu"}</button>
            </div>
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
