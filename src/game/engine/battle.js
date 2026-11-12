// Battle simulation. Follows the phase order of GameManager.Update in the
// Unity build, one cycle at a time:
//
//   designed per-cycle buffs -> skirmishers -> squares -> artillery (and the
//   designed rifle and rocket fire) -> grenadiers + cleanup -> melee strengths
//   -> close up -> melee -> grenadiers + cleanup -> close up
//
// It returns the result plus an event log; the battle screen animates the log.
import { createCompany } from "./units.js";

const MAX_CYCLES = 200;

/**
 * @param catalog  from createCatalog()
 * @param left     the player's units, front first (they are cloned, not changed)
 * @param right    the opponent's units, front first
 * @returns {{ result: "win" | "loss" | "draw", events: object[] }}  result is from the left side's view
 */
export function simulateBattle(catalog, left, right) {
  const b = {
    catalog,
    rules: catalog.rules,
    sides: { left: left.filter(Boolean).map(enter), right: right.filter(Boolean).map(enter) },
    roundCycle: 1,
    events: [],
  };
  const log = (e) => b.events.push(e);
  log({ type: "start", left: b.sides.left.map(snapshot), right: b.sides.right.map(snapshot) });
  arrange(b);

  for (let n = 0; n < MAX_CYCLES; n++) {
    log({ type: "cycle", n: b.roundCycle });
    cycleBuffs(b);
    skirmishCheck(b);
    squareChecks(b);
    artilleryPhase(b);
    let result = grenadiersAndCleanup(b);
    if (result) return finish(b, result);

    const strengths = meleeStrengths(b);
    arrange(b);
    fight(b, strengths);
    result = grenadiersAndCleanup(b);
    b.roundCycle++;
    if (result) return finish(b, result);
    arrange(b);
  }
  return finish(b, "draw");
}

function enter(u) {
  return { ...u, attackBonus: 0, cycle: 1, squared: false, skirmishReady: false, grenadiersReady: false };
}

function def(b, u) {
  return b.catalog.units[u.id] ?? {};
}

function snapshot(u) {
  return { uid: u.uid, id: u.id, name: u.name, attack: u.attack, attackBonus: u.attackBonus, health: u.health, rank: u.rank, isSkirmisher: u.isSkirmisher };
}

/** What the battle screen shows on a unit's badges: attack including bonuses, and health. */
function shown(u) {
  return { uid: u.uid, attack: u.attack + u.attackBonus, health: u.health };
}

function other(side) {
  return side === "left" ? "right" : "left";
}

function front(b, side) {
  return b.sides[side][0] ?? null;
}

function isCavalry(u) {
  return u?.type === "cavalry";
}

// Unit.CheckUnlocksOnStart: companies unlock at their rank (rank 0 means the
// battalion comes with them).
function initAbilities(b) {
  for (const side of ["left", "right"]) {
    for (const u of b.sides[side]) {
      const d = def(b, u);
      u.skirmishReady = !!d.skirmish && u.rank >= d.skirmish.unlockRank;
      u.grenadiersReady = !!d.grenadiers && u.rank >= d.grenadiers.unlockRank;
    }
  }
}

// Unit.ApplyQueuePositionChangeEffect + Artillery.SetAttackByQueue: a gun at
// the front loads canister (+3 attack); anywhere else it fires round shot.
function arrange(b) {
  if (!b.initialised) {
    initAbilities(b);
    b.initialised = true;
  }
  for (const side of ["left", "right"]) {
    b.sides[side].forEach((u, i) => {
      u.position = i + 1;
      if (def(b, u).artillery) u.attackBonus = u.position === 1 ? b.rules.canisterAttackBonus : 0;
    });
  }
  b.events.push({
    type: "arrange",
    left: b.sides.left.map((u) => u.uid),
    right: b.sides.right.map((u) => u.uid),
    stats: [...b.sides.left, ...b.sides.right].map(shown),
  });
}

// Designed ability (Grenadiers a Pied de la Garde): every cycle, other infantry gain health.
function cycleBuffs(b) {
  for (const side of ["left", "right"]) {
    for (const u of b.sides[side]) {
      const boost = def(b, u).cycleBoostInfantry;
      if (!boost) continue;
      for (const ally of b.sides[side]) {
        if (ally === u || ally.type !== "infantry") continue;
        ally.attackBonus += boost.attack;
        ally.health += boost.health;
        b.events.push({ type: "buff", uid: ally.uid, attack: boost.attack, health: boost.health, source: u.uid, stat: shown(ally) });
      }
    }
  }
}

// GameManager.SkirmishCheck + Skirmish.DeploySkirmishers.
function skirmishCheck(b) {
  for (const side of ["left", "right"]) {
    const u = front(b, side);
    const enemy = front(b, other(side));
    if (!u || !enemy || !u.skirmishReady || isCavalry(enemy)) continue;
    const d = def(b, u);
    if (u.cycle === 1) {
      if (b.sides[side].length > 4) {
        u.attackBonus = 1;
        b.events.push({ type: "skirmishBonus", uid: u.uid, attackBonus: 1, stat: shown(u) });
      } else {
        const company = enter(createCompany(b.catalog, d.skirmish.company, u, { skirmisher: true }));
        b.sides[side].unshift(company);
        u.cycle++;
        b.events.push({ type: "spawn", side, reason: "skirmish", from: u.uid, unit: snapshot(company) });
        arrange(b);
      }
    }
    u.skirmishReady = false;
  }
}

// GameManager.SquareCheck: infantry facing cavalry forms square, but not on a
// first clash after reaching the front mid-battle. A square adds +3 attack.
function squareChecks(b) {
  const l = front(b, "left");
  const r = front(b, "right");
  if (!l || !r) return;
  for (const [u, opp] of [[l, r], [r, l]]) {
    const squared = (b.roundCycle <= 1 || u.cycle > 1) && u.formsSquare && !u.isSkirmisher && isCavalry(opp);
    if (squared === u.squared) continue;
    u.squared = squared;
    u.attackBonus += squared ? b.rules.squareAttackBonus : -b.rules.squareAttackBonus;
    b.events.push({ type: "square", uid: u.uid, on: squared, stat: shown(u) });
  }
}

// GameManager.ArtilleryPhase + Artillery.Fire + Cannonball: round shot from
// within range, doubled on a square, harmless to skirmishers. Also fires the
// designed rifle and rocket abilities.
function artilleryPhase(b) {
  for (const side of ["left", "right"]) {
    const enemySide = other(side);
    for (const u of [...b.sides[side]]) {
      const d = def(b, u);
      const target = front(b, enemySide);
      if (!target) break;

      if (d.artillery && u.position > 1 && u.position <= d.artillery.range) {
        const dmg = target.squared ? u.attack * 2 : target.isSkirmisher ? 0 : u.attack;
        b.events.push({ type: "fire", weapon: "ball", from: u.uid, to: target.uid, damage: dmg, crit: target.squared });
        damage(b, enemySide, target, dmg);
      }
      if (d.rifleTactics && u.position === d.rifleTactics.position) {
        b.events.push({ type: "fire", weapon: "rifle", from: u.uid, to: target.uid, damage: u.attack });
        damage(b, enemySide, target, u.attack);
      }
      if (d.rockets && u.position >= d.rockets.minPosition && b.sides[enemySide].some((t) => t.health > 0)) {
        // The attack is split into single rockets: one to each enemy from the
        // front back, then round again from the front (attack 6 against five
        // enemies hits 2, 1, 1, 1, 1). Like round shot, rockets do nothing to skirmishers.
        const enemies = b.sides[enemySide].filter((t) => t.health > 0);
        const to = Array.from({ length: u.attack }, (_, i) => enemies[i % enemies.length]);
        const hits = new Map();
        for (const t of to) hits.set(t, (hits.get(t) ?? 0) + (t.isSkirmisher ? 0 : 1));
        b.events.push({ type: "fire", weapon: "rockets", from: u.uid, to: to.map((t) => t.uid), damage: u.attack });
        hits.forEach((dmg, t) => damage(b, enemySide, t, dmg));
      }
    }
  }
}

// ComputeAttackStrengths: cavalry hitting a square deals 1 (a lancer's first clash excepted).
function meleeStrengths(b) {
  const l = front(b, "left");
  const r = front(b, "right");
  const hit = (u) => u.attack + u.attackBonus;
  const breaksSquare = (cav) => cav.cycle === 1 && def(b, cav).lancer;
  if (l.squared && isCavalry(r) && !breaksSquare(r)) return { left: 1, right: hit(l) };
  if (r.squared && isCavalry(l) && !breaksSquare(l)) return { left: hit(r), right: 1 };
  return { left: hit(r), right: hit(l) };
}

function fight(b, strengths) {
  const l = front(b, "left");
  const r = front(b, "right");
  b.events.push({
    type: "melee",
    left: l.uid,
    right: r.uid,
    leftDamage: strengths.left,
    rightDamage: strengths.right,
    leftKind: strikeKind(b, l),
    rightKind: strikeKind(b, r),
  });
  damage(b, "left", l, strengths.left);
  damage(b, "right", r, strengths.right);
  l.cycle++;
  r.cycle++;
}

// How a front unit strikes, for the battle effects (CombatEffect.cs).
function strikeKind(b, u) {
  if (isCavalry(u)) return "sabre";
  if (def(b, u).artillery) return "canister";
  return "musket";
}

function damage(b, side, u, amount) {
  if (!amount) return;
  const wasAlive = u.health > 0;
  u.health -= amount;
  b.events.push({ type: "damage", uid: u.uid, amount, health: u.health });
  if (wasAlive && u.health <= 0) onDie(b, side, u);
}

// Unit.OnDie + Cavalry.WinBuff: the enemy front unit, if cavalry, grows.
function onDie(b, side, u) {
  b.events.push({ type: "fallen", uid: u.uid });
  const opp = front(b, other(side));
  if (!opp || !isCavalry(opp) || opp.health <= 0) return;
  const buff = def(b, opp).winBuff;
  if (!buff) return;
  const n = buff === "major" ? opp.rank + 1 : 1;
  opp.health += n;
  opp.attackBonus += n;
  b.events.push({ type: "buff", uid: opp.uid, attack: n, health: n, reason: "winBuff", stat: shown(opp) });
}

// GrenadiersCheck then PostCycleCleanup, then CheckForAndHandleBattleResult.
function grenadiersAndCleanup(b) {
  for (const side of ["left", "right"]) {
    const u = front(b, side);
    if (!u || u.health > 0 || !u.grenadiersReady) continue;
    u.grenadiersReady = false;
    const company = enter(createCompany(b.catalog, def(b, u).grenadiers.company, u, { skirmisher: false }));
    b.sides[side].splice(1, 0, company);
    b.events.push({ type: "spawn", side, reason: "grenadiers", from: u.uid, unit: snapshot(company) });
  }
  for (const side of ["left", "right"]) {
    const dead = b.sides[side].filter((u) => u.health <= 0);
    if (!dead.length) continue;
    b.sides[side] = b.sides[side].filter((u) => u.health > 0);
    b.events.push({ type: "remove", side, uids: dead.map((u) => u.uid) });
  }
  const l = b.sides.left.length;
  const r = b.sides.right.length;
  if (l && r) return null;
  return !l && !r ? "draw" : !l ? "loss" : "win";
}

function finish(b, result) {
  b.events.push({ type: "result", result });
  return { result, events: b.events };
}
