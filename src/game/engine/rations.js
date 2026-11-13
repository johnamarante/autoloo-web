// Rations (data/rations.json, designed in supplies/rations.csv): bought beside
// the recruits and placed on a deployed unit. Some feed only that unit, some
// the whole army, and some change the shop.
import { createUnit } from "./units.js";

/** Whether this ration can be placed on this unit; a reason when it cannot. */
export function rationRefusal(catalog, run, rationId, unit) {
  const def = catalog.def(unit.id);
  if (rationId === "wine" && !def.skirmish) return "Wine is for battalions with skirmishers";
  if (rationId === "onion" && !def.grenadiers) return "Onions are for battalions with grenadiers";
  if (rationId === "telescope" && unit.telescope) return "This unit already has a telescope";
  if (rationId === "claymore" && !["infantry", "cavalry", "artillery"].includes(unit.type)) return "The claymore cannot go on this unit";
  if (rationId === "colors" && extraRanksLeft(catalog, run) < 1) return "The shop is already at its highest rank";
  return null;
}

/**
 * Feeds a ration to the unit at lineIndex. Returns the stat changes as
 * { type: "buff", uid, attack, health } events, like deployment boosts.
 */
export function applyRation(catalog, run, rationId, unit, rng) {
  const events = [];
  const add = (u, attack, health) => {
    if (!attack && !health) return;
    u.attack += attack;
    u.health += health;
    events.push({ type: "buff", uid: u.uid, attack, health });
  };
  const army = run.line.filter(Boolean);
  const scots = ["british_highlander", "british_socttsgreysdragoons"];

  switch (rationId) {
    case "bread":
      add(unit, 1, 1);
      break;
    case "cheese":
      add(unit, 0, 2);
      break;
    case "vegetables":
      add(unit, 2, 2);
      break;
    case "wine":
      unit.skirmishBonus = (unit.skirmishBonus ?? 0) + 1;
      events.push({ type: "note", uid: unit.uid, text: "Skirmishers +1/+1" });
      break;
    case "onion":
      unit.grenadierBonus = (unit.grenadierBonus ?? 0) + 1;
      events.push({ type: "note", uid: unit.uid, text: "Grenadiers +1/+1" });
      break;
    case "spirits":
      // Taken off again once the battle is over (endSpirits).
      unit.spirits = (unit.spirits ?? 0) + 3;
      add(unit, 3, 3);
      break;
    case "hay":
      army.filter((u) => u.type === "cavalry").forEach((u) => add(u, 1, 1));
      break;
    case "bacon":
      army.filter((u) => u.type === "infantry").forEach((u) => add(u, 3, 3));
      break;
    case "telescope":
      unit.telescope = true;
      if (unit.type === "artillery") add(unit, 1, 1);
      events.push({ type: "note", uid: unit.uid, text: "Telescope" }, { type: "scout", uid: unit.uid });
      break;
    case "claymore":
      if (unit.type === "artillery") add(unit, 1, 1);
      else add(unit, unit.attack, scots.includes(unit.id) ? unit.health : 0);
      break;
    case "eagle":
      add(unit, unit.attack, unit.health);
      break;
    case "colors":
      run.colors = (run.colors ?? 0) + 1;
      events.push({ type: "shopRank", rank: shopRank(catalog, run) });
      break;
    case "drums":
      // The recruits are replaced by three of this unit, held or not.
      run.shop = run.shop.map(() => ({ unit: createUnit(catalog, unit.id, { rng }), frozen: false }));
      events.push({ type: "drums", id: unit.id });
      break;
    default:
      throw new Error(`Unknown ration "${rationId}"`);
  }
  return events;
}

/** Spirits wear off after the battle (a unit is never left below 1 health). */
export function endSpirits(run) {
  for (const u of run.line) {
    if (!u?.spirits) continue;
    u.attack = Math.max(0, u.attack - u.spirits);
    u.health = Math.max(1, u.health - u.spirits);
    u.spirits = 0;
  }
}

/** The shop rank its wins have earned, before any Colors. */
export function rankForWins(catalog, nation, wins) {
  const steps = catalog.nations[nation].shopRankWins ?? [0];
  return steps.filter((w) => wins >= w).length || 1;
}

export function maxShopRank(catalog, nation) {
  return (catalog.nations[nation].shopRankWins ?? [0]).length;
}

/** The run's shop rank: earned by wins, plus one for each Colors, up to the nation's highest. */
export function shopRank(catalog, run) {
  return Math.min(maxShopRank(catalog, run.nation), rankForWins(catalog, run.nation, run.wins) + (run.colors ?? 0));
}

function extraRanksLeft(catalog, run) {
  return maxShopRank(catalog, run.nation) - shopRank(catalog, run);
}

/** Rations the shop can offer: this nation's (or both sides'), up to the shop rank. */
export function rationPool(catalog, run) {
  const rank = shopRank(catalog, run);
  return Object.entries(catalog.rations)
    .filter(([, r]) => (!r.nation || r.nation === run.nation) && r.shopRank <= rank)
    .map(([id]) => id)
    .filter((id) => id !== "colors" || extraRanksLeft(catalog, run) > 0);
}
