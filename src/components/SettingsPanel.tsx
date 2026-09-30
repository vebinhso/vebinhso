import { useEffect, useState } from "react";
import { getAudioSettings, setMasterVolume, setMuted } from "@/lib/audio";
import { useWorldToggles, setToggles } from "@/lib/world-toggles";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/lib/locale";

export function SettingsPanel({ offset = false }: { offset?: boolean }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(() => getAudioSettings());
  const wt = useWorldToggles();
  const locale = useLocale();
  const en = locale === "en";

  useEffect(() => {
    const sync = () => setS(getAudioSettings());
    window.addEventListener("audio-settings-change", sync);
    return () => window.removeEventListener("audio-settings-change", sync);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={en ? "Settings" : "Cài đặt"}
        className={`fixed top-3 z-50 w-11 h-11 rounded-full bg-white/90 border-2 border-white shadow-lg hover:scale-105 transition flex items-center justify-center text-xl ${offset ? "right-[9.5rem]" : "right-3"}`}
      >
        ⚙️
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-4 text-center">⚙️ {en ? "SETTINGS" : "CÀI ĐẶT"}</h3>

            <div className="flex items-center justify-between mb-4">
              <span className="font-bold">🌐 {en ? "Language" : "Ngôn ngữ"}</span>
              <LanguageToggle />
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="font-bold">🔊 {en ? "Sound" : "Bật âm thanh"}</span>
              <button
                onClick={() => setMuted(!s.muted)}
                className={`px-4 py-2 rounded-full font-black text-sm border-2 ${
                  s.muted
                    ? "bg-gray-300 border-gray-400 text-gray-700"
                    : "bg-emerald-500 border-emerald-700 text-white"
                }`}
              >
                {s.muted ? (en ? "OFF" : "TẮT") : (en ? "ON" : "BẬT")}
              </button>
            </div>

            <div className="mb-2 flex justify-between font-bold text-sm">
              <span>{en ? "Volume" : "Âm lượng"}</span>
              <span>{Math.round(s.master * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(s.master * 100)}
              onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
              disabled={s.muted}
              className="w-full mb-6 accent-orange-500"
            />

            <div className="border-t-2 border-dashed border-orange-200 pt-4 mb-4">
              <div className="text-sm font-black mb-2 text-center">🎮 {en ? "CHARACTER" : "NHÂN VẬT"}</div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">
                  {wt.collision === "block" ? (en ? "🧱 Solid objects" : "🧱 Bị cản bởi vật") : (en ? "👻 Walk through" : "👻 Đi xuyên thấu")}
                </span>
                <button
                  onClick={() => setToggles({ collision: wt.collision === "block" ? "phase" : "block" })}
                  className={`px-4 py-2 rounded-full font-black text-xs border-2 ${
                    wt.collision === "block"
                      ? "bg-rose-500 border-rose-700 text-white"
                      : "bg-sky-500 border-sky-700 text-white"
                  }`}
                >
                  {wt.collision === "block" ? (en ? "SOLID" : "ĐANG CẢN") : (en ? "PHASE" : "XUYÊN THẤU")}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground font-bold mt-1">
                {en ? "Solid mode makes the character collide with walls and furniture." : "Bật \"Cản\" để nhân vật va chạm tường + đồ nội thất."}
              </p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="toy-button toy-button-primary w-full"
            >
              {en ? "CLOSE" : "ĐÓNG"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
