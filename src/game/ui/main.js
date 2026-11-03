// Game entry point: menu -> deployment -> battle report -> deployment ...
// Opponents are armies other players drafted, read from the store (see
// net/config.js); signed-in players post theirs back at the end of each turn.
import { createRng } from "../engine/rng.js";
import { applyBattleResult, createRun } from "../engine/run.js";
import { simulateBattle } from "../engine/battle.js";
import { createStore, storageMode } from "../net/config.js";
import { authConfigured, currentSession, handleLoginRedirect, login, logout } from "../net/auth.js";
import { claimName, resolvePlayer } from "../net/player.js";
import { findOpponent, postDraft, savePlayerRecord } from "../net/drafts.js";
import { loadGameData } from "./data.js";
import { clearSave, loadSave, saveRun } from "./save.js";
import { mountMenu } from "./menu.js";
import { mountDeployment } from "./deployment.js";
import { mountReport } from "./report.js";
import { mountBattle } from "./battle.js";
import { mountEnding } from "./ending.js";
import { ambience, music, sfx } from "./sound.js";

const root = document.getElementById("game");
const rng = createRng();
const mode = storageMode();
const store = createStore(mode);
let player;
let loginMessage = "";
let data;
let screen;
let run;
let opponent;

function show(mount, ctx) {
  screen?.destroy();
  root.replaceChildren();
  screen = mount(root, ctx);
}

function menu() {
  // As in MainMenu.cs, a saved game is offered only to the player who saved it.
  const save = loadSave();
  music("menu");
  ambience(null);
  show(mountMenu, {
    data,
    save: save?.playername === player.name ? save : null,
    status: { mode, player, canLogin: authConfigured(), message: loginMessage },
    onLogin: (signup) => login({ signup }),
    onLogout: logout,
    async onSetName(name) {
      player = await claimName(store, player, name);
      menu();
    },
    onNewGame(nation) {
      clearSave();
      run = createRun(data.catalog, nation, rng);
      saveRun(run, player.name);
      deployment();
    },
    onResume() {
      const save = loadSave();
      run = createRun(data.catalog, save.nation, rng, save);
      deployment();
    },
  });
}

async function deployment() {
  // Unity drops the menu music once a side is chosen; deployment has only the distant battle.
  music(null);
  ambience("deployment");
  opponent = await findOpponent(store, data.catalog, run.nation, run.round, rng);
  show(mountDeployment, { data, run, rng, opponent, playerName: player.name, onBattle: battle, onQuit: menu });
  sfx("bugle"); // a fresh shop each turn, as Deployment draws one
}

function battle() {
  // Deployment.cs stores the army as the battle starts; both writes run in the background.
  savePlayerRecord(store, run, player);
  postDraft(store, data.catalog, run, player);
  // The line itself is not changed by the battle, like Unity restoring the army from UnitDetails.
  const army = run.line.filter(Boolean);
  const outcome = simulateBattle(data.catalog, army, opponent.units);
  ambience("battle");
  music(`march_${run.nation}`);
  show(mountBattle, { data, run, opponent, outcome, onDone: () => report(army, outcome.result) });
}

function report(army, result) {
  applyBattleResult(data.catalog, run, result, rng);
  if (run.status === "playing") saveRun(run, player.name);
  else clearSave();
  savePlayerRecord(store, run, player);
  show(mountReport, {
    data,
    run,
    result,
    opponent,
    army,
    onContinue: () => (run.status === "playing" ? deployment() : ending()),
  });
}

function ending() {
  show(mountEnding, { data, run, onDone: menu });
}

try {
  const [loaded, redirect] = await Promise.all([loadGameData(), authConfigured() ? handleLoginRedirect() : null]);
  data = loaded;
  loginMessage = redirect?.error ?? "";
  player = await resolvePlayer(store, mode, redirect?.session ?? currentSession());
  menu();
} catch (err) {
  console.error(err);
  root.innerHTML = `<p class="boot-error">The game could not load. Serve this folder over HTTP (npm start) rather than opening the file directly.</p>`;
}
