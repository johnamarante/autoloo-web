// Opponents, as OpponentGeneration.cs builds them: a random army another
// player drafted at the same round, or five random units as a fallback.
import { createUnit, fromUnitDetail } from "./units.js";

/** Unity draft key: armydraft_{fr|br}_{round, capped at 3}. */
export function draftKey(catalog, nation, round) {
  return `armydraft_${catalog.nations[nation].draftCode}_${Math.min(round, catalog.rules.draftRoundCap)}`;
}

/**
 * Picks an army another player drafted on the same turn as this player. If
 * there is none, it takes the nearest earlier turn, then the nearest later
 * one. Armies no player could have built by their turn are left out (the old
 * seed drafts stamped turn 1 hold four units or six-attack guns).
 */
export function pickDraft(catalog, nation, drafts, round, rng) {
  if (!Array.isArray(drafts) || !drafts.length) return null;
  const fair = drafts.filter((d) => couldBuild(catalog, nation, d));
  if (!fair.length) return null;
  const turns = [...new Set(fair.map((d) => Number(d.round)))];
  const distance = (t) => (t <= round ? round - t : t - round + 0.5); // earlier turns win ties
  const turn = turns.reduce((best, t) => (distance(t) < distance(best) ? t : best));
  const pool = fair.filter((d) => Number(d.round) === turn);
  return pool[rng.int(pool.length)];
}

/** Most units a line can hold by this turn: 10 coin buys three on turn 1. */
export function maxUnits(catalog, round) {
  const { startingCoin, unitCost, lineSlots } = catalog.rules;
  return Math.min(lineSlots, round * Math.floor(startingCoin / unitCost));
}

/** Whether a draft is an army a player could really have on its turn. */
export function couldBuild(catalog, nation, draft) {
  const round = Number(draft?.round);
  const details = draft?.UnitDetails ?? [];
  if (!Number.isInteger(round) || round < 1 || !details.length || details.length > maxUnits(catalog, round)) return false;
  return details.every((d) => {
    const id = catalog.idFromName(nation, d.Name);
    if (!id) return true; // unknown units are skipped when the army is built
    const def = catalog.def(id);
    const rank = Number(d.Rank) || 0;
    // Merges add a point each; deployment boosts (Highlanders) add a few more per turn.
    const most = (base) => base + rank + 4 * round;
    return def.tier <= round && rank <= def.maxRank && d.Attack <= most(def.attack) && d.HitPoints <= most(def.health);
  });
}

/** Units in front-first order; unknown units are skipped, like Unity's try/catch. */
export function opponentFromDraft(catalog, nation, draft) {
  const details = [...(draft?.UnitDetails ?? [])].sort((a, b) => a.QueuePosition - b.QueuePosition);
  const units = details.map((d) => fromUnitDetail(catalog, nation, d)).filter(Boolean);
  return units.length ? { name: String(draft.playername ?? "Unknown"), units } : null;
}

/**
 * OpponentGeneration.GenerateRandom, sized to the turn: rank 0 units the shop
 * could have offered by then, three on turn 1 and five after.
 */
export function randomOpponent(catalog, nation, rng, round = 1) {
  const roster = catalog.nations[nation].roster.filter((id) => catalog.def(id).tier <= round && catalog.def(id).chance > 0);
  const units = Array.from({ length: maxUnits(catalog, round) }, () => createUnit(catalog, roster[rng.int(roster.length)], { rng }));
  return { name: rng.hex8(), units };
}

/** Scout.ScoutReport: enemy units outranking the scout show as unknown. */
export function scoutReport(opponent, scoutRank) {
  return (opponent?.units ?? []).slice(0, 5).map((u) => (u.rank > scoutRank ? { known: false } : { known: true, id: u.id, rank: u.rank }));
}

/** AutolooUserInfoUtil.GetUserDataKey: "auth0|abc" -> "player_abc". */
export function playerKey(userId) {
  const id = String(userId);
  return `player_${id.includes("|") ? id.split("|")[1] : id}`;
}

/** One army as StoreAndLoadArmyDetails writes it, to the player record and to the draft list. */
export function draftEntry(run, playerName, unitDetails) {
  return { playername: playerName, round: run.round, wins: run.wins, losses: run.losses, UnitDetails: unitDetails };
}

/** UpdateArmyDraftsByRosterAndTurn: drafts are stored as { data: [entry, ...] } and only ever appended to. */
export function appendDraft(stored, entry) {
  const list = Array.isArray(stored?.data) ? stored.data : [];
  return { data: [...list, entry] };
}
