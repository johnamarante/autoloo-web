// A unit on the board: its sprite at battlefield scale, with attack and
// health badges, a rank chevron, and (in the shop) its cost and whether it is held in reserve.
import { layoutSprites, spriteStageHtml } from "../../cards/sprite-art.js";
import { unitLook } from "./data.js";
import { WEAPONS, badgeSrc, companyKind, weaponKey, weaponSrc } from "../../cards/weapons.js";

const UI = new URL("../../../assets/ui/", import.meta.url).href;
// Unity's icon_heart, which its units draw their health number on.
const HEART = new URL("../../../assets/icons/icon_heart.svg", import.meta.url).href;
// Token geometry in em; the French line infantryman stands 8em tall.
const TOKEN = { emPerUnit: 8 / 10.43, maxW: 10.4, maxH: 9 };

export function tokenHtml(data, unit, { where, index, selected = false, frozen = false, facing = "right" } = {}) {
  const look = unitLook(data, unit);
  // A card can let its art stand taller than other units' (the rocket trooper and his pole).
  const art = look.artLayers.length
    ? spriteStageHtml(layoutSprites(look.artLayers, { ...TOKEN, maxH: look.card?.tokenMaxH ?? TOKEN.maxH }), "token__stage")
    : `<div class="token__noart">${escapeHtml(look.name)}</div>`;
  const def = data.catalog.def(unit.id);
  const weapon = weaponKey(unit.id, def?.type ?? "infantry");
  const badges = companyBadges(def, unit);
  const label = `${look.name}, ${unit.attack} attack with ${WEAPONS[weapon].label.toLowerCase()}, ${unit.health} health, rank ${unit.rank}${
    badges.length ? `, ${badges.map((b) => (b === "skirmisher" ? "skirmishers" : "grenadiers")).join(" and ")} attached` : ""
  }${where === "shop" ? `, costs ${unit.cost}${frozen ? ", in reserve" : ""}` : ""}`;
  return `
    <button type="button" class="token${selected ? " is-selected" : ""}${frozen ? " is-frozen" : ""}" data-facing="${facing}"
      data-where="${where}" data-index="${index}" data-uid="${unit.uid}" aria-label="${escapeHtml(label)}" aria-pressed="${selected}">
      <span class="token__figure">${art}</span>
      ${where !== "enemy" ? `<img class="token__rank" src="${UI}rank/${Math.min(unit.rank, 9)}.svg" alt="">` : ""}
      ${where === "shop" ? `<span class="token__cost"><img src="${UI}coin.svg" alt="">${unit.cost}</span>` : ""}
      ${
        badges.length
          ? `<span class="token__badges">${badges
              .map((kind) => `<img class="token__badge" data-badge="${kind}" src="${badgeSrc(kind, unit.id)}" alt="">`)
              .join("")}</span>`
          : ""
      }
      <span class="token__weapon" data-weapon="${weapon}"><img src="${weaponSrc(weapon)}" alt=""></span>
      <span class="token__stat token__stat--atk"><span class="token__num">${unit.attack}</span></span>
      <span class="token__stat token__stat--hp"><img class="token__heart" src="${HEART}" alt=""><span class="token__num">${unit.health}</span></span>
    </button>`;
}

// The companies a battalion carries once they are unlocked (Unit.CheckUnlocksOnStart
// turns on Skirmish and GrenadierAttack, and with them the badges), or, for a
// company on the field, its own badge.
function companyBadges(def, unit) {
  const own = companyKind(unit.id);
  if (own) return [own];
  const out = [];
  if (def?.skirmish && unit.rank >= def.skirmish.unlockRank) out.push("skirmisher");
  if (def?.grenadiers && unit.rank >= def.grenadiers.unlockRank) out.push("grenadier");
  return out;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
