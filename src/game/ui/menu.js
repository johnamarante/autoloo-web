// Main menu (MainMenu.cs): resume a saved game, or choose a side. Each side
// shows its roster; hovering a unit shows its card.
import { createUnit } from "../engine/units.js";
import { createUnitCard } from "../../cards/unit-card.js";
import { tokenHtml, escapeHtml } from "./token.js";
import { unitLook } from "./data.js";
import { NAME_MAX } from "../net/player.js";
import { handleSoundToggle, soundTogglesHtml } from "./sound-toggles.js";
import { VERSION } from "../version.js";

const UI = new URL("../../../assets/ui/", import.meta.url).href;

const STORE_LABELS = {
  live: "Live server",
  dev: "Dev server, saves stay local",
  offline: "Offline",
};

/**
 * ctx: { data, save, status: { mode, player, canLogin }, onNewGame(nation), onResume(),
 *        onLogin({ email, password, signup }) -> Promise, onResetPassword(email) -> Promise<message>,
 *        onLogout(), onSetName(name) -> Promise }
 * Login happens in the menu's own form; a rejected promise carries Auth0's message, shown in the form.
 * player is { name, guest, needsName?, test? }; needsName asks for a name, as MainMenu does on a first login.
 */
export function mountMenu(root, ctx) {
  const { data, save } = ctx;
  const { catalog } = data;
  const preview = {};
  for (const nation of Object.keys(catalog.nations)) {
    preview[nation] = catalog.nations[nation].roster.map((id) => createUnit(catalog, id));
  }

  root.innerHTML = `
    <div class="screen menu">
      <header class="menu__head">
        <h1>Autoloo</h1>
        <p>Waterloo, 1815. Recruit, merge and line up your army, then let the battle begin!</p>
        ${ctx.status ? statusHtml(ctx.status) : ""}
      </header>
      ${
        save
          ? `<section class="menu__resume" aria-label="Saved game">
              <h2>Continue your campaign?</h2>
              <p>${escapeHtml(catalog.nations[save.nation]?.rosterName ?? save.nation)} · Turn ${save.round} · ${save.coin} coin · ${save.wins} wins · ${save.losses} losses</p>
              <button type="button" class="btn btn--primary" data-act="resume">Continue</button>
            </section>`
          : ""
      }
      <div class="menu__sides">
        ${Object.entries(catalog.nations)
          .map(
            ([nation, n]) => `
          <section class="side" data-nation="${nation}" aria-label="Play as ${n.rosterName}">
            <button type="button" class="side__flag" data-act="new" data-nation="${nation}">
              <img src="${UI}${nation}Flag.png" alt="">
              <span>Play as ${n.rosterName}</span>
            </button>
            <ul class="side__roster">
              ${preview[nation].map((u, i) => `<li>${tokenHtml(data, u, { where: "roster", index: `${nation}:${i}` })}</li>`).join("")}
            </ul>
          </section>`
          )
          .join("")}
      </div>
      <aside class="card-place card-place--menu" aria-live="polite"></aside>
      <p class="menu__version">Version ${VERSION}</p>
      ${ctx.status?.player.needsName ? nameSetupHtml(ctx.status.player.name) : ""}
    </div>`;

  const place = root.querySelector(".card-place");
  const showCard = (token) => {
    place.replaceChildren();
    const [nation, i] = token?.dataset.index.split(":") ?? [];
    const look = token && unitLook(data, preview[nation][Number(i)]);
    if (look?.card) {
      place.append(createUnitCard(look.card, { roster: look.roster, rations: data.rations }));
      return;
    }
    // The same placeholder as on the deployment screen.
    const verb = matchMedia("(hover: none)").matches ? "Tap" : "Hover over";
    place.innerHTML = `<p class="card-place__hint">${verb} a unit to see its card.</p>`;
  };

  showCard(null);
  root.onpointerover = (e) => showCard(e.target.closest(".token"));
  root.onfocusin = (e) => showCard(e.target.closest(".token"));
  root.onclick = (e) => {
    if (handleSoundToggle(e.target)) return;
    const btn = e.target.closest("[data-act]");
    if (btn?.dataset.act === "new") ctx.onNewGame(btn.dataset.nation);
    if (btn?.dataset.act === "resume") ctx.onResume();
    if (btn?.dataset.act === "login") openLogin(false);
    if (btn?.dataset.act === "signup") openLogin(true);
    if (btn?.dataset.act === "logout") ctx.onLogout();
  };

  function openLogin(signup) {
    root.querySelector(".login")?.remove();
    root.querySelector(".screen").insertAdjacentHTML("beforeend", loginFormHtml(signup));
    const dialog = root.querySelector(".login");
    const form = dialog.querySelector("form");
    const error = dialog.querySelector(".login__error");
    const note = dialog.querySelector(".login__note");
    const busy = (on) => form.querySelectorAll("button, input").forEach((el) => (el.disabled = on));
    const close = () => dialog.remove();
    form.elements.email.focus();
    form.onsubmit = async (e) => {
      e.preventDefault();
      error.textContent = note.textContent = "";
      busy(true);
      try {
        await ctx.onLogin({ email: form.elements.email.value, password: form.elements.password.value, signup });
      } catch (err) {
        error.textContent = err.message;
        busy(false);
        form.elements.password.select();
      }
    };
    dialog.onclick = async (e) => {
      const act = e.target.closest("[data-login]")?.dataset.login;
      if (act === "cancel") close();
      if (act === "switch") openLogin(!signup);
      if (act === "reset") {
        error.textContent = note.textContent = "";
        if (!form.elements.email.value.trim()) {
          error.textContent = "Enter your email address first.";
          form.elements.email.focus();
          return;
        }
        busy(true);
        try {
          note.textContent = await ctx.onResetPassword(form.elements.email.value);
        } catch (err) {
          error.textContent = err.message;
        }
        busy(false);
      }
    };
    dialog.onkeydown = (e) => {
      if (e.key === "Escape") close();
    };
  }

  const form = root.querySelector(".name-setup form");
  if (form) {
    form.elements.name.select();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const error = form.querySelector(".name-setup__error");
      form.elements.submit.disabled = true;
      try {
        await ctx.onSetName(form.elements.name.value);
      } catch (err) {
        error.textContent = err.message;
        form.elements.submit.disabled = false;
      }
    };
  }

  return {
    destroy() {
      root.onpointerover = root.onfocusin = root.onclick = null;
    },
  };
}

function statusHtml({ mode, player, canLogin, message }) {
  const account =
    player.test || !canLogin
      ? ""
      : player.guest
        ? `<button type="button" class="btn btn--small" data-act="login">Log in</button>
           <button type="button" class="btn btn--small" data-act="signup">Sign up</button>`
        : `<button type="button" class="btn btn--small" data-act="logout">Log out</button>`;
  return `
    <p class="menu__status">Playing as <b>${escapeHtml(player.name)}</b> · ${STORE_LABELS[mode]} ${account} ${soundTogglesHtml("sound-toggles--small")}</p>
    ${message ? `<p class="menu__message" role="alert">${escapeHtml(message)}</p>` : ""}`;
}

function loginFormHtml(signup) {
  return `
    <div class="name-setup login" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <form>
        <h2 id="login-title">${signup ? "Sign up" : "Log in"}</h2>
        <p>${signup ? "Create an account to put your armies in the field." : "Use the same account as the Autoloo app."}</p>
        <input name="email" type="email" required autocomplete="username" placeholder="Email" aria-label="Email">
        <input name="password" type="password" required autocomplete="${signup ? "new-password" : "current-password"}" placeholder="Password" aria-label="Password">
        <p class="name-setup__error login__error" role="alert"></p>
        <p class="login__note" role="status"></p>
        <div class="login__actions">
          <button type="button" class="btn btn--small" data-login="cancel">Cancel</button>
          <button type="submit" class="btn btn--primary">${signup ? "Create account" : "Log in"}</button>
        </div>
        <p class="login__links">
          <button type="button" class="login__link" data-login="switch">${signup ? "Already have an account? Log in" : "New here? Sign up"}</button>
          ${signup ? "" : '<button type="button" class="login__link" data-login="reset">Forgot password?</button>'}
        </p>
      </form>
    </div>`;
}

function nameSetupHtml(suggested) {
  return `
    <div class="name-setup" role="dialog" aria-modal="true" aria-labelledby="name-setup-title">
      <form>
        <h2 id="name-setup-title">Choose your name</h2>
        <p>Other players see this name when they fight your army.</p>
        <input name="name" value="${escapeHtml(suggested)}" maxlength="${NAME_MAX}" required autocomplete="nickname" aria-label="Player name">
        <p class="name-setup__error" role="alert"></p>
        <button type="submit" name="submit" class="btn btn--primary">Enlist</button>
      </form>
    </div>`;
}
