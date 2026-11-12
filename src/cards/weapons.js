// What each unit fights with, and the badges for the companies a battalion
// carries. The icons are the Unity build's (Assets/images/icon_*.svg and
// *_badge.svg): the weapon sits behind the attack number, as on the Unity
// unit's "Attack" object, and the badges are its skirmisher_Badge and
// grenadier_Badge, shown once the company is unlocked.
const ICONS = new URL("../../assets/icons/", import.meta.url).href;

export const WEAPONS = {
  musket: { label: "Musket and bayonet", file: "icon_musket_with_bayonet.svg", tip: "Volleys, then the bayonet." },
  lightMusket: { label: "Light musket", file: "icon_skirmish_musket.svg", tip: "Skirmish fire in open order." },
  rifle: { label: "Baker rifle", file: "icon_baker_rifle.svg", tip: "Aimed fire from behind the line." },
  sabre: { label: "Sabre", file: "icon_saber.svg", tip: "Cuts down whatever the charge reaches." },
  lance: { label: "Lance", file: "icon_lance.svg", tip: "Outreaches bayonets on the first clash." },
  cannonball: { label: "Round shot", file: "icon_cannonball.svg", tip: "Fires over the line; canister up close." },
  rocket: { label: "Congreve rockets", file: "icon_rocket.svg", tip: "Wild salvoes over the line." },
};

// Units whose weapon is not the usual one for their type (Unity prefabs).
const BY_UNIT = {
  french_lancer: "lance",
  british_rockets: "rocket",
  british_rifles: "rifle",
};

// Skirmisher companies carry light muskets (Skirmish.lightMusket); grenadier
// companies the line musket.
const SKIRMISH_COMPANIES = new Set(["french_linevoltiguer", "french_legerevoltiguer", "british_foot_light", "british_nassauskirmisher"]);
const GRENADIER_COMPANIES = new Set(["french_linegrenadier", "french_carabinerapied", "british_foot_grenadier", "british_nassaugrenadier"]);

const BY_TYPE = { infantry: "musket", cavalry: "sabre", artillery: "cannonball" };

/** The weapon key for a unit id (battalion or company) and type. */
export function weaponKey(id, type) {
  if (BY_UNIT[id]) return BY_UNIT[id];
  if (SKIRMISH_COMPANIES.has(id)) return "lightMusket";
  if (GRENADIER_COMPANIES.has(id)) return "musket";
  return BY_TYPE[type] ?? "musket";
}

export const weaponSrc = (key) => ICONS + WEAPONS[key].file;

// Unity gives British foot (and its light company) the British light-company
// badge, and French and Nassau battalions the French voltigeur badge.
const BRITISH_LIGHT = new Set(["british_foot", "british_footguardcenter", "british_foot_light"]);

/** Badge art for a battalion or company id: kind is "skirmisher" or "grenadier". */
export function badgeSrc(kind, id) {
  if (kind === "grenadier") return `${ICONS}grenadier_badge.svg`;
  return `${ICONS}${BRITISH_LIGHT.has(id) ? "british" : "french"}_skirmisher_badge.svg`;
}

/** The company a company unit belongs to ("skirmisher" or "grenadier"), or null. */
export function companyKind(id) {
  if (SKIRMISH_COMPANIES.has(id)) return "skirmisher";
  if (GRENADIER_COMPANIES.has(id)) return "grenadier";
  return null;
}
