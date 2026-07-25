import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Suspense, lazy } from "react";
import { getVisitableHouse, setPresence } from "@/lib/friend-houses.functions";

const GameWorld = lazy(() => import("@/game/GameWorld"));

export const Route = createFileRoute("/visit/$ownerId")({
  component: VisitPage,
  head: () => ({
    meta: [
      { title: "Thăm nhà · Vệ binh số" },
      { name: "description", content: "Tham quan nhà của bạn bè trong Vệ binh số." },
      { property: "og:title", content: "Thăm nhà · Vệ binh số" },
      { property: "og:description", content: "Chuyến thăm nhà bạn bè trong Vệ binh số." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function VisitPage() {
  const { ownerId } = Route.useParams();
  const navigate = useNavigate();
  const fetchFn = useServerFn(getVisitableHouse);
  const presenceFn = useServerFn(setPresence);

  const q = useQuery({
    queryKey: ["visit-house", ownerId],
    queryFn: () => fetchFn({ data: { ownerId } }),
    retry: false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [activeFloor, setActiveFloor] = useState(0);

  useEffect(() => {
    if (!q.data) return;
    // Announce presence when snapshot loads
    presenceFn({ data: { in_house_owner: ownerId } }).catch(() => {});
    // R3F Canvas can boot at its default 300x150 when mounted inside Suspense
    // on a fixed-position container — nudge it to remeasure once data is in.
    const kick = () => window.dispatchEvent(new Event("resize"));
    kick();
    const t1 = setTimeout(kick, 60);
    const t2 = setTimeout(kick, 300);
    const t3 = setTimeout(kick, 900);
    const clear = () => { presenceFn({ data: { in_house_owner: null } }).catch(() => {}); };
    window.addEventListener("beforeunload", clear);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("beforeunload", clear);
      clear();
    };
  }, [q.data, ownerId, presenceFn]);

  const emptyHandlers = useMemo(() => ({
    onRotate: () => {},
    onPlace: () => {},
    onRemove: () => {},
    onPillarClick: () => {},
    onWallRemove: () => {},
    onRoofRemove: () => {},
    onFloorRemove: () => {},
  }), []);

  if (q.isLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-emerald-50">
        <div className="text-center">
          <div className="text-5xl mb-2 animate-spin inline-block">🏠</div>
          <p className="font-black">Đang mở cửa nhà…</p>
        </div>
      </main>
    );
  }

  if (q.error) {
    const msg = (q.error as Error).message || "Căn nhà này hiện không mở cho bạn tham quan.";
    return (
      <main className="min-h-screen grid place-items-center bg-emerald-50 p-4">
        <div className="glass-card p-6 text-center max-w-sm">
          <div className="text-5xl mb-2">🔒</div>
          <h1 className="text-xl font-black mb-2">Nơi ở riêng tư</h1>
          <p className="text-sm text-muted-foreground mb-4">{msg}</p>
          <button
            onClick={() => navigate({ to: "/friends-map" })}
            className="toy-button toy-button-primary w-full"
          >
            ← Quay lại bản đồ
          </button>
        </div>
      </main>
    );
  }

  const snap = q.data!;
  const maxFloor = Math.max(
    0,
    ...snap.floors.map((f) => f.floor),
    ...snap.walls.map((w) => w.floor),
    ...snap.roofs.map((r) => r.floor),
    ...snap.placed.map((p) => p.floor),
  );

  return (
    <main className="fixed inset-0 bg-black">
      <Suspense fallback={<div className="text-white p-4">Đang tải cảnh 3D...</div>}>
        <GameWorld
          placed={snap.placed}
          walls={snap.walls}
          roofs={snap.roofs}
          floors={snap.floors}
          wallColor={"#f5e6c8"}
          wallMode={false}
          wallPickA={null}
          roofMode={false}
          roofPicks={[]}
          floorMode={false}
          floorPicks={[]}
          selectedItemId={null}
          rotation={0}
          activeFloor={activeFloor}
          editingId={null}
          {...emptyHandlers}
        />
      </Suspense>

      {/* HUD */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 items-center pointer-events-none">
        <div className="pointer-events-auto glass-card px-4 py-3 flex items-center gap-3 shadow-lg border-4 border-orange-300">
          {snap.owner.avatar_url ? (
            <img src={snap.owner.avatar_url} className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-orange-400" alt="" />
          ) : (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-orange-400 text-white grid place-items-center font-black text-xl md:text-2xl border-2 border-orange-500">
              {(snap.owner.username || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="leading-tight">
            <div className="text-lg md:text-2xl font-black text-orange-700">
              🏠 {snap.owner.house_name || `Nhà của ${snap.owner.display_name || snap.owner.username}`}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground font-bold">
              Chủ nhà: <span className="text-orange-600">@{snap.owner.username}</span>
              {snap.owner.coop_build && <> · 🔨 Cho phép cùng xây</>}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => navigate({ to: "/game" })}
          className="pointer-events-auto toy-button toy-button-primary !text-sm"
        >
          🚪 Rời nhà
        </button>
      </div>

      {maxFloor > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
          {Array.from({ length: maxFloor + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => setActiveFloor(i)}
              className={`px-3 py-2 rounded-xl text-sm font-black border-2 ${
                activeFloor === i
                  ? "bg-orange-400 border-orange-500 text-white"
                  : "bg-white/90 border-white"
              }`}
            >
              Tầng {i + 1}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
