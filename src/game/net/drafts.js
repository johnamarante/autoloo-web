// Matchmaking and the player record, through whichever store is in use.
// Network problems never stop a game: a failed read falls back to a random
// opponent, and a failed write is logged, like Unity's async void calls.
import { appendDraft, draftEntry, draftKey, opponentFromDraft, pickDraft, playerKey, randomOpponent } from "../engine/opponent.js";
import { armyDetails, shopRank } from "../engine/run.js";

/** OpponentGeneration.GetDraftDataAsync, then GenerateFromDraftData or GenerateRandom. */
export async function findOpponent(store, catalog, nation, round, rng, rank = 1) {
  const enemy = catalog.nations[nation].enemy;
  try {
    const stored = await store.get(draftKey(catalog, enemy, round));
    const opponent = opponentFromDraft(catalog, enemy, pickDraft(catalog, enemy, stored?.data, round, rng, rank));
    if (opponent) return opponent;
  } catch (err) {
    console.warn("Could not load opponent drafts, using a random army.", err);
  }
  return randomOpponent(catalog, enemy, rng, round, rank);
}

/** WriteToPlayerPaste: the player's latest army and record. */
export async function savePlayerRecord(store, run, player, catalog = null) {
  if (player.guest) return;
  try {
    await store.set(playerKey(player.userId), draftEntry(run, player.name, armyDetails(run), catalog ? shopRank(catalog, run) : null));
  } catch (err) {
    console.warn("Could not save the player record.", err);
  }
}

/** UpdateArmyDraftsByRosterAndTurn: adds this turn's army to the pool other players fight. */
export async function postDraft(store, catalog, run, player) {
  if (player.guest) return;
  const key = draftKey(catalog, run.nation, run.round);
  try {
    const stored = await store.get(key);
    await store.set(key, appendDraft(stored, draftEntry(run, player.name, armyDetails(run), shopRank(catalog, run))));
  } catch (err) {
    console.warn("Could not post this army to the draft pool.", err);
  }
}
