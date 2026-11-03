// Post-battle report: the result banner and Unity's laurel and heart recap
// (GameManager.WaitForUserClick). The animated battle (phase 3) plays before it.
import { heartsLeft } from "../engine/run.js";
import { tokenHtml, escapeHtml } from "./token.js";

const UI = new URL("../../../assets/ui/", import.meta.url).href;
const BANNERS = {
  france: { win: "french_win", loss: "french_loss", draw: "french_draw" },
  britain: { win: "britain_win", loss: "british_loss", draw: "british_draw" },
};

/** ctx: { data, run (result already applied), result, opponent, army, onContinue() } */
export function mountReport(root, ctx) {
  const { data, run, result, opponent } = ctx;
  const { catalog } = data;
  const hearts = heartsLeft(catalog, run);
  const over = run.status !== "playing";
  const title = over ? (run.status === "victory" ? "Victory!" : "Defeat") : { win: "Victory in the field", loss: "Repulsed", draw: "A bloody draw" }[result];

  root.innerHTML = `
    <div class="screen report" data-result="${result}" data-nation="${run.nation}">
      <img class="report__banner" src="${UI}results/${BANNERS[run.nation][result]}.svg" alt="${result}">
      <h1>${title}</h1>
      <p class="report__vs">Your army against <b>${escapeHtml(opponent.name)}</b></p>
      <div class="report__armies">
        <ol class="report__army">${ctx.army.map((u, i) => `<li>${tokenHtml(data, u, { where: "report", index: i })}</li>`).join("")}</ol>
        <span class="report__swords" aria-hidden="true">⚔</span>
        <ol class="report__army report__army--enemy">${opponent.units.map((u, i) => `<li>${tokenHtml(data, u, { where: "enemy", index: i, facing: "left" })}</li>`).join("")}</ol>
      </div>
      <div class="recap" aria-label="${run.wins} wins, ${hearts} hearts left">
        <ol class="recap__row">${Array.from({ length: catalog.rules.winsToVictory }, (_, i) => `<li style="--i:${i}"><img src="${UI}${i < run.wins ? "laurel" : "graylaurel"}.svg" alt=""></li>`).join("")}</ol>
        <ol class="recap__row">${Array.from({ length: catalog.rules.hearts }, (_, i) => `<li style="--i:${i + catalog.rules.winsToVictory}"><img src="${UI}${i < hearts ? "heart" : "grayheart"}.svg" alt=""></li>`).join("")}</ol>
      </div>
      <button type="button" class="btn btn--primary" data-act="continue">${over ? "Back to the menu" : "Continue"}</button>
    </div>`;

  root.querySelector('[data-act="continue"]').focus();
  root.onclick = (e) => {
    if (e.target.closest('[data-act="continue"]')) ctx.onContinue();
  };
  return {
    destroy() {
      root.onclick = null;
    },
  };
}
