import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_OUTFIT, loadOutfit, saveOutfit, type Outfit } from "@/lib/character";
import { generateOutfit } from "@/lib/ai.functions";

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
  return (
    <div className="flex items-end justify-center h-56 bg-gradient-to-b from-sky-200 to-emerald-200 rounded-2xl overflow-hidden">
      <svg viewBox="0 0 80 160" className="h-52">
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
        {/* head */}
        <circle cx="40" cy="42" r="18" fill={o.skin} />
        {/* hair */}
        <path d="M22 38 Q40 18 58 38 Q58 28 40 22 Q22 28 22 38 Z" fill={o.hair} />
        {/* hat */}
        {o.hat && <path d="M20 30 Q40 14 60 30 L56 32 Q40 22 24 32 Z" fill={o.hat} />}
        {/* eyes */}
        <circle cx="34" cy="44" r="2" fill="#111" />
        <circle cx="46" cy="44" r="2" fill="#111" />
        <path d="M34 52 Q40 56 46 52" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" />
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

  useEffect(() => {
    if (!getCurrentUser()) navigate({ to: "/login" });
    const existing = loadOutfit();
    if (existing) { setOutfit(existing); setDesc(existing.description); }
  }, [navigate]);

  const handleGenerate = async () => {
    if (!desc.trim()) { setErr("Hãy mô tả bộ trang phục bạn muốn"); return; }
    setErr(null); setLoading(true);
    try {
      const colors = await gen({ data: { description: desc } });
      setOutfit({ description: desc, ...colors });
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

          <PreviewCharacter o={outfit} />

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
            <Swatch label="Tóc" color={outfit.hair} />
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
        </div>
      </div>
    </GameLayout>
  );
}
