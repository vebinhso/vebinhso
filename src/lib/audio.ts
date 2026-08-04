// Trung tâm quản lý âm thanh cho cả app.
// - BGM (loop): home | house | magic — chỉ phát 1 cái tại một thời điểm.
// - Loop SFX: rain | tornado — bật/tắt theo quyền năng.
// - One-shot SFX: click | place | purchase | rightHouse | wrongHouse | wrongGame | monsterHit
//   khi `duck=true` sẽ giảm volume BGM xuống đến khi sfx kết thúc.
// - Cài đặt người dùng: mute + master volume (lưu localStorage).
import homeUrl from "@/assets/audio/home.mp3";
import houseUrl from "@/assets/audio/house.mp3";
import magicUrl from "@/assets/audio/magic.mp3";
import rainUrl from "@/assets/audio/rain.mp3";
import tornadoUrl from "@/assets/audio/tornado.mp3";
import clickUrl from "@/assets/audio/click.mp3";
import placeUrl from "@/assets/audio/place.mp3";
import purchaseUrl from "@/assets/audio/purchase.mp3";
import rightHouseUrl from "@/assets/audio/right-house.mp3";
import wrongHouseUrl from "@/assets/audio/wrong-house.mp3";
import wrongGameUrl from "@/assets/audio/wrong-game.mp3";
import monsterHitUrl from "@/assets/audio/monster-hit.mp3";

export type BgmName = "home" | "house" | "magic" | null;
export type LoopSfx = "rain" | "tornado";
export type Sfx =
  | "click"
  | "place"
  | "purchase"
  | "rightHouse"
  | "wrongHouse"
  | "wrongGame"
  | "monsterHit";

const SOURCES: Record<string, string> = {
  home: homeUrl,
  house: houseUrl,
  magic: magicUrl,
  rain: rainUrl,
  tornado: tornadoUrl,
  click: clickUrl,
  place: placeUrl,
  purchase: purchaseUrl,
  rightHouse: rightHouseUrl,
  wrongHouse: wrongHouseUrl,
  wrongGame: wrongGameUrl,
  monsterHit: monsterHitUrl,
};

const BGM_VOL = 0.45;
const BGM_DUCK = 0.1;
const LOOP_SFX_VOL = 0.5;
const SFX_VOL: Record<Sfx, number> = {
  click: 0.85, // to hơn theo yêu cầu người dùng
  place: 0.7,
  purchase: 0.8,
  rightHouse: 0.85,
  wrongHouse: 0.85,
  wrongGame: 0.85,
  monsterHit: 0.85,
};

type AudioRef = { el: HTMLAudioElement };

const bgmEls: Partial<Record<Exclude<BgmName, null>, AudioRef>> = {};
const loopEls: Partial<Record<LoopSfx, AudioRef>> = {};
let currentBgm: BgmName = null;
let unlocked = false;
const pendingPlays: Array<() => void> = [];
let duckCount = 0;

// ===== Cài đặt người dùng =====
const SETTINGS_KEY = "vebinhso_audio_settings_v1";
type Settings = { muted: boolean; master: number }; // master: 0..1
function loadSettings(): Settings {
  if (typeof window === "undefined") return { muted: false, master: 1 };
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s && typeof s.master === "number") return { muted: !!s.muted, master: Math.max(0, Math.min(1, s.master)) };
  } catch {}
  return { muted: false, master: 1 };
}
let SETTINGS: Settings = loadSettings();
function saveSettings() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch {}
  window.dispatchEvent(new Event("audio-settings-change"));
}

function effectiveBgmVol() {
  if (SETTINGS.muted) return 0;
  const base = duckCount > 0 ? BGM_DUCK : BGM_VOL;
  return base * SETTINGS.master;
}
function effectiveLoopVol() {
  return SETTINGS.muted ? 0 : LOOP_SFX_VOL * SETTINGS.master;
}
function effectiveSfxVol(name: Sfx) {
  return SETTINGS.muted ? 0 : SFX_VOL[name] * SETTINGS.master;
}

export function getAudioSettings(): Settings { return { ...SETTINGS }; }
export function setMuted(m: boolean) {
  SETTINGS.muted = m;
  saveSettings();
  applyAllVolumes();
}
export function setMasterVolume(v: number) {
  SETTINGS.master = Math.max(0, Math.min(1, v));
  saveSettings();
  applyAllVolumes();
}

function isBrowser() {
  return typeof window !== "undefined";
}

function makeAudio(src: string, opts: { loop?: boolean; volume?: number } = {}) {
  const el = new Audio(src);
  el.preload = "auto";
  el.loop = !!opts.loop;
  el.volume = opts.volume ?? 1;
  // @ts-expect-error - playsInline tồn tại trên iOS
  el.playsInline = true;
  return el;
}

function getBgm(name: Exclude<BgmName, null>): AudioRef {
  if (!bgmEls[name]) bgmEls[name] = { el: makeAudio(SOURCES[name], { loop: true, volume: effectiveBgmVol() }) };
  return bgmEls[name]!;
}
function getLoopSfx(name: LoopSfx): AudioRef {
  if (!loopEls[name]) loopEls[name] = { el: makeAudio(SOURCES[name], { loop: true, volume: effectiveLoopVol() }) };
  return loopEls[name]!;
}

function applyAllVolumes() {
  const bgm = effectiveBgmVol();
  for (const k of Object.keys(bgmEls) as Array<Exclude<BgmName, null>>) {
    const ref = bgmEls[k];
    if (ref) ref.el.volume = bgm;
  }
  const loop = effectiveLoopVol();
  for (const k of Object.keys(loopEls) as LoopSfx[]) {
    const ref = loopEls[k];
    if (ref) ref.el.volume = loop;
  }
}

function safePlay(el: HTMLAudioElement, retryOnBlock = false) {
  const p = el.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      // Trình duyệt chặn autoplay -> chờ thao tác đầu tiên rồi phát lại
      if (retryOnBlock) {
        unlocked = false;
        pendingPlays.push(() => safePlay(el));
        unlockAudioOnUserGesture();
      }
    });
  } else {
    unlocked = true;
  }
}

export function setBgm(name: BgmName) {
  if (!isBrowser()) return;
  if (currentBgm === name) return;
  if (currentBgm) {
    const old = bgmEls[currentBgm];
    if (old) { old.el.pause(); old.el.currentTime = 0; }
  }
  currentBgm = name;
  if (!name) return;
  const next = getBgm(name);
  next.el.volume = effectiveBgmVol();
  // Luôn thử phát ngay (kể cả khi chưa đăng nhập / chưa bấm gì);
  // nếu trình duyệt chặn thì tự phát lại ở thao tác đầu tiên.
  safePlay(next.el, true);
}

export function startLoopSfx(name: LoopSfx) {
  if (!isBrowser()) return;
  const ref = getLoopSfx(name);
  ref.el.volume = effectiveLoopVol();
  if (!ref.el.paused) return;
  if (!unlocked) pendingPlays.push(() => safePlay(ref.el));
  else safePlay(ref.el);
}

export function stopLoopSfx(name: LoopSfx) {
  const ref = loopEls[name];
  if (!ref) return;
  ref.el.pause();
  ref.el.currentTime = 0;
}

export function playSfx(name: Sfx, opts: { duck?: boolean } = {}) {
  if (!isBrowser() || !unlocked) return;
  if (SETTINGS.muted) return;
  const el = makeAudio(SOURCES[name], { loop: false, volume: effectiveSfxVol(name) });
  const duck = !!opts.duck;
  if (duck) {
    duckCount++;
    applyAllVolumes();
  }
  const cleanup = () => {
    if (duck) {
      duckCount = Math.max(0, duckCount - 1);
      applyAllVolumes();
    }
    el.removeEventListener("ended", cleanup);
    el.removeEventListener("error", cleanup);
  };
  el.addEventListener("ended", cleanup);
  el.addEventListener("error", cleanup);
  safePlay(el);
}

export function unlockAudioOnUserGesture() {
  if (!isBrowser() || unlocked) return;
  const handler = () => {
    if (unlocked) return;
    unlocked = true;
    for (const f of pendingPlays.splice(0)) f();
    document.removeEventListener("pointerdown", handler);
    document.removeEventListener("keydown", handler);
    document.removeEventListener("touchstart", handler);
  };
  document.addEventListener("pointerdown", handler, { once: false });
  document.addEventListener("keydown", handler, { once: false });
  document.addEventListener("touchstart", handler, { once: false });
}

export function stopAllBgm() {
  setBgm(null);
}
