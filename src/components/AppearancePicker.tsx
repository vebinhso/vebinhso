import { useLocale } from "@/lib/locale";
import { BODY_SHAPES, EXPRESSIONS, FACE_SHAPES, SKIN_TONES, exprOf } from "@/lib/appearance";
import { FaceSvg } from "./FaceSvg";
import type { Outfit } from "@/lib/character";

export function AppearancePicker({ o, onChange }: { o: Outfit; onChange: (p: Partial<Outfit>) => void }) {
  const en = useLocale() === "en";
  const card = (on: boolean) => `rounded-xl border-2 p-1.5 bg-card/80 flex flex-col items-center gap-1 ${on ? "border-primary" : "border-border"}`;
  const title = (vi: string, e: string) => <div className="text-sm font-black mb-2">{en ? e : vi}</div>;
  const face = o.faceShape ?? "oval";
  const expr = exprOf(o.expression);
  const body = o.bodyShape ?? "rectangle";

  return (
    <div className="mt-4 space-y-5">
      <p className="text-xs font-bold text-muted-foreground">{en ? "Appearance changes are free." : "Đổi ngoại hình miễn phí."}</p>
      <section>
        {title("Màu da", "Skin tone")}
        <div className="grid grid-cols-10 gap-1.5">
          {SKIN_TONES.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => onChange({ skin: c })}
              className={`aspect-square rounded-lg border-2 ${o.skin === c ? "border-primary scale-110" : "border-border"}`} style={{ background: c }} />
          ))}
        </div>
      </section>
      <section>
        {title("Khuôn mặt", "Face shape")}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {FACE_SHAPES.map((f) => (
            <button key={f.id} type="button" onClick={() => onChange({ faceShape: f.id })} className={card(face === f.id)}>
              <svg viewBox="18 18 44 50" className="h-12"><path d={f.d} fill={o.skin} stroke="#00000040" /><FaceSvg e={expr} /></svg>
              <span className="text-[11px] font-bold">{en ? f.en : f.vi}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        {title("Cảm xúc", "Expression")}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {EXPRESSIONS.map((x) => (
            <button key={x.id} type="button" onClick={() => onChange({ expression: x.id })} className={card(expr === x.id)}>
              <svg viewBox="20 22 40 42" className="h-11"><circle cx="40" cy="43" r="19" fill={o.skin} stroke="#00000040" /><FaceSvg e={x.id} /></svg>
              <span className="text-[10px] font-bold text-center leading-tight">{en ? x.en : x.vi}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        {title("Dáng người", "Body shape")}
        <div className="grid grid-cols-5 gap-2">
          {BODY_SHAPES.map((b) => (
            <button key={b.id} type="button" onClick={() => onChange({ bodyShape: b.id })} className={card(body === b.id)}>
              <svg viewBox="0 0 40 50" className="h-14">
                <path d={`M${20 - b.top / 2} 4 L${20 + b.top / 2} 4 L${20 + b.waist / 2} 24 L${20 + b.hip / 2} 46 L${20 - b.hip / 2} 46 L${20 - b.waist / 2} 24 Z`}
                  transform="scale(1 1)" fill={o.skin} stroke="#00000040" style={{ transformOrigin: "20px 25px", transform: "scaleX(0.9)" }} />
              </svg>
              <span className="text-[10px] font-bold text-center leading-tight">{en ? b.en : b.vi}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
