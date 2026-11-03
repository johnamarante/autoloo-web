// Where saves and drafts go, and who is playing.
//
//   live     the Cloudflare Worker that Unity players use (the default on GitHub Pages)
//   dev      the stand-in Worker in serve.mjs (the default on localhost): it keeps
//            its own copies and only reads from the live Worker, never writes
//   offline  this browser's localStorage
//
// Override with ?store=live|dev|offline. Players log in with Auth0 (see
// auth.js); guests never post armies, as in Unity. On a non-live store,
// ?player=name plays as a test player without logging in.
import { createLocalStore, createWorkerStore } from "./store.js";

export const LIVE_WORKER = "https://autoloo.john-amarante8888.workers.dev";

export function storageMode(location = window.location) {
  const asked = new URLSearchParams(location.search).get("store");
  if (["live", "dev", "offline"].includes(asked)) return asked;
  return ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) ? "dev" : "live";
}

export function createStore(mode, location = window.location) {
  if (mode === "live") return createWorkerStore(LIVE_WORKER);
  if (mode === "dev") return createWorkerStore(`${location.origin}/api`);
  return createLocalStore();
}

export function currentPlayer(mode, location = window.location) {
  const name = new URLSearchParams(location.search).get("player")?.trim();
  if (name && mode !== "live") return { userId: `dev|${name}`, name, guest: false, test: true };
  return { userId: "guest", name: "guest", guest: true };
}
