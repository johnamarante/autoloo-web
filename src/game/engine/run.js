// One player's run: the deployment phase between battles. Mirrors
// Deployment.cs (shop, roll, freeze, sell, end turn) and the drop and merge
// rules in Unit.OnMouseDown / Deployment.TrySnapToDeploymentQueueSpace.
import { canMerge, createUnit, fromUnitDetail, rankRefund, sellValue, toUnitDetail } from "./units.js";
import { applyRation, endSpirits, rationPool, rationRefusal, shopRank } from "./rations.js";

export { shopRank };

/**
 * State shape:
 *   line[0..4]  deployed units, index 0 is the front (Unity queue position -1)
 *   shop[0..2]  { unit, frozen } or null
 *   rations[0..1]  { id, frozen } or null
 *   colors      how many Colors raised the shop rank
 */
export function createRun(catalog, nation, rng, saved = null) {
  const rules = catalog.rules;
  const run = {
    nation,
    round: 1,
    coin: rules.startingCoin,
    wins: 0,
    losses: 0,
    line: Array(rules.lineSlots).fill(null),
    shop: Array(rules.shopSlots).fill(null),
    rations: Array(rules.rationSlots ?? 0).fill(null),
    colors: 0,
    status: "playing",
  };
  if (saved) {
    Object.assign(run, { round: saved.round, coin: saved.coin, wins: saved.wins, losses: saved.losses, colors: Number(saved.colors) || 0 });
    (saved.RationQueue ?? []).forEach((id, i) => {
      if (catalog.rations[id] && i < run.rations.length) run.rations[i] = { id, frozen: true };
    });
    for (const d of saved.UnitDetails ?? []) {
      const u = fromUnitDetail(catalog, nation, d);
      if (u && d.QueuePosition >= 1 && d.QueuePosition <= rules.lineSlots) run.line[d.QueuePosition - 1] = u;
    }
    (saved.ShopQueue ?? []).forEach((d, i) => {
      const u = fromUnitDetail(catalog, nation, d);
      if (u && i < rules.shopSlots) run.shop[i] = { unit: u, frozen: true };
    });
    fillShop(catalog, run, rng);
  } else {
    fillShop(catalog, run, rng);
  }
  return run;
}

/** Units the shop can offer: tier at most the shop rank, weighted by Chance. */
export function shopPool(catalog, run) {
  const rank = shopRank(catalog, run);
  return catalog.nations[run.nation].roster
    .map((id) => ({ id, def: catalog.def(id) }))
    .filter(({ def }) => def.tier <= rank && def.chance > 0);
}

function fillShop(catalog, run, rng) {
  const pool = shopPool(catalog, run);
  const total = pool.reduce((s, p) => s + p.def.chance, 0);
  run.shop = run.shop.map((slot) => {
    if (slot?.frozen) return slot;
    let roll = rng.int(total);
    for (const p of pool) {
      if (roll < p.def.chance) return { unit: createUnit(catalog, p.id, { rng }), frozen: false };
      roll -= p.def.chance;
    }
    return null;
  });
  fillRations(catalog, run, rng);
}

// Rations come up evenly from what the shop rank offers; held ones stay.
function fillRations(catalog, run, rng) {
  const pool = rationPool(catalog, run);
  run.rations = run.rations.map((slot) => (slot?.frozen ? slot : pool.length ? { id: pool[rng.int(pool.length)], frozen: false } : null));
}

export function roll(catalog, run, rng, { paid = true } = {}) {
  if (paid) {
    if (run.coin < catalog.rules.rollCost) return fail("Not enough coin to draft recruits");
    run.coin -= catalog.rules.rollCost;
  }
  fillShop(catalog, run, rng);
  return ok("roll");
}

export function toggleFreeze(run, shopIndex) {
  const slot = run.shop[shopIndex];
  if (!slot) return fail("Empty shop slot");
  slot.frozen = !slot.frozen;
  return ok(slot.frozen ? "freeze" : "unfreeze");
}

export function toggleRationFreeze(run, rationIndex) {
  const slot = run.rations[rationIndex];
  if (!slot) return fail("Empty ration slot");
  slot.frozen = !slot.frozen;
  return ok(slot.frozen ? "freeze" : "unfreeze");
}

/** Places a ration from the shop on a deployed unit. */
export function buyRation(catalog, run, rationIndex, lineIndex, rng) {
  const slot = run.rations[rationIndex];
  if (!slot) return fail("Empty ration slot");
  const unit = run.line[lineIndex];
  if (!unit) return fail("Place rations on a deployed unit");
  const cost = catalog.rules.rationCost;
  if (run.coin < cost) return fail("Not enough coin");
  const refusal = rationRefusal(catalog, run, slot.id, unit);
  if (refusal) return fail(refusal);
  run.coin -= cost;
  run.rations[rationIndex] = null;
  const events = applyRation(catalog, run, slot.id, unit, rng);
  // A higher shop rank shows at once in the rations still on offer.
  if (slot.id === "colors") fillRations(catalog, run, rng);
  return ok("ration", { unit, ration: slot.id, events });
}

/** Drops a shop unit on a line slot: place, merge, or insert with a shift. */
export function buy(catalog, run, shopIndex, lineIndex) {
  const slot = run.shop[shopIndex];
  if (!slot) return fail("Empty shop slot");
  const unit = slot.unit;
  if (run.coin < unit.cost) return fail("Not enough coin");
  const target = run.line[lineIndex];

  if (target && canMerge(target, unit)) {
    if (target.rank < unit.rank) return fail("Cannot merge onto a lower rank");
    run.coin -= unit.cost;
    run.shop[shopIndex] = null;
    return ok("merge", { unit: target, events: rankUp(catalog, run, target, unit) });
  }
  if (target && !shiftToMakeRoom(run, lineIndex)) return fail("The line is full");

  run.coin -= unit.cost;
  run.shop[shopIndex] = null;
  run.line[lineIndex] = unit;
  return ok("deploy", { unit, events: onDeploy(catalog, run, unit) });
}

/** Moves a deployed unit to another line slot: move, merge, or swap. */
export function move(catalog, run, fromIndex, toIndex) {
  const unit = run.line[fromIndex];
  if (!unit || fromIndex === toIndex) return fail("Nothing to move");
  const target = run.line[toIndex];
  if (target && canMerge(target, unit)) {
    if (target.rank < unit.rank) return fail("Cannot merge onto a lower rank");
    run.line[fromIndex] = null;
    return ok("merge", { unit: target, events: rankUp(catalog, run, target, unit) });
  }
  run.line[fromIndex] = target;
  run.line[toIndex] = unit;
  return ok(target ? "swap" : "move", { unit });
}

export function sell(run, lineIndex) {
  const unit = run.line[lineIndex];
  if (!unit) return fail("Nothing to sell");
  run.coin += sellValue(unit);
  run.line[lineIndex] = null;
  return ok("sell", { unit });
}

/** Unity: you must deploy something; if you cannot afford a unit you get 3 coin and a free roll. */
export function checkEndTurn(catalog, run, rng) {
  if (run.line.some(Boolean)) return ok("ready");
  if (run.coin < catalog.rules.unitCost) {
    run.coin = catalog.rules.unitCost;
    roll(catalog, run, rng, { paid: false });
  }
  return fail("Please deploy at least one unit");
}

/** The army as Unity saves it (UnitDetails), front first. */
export function armyDetails(run) {
  return run.line.flatMap((u, i) => (u ? [toUnitDetail(u, i + 1)] : []));
}

/** Frozen shop units carry over, like Unity's ShopQueue. */
export function shopDetails(run) {
  return run.shop.flatMap((s) => (s?.frozen ? [toUnitDetail(s.unit, 0)] : []));
}

/** Held rations carry over too. */
export function rationDetails(run) {
  return run.rations.flatMap((s) => (s?.frozen ? [s.id] : []));
}

/** Returns the new shop rank when this result raised it. */
export function applyBattleResult(catalog, run, result, rng) {
  const rankBefore = shopRank(catalog, run);
  endSpirits(run);
  if (result === "win") run.wins++;
  if (result === "loss") run.losses++;
  if (run.losses >= catalog.rules.hearts) run.status = "defeat";
  else if (run.wins >= catalog.rules.winsToVictory) run.status = "victory";
  run.round++;
  run.coin = catalog.rules.startingCoin;
  fillShop(catalog, run, rng);
  const rank = shopRank(catalog, run);
  return rank > rankBefore ? { shopRankUp: rank } : {};
}

export function heartsLeft(catalog, run) {
  return catalog.rules.hearts - run.losses;
}

// Unit.RankUp: +1/+1 and a rank; the consumed unit's rank/3 comes back as coin.
// Scouts report again on a rank up (Unit.OnRankChanged).
function rankUp(catalog, run, target, consumed) {
  target.rank++;
  target.attack++;
  target.health++;
  // Rations the consumed unit carried are not lost.
  target.skirmishBonus = (target.skirmishBonus ?? 0) + (consumed.skirmishBonus ?? 0) || undefined;
  target.grenadierBonus = (target.grenadierBonus ?? 0) + (consumed.grenadierBonus ?? 0) || undefined;
  target.telescope = target.telescope || consumed.telescope || undefined;
  run.coin += rankRefund(consumed.rank);
  const events = [{ type: "rankUp", uid: target.uid, rank: target.rank }];
  if (catalog.def(target.id).scout) events.push({ type: "scout", uid: target.uid, rank: target.rank });
  return events;
}

// Pushes units toward the nearest empty slot so lineIndex is free.
function shiftToMakeRoom(run, lineIndex) {
  const empties = run.line.map((u, i) => (u ? null : i)).filter((i) => i !== null);
  if (!empties.length) return false;
  const empty = empties.reduce((best, i) => (Math.abs(i - lineIndex) < Math.abs(best - lineIndex) ? i : best));
  const step = empty > lineIndex ? 1 : -1;
  for (let i = empty; i !== lineIndex; i -= step) run.line[i] = run.line[i - step];
  run.line[lineIndex] = null;
  return true;
}

// Deploy-time abilities: BolsterMorale (Highlanders), and the designed
// Tirailleurs boost. Scouting is reported to the UI as an event.
function onDeploy(catalog, run, unit) {
  const def = catalog.def(unit.id);
  const events = [];
  const allies = run.line.filter(Boolean);
  const buff = (u, attack, health) => {
    u.attack += attack;
    u.health += health;
    events.push({ type: "buff", uid: u.uid, attack, health });
  };

  if (def.bolsterMorale && def.kindTags?.length) {
    const shares = (u) => (catalog.def(u.id).kindTags ?? []).some((t) => def.kindTags.includes(t));
    const tagged = allies.filter(shares);
    tagged.forEach((u) => buff(u, 1, 1));
    // Unity also gives the Highlanders themselves a second +1/+1 when anyone else shares the tag.
    if (tagged.some((u) => u !== unit)) buff(unit, 1, 1);
  }
  if (def.deployBoostInfantry) {
    const { attack, health } = def.deployBoostInfantry;
    allies.filter((u) => u !== unit && u.type === "infantry").forEach((u) => buff(u, attack, health));
  }
  if (def.scout) events.push({ type: "scout", uid: unit.uid, rank: unit.rank });
  return events;
}

function ok(action, extra = {}) {
  return { ok: true, action, events: [], ...extra };
}

function fail(reason) {
  return { ok: false, reason };
}
