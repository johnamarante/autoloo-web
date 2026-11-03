// Opponents, as OpponentGeneration.cs builds them: a random army another
// player drafted at the same round, or five random units as a fallback.
import { createUnit, fromUnitDetail } from "./units.js";

/** Unity draft key: armydraft_{fr|br}_{round, capped at 3}. */
export function draftKey(catalog, nation, round) {
  return `armydraft_${catalog.nations[nation].draftCode}_${Math.min(round, catalog.rules.draftRoundCap)}`;
}

/** Picks a stored draft for this round, falling back to any draft in the list. */
export function pickDraft(drafts, round, rng) {
  if (!Array.isArray(drafts) || !drafts.length) return null;
  const sameRound = drafts.filter((d) => Number(d.round) === round);
  const pool = sameRound.length ? sameRound : drafts;
  return pool[rng.int(pool.length)];
}

/** Units in front-first order; unknown units are skipped, like Unity's try/catch. */
export function opponentFromDraft(catalog, nation, draft) {
  const details = [...(draft?.UnitDetails ?? [])].sort((a, b) => a.QueuePosition - b.QueuePosition);
  const units = details.map((d) => fromUnitDetail(catalog, nation, d)).filter(Boolean);
  return units.length ? { name: String(draft.playername ?? "Unknown"), units } : null;
}

/** OpponentGeneration.GenerateRandom: five rank 0 units from the enemy roster. */
export function randomOpponent(catalog, nation, rng) {
  const roster = catalog.nations[nation].roster;
  const units = Array.from({ length: 5 }, () => createUnit(catalog, roster[rng.int(roster.length)], { rng }));
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
