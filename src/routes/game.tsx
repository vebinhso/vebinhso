import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { getCurrentUser, type Account } from "@/lib/auth";
import { loadGame, saveGame, computeLevel, nextLevelInfo, type GameState, type PlacedItem } from "@/lib/game";
import { CATALOG, CATEGORIES, getItem } from "@/game/catalog";
import { randomQuestion, type Question } from "@/game/questions";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const u = getCurrentUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setUser(u);
    setState(loadGame());
  }, [navigate]);

  useEffect(() => {
    if (state) saveGame(state);
  }, [state]);

  if (!mounted || !user || !state) return null;

  const level = computeLevel(state);
  const lvlInfo = nextLevelInfo(state);

  const buyAndSelect = (itemId: string) => {
    const it = getItem(itemId);
    if (!it) return;
    if (state.money < it.price) {
      setQuestionResult("❌ Không đủ tiền! Trả lời câu hỏi để kiếm tiền.");
      setTimeout(() => setQuestionResult(null), 2000);
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
    const collides = state.placed.some((p) => {
      const pi = getItem(p.itemId);
      if (!pi) return false;
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
    const refund = it ? it.price : 0; // hoàn 100% vào tài khoản khi vật tư biến mất
    setState({
      ...state,
      money: state.money + refund,
      netWorth: Math.max(0, state.netWorth - (it?.price ?? 0)),
      placed: state.placed.filter((x) => x.id !== id),
    });
  };

  const openQuestion = () => {
    setQuestion(randomQuestion());
    setQuestionResult(null);
  };

  const answerQuestion = (idx: number) => {
    if (!question) return;
    if (idx === question.answer) {
      setState({
        ...state,
        money: state.money + question.reward,
        correctAnswers: state.correctAnswers + 1,
      });
      setQuestionResult(`✅ Chính xác! +${question.reward}đ`);
    } else {
      setQuestionResult(`❌ Sai rồi! Đáp án: ${question.options[question.answer]}`);
    }
    setTimeout(() => {
      setQuestion(null);
      setQuestionResult(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-sky-300 overflow-hidden select-none">
      {/* 3D scene */}
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl">Đang tải thế giới 3D...</div>}>
        <GameWorld
          placed={state.placed}
          selectedItemId={selected}
          rotation={rotation}
          onRotate={() => setRotation((r) => (r + 1) % 4)}
          onPlace={handlePlace}
          onRemove={handleRemove}
        />
      </Suspense>

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="glass-card px-4 py-2 pointer-events-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 border-2 border-white flex items-center justify-center text-xl">🐕</div>
          <div className="text-sm">
            <div className="font-black">{user.username} <span className="text-xs text-orange-700">#{user.id}</span></div>
            <div className="font-bold text-yellow-700">💰 {state.money}đ • 🏠 {state.netWorth}đ</div>
            <div className="text-xs font-bold text-blue-700">Lv.{level} • ✅ {state.correctAnswers} câu</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <Link to="/" className="toy-button text-xs !py-2 !px-3">🏡 Về trang chủ</Link>
          <button onClick={() => setShopOpen(true)} className="toy-button toy-button-primary !text-base !py-2 !px-5">🛒 CỬA HÀNG</button>
          <button onClick={openQuestion} className="toy-button toy-button-green !text-sm !py-2 !px-4">❓ KIẾM TIỀN</button>
        </div>
      </div>

      {/* Level progress */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 glass-card px-4 py-2 pointer-events-none hidden md:block">
        <div className="text-xs font-black text-center">CẤP {level} → CẤP {lvlInfo.next}</div>
        <div className="text-[10px] font-bold text-muted-foreground">
          💰 Tài khoản {state.money}/{lvlInfo.moneyNeeded}đ • 🏠 Tài sản ròng {state.netWorth}đ • ✅ {state.correctAnswers}/{lvlInfo.questionsNeeded}
        </div>
      </div>

      {/* Bottom controls hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-xs font-bold pointer-events-none">
        🎮 WASD: Di chuyển • SPACE: Nhảy • R: Xoay vật • Chuột: Camera 360° • Click: Đặt • Chuột phải: Xóa
      </div>

      {/* Selected item indicator */}
      {selected && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-card px-4 py-2 flex items-center gap-3 pointer-events-auto">
          <span className="text-2xl">{getItem(selected)?.icon}</span>
          <div className="text-sm font-black">Đang đặt: {getItem(selected)?.name}</div>
          <button onClick={() => setSelected(null)} className="toy-button !text-xs !py-1 !px-3">Hủy</button>
        </div>
      )}

      {/* Toast result */}
      {questionResult && !question && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 glass-card px-5 py-3 font-black text-base animate-bounce">
          {questionResult}
        </div>
      )}

      {/* Shop modal */}
      {shopOpen && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4" onClick={() => setShopOpen(false)}>
          <div className="glass-card max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b-2 border-white/50 flex items-center justify-between">
              <h2 className="text-2xl font-black">🛒 CỬA HÀNG VỆ BINH</h2>
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
            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {CATALOG.filter((c) => c.category === activeCat).map((it) => {
                const canAfford = state.money >= it.price;
                return (
                  <div
                    key={it.id}
                    className="relative rounded-3xl p-3 text-center border-2 border-amber-200 transition-transform hover:-translate-y-1"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 20%, #fffaf0 0%, #ffe8b8 55%, #f7c573 100%)",
                      boxShadow:
                        "0 12px 22px -10px rgba(180,120,0,0.55), inset 0 -6px 0 rgba(0,0,0,0.07), inset 0 4px 0 rgba(255,255,255,0.6)",
                    }}
                  >
                    <div
                      className="mx-auto w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-1"
                      style={{
                        background:
                          "radial-gradient(circle at 35% 30%, #ffffff 0%, #fff3c8 50%, #f0b94f 100%)",
                        boxShadow:
                          "inset 0 -4px 8px rgba(120,60,0,0.25), 0 4px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      {it.icon}
                    </div>
                    <div className="font-black text-sm mt-1 line-clamp-1">{it.name}</div>
                    <div className="text-[10px] text-amber-900/70 font-bold">
                      {it.w}×{it.d} ô
                    </div>
                    <div className="inline-block px-2 py-0.5 mt-1 rounded-full bg-amber-900 text-amber-100 text-xs font-black">
                      💰 {it.price}đ
                    </div>
                    <button
                      onClick={() => buyAndSelect(it.id)}
                      disabled={!canAfford}
                      className={`toy-button !text-xs !py-1 !px-3 mt-2 w-full ${
                        canAfford ? "toy-button-primary !text-xs !py-1 !px-3" : "opacity-50"
                      }`}
                    >
                      {canAfford ? "MUA & ĐẶT" : "Hết tiền"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Question modal */}
      {question && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6">
            <div className="text-xs font-bold text-orange-700 mb-2">❓ Trả lời đúng để +{question.reward}đ</div>
            <h3 className="text-lg font-black mb-4">{question.q}</h3>
            <div className="grid grid-cols-1 gap-2">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => answerQuestion(i)}
                  disabled={!!questionResult}
                  className="toy-button !text-sm !py-2 w-full justify-start"
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>
            {questionResult && (
              <div className="mt-4 text-center font-black text-lg">{questionResult}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
