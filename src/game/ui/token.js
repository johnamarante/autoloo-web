// A unit on the board: its sprite at battlefield scale, with attack and
// health badges, a rank chevron, and (in the shop) its cost and whether it is held in reserve.
import { layoutSprites, spriteStageHtml } from "../../cards/sprite-art.js";
import { unitLook } from "./data.js";

const UI = new URL("../../../assets/ui/", import.meta.url).href;
// Token geometry in em; the French line infantryman stands 8em tall.
const TOKEN = { emPerUnit: 8 / 10.43, maxW: 10.4, maxH: 9 };

export function tokenHtml(data, unit, { where, index, selected = false, frozen = false, facing = "right" } = {}) {
  const look = unitLook(data, unit);
  const art = look.artLayers.length
    ? spriteStageHtml(layoutSprites(look.artLayers, TOKEN), "token__stage")
    : `<div class="token__noart">${escapeHtml(look.name)}</div>`;
  const label = `${look.name}, ${unit.attack} attack, ${unit.health} health, rank ${unit.rank}${
    where === "shop" ? `, costs ${unit.cost}${frozen ? ", in reserve" : ""}` : ""
  }`;
  return `
    <button type="button" class="token${selected ? " is-selected" : ""}${frozen ? " is-frozen" : ""}" data-facing="${facing}"
      data-where="${where}" data-index="${index}" data-uid="${unit.uid}" aria-label="${escapeHtml(label)}" aria-pressed="${selected}">
      <span class="token__figure">${art}</span>
      ${where !== "enemy" ? `<img class="token__rank" src="${UI}rank/${Math.min(unit.rank, 9)}.svg" alt="">` : ""}
      ${where === "shop" ? `<span class="token__cost"><img src="${UI}coin.svg" alt="">${unit.cost}</span>` : ""}
      <span class="token__stat token__stat--atk">${unit.attack}</span>
      <span class="token__stat token__stat--hp">${unit.health}</span>
    </button>`;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
