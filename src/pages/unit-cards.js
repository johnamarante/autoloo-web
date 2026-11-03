import { loadRosters } from "../data/roster.js";
import { createUnitCard } from "../cards/unit-card.js";

const main = document.getElementById("armies");
const rankInput = document.getElementById("rank-all");
const rankOut = document.getElementById("rank-all-out");

const state = { nation: "all", scope: "roster", rank: 0 };
let data;
let cards = [];

try {
  data = await loadRosters();
  render();
} catch (err) {
  console.error(err);
  main.innerHTML = `<p class="status status--error">Could not load the roster data. Serve this folder over HTTP (npm start) rather than opening the file directly.</p>`;
}

function render() {
  cards = [];
  main.replaceChildren();
  for (const roster of Object.values(data.rosters)) {
    if (state.nation !== "all" && state.nation !== roster.nation) continue;
    const units = roster.units.filter((u) => state.scope === "all" || u.playable);

    const section = document.createElement("section");
    section.className = "army";
    section.dataset.nation = roster.nation;
    section.innerHTML = `
      <header class="army__head">
        <h2>${roster.name}</h2>
        <p>${roster.army} · ${units.length} unit${units.length === 1 ? "" : "s"}</p>
      </header>`;
    const grid = document.createElement("div");
    grid.className = "army__grid";
    for (const unit of units) {
      const card = createUnitCard(unit, {
        roster,
        rations: data.rations,
        rank: state.rank,
        interactive: true,
      });
      cards.push(card);
      grid.append(card);
    }
    section.append(grid);
    main.append(section);
  }
}

// Scoped to the filter bar: cards and army sections also carry data-nation.
const nationTabs = document.querySelectorAll(".controls button[data-nation]");
const scopeButtons = document.querySelectorAll(".controls button[data-scope]");

nationTabs.forEach((btn) =>
  btn.addEventListener("click", () => {
    state.nation = btn.dataset.nation;
    nationTabs.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    render();
  })
);

scopeButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    state.scope = btn.dataset.scope;
    scopeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    render();
  })
);

rankInput.addEventListener("input", () => {
  state.rank = Number(rankInput.value);
  rankOut.textContent = state.rank;
  // Each card clamps to its own max rank.
  cards.forEach((card) => card.setRank(state.rank));
});
