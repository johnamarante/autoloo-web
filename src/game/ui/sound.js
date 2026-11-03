// Music and sound effects. Browsers only allow sound after the player has
// clicked or pressed a key, so anything asked for before that starts on the
// first one. Music, and effects with the battle ambience, can each be switched
// off; the choice is kept in this browser.
import { AMBIENCE, SOUNDS, TRACKS } from "./sound-list.js";

const BASE = new URL("../../../assets/audio/", import.meta.url).href;
const PREFS_KEY = "autoloo.audio.v1";

const prefs = { music: true, effects: true, ...readPrefs() };
let unlocked = false;
const lastPick = new Map();

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are best effort.
  }
}

/**
 * One looping layer of sound: an intro that plays once, then a cycle of
 * files that repeats (or plays through once). Switching fades the old one out.
 */
function createChannel(table, pref) {
  let wanted = null;
  let playing = null;

  function start() {
    fade(playing?.el);
    playing = null;
    const track = table[wanted];
    if (!track || !prefs[pref] || !unlocked) return;
    const me = { el: null };
    playing = me;
    const parts = [...(track.intro ? [track.intro] : []), ...track.cycle];
    const firstOfCycle = track.intro ? 1 : 0;
    const playPart = (i) => {
      if (playing !== me) return;
      if (i >= parts.length) {
        if (track.once) return;
        i = firstOfCycle;
      }
      const el = new Audio(BASE + parts[i]);
      el.volume = track.volume ?? 1;
      // A cycle of one file loops seamlessly on its own.
      if (!track.once && parts.length - firstOfCycle === 1 && i === firstOfCycle) el.loop = true;
      else el.addEventListener("ended", () => playPart(i + 1), { once: true });
      me.el = el;
      el.play().catch(() => {});
    };
    playPart(0);
  }

  return {
    set(name) {
      if (wanted === name) return;
      wanted = name ?? null;
      start();
    },
    restart: start,
    stop() {
      wanted = null;
      fade(playing?.el);
      playing = null;
    },
  };
}

function fade(el) {
  if (!el) return;
  const step = el.volume / 10;
  const timer = setInterval(() => {
    el.volume = Math.max(0, el.volume - step);
    if (el.volume <= 0.001) {
      clearInterval(timer);
      el.pause();
    }
  }, 40);
}

const musicChannel = createChannel(TRACKS, "music");
const ambienceChannel = createChannel(AMBIENCE, "effects");

function unlock() {
  if (unlocked) return;
  unlocked = true;
  window.removeEventListener("pointerdown", unlock, true);
  window.removeEventListener("keydown", unlock, true);
  musicChannel.restart();
  ambienceChannel.restart();
}
window.addEventListener("pointerdown", unlock, true);
window.addEventListener("keydown", unlock, true);

/** Plays one of a sound's variations, not the same one twice in a row. */
export function sfx(name, { volume = 1 } = {}) {
  const sound = SOUNDS[name];
  if (!sound || !prefs.effects || !unlocked) return;
  const files = sound.files;
  let i = Math.floor(Math.random() * files.length);
  if (files.length > 1 && i === lastPick.get(name)) i = (i + 1) % files.length;
  lastPick.set(name, i);
  const el = new Audio(BASE + files[i]);
  el.volume = Math.min(1, (sound.volume ?? 1) * volume);
  el.play().catch(() => {});
}

/** Switches the music to a track from TRACKS; null stops it. */
export const music = (name) => musicChannel.set(name);

/** Switches the background battle noise to one from AMBIENCE; null stops it. */
export const ambience = (name) => ambienceChannel.set(name);

export function soundPrefs() {
  return { ...prefs };
}

export function setSoundPref(kind, on) {
  prefs[kind] = Boolean(on);
  writePrefs();
  (kind === "music" ? musicChannel : ambienceChannel).restart();
}
