// Who is playing: a signed-in Auth0 user, a test player on a dev store, or a
// guest. A signed-in user's name comes from their player_{id} record, which
// MainMenu.SetupNewUser creates the first time they log in.
import { playerKey } from "../engine/opponent.js";
import { currentPlayer } from "./config.js";

export const GUEST = { userId: "guest", name: "guest", guest: true };
export const NAME_MAX = 24;

export async function resolvePlayer(store, mode, session, location = window.location) {
  const testPlayer = currentPlayer(mode, location);
  if (!testPlayer.guest) return testPlayer;
  if (!session) return GUEST;

  const suggested = (session.email.split("@")[0] || "Player").slice(0, NAME_MAX);
  const base = { userId: session.userId, email: session.email, guest: false };
  try {
    const record = await store.get(playerKey(session.userId));
    if (record?.playername) return { ...base, name: String(record.playername) };
    return { ...base, name: suggested, needsName: true };
  } catch (err) {
    // Unknown whether a record exists, so play under the suggested name without writing one.
    console.warn("Could not load the player record.", err);
    return { ...base, name: suggested };
  }
}

/** MainMenu.SetupNewUser: the first record holds just the name. */
export async function claimName(store, player, name) {
  const clean = String(name).trim().slice(0, NAME_MAX);
  if (!clean) throw new Error("Please enter a name.");
  await store.set(playerKey(player.userId), { playername: clean, UnitDetails: [] });
  return { ...player, name: clean, needsName: false };
}
