import { createFileRoute, useNavigate } from "@tanstack/react-router";
import houseAvatar from "@/assets/house-avatar.png.asset.json";
import { GameLayout } from "@/components/GameLayout";
import { lazy, Suspense, useEffect, useState } from "react";
const CharacterPreview3D = lazy(() => import("@/game/CharacterPreview3D"));
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_OUTFIT, loadOutfit, saveOutfit, type Outfit } from "@/lib/character";
import { generateOutfit } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { PasteDropZone } from "@/components/PasteDropZone";
import { HairPicker } from "@/components/HairPicker";
import { HairBack, HairFront } from "@/components/HairSvg";
import { DEFAULT_HAIR_STYLE, isHairStyle, type HairStyleId } from "@/lib/hair";
import { useLocale } from "@/lib/locale";
import { AccessoryPicker } from "@/components/AccessoryPicker";
import { AccessorySvg } from "@/components/AccessorySvg";
import { equippedBySlot } from "@/lib/accessories";
import { AppearancePicker } from "@/components/AppearancePicker";
import { FaceSvg } from "@/components/FaceSvg";
import { bodyOf, exprOf, faceOf } from "@/lib/appearance";
import { bottomOf, topOf } from "@/lib/clothes";
import { ClothesDefs, RangerHelmet, TopEmblem, bottomFill, topFill } from "@/components/ClothesSvg";
import { BottomShape, ClothesPicker } from "@/components/ClothesPicker";

export const Route = createFileRoute("/character")({ component: CharacterPage });

const PRESETS = [
  "Áo thun đỏ, quần jean xanh, mũ lưỡi trai vàng, giày thể thao trắng",
  "Áo giáp ninja đen, khăn che mặt, găng tay bạc",
  "Áo hoodie tím neon, quần đen, giày phát sáng xanh",
  "Bộ đồ phù thuỷ xanh đậm với mũ phù thuỷ và sao vàng",
  "Áo cam rực, quần ngắn nâu, mũ thám hiểm khaki",
];

function Swatch({ label, color }: { label: string; color?: string }) {
  if (!color) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-black/10 text-xs font-bold">
      <span className="w-5 h-5 rounded-full border border-black/30" style={{ background: color }} />
      <span>{label}</span>
      <span className="text-muted-foreground">{color}</span>
    </div>
  );
}

function PreviewCharacter({ o }: { o: Outfit }) {
  const acc = equippedBySlot(o.accessories);
  const b = bodyOf(o.bodyShape);
  const hs = isHairStyle(o.hairStyle) ? o.hairStyle : DEFAULT_HAIR_STYLE;
  const top = topOf(o.topStyle);
  const bot = bottomOf(o.bottomStyle);
  const uid = "pv";
  const shirtFill = top ? topFill(top, uid) : o.shirt;
  const helmet = top?.helmet;
  const torsoBottom = top?.long ? 128 : 101;
  return (
    <div className="flex items-end justify-center h-56 bg-gradient-to-b from-sky-200 to-emerald-200 rounded-2xl overflow-hidden">
      <svg viewBox="0 0 80 160" className="h-52">
        <ClothesDefs top={top} bottom={bot} uid={uid} />
        {!acc.head && !helmet && <HairBack style={hs} color={o.hair} />}
        {/* legs (skin under skirts/shorts) */}
        {bot && bot.kind !== "pants" && bot.kind !== "wide" && (
          <g fill={o.skin}><rect x="29" y="100" width="8" height="40" rx="3" /><rect x="43" y="100" width="8" height="40" rx="3" /></g>
        )}
        {bot ? <BottomShape b={bot} fill={bottomFill(bot, uid)} /> : (
          <>
            <rect x="28" y="100" width="10" height="40" rx="3" fill={o.pants} />
            <rect x="42" y="100" width="10" height="40" rx="3" fill={o.pants} />
          </>
        )}
        {/* shoes */}
        <rect x="27" y="138" width="12" height="6" rx="2" fill={o.shoes} />
        <rect x="41" y="138" width="12" height="6" rx="2" fill={o.shoes} />
        {/* body */}
        <path d={`M${40 - b.top / 2} 62 Q40 58 ${40 + b.top / 2} 62 L${40 + b.waist / 2} 82 L${40 + b.hip / 2 + (top?.long ? 2 : 0)} ${torsoBottom} L${40 - b.hip / 2 - (top?.long ? 2 : 0)} ${torsoBottom} L${40 - b.waist / 2} 82 Z`} fill={shirtFill} />
        {/* accent belt */}
        {!top && <rect x={40 - b.hip / 2} y="96" width={b.hip} height="5" fill={o.accent} />}
        {top?.hood && <path d="M28 62 Q40 70 52 62 L50 60 Q40 66 30 60 Z" fill={top.color2 === "#111111" ? "#e5e5e5" : top.color2} opacity="0.7" />}
        {top && <TopEmblem t={top} />}
        {/* arms */}
        <rect x={30 - b.top / 2} y="62" width="10" height="40" rx="4" fill={shirtFill} />
        <rect x={50 + b.top / 2} y="62" width="10" height="40" rx="4" fill={shirtFill} />
        {/* hands */}
        <circle cx="19" cy="105" r="5" fill={helmet ? "#ffffff" : o.skin} />
        <circle cx="61" cy="105" r="5" fill={helmet ? "#ffffff" : o.skin} />
        {acc.neck && <AccessorySvg id={acc.neck} hair={o.hair} />}
        {acc.wrist && <AccessorySvg id={acc.wrist} hair={o.hair} />}
        {acc.finger && <AccessorySvg id={acc.finger} hair={o.hair} />}
        {acc.head && !helmet && <AccessorySvg id={acc.head} hair={o.hair} />}
        {/* head */}
        <path d={faceOf(o.faceShape).d} fill={o.skin} />
        {helmet ? <RangerHelmet color={top!.color} /> : (
          <>
            {!acc.head && <HairFront style={hs} color={o.hair} />}
            {o.hat && !acc.head && <path d="M20 30 Q40 14 60 30 L56 32 Q40 22 24 32 Z" fill={o.hat} />}
            <FaceSvg e={exprOf(o.expression)} />
            {acc.beard && <AccessorySvg id={acc.beard} hair={o.hair} />}
          </>
        )}
      </svg>
    </div>
  );
}

function CharacterPage() {
  const navigate = useNavigate();
  const [desc, setDesc] = useState("");
  const [outfit, setOutfit] = useState<Outfit>(DEFAULT_OUTFIT);
  const [loading, setLoading] = useState(false);
  const [view3d, setView3d] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [err, setErr] = useState<string | null>(null);
  const gen = useServerFn(generateOutfit);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const en = useLocale() === "en";
  const [tab, setTab] = useState<"look" | "hair" | "shirt" | "pants" | "accessory">("hair");
  const [preview, setPreview] = useState<{ style: HairStyleId; color: string } | null>(null);
  const currentHairStyle: HairStyleId = isHairStyle(outfit.hairStyle) ? outfit.hairStyle : DEFAULT_HAIR_STYLE;
  const shown: Outfit = preview ? { ...outfit, hairStyle: preview.style, hair: preview.color } : outfit;
  // Lưu ngay thay đổi tóc đã trả phí để không mất khi rời trang.
  const commitHair = (patch: Partial<Outfit>) => {
    setOutfit((prev) => {
      const next = { ...prev, ...patch };
      saveOutfit({ ...next, description: desc || next.description });
      return next;
    });
  };

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate({ to: "/login" }); return; }
    const existing = loadOutfit();
    if (existing) { setOutfit(existing); setDesc(existing.description); }
    supabase.from("profiles").select("avatar_url").eq("user_id", u.id).maybeSingle()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url); });
  }, [navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadAvatarFile(file);
  };

  const uploadAvatarFile = async (file: File) => {
    const u = getCurrentUser();
    if (!u) return;
    if (!file.type.startsWith("image/")) { setErr("Vui lòng chọn tệp ảnh"); return; }
    if (file.size > 2 * 1024 * 1024) { setErr("Ảnh tối đa 2MB"); return; }
    setErr(null); setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${u.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", u.id);
      setAvatarUrl(publicUrl);
      // Refresh in-memory user cache so trang chủ hiển thị avatar mới ngay
      const { setCurrentUserCache } = await import("@/lib/auth");
      setCurrentUserCache({ ...u, avatarUrl: publicUrl });
    } catch (e: any) {
      setErr(e?.message || "Lỗi tải ảnh");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!desc.trim()) { setErr("Hãy mô tả bộ trang phục bạn muốn"); return; }
    setErr(null); setLoading(true);
    try {
      const colors = await gen({ data: { description: desc } });
      setOutfit((prev) => ({ ...prev, description: desc, ...colors, hair: prev.hair, hairStyle: prev.hairStyle, skin: prev.skin }));
    } catch (e: any) {
      setErr(e?.message || "Lỗi tạo trang phục");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    saveOutfit({ ...outfit, description: desc || outfit.description });
    navigate({ to: "/play" });
  };

  return (
    <GameLayout showBack>
      <div className="flex-1 flex items-start justify-center p-4">
        <div className="glass-card max-w-2xl w-full p-6 md:p-8">
          <div className="text-center mb-4">
            <div className="text-5xl mb-1">🧥</div>
            <h1 className="text-2xl font-black">THIẾT KẾ NHÂN VẬT BẰNG AI</h1>
            <p className="text-xs font-bold text-muted-foreground">
              Cao 2 ô × rộng 1 ô · Mô tả bộ đồ rồi để AI lên màu cho bạn
            </p>
          </div>

          <div className="mb-4 flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full bg-white/70 border-2 border-black/20 overflow-hidden flex items-center justify-center text-4xl">
              {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <img src={houseAvatar.url} alt="Vệ Binh Số" className="w-full h-full object-contain" />}
            </div>
            <PasteDropZone onFile={uploadAvatarFile} className="p-2" hint="Ctrl+V để dán ảnh · hoặc kéo thả ảnh vào đây">
              <label className="toy-button !text-sm py-2 px-4 cursor-pointer">
                {uploading ? "Đang tải..." : "📷 Tải ảnh đại diện"}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </PasteDropZone>
            <p className="text-xs font-bold text-muted-foreground">Ảnh tối đa 2MB · JPG, PNG</p>
          </div>

          <div className="relative">
            {view3d && mounted ? (
              <div className="h-72 bg-gradient-to-b from-sky-200 to-emerald-200 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing">
                <Suspense fallback={<PreviewCharacter o={shown} />}>
                  <CharacterPreview3D o={shown} />
                </Suspense>
              </div>
            ) : <PreviewCharacter o={shown} />}
            <button type="button" onClick={() => setView3d((v) => !v)} className="absolute top-2 right-2 toy-button !text-xs py-1 px-3">
              {view3d ? "2D" : "3D"}
            </button>
            {view3d && <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-bold text-foreground/70 pointer-events-none">{en ? "Drag to rotate · scroll to zoom" : "Kéo để xoay · cuộn để phóng to"}</p>}
          </div>

          <div className="grid grid-cols-5 gap-2 mt-4">
            {([
              ["look", en ? "Look" : "Ngoại hình"],
              ["hair", en ? "Hair" : "Tóc"],
              ["shirt", en ? "Shirt" : "Áo"],
              ["pants", en ? "Pants" : "Quần"],
              ["accessory", en ? "Accessories" : "Phụ kiện"],
            ] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={`toy-button !text-sm py-2 ${tab === k ? "toy-button-primary" : ""}`}>{label}</button>
            ))}
          </div>

          {tab === "hair" ? (
            <HairPicker
              currentStyle={currentHairStyle}
              hasChosen={isHairStyle(outfit.hairStyle)}
              currentColor={outfit.hair}
              previewStyle={preview?.style ?? currentHairStyle}
              previewColor={preview?.color ?? outfit.hair}
              onPreview={(style, color) => setPreview({ style, color })}
              onApplyStyle={(style) => { commitHair({ hairStyle: style }); setPreview((p) => p ? { ...p, style } : null); }}
              onApplyColor={(color) => { commitHair({ hair: color }); setPreview((p) => p ? { ...p, color } : null); }}
            />
          ) : tab === "look" ? (
            <AppearancePicker o={outfit} onChange={commitHair} />
          ) : tab === "shirt" || tab === "pants" ? (
            <ClothesPicker kind={tab === "shirt" ? "top" : "bottom"} o={outfit} onChange={commitHair} />
          ) : tab === "accessory" ? (
            <AccessoryPicker
              owned={outfit.accessoriesOwned}
              equipped={outfit.accessories}
              hair={outfit.hair}
              skin={outfit.skin}
              onChange={(accessoriesOwned, accessories) => commitHair({ accessoriesOwned, accessories })}
            />
          ) : (
          <>



          <div className="mt-4">
            <label className="block text-sm font-black mb-2">Mô tả trang phục</label>
            <textarea
              className="w-full rounded-xl border-2 border-black/20 p-3 font-bold text-sm bg-white/80"
              rows={3}
              placeholder="VD: Áo khoác đỏ, quần đen, mũ vàng, giày thể thao trắng..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={500}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setDesc(p)} className="text-xs font-bold px-3 py-1 rounded-full bg-white/70 border border-black/10 hover:bg-white">
                  {p.split(",")[0]}…
                </button>
              ))}
            </div>
          </div>

          {err && <div className="mt-3 text-sm font-bold text-red-600">{err}</div>}

          <div className="flex flex-wrap gap-2 mt-3">
            <Swatch label="Da" color={outfit.skin} />
            <Swatch label="Áo" color={outfit.shirt} />
            <Swatch label="Quần" color={outfit.pants} />
            <Swatch label="Giày" color={outfit.shoes} />
            {outfit.hat && <Swatch label="Mũ" color={outfit.hat} />}
            <Swatch label="Nhấn" color={outfit.accent} />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="toy-button !text-base py-3"
            >
              {loading ? "⏳ Đang tạo..." : "✨ AI lên màu"}
            </button>
            <button onClick={handleSave} className="toy-button toy-button-primary !text-base py-3">
              ✅ Lưu & Chơi
            </button>
          </div>
          </>
          )}
          {tab !== "hair" && tab !== "shirt" && tab !== "pants" && tab !== "accessory" && tab !== "look" ? null : (
            <button onClick={handleSave} className="toy-button toy-button-primary !text-base py-3 w-full mt-5">
              {en ? "✅ Save & Play" : "✅ Lưu & Chơi"}
            </button>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
