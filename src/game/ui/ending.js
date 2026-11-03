// Victory and defeat scenes (Scenes/FrenchVictory.unity and the others): a
// full-screen painting, the scene's text and music, and a button back to
// the title, as GameOver.cs draws it.
import { music } from "./sound.js";
import { escapeHtml } from "./token.js";

const ART = new URL("../../../assets/endings/", import.meta.url).href;
const SCENES = {
  france: { victory: "FrenchVictory", defeat: "FrenchDefeat" },
  britain: { victory: "BritishVictory", defeat: "BritishDefeat" },
};

/** ctx: { data, run (status "victory" or "defeat"), onDone() } */
export function mountEnding(root, ctx) {
  const { run } = ctx;
  const outcome = run.status === "victory" ? "victory" : "defeat";
  const text = ctx.data.endings[SCENES[run.nation][outcome]] ?? "";
  music(`${outcome}_${run.nation}`);

  root.innerHTML = `
    <div class="screen ending" data-outcome="${outcome}" data-nation="${run.nation}">
      <img class="ending__art" src="${ART}${run.nation}-${outcome}.webp" alt="">
      <div class="ending__text">
        <h1 class="sr-only">${outcome === "victory" ? "Victory" : "Defeat"}</h1>
        ${text
          .split("\n")
          .map((p, i) => `<p${i === 0 && p.length <= 60 ? ' class="ending__headline"' : ""}>${escapeHtml(p)}</p>`)
          .join("")}
        <p class="ending__record">${count(run.wins, "win")} · ${count(run.losses, "loss", "losses")} · ${count(run.round, "turn")}</p>
      </div>
      <button type="button" class="btn ending__done" data-act="done">Return to Title</button>
    </div>`;

  root.querySelector('[data-act="done"]').onclick = () => ctx.onDone();
  root.querySelector('[data-act="done"]').focus();
  return {
    destroy() {
      music(null);
    },
  };
}

const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
