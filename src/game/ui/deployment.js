// Deployment screen: the shop, your 5-slot line, and the turn's buttons.
// Mirrors Deployment.cs and Unit.OnMouseDown: click a unit to select it, then
// click a slot (or drag it there) to deploy, merge, move or swap.
import { canMerge } from "../engine/units.js";
import { buy, checkEndTurn, heartsLeft, move, roll, sell, toggleFreeze } from "../engine/run.js";
import { scoutReport } from "../engine/opponent.js";
import { createUnitCard } from "../../cards/unit-card.js";
import { layoutSprites, spriteStageHtml } from "../../cards/sprite-art.js";
import { saveRun } from "./save.js";
import { escapeHtml, tokenHtml } from "./token.js";
import { unitLook } from "./data.js";
import { sfx } from "./sound.js";

const UI = new URL("../../../assets/ui/", import.meta.url).href;
const DRAG_THRESHOLD = 6;
// Small line icons for the buttons; they take the button's text colour.
const svg = (body) => `<svg class="gbtn__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ICON = {
  back: svg('<path d="M14 6l-6 6 6 6"/>'),
  dice: svg('<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>'),
  reserve: svg('<path d="M5 4h14v16l-7-4-7 4z"/>'),
  advance: svg('<path d="M5 6l6 6-6 6"/><path d="M12 6l6 6-6 6"/>'),
};

/**
 * @param root  element to render into
 * @param ctx   { data, run, rng, opponent, playerName, onBattle(), onQuit() }
 */
export function mountDeployment(root, ctx) {
  const { data, run, rng } = ctx;
  const { catalog } = data;
  let selected = null; // { where: "shop" | "line", index }
  let hovered = null;
  let drag = null;
  let suppressClick = false;

  const unitAt = (ref) => (!ref ? null : ref.where === "shop" ? run.shop[ref.index]?.unit ?? null : run.line[ref.index] ?? null);
  const same = (a, b) => a && b && a.where === b.where && a.index === b.index;

  function render() {
    const sel = unitAt(selected);
    const targets = dropTargets(selected);
    const scouts = run.line.filter((u) => u && catalog.def(u.id)?.scout);
    const scoutRank = scouts.length ? Math.max(...scouts.map((u) => u.rank)) : null;

    root.innerHTML = `
      <div class="screen deploy" data-nation="${run.nation}">
        <header class="hud">
          <button type="button" class="gbtn gbtn--quit hud__quit" data-act="quit" aria-label="Save and quit to menu">${ICON.back}<span>Quit</span></button>
          <div class="hud__stats">
            <span class="hud__stat" title="Coin"><img src="${UI}coin.svg" alt="Coin"><b>${run.coin}</b></span>
            <span class="hud__stat" title="Hearts left"><img src="${UI}heart.svg" alt="Hearts"><b>${heartsLeft(catalog, run)}</b></span>
            <span class="hud__stat" title="Wins (${catalog.rules.winsToVictory} to win)"><img src="${UI}laurel.svg" alt="Wins"><b>${run.wins}</b><small>/${catalog.rules.winsToVictory}</small></span>
            <span class="hud__stat hud__turn" title="Turn">Turn <b>${run.round}</b></span>
          </div>
          <div class="hud__opponent">
            <span>Next opponent</span>
            <b>${escapeHtml(ctx.opponent?.name ?? "Unknown")}</b>
          </div>
        </header>

        ${scoutRank !== null ? scoutHtml(scoutReport(ctx.opponent, scoutRank)) : ""}

        <section class="line" aria-label="Your line, front on the right">
          <div class="line__slots">
            ${[4, 3, 2, 1, 0].map((i) => slotHtml("line", i, run.line[i], targets.get(i), same(selected, { where: "line", index: i }))).join("")}
          </div>
          <div class="line__front" aria-hidden="true">Front →</div>
        </section>

        <section class="shop" aria-label="Recruits">
          <img class="shop__sign" src="${UI}recruit_sign.svg" alt="Recruits">
          <div class="shop__slots">
            ${run.shop.map((s, i) => slotHtml("shop", i, s?.unit, null, same(selected, { where: "shop", index: i }), s?.frozen)).join("")}
          </div>
        </section>

        <aside class="card-place" aria-live="polite"></aside>

        <footer class="actions">
          <button type="button" class="gbtn gbtn--roll" data-act="roll" ${run.coin < catalog.rules.rollCost ? "disabled" : ""} aria-label="Roll the shop for ${catalog.rules.rollCost} coin">${ICON.dice}<span>Roll</span>${costHtml(catalog.rules.rollCost)}</button>
          ${
            selected?.where === "shop"
              ? reserveButtonHtml(Boolean(run.shop[selected.index]?.frozen))
              : selected?.where === "line"
                ? `<button type="button" class="gbtn gbtn--sell" data-act="sell" aria-label="Sell for ${1 + Math.floor(sel.rank / 3)} coin"><span>Sell</span>${costHtml(`+${1 + Math.floor(sel.rank / 3)}`)}</button>`
                : `<span class="actions__hint">${hintText()}</span>`
          }
          <button type="button" class="gbtn gbtn--battle actions__battle" data-act="battle" aria-label="End turn and go to battle"><span>To Battle</span>${ICON.advance}</button>
        </footer>
        <div class="fx-layer" aria-hidden="true"></div>
        <p class="toast" role="status"></p>
      </div>`;
    showCard();
  }

  function costHtml(amount) {
    return `<span class="gbtn__cost"><img src="${UI}coin.svg" alt="">${amount}</span>`;
  }

  // A held recruit stays in the shop through the next roll and the next turn (Unity's freeze).
  function reserveButtonHtml(reserved) {
    return reserved
      ? `<button type="button" class="gbtn gbtn--reserve" data-act="freeze" aria-pressed="true" aria-label="Release this recruit from reserve">${ICON.reserve}<span>Release</span></button>`
      : `<button type="button" class="gbtn gbtn--reserve" data-act="freeze" aria-pressed="false" aria-label="Hold this recruit in reserve">${ICON.reserve}<span>Reserve</span></button>`;
  }

  function hintText() {
    if (run.round === 1 && !run.line.some(Boolean)) return "Drag a recruit onto your line, or click it and then a slot.";
    return "Merge copies of a unit to rank it up.";
  }

  function slotHtml(where, index, unit, target, isSelected, frozen = false) {
    const cls = ["slot", `slot--${where}`, target ? `is-target is-${target}` : ""].filter(Boolean).join(" ");
    const label = where === "line" ? `Line slot ${index + 1}${index === 0 ? " (front)" : ""}` : `Recruit slot ${index + 1}`;
    return `
      <div class="${cls}" data-where="${where}" data-index="${index}" role="group" aria-label="${label}">
        <img class="slot__marker" src="${UI}marker.svg" alt="">
        ${target === "merge" ? `<img class="slot__hint" src="${UI}combine_icon.svg" alt="Merge">` : ""}
        ${unit ? tokenHtml(data, unit, { where, index, selected: isSelected, frozen }) : where === "line" ? `<button type="button" class="slot__empty" data-where="line" data-index="${index}" aria-label="Empty ${label}"></button>` : ""}
      </div>`;
  }

  // Deployment.SetDeployMarkerArrows: where the selected unit can go.
  function dropTargets(src) {
    const map = new Map();
    const unit = unitAt(src);
    if (!unit) return map;
    const hasGap = run.line.some((u) => !u);
    run.line.forEach((target, i) => {
      if (src.where === "line" && i === src.index) return;
      if (canMerge(target, unit) && target.rank >= unit.rank) map.set(i, "merge");
      else if (src.where === "shop" ? run.coin >= unit.cost && (!target || hasGap) : true) map.set(i, "drop");
    });
    if (src.where === "shop" && run.coin < unit.cost) map.clear();
    return map;
  }

  function scoutHtml(report) {
    const enemy = catalog.nations[run.nation].enemy;
    const items = report.map((s, i) => {
      if (!s.known) return `<li title="Outranks your scout"><img src="${UI}scout_question_mark.svg" alt="Unknown unit"></li>`;
      const look = unitLook(data, { id: s.id, kind: "" });
      const art = look.artLayers.length ? spriteStageHtml(layoutSprites(look.artLayers, { maxW: 4.2, maxH: 4.2 }), "scout__stage") : "";
      return `<li title="${escapeHtml(look.name)}, rank ${s.rank}">${art}<span class="scout__rank">${s.rank}</span></li>`;
    });
    return `
      <section class="scout" aria-label="Scout report">
        <h2>Scout report <small>(${catalog.nations[enemy].rosterName}, front on the left)</small></h2>
        <ol>${items.join("")}</ol>
      </section>`;
  }

  function showCard() {
    const place = root.querySelector(".card-place");
    if (!place) return;
    const ref = hovered ?? selected;
    const unit = unitAt(ref);
    const look = unit && unitLook(data, unit);
    place.replaceChildren();
    if (!look?.card) {
      const verb = matchMedia("(hover: none)").matches ? "Tap" : "Hover over";
      place.innerHTML = `<p class="card-place__hint">${verb} a unit to see its card.</p>`;
      return;
    }
    const card = createUnitCard(look.card, { roster: look.roster, rations: data.rations, rank: Math.min(unit.rank, look.card.maxRank) });
    place.append(card);
  }

  function act(result) {
    if (!result.ok) {
      toast(result.reason);
      return false;
    }
    saveRun(run, ctx.playerName);
    selected = null;
    render();
    for (const e of result.events ?? []) {
      if (e.type === "buff") floatAtUid(e.uid, `+${e.attack}/+${e.health}`);
      if (e.type === "rankUp") floatAtUid(e.uid, `Rank ${e.rank}!`);
    }
    if (result.action === "sell") floatAt(root.querySelector('[data-act="roll"]'), `+${1 + Math.floor(result.unit.rank / 3)} coin`);
    return true;
  }

  function drop(src, dst) {
    if (!src || !dst || dst.where !== "line") return;
    if (src.where === "shop") act(buy(catalog, run, src.index, dst.index));
    else act(move(catalog, run, src.index, dst.index));
  }

  function clickRef(ref) {
    if (same(ref, selected)) {
      selected = null;
      render();
    } else if (selected && ref.where === "line") {
      drop(selected, ref);
    } else if (unitAt(ref)) {
      selected = ref;
      render();
      focusRef(ref);
    }
  }

  function focusRef(ref) {
    root.querySelector(`.token[data-where="${ref.where}"][data-index="${ref.index}"]`)?.focus();
  }

  // Input ---------------------------------------------------------------

  root.onclick = (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const btn = e.target.closest("[data-act]");
    if (btn) return onAction(btn.dataset.act);
    const hit = e.target.closest(".token, .slot__empty, .slot");
    if (hit) return clickRef({ where: hit.dataset.where, index: Number(hit.dataset.index) });
    if (selected) {
      selected = null;
      render();
    }
  };

  root.onkeydown = (e) => {
    if (e.key === "Escape" && selected) {
      selected = null;
      render();
    }
  };

  root.onpointerover = (e) => {
    const t = e.target.closest(".token");
    const ref = t ? { where: t.dataset.where, index: Number(t.dataset.index) } : null;
    if (drag || same(ref, hovered) || (!ref && !hovered)) return;
    hovered = ref;
    showCard();
  };
  root.onpointerleave = () => {
    hovered = null;
    showCard();
  };

  root.onpointerdown = (e) => {
    const t = e.target.closest(".token");
    if (!t || e.button > 0) return;
    drag = { ref: { where: t.dataset.where, index: Number(t.dataset.index) }, x: e.clientX, y: e.clientY, el: t, active: false };
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", cancelDrag);

  function onPointerMove(e) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
      drag.active = true;
      selected = drag.ref;
      render();
      const src = root.querySelector(`.token[data-where="${drag.ref.where}"][data-index="${drag.ref.index}"]`);
      const box = src.getBoundingClientRect();
      drag.ghost = src.cloneNode(true);
      drag.ghost.classList.add("token--ghost");
      // The ghost lives outside the stage, so carry over the stage's em size.
      drag.ghost.style.fontSize = getComputedStyle(src).fontSize;
      drag.ghost.style.width = `${box.width}px`;
      drag.ghost.style.height = `${box.height}px`;
      drag.offset = { x: drag.x - box.left, y: drag.y - box.top };
      src.classList.add("is-dragging");
      document.body.append(drag.ghost);
    }
    drag.ghost.style.transform = `translate(${e.clientX - drag.offset.x}px, ${e.clientY - drag.offset.y}px)`;
    root.querySelectorAll(".slot.is-over").forEach((s) => s.classList.remove("is-over"));
    slotUnder(e)?.classList.add("is-over");
  }

  function onPointerUp(e) {
    if (!drag) return;
    const wasActive = drag.active;
    const ref = drag.ref;
    const slot = wasActive ? slotUnder(e) : null;
    cancelDrag();
    if (!wasActive) return;
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);
    if (slot && slot.dataset.where === "line") drop(ref, { where: "line", index: Number(slot.dataset.index) });
    else {
      selected = null;
      render();
    }
  }

  function cancelDrag() {
    drag?.ghost?.remove();
    drag = null;
  }

  function slotUnder(e) {
    const hidden = drag?.ghost;
    if (hidden) hidden.style.visibility = "hidden";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (hidden) hidden.style.visibility = "";
    return el?.closest(".slot--line") ?? null;
  }

  function onAction(name) {
    if (name === "roll") {
      if (!act(roll(catalog, run, rng))) return;
      // Deployment.Roll: a coin for the re-roll, and the bugle as the new recruits arrive.
      sfx("coin");
      sfx("bugle");
      return;
    }
    if (name === "freeze" && selected?.where === "shop") return act(toggleFreeze(run, selected.index));
    if (name === "sell" && selected?.where === "line") return act(sell(run, selected.index));
    if (name === "quit") return ctx.onQuit();
    if (name === "battle") {
      const check = checkEndTurn(catalog, run, rng);
      if (!check.ok) {
        render();
        toast(check.reason);
        return;
      }
      saveRun(run, ctx.playerName);
      ctx.onBattle();
    }
  }

  // Feedback --------------------------------------------------------------

  function toast(text) {
    const el = root.querySelector(".toast");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("is-on");
    void el.offsetWidth;
    el.classList.add("is-on");
  }

  function floatAtUid(uid, text) {
    floatAt(root.querySelector(`.token[data-uid="${uid}"]`), text);
  }

  function floatAt(el, text) {
    const layer = root.querySelector(".fx-layer");
    if (!el || !layer) return;
    const a = el.getBoundingClientRect();
    const l = layer.getBoundingClientRect();
    const f = document.createElement("span");
    f.className = "floater";
    f.textContent = text;
    f.style.left = `${a.left - l.left + a.width / 2}px`;
    f.style.top = `${a.top - l.top + a.height * 0.25}px`;
    layer.append(f);
    f.addEventListener("animationend", () => f.remove());
  }

  render();
  return {
    destroy() {
      cancelDrag();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", cancelDrag);
      root.onclick = root.onkeydown = root.onpointerover = root.onpointerleave = root.onpointerdown = null;
    },
  };
}
