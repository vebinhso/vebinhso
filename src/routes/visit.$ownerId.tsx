import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  });

  const [activeFloor, setActiveFloor] = useState(0);

  useEffect(() => {
    // Announce presence when snapshot loads
    if (q.data) {
      presenceFn({ data: { in_house_owner: ownerId } }).catch(() => {});
    }
    const clear = () => { presenceFn({ data: { in_house_owner: null } }).catch(() => {}); };
    window.addEventListener("beforeunload", clear);
    return () => {
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
        <div className="pointer-events-auto glass-card px-3 py-2 flex items-center gap-2 shadow">
          {snap.owner.avatar_url ? (
            <img src={snap.owner.avatar_url} className="w-8 h-8 rounded-full" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-orange-400 text-white grid place-items-center font-black">
              {(snap.owner.username || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="leading-tight">
            <div className="text-sm font-black">🏠 {snap.owner.house_name || `Nhà của ${snap.owner.username}`}</div>
            <div className="text-[11px] text-muted-foreground">Đang tham quan · chỉ xem</div>
          </div>
        </div>

        <div className="flex-1" />

        <Link
          to="/friends-map"
          className="pointer-events-auto toy-button toy-button-primary !text-sm"
        >
          🚪 Rời nhà
        </Link>
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
