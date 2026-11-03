// Local save, in Unity's SavedFile shape (UnitDetails.json), so the same
// object can later go to the Cloudflare Worker. Browser storage can be
// unavailable (private windows, blocked site data), so every call is guarded.
import { armyDetails, shopDetails } from "../engine/run.js";

const KEY = "autoloo.save.v1";

export function saveRun(run, playerName = "guest") {
  const saved = {
    playername: playerName,
    nation: run.nation,
    round: run.round,
    wins: run.wins,
    losses: run.losses,
    coin: run.coin,
    UnitDetails: armyDetails(run),
    ShopQueue: shopDetails(run),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Saving is best effort.
  }
  return saved;
}

export function loadSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    return saved?.nation ? saved : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
