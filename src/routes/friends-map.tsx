import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listFriendHouses,
  getMyHouseSettings,
  updateHouseSettings,
  listMyFriendsForWhitelist,
  getVisitableHouse,
  type FriendHouse,
  type HousePrivacy,
  type MyHouseSettings as MyHouseData,
} from "@/lib/friend-houses.functions";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/friends-map")({
  component: FriendsMapPage,
  head: () => ({
    meta: [
      { title: "Bản đồ bạn bè · Vệ binh số" },
      { name: "description", content: "Xem nhà của bạn bè trên bản đồ và tham quan các căn nhà đang mở cửa." },
      { property: "og:title", content: "Bản đồ bạn bè · Vệ binh số" },
      { property: "og:description", content: "Ghé thăm nhà của bạn bè trong Vệ binh số." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const MAP_W = 2000;
const MAP_H = 1200;

function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

function initial(name: string) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function FriendsMapPage() {
  const me = getCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listFriendHouses);
  const mineFn = useServerFn(getMyHouseSettings);
  const updateFn = useServerFn(updateHouseSettings);
  const visitFn = useServerFn(getVisitableHouse);

  const prefetchVisit = (ownerId: string) => {
    // Warm the 3D chunk + snapshot cache so entering a house feels instant.
    import("@/game/GameWorld").catch(() => {});
    qc.prefetchQuery({
      queryKey: ["visit-house", ownerId],
      queryFn: () => visitFn({ data: { ownerId } }),
      staleTime: 30_000,
    }).catch(() => {});
  };

  const housesQ = useQuery({
    queryKey: ["friend-houses"],
    queryFn: () => listFn(),
    refetchInterval: 20_000,
    enabled: !!me,
  });
  const mineQ = useQuery({
    queryKey: ["my-house"],
    queryFn: () => mineFn(),
    enabled: !!me,
  });

  // Realtime: refresh on presence changes (throttled to avoid refetch storms)
  useEffect(() => {
    if (!me) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase
      .channel("presence-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, () => {
        if (timer) return;
        timer = setTimeout(() => {
          timer = null;
          qc.invalidateQueries({ queryKey: ["friend-houses"] });
        }, 6000);
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [me, qc]);


  const { ref, size } = useContainerSize<HTMLDivElement>();
  const scale = Math.min(size.w / MAP_W, size.h / MAP_H, 1);

  // De-collision: jitter positions that are too close (simple grid bucketing).
  const houses = useMemo<FriendHouse[]>(() => {
    const raw = housesQ.data ?? [];
    const seen = new Map<string, number>();
    return raw.map((h) => {
      const key = `${Math.round(h.map_x / 90)},${Math.round(h.map_y / 90)}`;
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      if (n === 1) return h;
      const offset = 60 * (n - 1);
      const ang = (parseInt(h.user_id.slice(0, 6), 16) % 360) * (Math.PI / 180);
      return {
        ...h,
        map_x: Math.max(60, Math.min(MAP_W - 60, h.map_x + Math.cos(ang) * offset)),
        map_y: Math.max(60, Math.min(MAP_H - 60, h.map_y + Math.sin(ang) * offset)),
      };
    });
  }, [housesQ.data]);

  const [selected, setSelected] = useState<FriendHouse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!me) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center">
          <p className="font-black mb-3">Bạn cần đăng nhập để xem bản đồ bạn bè.</p>
          <Link to="/login" className="toy-button toy-button-primary">Đăng nhập</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-emerald-50 to-sky-100">
      <header className="p-3 sm:p-4 flex items-center gap-2 flex-wrap">
        <Link to="/" className="toy-button toy-button-ghost !text-sm">← Trang chủ</Link>
        <h1 className="text-xl sm:text-2xl font-black flex-1">🗺️ Bản đồ bạn bè</h1>
        <button className="toy-button toy-button-primary !text-sm" onClick={() => setSettingsOpen(true)}>
          ⚙️ Nhà của tôi
        </button>
      </header>

      <div className="px-3 sm:px-4 pb-3 text-sm text-muted-foreground">
        {housesQ.isLoading
          ? "Đang tải bạn bè..."
          : houses.length === 0
          ? "Chưa có bạn bè nào để hiển thị. Kết bạn ở trang chủ trước nhé!"
          : `Đang hiển thị ${houses.length} căn nhà bạn bè.`}
      </div>

      <div
        ref={ref}
        className="relative mx-3 sm:mx-4 mb-4 rounded-2xl overflow-hidden border-4 border-emerald-300 bg-emerald-50 shadow-inner"
        style={{ height: "min(75vh, 800px)" }}
      >
        {/* Simulated map background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #bbf7d0 0, transparent 40%), radial-gradient(circle at 80% 60%, #bae6fd 0, transparent 45%), radial-gradient(circle at 55% 85%, #fef3c7 0, transparent 35%)",
          }}
        />
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: MAP_W, height: MAP_H, transform: `scale(${scale})` }}
        >
          <MapDecorations />
          {houses.map((h) => (
            <HouseMarker
              key={h.user_id}
              house={h}
              onHover={() => prefetchVisit(h.user_id)}
              onClick={() => { prefetchVisit(h.user_id); setSelected(h); }}
            />
          ))}
        </div>

      </div>

      {selected && (
        <HousePopup
          house={selected}
          myId={me.id}
          onClose={() => setSelected(null)}
          onVisit={() => navigate({ to: "/visit/$ownerId", params: { ownerId: selected.user_id } })}
        />
      )}

      {settingsOpen && mineQ.data && (
        <MyHouseSettings
          initial={mineQ.data as any}
          onClose={() => setSettingsOpen(false)}
          onSave={async (payload) => {
            await updateFn({ data: payload });
            await qc.invalidateQueries({ queryKey: ["my-house"] });
            await qc.invalidateQueries({ queryKey: ["friend-houses"] });
          }}
        />
      )}
    </main>
  );
}

function HouseMarker({ house, onClick, onHover }: { house: FriendHouse; onClick: () => void; onHover?: () => void }) {
  const online = house.is_online;
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onTouchStart={onHover}
      className="absolute -translate-x-1/2 -translate-y-1/2 group animate-in fade-in slide-in-from-bottom-2 duration-300 z-10"
      style={{ left: house.map_x, top: house.map_y }}
      aria-label={`Nhà của ${house.username}`}
    >
      <div className="flex flex-col items-center">
        <div className="relative transition-transform group-hover:-translate-y-2">
          <div className="text-8xl drop-shadow-2xl leading-none">🏠</div>
          <div
            className={`absolute top-1 right-1 w-6 h-6 rounded-full border-4 border-white shadow ${
              online ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
            }`}
            title={online ? "Online" : "Offline"}
          />
        </div>
        <div className="mt-2 flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-base sm:text-xl font-black shadow-2xl border-2 sm:border-4 border-emerald-400 max-w-[240px] sm:max-w-[320px] min-w-0">
          {house.avatar_url ? (
            <img src={house.avatar_url} alt="" className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 rounded-full border-2 border-emerald-300" />
          ) : (
            <span className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 rounded-full bg-orange-400 text-white grid place-items-center text-sm sm:text-base font-black border-2 border-emerald-300">
              {initial(house.username)}
            </span>
          )}
          <span className="truncate text-emerald-900 drop-shadow min-w-0">{house.house_name || house.username}</span>
        </div>
      </div>
    </button>
  );
}

function MapDecorations() {
  // Cartoon travel-map decorations: winding road, river, ponds, mountains, trees, landmarks.
  // Positions are hand-tuned around empty regions of MAP_W x MAP_H (2000x1200).
  const trees: Array<[number, number, number]> = [
    // [x, y, size]
    [520, 180, 56], [640, 260, 44], [780, 200, 60], [900, 300, 48],
    [1200, 160, 56], [1350, 240, 48], [1500, 180, 60], [1700, 260, 52],
    [1850, 360, 56], [1780, 520, 48], [1600, 640, 56], [1450, 780, 48],
    [1250, 900, 60], [1050, 1000, 52], [820, 980, 56], [560, 900, 48],
    [340, 820, 56], [220, 700, 48], [180, 520, 56], [260, 380, 48],
    [420, 480, 44], [980, 460, 44], [1080, 720, 48], [1520, 940, 56],
  ];
  const mountains: Array<[number, number, number]> = [
    [1150, 120, 1.2], [1420, 100, 1.5], [1680, 130, 1.1],
    [220, 260, 1.0], [1900, 720, 1.3],
  ];
  const landmarks: Array<[number, number, string, number]> = [
    [1550, 500, "⛲", 72],
    [420, 640, "🌳", 96],
    [1720, 980, "🎡", 96],
    [1100, 640, "🌉", 84],
    [720, 460, "🏞️", 84],
    [1380, 380, "🚂", 72],
  ];
  return (
    <svg
      width={MAP_W}
      height={MAP_H}
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
    >
      {/* Paper texture edge */}
      <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#paper)" />
      <defs>
        <radialGradient id="paper" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#fefce8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.0" />
        </radialGradient>
        <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#065f46" opacity="0.15" />
        </pattern>
      </defs>

      {/* Winding cartoon river */}
      <path
        d="M -20 300 C 300 220, 500 500, 800 420 S 1300 320, 1600 520 S 1950 780, 2100 700"
        stroke="#7dd3fc" strokeWidth="42" fill="none" strokeLinecap="round"
      />
      <path
        d="M -20 300 C 300 220, 500 500, 800 420 S 1300 320, 1600 520 S 1950 780, 2100 700"
        stroke="#bae6fd" strokeWidth="26" fill="none" strokeLinecap="round"
      />

      {/* Winding dashed road */}
      <path
        d="M 60 1100 C 400 950, 700 1050, 1000 900 S 1500 700, 1700 850 S 2000 1050, 2100 950"
        stroke="#fde68a" strokeWidth="38" fill="none" strokeLinecap="round"
      />
      <path
        d="M 60 1100 C 400 950, 700 1050, 1000 900 S 1500 700, 1700 850 S 2000 1050, 2100 950"
        stroke="#f59e0b" strokeWidth="6" fill="none" strokeDasharray="18 22" strokeLinecap="round"
      />

      {/* Ponds */}
      <ellipse cx="1750" cy="240" rx="90" ry="46" fill="#7dd3fc" opacity="0.9" />
      <ellipse cx="380" cy="1000" rx="110" ry="52" fill="#7dd3fc" opacity="0.9" />

      {/* Grass tufts pattern in corners */}
      <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#dots)" />

      {/* Mountains */}
      {mountains.map(([x, y, s], i) => (
        <g key={`m${i}`} transform={`translate(${x} ${y}) scale(${s})`}>
          <polygon points="0,120 90,0 180,120" fill="#94a3b8" />
          <polygon points="60,50 90,0 120,50 90,80" fill="#f8fafc" />
          <polygon points="140,120 210,40 280,120" fill="#a3a3a3" />
        </g>
      ))}

      {/* Trees as emoji-in-foreignObject for a hand-drawn cartoon look */}
      {trees.map(([x, y, s], i) => (
        <foreignObject key={`t${i}`} x={x - s / 2} y={y - s / 2} width={s} height={s}>
          <div style={{ fontSize: s * 0.9, lineHeight: 1, filter: "drop-shadow(0 3px 2px rgba(0,0,0,0.15))" }}>
            🌲
          </div>
        </foreignObject>
      ))}

      {/* Landmarks */}
      {landmarks.map(([x, y, emoji, s], i) => (
        <foreignObject key={`l${i}`} x={(x as number) - (s as number) / 2} y={(y as number) - (s as number) / 2} width={s as number} height={s as number}>
          <div style={{ fontSize: (s as number) * 0.9, lineHeight: 1, filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.18))" }}>
            {emoji}
          </div>
        </foreignObject>
      ))}

      {/* Compass */}
      <g transform={`translate(${MAP_W - 130} 110)`}>
        <circle r="52" fill="#fff" stroke="#0f172a" strokeWidth="4" opacity="0.9" />
        <polygon points="0,-40 10,0 0,40 -10,0" fill="#ef4444" />
        <text textAnchor="middle" y="-56" fontSize="22" fontWeight="900" fill="#0f172a">N</text>
      </g>
    </svg>
  );
}


function HousePopup({
  house, myId, onClose, onVisit,
}: { house: FriendHouse; myId: string; onClose: () => void; onVisit: () => void }) {
  const canVisit =
    house.user_id === myId ||
    house.house_privacy === "public" ||
    house.house_privacy === "friends" ||
    house.house_privacy === "custom"; // server re-validates whitelist

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div
        className="glass-card w-full max-w-sm p-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-3">
          {house.avatar_url ? (
            <img src={house.avatar_url} className="w-16 h-16 rounded-full border-4 border-orange-300" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-orange-400 text-white grid place-items-center text-2xl font-black border-4 border-orange-300">
              {initial(house.username)}
            </div>
          )}
        </div>
        <h2 className="text-xl font-black">🏠 {house.house_name || `Nhà của ${house.username}`}</h2>
        <p className="text-sm text-muted-foreground">@{house.username}</p>
        <div className="mt-2 inline-flex items-center gap-2 text-sm font-bold">
          {house.is_online ? <><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Online</> : <><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Offline</>}
        </div>
        {house.in_house_owner && (
          <p className="mt-1 text-xs text-emerald-700">Đang ở trong một căn nhà.</p>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="toy-button toy-button-ghost flex-1 !text-sm !px-3 !py-2">Đóng</button>
          {canVisit ? (
            <button onClick={onVisit} className="toy-button toy-button-primary flex-1 !text-sm !px-3 !py-2 !animate-none !rounded-2xl">🏠 Vào nhà</button>
          ) : (
            <button disabled className="toy-button toy-button-ghost flex-1 !text-sm !px-3 !py-2 opacity-60 cursor-not-allowed">🔒 Riêng tư</button>
          )}
        </div>
      </div>
    </div>
  );
}

type MyHouse = MyHouseData;

const PRIVACY_OPTIONS: { id: HousePrivacy; label: string; hint: string }[] = [
  { id: "public",  label: "🌐 Công khai", hint: "Mọi người chơi đã đăng nhập đều có thể vào thăm." },
  { id: "friends", label: "👥 Bạn bè",    hint: "Chỉ bạn bè đã chấp nhận mới vào được." },
  { id: "custom",  label: "✅ Tuỳ chỉnh", hint: "Chỉ những người bạn bạn tick chọn mới vào được." },
  { id: "closed",  label: "🚪 Đóng cửa", hint: "Không ai vào thăm được, kể cả bạn bè." },
];

function MyHouseSettings({
  initial: init, onClose, onSave,
}: { initial: MyHouse; onClose: () => void; onSave: (p: any) => Promise<void> }) {
  const [privacy, setPrivacy] = useState<HousePrivacy>(
    (init.house_privacy === "private" ? "closed" : init.house_privacy) as HousePrivacy,
  );
  const [name, setName] = useState(init.house_name ?? "");
  const [x, setX] = useState(init.map_x);
  const [y, setY] = useState(init.map_y);
  const [allowSet, setAllowSet] = useState<Set<string>>(new Set(init.house_allow_list ?? []));
  const [coop, setCoop] = useState<boolean>(!!init.coop_build);
  const [busy, setBusy] = useState(false);

  const friendsFn = useServerFn(listMyFriendsForWhitelist);
  const friendsQ = useQuery({
    queryKey: ["my-friends-whitelist"],
    queryFn: () => friendsFn(),
    enabled: privacy === "custom",
    staleTime: 30_000,
  });

  const save = async () => {
    setBusy(true);
    try {
      await onSave({
        privacy,
        house_name: name.trim() || null,
        map_x: x,
        map_y: y,
        house_allow_list: Array.from(allowSet),
        coop_build: coop,
      });
      onClose();
    } finally { setBusy(false); }
  };

  const toggleFriend = (id: string) => {
    setAllowSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-md p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-black mb-3">⚙️ Cài đặt nhà của tôi</h2>

        <label className="block text-sm font-bold mb-1">Tên căn nhà</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder={init.username}
          className="w-full mb-3 px-3 py-2 rounded-xl border-2 border-orange-200 focus:border-orange-400 outline-none"
        />

        <label className="block text-sm font-bold mb-1">Quyền tham quan</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {PRIVACY_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPrivacy(p.id)}
              className={`rounded-xl border-2 py-2 text-sm font-black transition ${
                privacy === p.id ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {PRIVACY_OPTIONS.find((p) => p.id === privacy)?.hint}
        </p>

        {privacy === "custom" && (
          <div className="mb-3">
            <div className="text-sm font-bold mb-1">Chọn bạn bè được phép vào</div>
            <div className="rounded-xl border-2 border-orange-200 max-h-48 overflow-y-auto divide-y">
              {friendsQ.isLoading && <div className="p-2 text-xs">Đang tải danh sách bạn bè…</div>}
              {friendsQ.data && friendsQ.data.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">Chưa có bạn bè để chọn.</div>
              )}
              {(friendsQ.data ?? []).map((f) => (
                <label key={f.user_id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-orange-50">
                  <input
                    type="checkbox"
                    checked={allowSet.has(f.user_id)}
                    onChange={() => toggleFriend(f.user_id)}
                  />
                  {f.avatar_url ? (
                    <img src={f.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-orange-400 text-white grid place-items-center text-xs font-black">
                      {initial(f.username)}
                    </span>
                  )}
                  <span className="text-sm">{f.display_name || f.username}</span>
                </label>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Đã chọn: {allowSet.size} bạn</div>
          </div>
        )}

        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={coop} onChange={(e) => setCoop(e.target.checked)} />
          <span className="text-sm font-bold">🔨 Cho phép bạn bè cùng xây khi vào thăm</span>
        </label>
        <p className="text-xs text-muted-foreground -mt-2 mb-3">
          Khi bật, khách được phép đặt/xoá đồ trong nhà bạn — tiền và vật liệu sẽ trừ vào tài khoản của khách.
        </p>

        <label className="block text-sm font-bold mb-1">Vị trí trên bản đồ</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="text-xs text-muted-foreground">X: {Math.round(x)}</div>
            <input type="range" min={40} max={MAP_W - 40} value={x} onChange={(e) => setX(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Y: {Math.round(y)}</div>
            <input type="range" min={40} max={MAP_H - 40} value={y} onChange={(e) => setY(Number(e.target.value))} className="w-full" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="toy-button toy-button-ghost flex-1">Huỷ</button>
          <button onClick={save} disabled={busy} className="toy-button toy-button-primary flex-1 disabled:opacity-60">
            {busy ? "Đang lưu..." : "💾 Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
