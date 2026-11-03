// The Music and Sound switches shown on the menu and during battle.
import { setSoundPref, soundPrefs } from "./sound.js";

export function soundTogglesHtml(extraClass = "") {
  const prefs = soundPrefs();
  return `
    <span class="sound-toggles ${extraClass}" role="group" aria-label="Sound">
      <button type="button" class="chip" data-sound="music" aria-pressed="${prefs.music}">Music</button>
      <button type="button" class="chip" data-sound="effects" aria-pressed="${prefs.effects}">Sound</button>
    </span>`;
}

/** Handles a click on one of the switches; returns true if it was one. */
export function handleSoundToggle(target) {
  const button = target.closest?.("[data-sound]");
  if (!button) return false;
  const on = button.getAttribute("aria-pressed") !== "true";
  setSoundPref(button.dataset.sound, on);
  button.setAttribute("aria-pressed", String(on));
  return true;
}
