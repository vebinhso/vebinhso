import { createFileRoute, useNavigate } from "@tanstack/react-router";
import houseAvatar from "@/assets/house-avatar.png.asset.json";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
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
  const hs = isHairStyle(o.hairStyle) ? o.hairStyle : DEFAULT_HAIR_STYLE;
  return (
    <div className="flex items-end justify-center h-56 bg-gradient-to-b from-sky-200 to-emerald-200 rounded-2xl overflow-hidden">
      <svg viewBox="0 0 80 160" className="h-52">
        {!acc.head && <HairBack style={hs} color={o.hair} />}
        {/* legs */}
        <rect x="28" y="100" width="10" height="40" rx="3" fill={o.pants} />
        <rect x="42" y="100" width="10" height="40" rx="3" fill={o.pants} />
        {/* shoes */}
        <rect x="27" y="138" width="12" height="6" rx="2" fill={o.shoes} />
        <rect x="41" y="138" width="12" height="6" rx="2" fill={o.shoes} />
        {/* body */}
        <rect x="24" y="60" width="32" height="46" rx="6" fill={o.shirt} />
        {/* accent belt */}
        <rect x="24" y="96" width="32" height="5" fill={o.accent} />
        {/* arms */}
        <rect x="14" y="62" width="10" height="40" rx="4" fill={o.shirt} />
        <rect x="56" y="62" width="10" height="40" rx="4" fill={o.shirt} />
        {/* hands */}
        <circle cx="19" cy="105" r="5" fill={o.skin} />
        <circle cx="61" cy="105" r="5" fill={o.skin} />
        {acc.neck && <AccessorySvg id={acc.neck} hair={o.hair} />}
        {acc.wrist && <AccessorySvg id={acc.wrist} hair={o.hair} />}
        {acc.finger && <AccessorySvg id={acc.finger} hair={o.hair} />}
        {acc.head && <AccessorySvg id={acc.head} hair={o.hair} />}
        {/* head */}
        <circle cx="40" cy="42" r="18" fill={o.skin} />
        {/* hair */}
        {!acc.head && <HairFront style={hs} color={o.hair} />}
        {/* hat */}
        {o.hat && !acc.head && <path d="M20 30 Q40 14 60 30 L56 32 Q40 22 24 32 Z" fill={o.hat} />}
        {/* eyes */}
        <circle cx="34" cy="44" r="2" fill="#111" />
        <circle cx="46" cy="44" r="2" fill="#111" />
        <path d="M34 52 Q40 56 46 52" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {acc.beard && <AccessorySvg id={acc.beard} hair={o.hair} />}
      </svg>
    </div>
  );
}

function CharacterPage() {
  const navigate = useNavigate();
  const [desc, setDesc] = useState("");
  const [outfit, setOutfit] = useState<Outfit>(DEFAULT_OUTFIT);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const gen = useServerFn(generateOutfit);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const en = useLocale() === "en";
  const [tab, setTab] = useState<"hair" | "shirt" | "pants" | "accessory">("hair");
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
      setOutfit((prev) => ({ ...prev, description: desc, ...colors, hair: prev.hair, hairStyle: prev.hairStyle }));
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

          <PreviewCharacter o={shown} />

          <div className="grid grid-cols-4 gap-2 mt-4">
            {([
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
        </div>
      </div>
    </GameLayout>
  );
}
