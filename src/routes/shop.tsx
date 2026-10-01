import { createFileRoute, Link } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useState } from "react";
import { ItemThumb, ThumbnailBaker, matchItem } from "@/game/ItemThumbs";
import { CATALOG, CATEGORIES, catalogLabel } from "@/game/catalog";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/shop")({ component: ShopPage });

function ShopPage() {
  const en = useLocale() === "en";
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Vật liệu");
  const [q, setQ] = useState("");
  return (
    <GameLayout showBack>
      <div className="p-4 md:p-8 max-w-6xl w-full mx-auto">
        <div className="glass-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h1 className="text-2xl md:text-3xl font-black">🛒 {en ? "SHOP" : "CỬA HÀNG"}</h1>
            <Link to="/game" className="toy-button toy-button-primary !text-sm">
              🏗️ {en ? "Open the home map to buy and place items" : "Vào bản đồ nhà để mua & đặt"}
            </Link>
          </div>

          <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={en ? "🔍 Search items (sofa, TV, fan...)" : "🔍 Tìm đồ (sofa, tivi, quạt...)"}
            className="w-full mb-3 rounded-full border-2 border-amber-300 bg-white px-4 py-2 text-sm font-bold outline-none focus:border-amber-500" />
          <ThumbnailBaker />
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`toy-button !text-xs !py-2 !px-3 ${
                  cat === c ? "toy-button-primary !text-xs !py-2 !px-3" : ""
                }`}
              >
                {catalogLabel(c, en)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(q.trim() ? CATALOG.filter((it) => matchItem(it, q, catalogLabel(it.name, en))) : CATALOG.filter((it) => it.category === cat)).map((it) => (
              <div
                key={it.id}
                className="relative rounded-3xl p-3 text-center border-2 border-amber-200 shadow-lg transition-transform hover:-translate-y-1 hover:rotate-[-1deg]"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, #fffaf0 0%, #ffe8b8 55%, #f7c573 100%)",
                  boxShadow:
                    "0 10px 22px -10px rgba(180,120,0,0.55), inset 0 -6px 0 rgba(0,0,0,0.06), inset 0 4px 0 rgba(255,255,255,0.6)",
                }}
              >
                <div
                  className="mx-auto w-full aspect-square max-w-[140px] rounded-2xl overflow-hidden flex items-center justify-center text-4xl mb-1"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, #ffffff 0%, #fff3c8 50%, #f0b94f 100%)",
                    boxShadow: "inset 0 -4px 8px rgba(120,60,0,0.25), 0 4px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <ItemThumb item={it} className="w-full h-full" />
                </div>
                <div className="font-black text-sm leading-tight">{catalogLabel(it.name, en)}</div>
                <div className="text-[10px] text-amber-900/70 font-bold">
                  {it.w}×{it.d}×{it.h} {en ? "cells" : "ô"}
                </div>
                <div className="mt-1 inline-block px-2 py-0.5 rounded-full bg-amber-900 text-amber-100 text-xs font-black">
                  💰 {it.price} {en ? "coins" : "đ"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
