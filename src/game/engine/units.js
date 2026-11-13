// Unit definitions and live unit state. Mirrors Unit.cs and its ability
// components (Skirmish, GrenadierAttack, Cavalry, Artillery, Scout,
// BolsterMorale) from the Unity build.

/** Wraps units.json with lookups. */
export function createCatalog(data) {
  const byKind = new Map();
  for (const [id, def] of Object.entries(data.units)) byKind.set(`${def.nation}:${def.kind}`, id);
  return {
    rules: data.rules,
    nations: data.nations,
    units: data.units,
    companies: data.companies,
    rations: data.rations ?? {},
    def: (id) => data.units[id],
    /** Finds a unit id from a Unity-style name such as "french_line_1a2b3c4d". */
    idFromName(nation, name) {
      const kind = String(name).split("_")[1];
      return byKind.get(`${nation}:${kind}`) ?? null;
    },
  };
}

let nextUid = 1;

/**
 * A live unit. `attack` and `health` are its base values (what gets saved);
 * `attackBonus` only lives for one battle, like Unit.AttackBonus.
 */
export function createUnit(catalog, id, { rank = 0, attack, health, rng, name } = {}) {
  const def = catalog.def(id);
  if (!def) throw new Error(`Unknown unit id "${id}"`);
  const prefix = catalog.nations[def.nation].prefix;
  return {
    uid: nextUid++,
    id,
    kind: def.kind,
    nation: def.nation,
    name: name ?? `${prefix}_${def.kind}_${rng ? rng.hex8() : randomHex8()}`,
    type: def.type,
    attack: attack ?? def.attack + rank,
    health: health ?? def.health + rank,
    rank,
    maxRank: def.maxRank,
    cost: def.cost,
    formsSquare: !!def.formsSquare,
    isSkirmisher: false,
    company: false,
  };
}

/** A skirmisher or grenadier company spawned from its battalion in battle. */
export function createCompany(catalog, companyId, parent, { skirmisher }) {
  const def = catalog.companies[companyId];
  // Wine feeds the skirmishers and onions the grenadiers.
  const fed = (skirmisher ? parent.skirmishBonus : parent.grenadierBonus) ?? 0;
  return {
    uid: nextUid++,
    id: companyId,
    kind: def.kind,
    nation: parent.nation,
    name: `${parent.name.split("_")[0]}_${def.kind}_${parent.name.split("_")[2] ?? "00000000"}${skirmisher ? "_skirmisher" : ""}`,
    type: "infantry",
    attack: evalFormula(def.attackFormula, parent.rank) + fed,
    health: evalFormula(def.healthFormula, parent.rank) + fed,
    rank: 0,
    maxRank: 0,
    cost: 0,
    formsSquare: !!def.formsSquare && !skirmisher,
    isSkirmisher: !!skirmisher,
    company: true,
  };
}

/**
 * A lancer split off by Swarm Attack (designed ability): the same unit, attack
 * and abilities as its parent, with its share of the health, drawn with a green
 * coat. Like a company it lives for one battle and is never saved.
 */
export function createSwarmCopy(parent, health) {
  return {
    uid: nextUid++,
    id: parent.id,
    kind: parent.kind,
    nation: parent.nation,
    name: `${parent.name}_swarm`,
    type: parent.type,
    attack: parent.attack,
    health,
    rank: 0,
    maxRank: 0,
    cost: 0,
    formsSquare: false,
    isSkirmisher: false,
    company: true,
    swarmCopy: true,
  };
}

// Mirrors Unit.ComputeSumFromFormulaString.
export function evalFormula(formula, parentRank) {
  let sum = 0;
  let sign = 1;
  for (const m of String(formula).matchAll(/PARENT RANK|\d+|[+-]/gi)) {
    const tok = m[0].toUpperCase();
    if (tok === "+") sign = 1;
    else if (tok === "-") sign = -1;
    else sum += sign * (tok === "PARENT RANK" ? parentRank : Number(tok));
  }
  return sum;
}

/** Same kind and both below max rank (Deployment.TrySnapToDeploymentQueueSpace). */
export function canMerge(target, incoming) {
  return !!target && !!incoming && target.id === incoming.id && target.rank < target.maxRank && incoming.rank < incoming.maxRank;
}

/** Unit.SellPriceBumpBasedOnRank. */
export function rankRefund(rank) {
  return Math.floor(rank / 3);
}

export function sellValue(unit) {
  return 1 + rankRefund(unit.rank);
}

/**
 * Unity's save shape (UnitDetail), with QueuePosition 1 = front. Rations the
 * unit carries go in an extra Rations field, which Unity ignores.
 */
export function toUnitDetail(unit, queuePosition) {
  const detail = {
    Name: unit.name,
    Attack: unit.attack,
    HitPoints: unit.health,
    Rank: unit.rank,
    QueuePosition: Math.abs(queuePosition),
    IsSkirmisher: !!unit.isSkirmisher,
  };
  const rations = carried(unit);
  if (Object.keys(rations).length) detail.Rations = rations;
  return detail;
}

/** What rations left on a unit: Wine, Onion, Spirits (until the battle ends) and the Telescope. */
export function carried(unit) {
  const out = {};
  if (unit.skirmishBonus) out.skirmishBonus = unit.skirmishBonus;
  if (unit.grenadierBonus) out.grenadierBonus = unit.grenadierBonus;
  if (unit.spirits) out.spirits = unit.spirits;
  if (unit.telescope) out.telescope = true;
  return out;
}

export function fromUnitDetail(catalog, nation, detail) {
  const id = catalog.idFromName(nation, detail.Name);
  if (!id) return null;
  const unit = createUnit(catalog, id, {
    rank: detail.Rank ?? 0,
    attack: detail.Attack,
    health: detail.HitPoints,
    name: detail.Name,
  });
  const r = detail.Rations ?? {};
  for (const key of ["skirmishBonus", "grenadierBonus", "spirits"]) if (Number(r[key]) > 0) unit[key] = Number(r[key]);
  if (r.telescope) unit.telescope = true;
  return unit;
}

function randomHex8() {
  return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
}
