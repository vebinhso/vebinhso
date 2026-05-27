// Trung tâm quản lý âm thanh cho cả app.
// - BGM (loop): home | house | magic — chỉ phát 1 cái tại một thời điểm.
// - Loop SFX: rain | tornado — bật/tắt theo quyền năng.
// - One-shot SFX: click | place | purchase | rightHouse | wrongHouse | wrongGame | monsterHit
//   khi `duck=true` sẽ giảm volume BGM xuống đến khi sfx kết thúc.
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
  click: 0.4,
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
let duckCount = 0; // số sfx đang phát (cần duck)

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
  if (!bgmEls[name]) bgmEls[name] = { el: makeAudio(SOURCES[name], { loop: true, volume: BGM_VOL }) };
  return bgmEls[name]!;
}
function getLoopSfx(name: LoopSfx): AudioRef {
  if (!loopEls[name]) loopEls[name] = { el: makeAudio(SOURCES[name], { loop: true, volume: LOOP_SFX_VOL }) };
  return loopEls[name]!;
}

function applyBgmVolume() {
  const target = duckCount > 0 ? BGM_DUCK : BGM_VOL;
  for (const k of Object.keys(bgmEls) as Array<Exclude<BgmName, null>>) {
    const ref = bgmEls[k];
    if (ref && !ref.el.paused) ref.el.volume = target;
  }
}

function safePlay(el: HTMLAudioElement) {
  const p = el.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

export function setBgm(name: BgmName) {
  if (!isBrowser()) return;
  if (currentBgm === name) return;
  // dừng bgm cũ
  if (currentBgm) {
    const old = bgmEls[currentBgm];
    if (old) { old.el.pause(); old.el.currentTime = 0; }
  }
  currentBgm = name;
  if (!name) return;
  const next = getBgm(name);
  next.el.volume = duckCount > 0 ? BGM_DUCK : BGM_VOL;
  if (!unlocked) {
    pendingPlays.push(() => safePlay(next.el));
  } else {
    safePlay(next.el);
  }
}

export function startLoopSfx(name: LoopSfx) {
  if (!isBrowser()) return;
  const ref = getLoopSfx(name);
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
  const el = makeAudio(SOURCES[name], { loop: false, volume: SFX_VOL[name] });
  const duck = !!opts.duck;
  if (duck) {
    duckCount++;
    applyBgmVolume();
  }
  const cleanup = () => {
    if (duck) {
      duckCount = Math.max(0, duckCount - 1);
      applyBgmVolume();
    }
    el.removeEventListener("ended", cleanup);
    el.removeEventListener("error", cleanup);
  };
  el.addEventListener("ended", cleanup);
  el.addEventListener("error", cleanup);
  safePlay(el);
}

// Mở khoá audio sau lượt tương tác đầu tiên (yêu cầu của trình duyệt).
export function unlockAudioOnUserGesture() {
  if (!isBrowser() || unlocked) return;
  const handler = () => {
    if (unlocked) return;
    unlocked = true;
    // chạy các pending play
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
