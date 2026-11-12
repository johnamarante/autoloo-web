// Battle screen: replays the engine's event log with the Unity build's
// effects (CombatEffect, Cannonball, NumberFloating, BlinkrRedEffect, and the
// shatter on death), at 1x or 2x speed, with a Skip button.
import { heartsLeft } from "../engine/run.js";
import { escapeHtml, tokenHtml } from "./token.js";
import { ambience, music, sfx } from "./sound.js";
import { handleSoundToggle, soundTogglesHtml } from "./sound-toggles.js";

const UI = new URL("../../../assets/ui/", import.meta.url).href;
const FX = new URL("../../../assets/fx/", import.meta.url).href;
const FRAMES = {
  musket: range(1, 19),
  rifle: range(1, 20),
  sabre: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13],
  cannon: range(1, 12),
};
const SPACING = 10; // em between places in line
const GAP = 5; // em from the centre to each front unit
const SPEED_KEY = "autoloo.battleSpeed";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let preloaded = false;

/** ctx: { data, run, opponent, outcome: { result, events }, onDone() } */
export function mountBattle(root, ctx) {
  const { data, run, opponent, outcome } = ctx;
  const { catalog } = data;
  let speed = Number(readPref(SPEED_KEY)) || 1;
  let skipped = false;
  let finished = false;
  const units = new Map(); // uid -> { el, side }
  const nationOf = { left: run.nation, right: catalog.nations[run.nation].enemy };
  const sound = (name, opts) => !skipped && sfx(name, opts);

  preloadFx();
  root.innerHTML = `
    <div class="screen battle" data-nation="${run.nation}">
      <header class="hud hud--battle">
        <div class="hud__stats">
          <span class="hud__stat" title="Hearts left"><img src="${UI}heart.svg" alt="Hearts"><b>${heartsLeft(catalog, run)}</b></span>
          <span class="hud__stat" title="Wins"><img src="${UI}laurel.svg" alt="Wins"><b>${run.wins}</b><small>/${catalog.rules.winsToVictory}</small></span>
          <span class="hud__stat hud__turn">Turn <b>${run.round}</b></span>
        </div>
        <p class="battle__vs">Your army <span>against</span> <b>${escapeHtml(opponent.name)}</b></p>
        <div class="battle__controls" role="group" aria-label="Battle speed">
          <button type="button" class="chip" data-speed="1" aria-pressed="${speed === 1}">1×</button>
          <button type="button" class="chip" data-speed="2" aria-pressed="${speed === 2}">2×</button>
          <button type="button" class="chip" data-act="skip">Skip</button>
          ${soundTogglesHtml()}
        </div>
      </header>
      <div class="field">
        <div class="field__units" inert></div>
        <div class="field__fx" aria-hidden="true"></div>
      </div>
      <div class="battle__result" hidden>
        <p class="battle__result-text"></p>
        <button type="button" class="btn btn--primary" data-act="continue">Continue</button>
      </div>
      <p class="sr-only" aria-live="polite" data-live></p>
    </div>`;

  const layer = root.querySelector(".field__units");
  const fx = root.querySelector(".field__fx");
  const live = root.querySelector("[data-live]");
  const screen = root.querySelector(".battle");
  const setMoveSpeed = () => screen.style.setProperty("--move", `${420 / speed}ms`);
  setMoveSpeed();

  const wait = (ms) => (skipped ? Promise.resolve() : new Promise((r) => setTimeout(r, ms / speed)));

  // Units ------------------------------------------------------------------

  function addUnit(snap, side, place) {
    const el = document.createElement("div");
    el.className = "bunit";
    el.dataset.uid = snap.uid;
    el.dataset.side = side;
    el.innerHTML = `<img class="bunit__square" src="${FX}square_transparent.svg" alt="">` + tokenHtml(data, snap, { where: "battle", index: 0, facing: side === "left" ? "right" : "left" });
    setPlace(el, side, place, true);
    layer.append(el);
    units.set(snap.uid, { el, side });
    return el;
  }

  function setPlace(el, side, place, instant = false) {
    const x = side === "left" ? 50 - GAP - (place - 1) * SPACING : 50 + GAP + (place - 1) * SPACING;
    if (instant) el.style.transition = "none";
    el.style.setProperty("--x", x);
    el.style.zIndex = String(20 - place);
    if (instant) {
      void el.offsetWidth;
      el.style.transition = "";
    }
  }

  function setStat({ uid, attack, health }) {
    const u = units.get(uid);
    if (!u) return;
    if (attack !== undefined) u.el.querySelector(".token__stat--atk .token__num").textContent = attack;
    if (health !== undefined) u.el.querySelector(".token__stat--hp .token__num").textContent = Math.max(0, health);
  }

  // Once a battalion has sent out its skirmishers (or had no room to), its badge fades,
  // as Unity turns off skirmisher_Badge when it disables the Skirmish component.
  function spendBadge(uid, kind) {
    units.get(uid)?.el.querySelector(`.token__badge[data-badge="${kind}"]`)?.classList.add("is-spent");
  }

  // Effects ------------------------------------------------------------------

  function centerOf(uid, dy = 0.45) {
    const u = units.get(uid);
    if (!u) return null;
    const a = u.el.querySelector(".token").getBoundingClientRect();
    const f = fx.getBoundingClientRect();
    return { x: a.left - f.left + a.width / 2, y: a.top - f.top + a.height * dy, w: a.width };
  }

  function floatText(uid, text, kind) {
    const p = centerOf(uid, 0.2);
    if (!p || skipped) return;
    const el = document.createElement("span");
    el.className = `bfloat bfloat--${kind}`;
    el.textContent = text;
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    el.style.animationDuration = `${1100 / speed}ms`;
    fx.append(el);
    el.addEventListener("animationend", () => el.remove());
  }

  function frames(set, uid, { flip = false, scale = 1, dy = 0.45, dx = 0 } = {}) {
    const p = centerOf(uid, dy);
    if (!p || skipped) return;
    const img = document.createElement("img");
    img.className = "bframes";
    img.alt = "";
    const size = p.w * 0.9 * scale;
    img.style.width = `${size}px`;
    img.style.left = `${p.x + dx * p.w - size / 2}px`;
    img.style.top = `${p.y - size / 2}px`;
    if (flip) img.style.transform = "scaleX(-1)";
    fx.append(img);
    const list = FRAMES[set];
    let i = 0;
    const tick = () => {
      if (i >= list.length || skipped) return img.remove();
      img.src = `${FX}${set}/${list[i++]}.svg`;
      setTimeout(tick, 40 / speed);
    };
    tick();
  }

  function blink(uid) {
    const u = units.get(uid);
    if (!u || reducedMotion) return;
    const hit = "brightness(0.75) sepia(1) saturate(9) hue-rotate(-35deg)";
    u.el.querySelector(".token__figure").animate(
      [{ filter: "none" }, { filter: hit }, { filter: "none" }, { filter: hit }, { filter: "none" }],
      { duration: 500 / speed }
    );
  }

  function lunge(uid, dir) {
    const u = units.get(uid);
    if (!u || reducedMotion) return;
    u.el.querySelector(".token").animate(
      [{ transform: "none" }, { transform: `translateX(${dir * 2.4}em)` }, { transform: "none" }],
      { duration: 380 / speed, easing: "ease-in-out" }
    );
  }

  function fly(fromUid, toUid, { size = 1.6, height = 0.5, duration = 650, cls = "" } = {}) {
    const a = centerOf(fromUid, 0.35);
    const b = centerOf(toUid, 0.45);
    if (!a || !b || skipped) return Promise.resolve();
    const ball = document.createElement("img");
    ball.className = `bball ${cls}`;
    ball.src = `${FX}flying_ball.svg`;
    ball.alt = "";
    ball.style.width = `${size}em`;
    fx.append(ball);
    const peak = Math.abs(b.x - a.x) * height;
    const steps = 16;
    const keyframes = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t - 4 * peak * t * (1 - t);
      return { transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` };
    });
    return ball.animate(keyframes, { duration: duration / speed, easing: "linear" }).finished.then(() => ball.remove(), () => ball.remove());
  }

  // Unit.OnDie + ConfettiBurst: the figure breaks apart and falls.
  function shatter(uid) {
    const u = units.get(uid);
    if (!u) return;
    units.delete(uid);
    if (skipped || reducedMotion) return u.el.remove();
    const token = u.el.querySelector(".token");
    const fig = u.el.querySelector(".token__figure");
    const box = token.getBoundingClientRect();
    const f = fx.getBoundingClientRect();
    const cols = 3;
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const shard = document.createElement("div");
        shard.className = "bshard";
        shard.style.left = `${box.left - f.left}px`;
        shard.style.top = `${box.top - f.top}px`;
        shard.style.width = `${box.width}px`;
        shard.style.height = `${box.height}px`;
        shard.style.fontSize = getComputedStyle(token).fontSize;
        const x0 = (c / cols) * 100;
        const y0 = (r / rows) * 100;
        const j = () => (Math.random() - 0.5) * 8;
        shard.style.clipPath = `polygon(${x0 + j()}% ${y0 + j()}%, ${x0 + 100 / cols + j()}% ${y0 + j()}%, ${x0 + 100 / cols + j()}% ${y0 + 100 / rows + j()}%, ${x0 + j()}% ${y0 + 100 / rows + j()}%)`;
        const piece = fig.cloneNode(true);
        if (u.side === "right") piece.style.transform = "scaleX(-1)";
        shard.append(piece);
        fx.append(shard);
        const vx = (c - 1) * 30 + (Math.random() - 0.5) * 40 + (u.side === "left" ? -20 : 20);
        const up = -40 - Math.random() * 50;
        const spin = (Math.random() - 0.5) * 220;
        shard
          .animate(
            [
              { transform: "translate(0, 0) rotate(0)", opacity: 1 },
              { transform: `translate(${vx * 0.5}px, ${up}px) rotate(${spin * 0.4}deg)`, opacity: 1, offset: 0.3 },
              { transform: `translate(${vx}px, ${box.height * 0.9}px) rotate(${spin}deg)`, opacity: 0 },
            ],
            { duration: 900 / speed, easing: "cubic-bezier(.3,.1,.6,1)" }
          )
          .finished.then(() => shard.remove(), () => shard.remove());
      }
    }
    u.el.remove();
  }

  // Event handlers ------------------------------------------------------------

  const handlers = {
    async start(e) {
      e.left.forEach((s, i) => addUnit(s, "left", i + 1));
      e.right.forEach((s, i) => addUnit(s, "right", i + 1));
      await wait(500);
    },
    async cycle() {
      await wait(200);
    },
    async arrange(e) {
      let moved = false;
      for (const side of ["left", "right"]) {
        e[side].forEach((uid, i) => {
          const u = units.get(uid);
          if (!u) return;
          const before = u.el.style.getPropertyValue("--x");
          setPlace(u.el, side, i + 1);
          if (before !== u.el.style.getPropertyValue("--x")) moved = true;
        });
      }
      e.stats.forEach(setStat);
      if (moved) await wait(420);
    },
    async spawn(e) {
      const from = units.get(e.from);
      const el = addUnit(e.unit, e.side, 1);
      if (from) el.style.setProperty("--x", from.el.style.getPropertyValue("--x"));
      el.classList.add("is-arriving");
      if (e.reason === "skirmish") spendBadge(e.from, "skirmisher");
      floatText(e.unit.uid, e.reason === "skirmish" ? "Skirmish!" : "Grenadiers!", "info");
      say(e.reason === "skirmish" ? "Skirmishers step out." : "Grenadiers step in.");
      await wait(450);
    },
    // Swarm Attack: the lancer's health drops and its green-coated copies ride
    // out from it; the arrange that follows spreads them behind it.
    async swarm(e) {
      const from = units.get(e.from);
      setStat(e.stat);
      floatText(e.from, "Swarm!", "info");
      say(`The lancers swarm: ${e.units.length + 1} squadrons.`);
      for (const snap of e.units) {
        const el = addUnit(snap, e.side, 1);
        if (from) el.style.setProperty("--x", from.el.style.getPropertyValue("--x"));
        el.classList.add("is-arriving");
      }
      await wait(450);
    },
    async skirmishBonus(e) {
      setStat(e.stat);
      spendBadge(e.uid, "skirmisher");
      floatText(e.uid, "+1 attack", "good");
      await wait(350);
    },
    async square(e) {
      units.get(e.uid)?.el.classList.toggle("is-square", e.on);
      setStat(e.stat);
      if (e.on) {
        floatText(e.uid, "Square!", "info");
        sound(`square_${nationOf[units.get(e.uid)?.side ?? "left"]}`);
      }
      await wait(e.on ? 450 : 100);
    },
    async fire(e) {
      if (e.weapon === "ball") {
        sound("cannonFire");
        frames("cannon", e.from, { scale: 0.9, dy: 0.5, dx: units.get(e.from)?.side === "left" ? 0.35 : -0.35, flip: units.get(e.from)?.side === "right" });
        await fly(e.from, e.to);
        sound("cannonHit");
        if (e.crit) floatText(e.to, "×2!", "bad");
      } else if (e.weapon === "rifle") {
        sound("rifle");
        frames("rifle", e.from, { scale: 0.8, dy: 0.4, dx: units.get(e.from)?.side === "left" ? 0.3 : -0.3, flip: units.get(e.from)?.side === "right" });
        await wait(350);
      } else if (e.weapon === "rockets") {
        sound("rockets");
        await Promise.all(e.to.map((t, i) => fly(e.from, t, { size: 1.1, height: 0.35, duration: 550 + i * 90, cls: "bball--rocket" })));
      }
    },
    async melee(e) {
      // CombatEffect on each side: muskets or a cavalry charge; guns at the front load and fire canister.
      for (const [side, kind] of [["left", e.leftKind], ["right", e.rightKind]]) {
        if (kind === "canister") sound(`loadGrape_${nationOf[side]}`, { volume: 0.7 });
        else sound(kind === "sabre" ? "sabre" : "musket", { volume: 0.7 });
      }
      lunge(e.left, 1);
      lunge(e.right, -1);
      await wait(190);
      if (e.leftKind === "canister" || e.rightKind === "canister") sound("grapeshot");
      frames(FX_FOR[e.leftKind], e.right, { flip: false, scale: e.leftKind === "sabre" ? 1.1 : 0.9 });
      frames(FX_FOR[e.rightKind], e.left, { flip: true, scale: e.rightKind === "sabre" ? 1.1 : 0.9 });
      await wait(260);
    },
    async damage(e) {
      setStat({ uid: e.uid, health: e.health });
      floatText(e.uid, `-${e.amount}`, "bad");
      blink(e.uid);
      await wait(120);
    },
    async fallen(e) {
      await wait(120);
      sound("shatter");
      shatter(e.uid);
      await wait(380);
    },
    async remove(e) {
      for (const uid of e.uids) {
        units.get(uid)?.el.remove();
        units.delete(uid);
      }
    },
    async buff(e) {
      setStat(e.stat);
      floatText(e.uid, `+${e.attack}/+${e.health}`, "good");
      await wait(e.reason === "winBuff" ? 380 : 160);
    },
  };
  const FX_FOR = { musket: "musket", sabre: "sabre", canister: "cannon" };

  function say(text) {
    live.textContent = text;
  }

  async function play() {
    await wait(300);
    for (const e of outcome.events) {
      if (skipped) break;
      await handlers[e.type]?.(e);
    }
    finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    // The march stops on a cymbal, then the side's win or lose call (a draw sounds like a loss, as in Unity).
    music(null);
    ambience(null);
    sfx("cymbal");
    setTimeout(() => sfx(`${outcome.result === "win" ? "win" : "lose"}_${run.nation}`), 350);
    const text = { win: "WIN!", loss: "LOSS", draw: "DRAW" }[outcome.result];
    const box = root.querySelector(".battle__result");
    box.dataset.result = outcome.result;
    root.querySelector(".battle__result-text").textContent = text;
    box.hidden = false;
    root.querySelector('[data-act="skip"]').disabled = true;
    say(`Battle over: ${text}`);
    root.querySelector('[data-act="continue"]').focus();
  }

  root.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b || handleSoundToggle(b)) return;
    if (b.dataset.speed) {
      speed = Number(b.dataset.speed);
      writePref(SPEED_KEY, speed);
      setMoveSpeed();
      root.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }
    if (b.dataset.act === "skip") {
      skipped = true;
      fx.replaceChildren();
      finish();
    }
    if (b.dataset.act === "continue") ctx.onDone();
  };

  play();
  return {
    destroy() {
      skipped = true;
      root.onclick = null;
    },
  };
}

function preloadFx() {
  if (preloaded) return;
  preloaded = true;
  for (const [set, list] of Object.entries(FRAMES)) for (const n of list) new Image().src = `${FX}${set}/${n}.svg`;
  new Image().src = `${FX}flying_ball.svg`;
}

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function readPref(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Preference only.
  }
}
