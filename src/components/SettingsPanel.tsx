import { useEffect, useState } from "react";
import { getAudioSettings, setMasterVolume, setMuted } from "@/lib/audio";
import { useWorldToggles, setToggles } from "@/lib/world-toggles";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(() => getAudioSettings());

  useEffect(() => {
    const sync = () => setS(getAudioSettings());
    window.addEventListener("audio-settings-change", sync);
    return () => window.removeEventListener("audio-settings-change", sync);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Cài đặt"
        className="fixed top-3 right-3 z-50 w-11 h-11 rounded-full bg-white/90 border-2 border-white shadow-lg hover:scale-105 transition flex items-center justify-center text-xl"
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
            <h3 className="text-xl font-black mb-4 text-center">⚙️ CÀI ĐẶT ÂM THANH</h3>

            <div className="flex items-center justify-between mb-4">
              <span className="font-bold">🔊 Bật âm thanh</span>
              <button
                onClick={() => setMuted(!s.muted)}
                className={`px-4 py-2 rounded-full font-black text-sm border-2 ${
                  s.muted
                    ? "bg-gray-300 border-gray-400 text-gray-700"
                    : "bg-emerald-500 border-emerald-700 text-white"
                }`}
              >
                {s.muted ? "TẮT" : "BẬT"}
              </button>
            </div>

            <div className="mb-2 flex justify-between font-bold text-sm">
              <span>Âm lượng</span>
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

            <button
              onClick={() => setOpen(false)}
              className="toy-button toy-button-primary w-full"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}
    </>
  );
}
