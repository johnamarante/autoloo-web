import { evalFormula, sellValue, shopOdds, statsAtRank } from "../data/roster.js";
import { rationSynergies } from "../data/rations.js";
import { KEYWORDS, TRIGGERS, TRIGGER_ORDER } from "./glossary.js";
import { icon } from "./icons.js";
import { installTooltips } from "./tooltip.js";
import { layoutSprites, spriteStageHtml } from "./sprite-art.js";
import { WEAPONS, weaponKey, weaponSrc } from "./weapons.js";

// Art panel geometry in em (matches .ucard__art in unit-card.css). The French
// line infantryman (10.43 Unity units tall) is the reference for scale.
const ART = { width: 21, height: 8.6, baseline: 0.75, top: 0.35, side: 0.6 };
const EM_PER_UNIT = 6.95 / 10.43;
const THUMB = { width: 2.8, height: 3.3 };

const ROMAN = ["0", "I", "II", "III", "IV", "V"];
const TYPE_LABEL = { infantry: "Infantry", cavalry: "Cavalry", artillery: "Artillery" };

/**
 * Creates a unit card element.
 * @param {object} unit     A unit from loadRosters().
 * @param {object} context  { roster, rations, rank = 0, interactive = false }
 * @returns {HTMLElement}   The card. Call card.setRank(n) to update it.
 */
export function createUnitCard(unit, context = {}) {
  installTooltips();
  const card = document.createElement("article");
  card.className = "ucard";
  card.dataset.nation = unit.nation;
  card.dataset.type = unit.type;
  card.dataset.status = unit.status.replace(/\s+/g, "-");
  card.setAttribute("aria-label", `${unit.displayName} unit card`);

  let rank = clampRank(unit, context.rank ?? 0);
  const render = () => {
    card.innerHTML = cardHtml(unit, rank, context);
    if (context.interactive) wireStepper(card, (dir) => {
      rank = clampRank(unit, rank + (dir === "up" ? 1 : -1));
      render();
      // Keep keyboard focus on the stepper; fall back to the other button at the ends.
      const btn = card.querySelector(`[data-step="${dir}"]`);
      (btn?.disabled ? card.querySelector("[data-step]:not([disabled])") : btn)?.focus();
    });
  };
  card.setRank = (next) => {
    rank = clampRank(unit, next);
    render();
  };
  render();
  return card;
}

function clampRank(unit, r) {
  return Math.max(0, Math.min(unit.maxRank, Number(r) || 0));
}

function wireStepper(card, step) {
  card.querySelectorAll("[data-step]").forEach((btn) =>
    btn.addEventListener("click", () => step(btn.dataset.step))
  );
}

function cardHtml(unit, rank, ctx) {
  const stats = statsAtRank(unit, rank);
  return `
    <div class="ucard__frame">
      ${headerHtml(unit)}
      ${artHtml(unit, ctx)}
      ${rankHtml(unit, rank, ctx.interactive)}
      ${abilitiesHtml(unit, rank)}
      ${tacticsHtml(unit)}
      ${rationsHtml(unit, ctx.rations)}
      ${footerHtml(unit, rank, stats)}
    </div>`;
}

function headerHtml(unit) {
  const subtitle = [unit.role, unit.contingent && unit.contingent !== unit.role ? unit.contingent : null]
    .filter(Boolean)
    .join(" · ");
  return `
    <header class="ucard__head">
      <div class="ucard__cost" title="Costs ${unit.cost} coins">
        ${icon("coin")}<span>${unit.cost}</span>
      </div>
      <div class="ucard__title">
        <h3>${esc(unit.displayName)}</h3>
        <p>${esc(subtitle)}</p>
      </div>
      <div class="ucard__tier" title="Tier ${unit.tier}: appears in the shop from round ${unit.tier}${unit.tierSource === "guess" ? " (provisional)" : ""}">
        <small>Tier</small><span>${ROMAN[unit.tier] ?? unit.tier}</span>
      </div>
    </header>`;
}

function artHtml(unit, ctx) {
  const odds = ctx.roster ? shopOdds(unit, ctx.roster) : null;
  const ribbon =
    unit.status === "implemented"
      ? ""
      : `<span class="ucard__ribbon" data-kind="${unit.playable ? "testing" : "dev"}" title="Status: ${esc(unit.status)}">${
          unit.playable ? "Testing" : "In dev"
        }</span>`;
  const art = unit.artLayers.length
    ? spriteStageHtml(
        layoutSprites(unit.artLayers, {
          emPerUnit: EM_PER_UNIT,
          maxW: ART.width - ART.side * 2,
          maxH: ART.height - ART.baseline - ART.top,
        }),
        "ucard__stage"
      )
    : `<div class="ucard__noart">${icon(typeIcon(unit))}<span>Art in progress</span></div>`;
  return `
    <figure class="ucard__art">
      ${art}
      ${ribbon}
    </figure>
    <div class="ucard__badges">
      <span class="badge" title="${TYPE_LABEL[unit.type]}">${icon(typeIcon(unit))}${TYPE_LABEL[unit.type]}</span>
      ${weaponBadge(weaponKey(unit.unitId, unit.type))}
      ${unit.maxAllowed ? `<span class="badge badge--limit" title="You can field at most ${unit.maxAllowed}">Limit ${unit.maxAllowed}</span>` : ""}
      ${odds ? `<span class="badge" title="Share of shop rolls among playable ${esc(ctx.roster.name)} units">${rarity(odds)} · ${Math.round(odds * 100)}%</span>` : ""}
    </div>`;
}

// What the unit fights with: the same icon the board shows behind its attack number.
function weaponBadge(key) {
  const w = WEAPONS[key];
  return `<span class="badge badge--weapon kw kw--plain" tabindex="0" data-tip="${esc(`Fights with: ${w.label}. ${w.tip}`)}"><img src="${weaponSrc(key)}" alt="" data-weapon="${key}">${esc(w.label)}</span>`;
}

function rankHtml(unit, rank, interactive) {
  const unlocks = new Map();
  for (const a of unit.attachments) {
    if (a.unlockRank > 0) unlocks.set(a.unlockRank, [...(unlocks.get(a.unlockRank) || []), a]);
  }
  const pips = Array.from({ length: unit.maxRank }, (_, i) => {
    const r = i + 1;
    const marks = unlocks.get(r) || [];
    const title = marks.length ? `Rank ${r}: unlocks ${marks.map((m) => m.displayName).join(", ")}` : `Rank ${r}`;
    return `<li class="pip${r <= rank ? " is-on" : ""}${marks.length ? " has-unlock" : ""}" title="${esc(title)}">
        ${icon("chevron")}${marks.map((m) => `<span class="pip__unlock" data-kind="${m.kind}"></span>`).join("")}
      </li>`;
  }).join("");
  const stepper = interactive
    ? `<div class="stepper" role="group" aria-label="Preview rank">
        <button type="button" data-step="down" aria-label="Lower rank" ${rank <= 0 ? "disabled" : ""}>&minus;</button>
        <button type="button" data-step="up" aria-label="Raise rank" ${rank >= unit.maxRank ? "disabled" : ""}>+</button>
      </div>`
    : "";
  return `
    <section class="ucard__rank" aria-label="Rank ${rank} of ${unit.maxRank}">
      <div class="ucard__rank-row">
        <span class="kw kw--plain" tabindex="0" data-tip="${esc(KEYWORDS.Rank)}">Rank <b>${rank}</b><span class="dim">/${unit.maxRank}</span></span>
        <ol class="pips">${pips}</ol>
        ${stepper}
      </div>
    </section>`;
}

function abilitiesHtml(unit, rank) {
  const abilityRows = [...unit.abilities]
    .sort((a, b) => TRIGGER_ORDER.indexOf(a.trigger) - TRIGGER_ORDER.indexOf(b.trigger))
    .map((a) => abilityRow(a, rank));
  const attachmentRows = unit.attachments.map((a) => attachmentRow(a, rank));
  const rows = [...abilityRows, ...attachmentRows];
  if (!rows.length) {
    return `<ul class="ucard__abilities"><li class="ability ability--none">No special ability. Solid in the line.</li></ul>`;
  }
  return `<ul class="ucard__abilities">${rows.join("")}</ul>`;
}

function abilityRow(a, rank) {
  return `
    <li class="ability">
      ${triggerChip(a.trigger)}
      <p>${keyword(a.keyword)} ${fillTokens(a.text, rank)}</p>
    </li>`;
}

function attachmentRow(a, rank) {
  const locked = rank < a.unlockRank;
  const atk = evalFormula(a.attackFormula, rank);
  const hp = evalFormula(a.healthFormula, rank);
  const art = a.artLayers.length
    ? spriteStageHtml(layoutSprites(a.artLayers, { maxW: THUMB.width, maxH: THUMB.height }), "company__stage")
    : icon("infantry");
  const unlockNote =
    a.unlockRank === 0 ? "Comes with the battalion" : locked ? `Unlocks at rank ${a.unlockRank}` : `Unlocked at rank ${a.unlockRank}`;
  return `
    <li class="ability ability--company${locked ? " is-locked" : ""}" data-kind="${a.kind}">
      <div class="company__art">${art}${locked ? `<span class="company__lock">${icon("lock")}</span>` : ""}</div>
      <div class="company__body">
        <div class="company__head">
          <strong>${esc(a.displayName)}</strong>
          <span class="mini-stats" title="${locked ? "Strength once unlocked at that rank" : "Current strength"}">
            <span class="mini-stats__atk">${icon("attack")}${locked ? evalFormula(a.attackFormula, a.unlockRank) : atk}</span>
            <span class="mini-stats__hp">${icon("health")}${locked ? evalFormula(a.healthFormula, a.unlockRank) : hp}</span>
          </span>
        </div>
        <p>${triggerChip(a.trigger, true)} ${keyword(a.keyword)} ${esc(a.text)}</p>
        <small class="company__unlock">${icon(locked ? "lock" : "chevron")}${unlockNote}</small>
      </div>
    </li>`;
}

function tacticsHtml(unit) {
  const { good, bad, traits } = tactics(unit);
  return `
    <section class="ucard__tactics" aria-label="Tactics">
      ${traits.length ? `<div class="traits">${traits.join("")}</div>` : ""}
      <dl>
        ${good ? `<div class="tac tac--good"><dt>${icon("shield")}Good vs</dt><dd>${good}</dd></div>` : ""}
        ${bad ? `<div class="tac tac--bad"><dt>${icon("target")}Weak vs</dt><dd>${bad}</dd></div>` : ""}
      </dl>
    </section>`;
}

// Derived from the battle rules in GameManager.ComputeAttackStrengths and Cannonball.
function tactics(unit) {
  const traits = [];
  const isLancer = unit.abilities.some((a) => a.keyword === "Lance Charge");
  if (unit.type === "infantry") {
    if (unit.formsSquare) {
      traits.push(trait("square", "Forms square", KEYWORDS.Square));
      return { traits, good: "Cavalry charges (+3 attack, takes 1 damage)", bad: "Artillery (double damage to squares)" };
    }
    traits.push(trait("square", "No square", "This unit cannot form square, so cavalry hits it at full strength.", true));
    return { traits, good: "Fighting from behind the line", bad: "Cavalry (cannot form square)" };
  }
  if (unit.type === "cavalry") {
    return {
      traits,
      good: isLancer ? "Squares on the first clash" : "Artillery and units that cannot form square",
      bad: isLancer ? "Squares after the first clash" : "Infantry in square (deals only 1 damage)",
    };
  }
  if (unit.range) traits.push(trait("target", `Range ${unit.range}`, `Fires round shot from up to ${unit.range} places back in your line.`));
  return { traits, good: "Squares (double damage)", bad: "Being caught at the front" };
}

function trait(iconName, label, tip, negative = false) {
  return `<span class="trait${negative ? " trait--neg" : ""} kw kw--plain" tabindex="0" data-tip="${esc(tip)}">${icon(iconName)}${label}</span>`;
}

function rationsHtml(unit, rations) {
  if (!rations) return "";
  const list = rationSynergies(unit, rations);
  if (!list.length) return "";
  return `
    <section class="ucard__rations" aria-label="Recommended rations">
      <span class="ucard__rations-label">${icon("ration")}Rations</span>
      ${list.map((r) => `<span class="ration kw kw--plain" tabindex="0" data-tip="${esc(r.effect)}">${esc(r.name)}</span>`).join("")}
    </section>`;
}

function footerHtml(unit, rank, stats) {
  const delta = (n) => (rank > 0 ? `<sup>+${n}</sup>` : "");
  return `
    <footer class="ucard__foot">
      <div class="stat stat--atk" title="Attack ${stats.attack}" aria-label="Attack ${stats.attack}">
        ${icon("attack")}<b>${stats.attack}</b>${delta(rank)}
      </div>
      <div class="ucard__sell" title="Coins returned if you sell at this rank">
        Sells for ${icon("coin")}<b>${sellValue(rank)}</b>
      </div>
      <div class="stat stat--hp" title="Health ${stats.health}" aria-label="Health ${stats.health}">
        ${icon("health")}<b>${stats.health}</b>${delta(rank)}
      </div>
    </footer>`;
}

function triggerChip(trigger, small = false) {
  const t = TRIGGERS[trigger] || { label: trigger, icon: "target" };
  return `<span class="trig${small ? " trig--sm" : ""}" data-trigger="${trigger}">${icon(t.icon)}${t.label}</span>`;
}

function keyword(name) {
  const tip = KEYWORDS[name];
  return tip
    ? `<span class="kw" tabindex="0" data-tip="${esc(tip)}">${esc(name)}.</span>`
    : `<strong>${esc(name)}.</strong>`;
}

// {R} is the current rank, {R+n} adds n. Rank-scaled numbers are highlighted.
function fillTokens(text, rank) {
  return esc(text).replace(/\{R(?:\+(\d+))?\}/g, (_, add) => `<b class="dyn">${rank + Number(add || 0)}</b>`);
}

function typeIcon(unit) {
  return unit.type === "cavalry" ? "horse" : unit.type === "artillery" ? "cannon" : "infantry";
}

function rarity(share) {
  if (share >= 0.25) return "Common";
  if (share >= 0.12) return "Uncommon";
  return "Rare";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
