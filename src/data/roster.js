import { parseCsv } from "./csv.js";
import { evalFormula } from "../game/engine/units.js";

export { evalFormula };

const DATA_ROOT = new URL("../../data/", import.meta.url);
const UNIT_ART_ROOT = new URL("../../assets/units/", import.meta.url);

export async function loadRosters() {
  const details = await fetchJson("rosters/card-details.json");
  const rations = parseCsv(await fetchText("supplies/rations.csv"));
  const sprites = (await fetchJson("sprites.json")).sprites;
  const game = await fetchJson("units.json");

  const rosters = {};
  for (const [nation, roster] of Object.entries(details.rosters)) {
    const rows = parseCsv(await fetchText(`rosters/${roster.file}`));
    const byName = new Map(rows.map((r) => [r.Name, r]));
    rosters[nation] = {
      nation,
      name: roster.name,
      army: roster.army,
      units: roster.units.map((u) => buildUnit(nation, u, byName, sprites, game)).filter(Boolean),
    };
  }
  return { rosters, rations, game };
}

// A unit's picture: "art" lists layered sprites back to front (a gun, then its
// gunner), each a path or { "sprite": path, "offset": [x, y] } in Unity units;
// "sprite" is the single-sprite shorthand.
function artLayers(meta, sprites) {
  const entries = meta.art || (meta.sprite ? [meta.sprite] : []);
  return entries
    .map((entry) => {
      const { sprite: path, offset } = typeof entry === "string" ? { sprite: entry } : entry;
      const s = sprites[path];
      if (!s?.bounds) {
        console.warn(`[autoloo] No measured sprite entry for "${path}" in sprites.json`);
        return null;
      }
      return { ...s, offset, src: new URL(path, UNIT_ART_ROOT).href };
    })
    .filter(Boolean);
}

function buildUnit(nation, meta, rowsByName, sprites, game) {
  const row = rowsByName.get(meta.csvName);
  if (!row) {
    console.warn(`[autoloo] No CSV row for "${meta.csvName}" (${nation})`);
    return null;
  }
  const g = meta.unitId ? game.units[meta.unitId] : null;
  if (meta.unitId && !g) console.warn(`[autoloo] No units.json entry "${meta.unitId}"`);

  // Units in the game take their numbers from units.json (the Unity prefabs);
  // units still in development fall back to the CSV.
  const stats = g
    ? { attack: g.attack, health: g.health, maxRank: g.maxRank, chance: g.chance, tier: g.tier, cost: g.cost, maxAllowed: null }
    : {
        attack: toInt(row.Attack),
        health: toInt(row.Health),
        maxRank: toInt(row["Max Rank"], 0),
        chance: toInt(row.Chance, null),
        maxAllowed: toInt(row["Max Allowed"], null),
      };

  return {
    ...meta,
    ...stats,
    nation,
    status: row.ImplementationStatus.toLowerCase(),
    playable: !!g && game.nations[nation].roster.includes(meta.unitId),
    csvAbilities: row.Abilities,
    artLayers: artLayers(meta, sprites),
    attachments: (meta.attachments || []).map((a) => {
      const rule = g?.[a.kind === "skirmisher" ? "skirmish" : "grenadiers"];
      const company = rule && game.companies[rule.company];
      if (company) {
        return { ...a, artLayers: artLayers(a, sprites), unlockRank: rule.unlockRank, attackFormula: company.attackFormula, healthFormula: company.healthFormula };
      }
      const aRow = rowsByName.get(a.csvName);
      if (!aRow) console.warn(`[autoloo] No CSV row for attachment "${a.csvName}"`);
      return {
        ...a,
        artLayers: artLayers(a, sprites),
        attackFormula: aRow?.Attack || "PARENT RANK",
        healthFormula: aRow?.Health || "PARENT RANK",
      };
    }),
  };
}

// Each merge (rank up) adds +1/+1, matching Unit.RankUp in the Unity build.
export function statsAtRank(unit, rank) {
  return { attack: unit.attack + rank, health: unit.health + rank };
}

// Coins returned when selling, matching Deployment's 1 + Unit.SellPriceBumpBasedOnRank.
export function sellValue(rank) {
  return 1 + Math.floor(rank / 3);
}

// Shop weight as a share of the playable units in the same roster.
export function shopOdds(unit, roster) {
  if (!unit.chance) return null;
  const pool = roster.units.filter((u) => u.playable && u.chance);
  const total = pool.reduce((sum, u) => sum + u.chance, 0);
  if (!unit.playable || !total) return null;
  return unit.chance / total;
}

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchText(path) {
  const res = await fetch(new URL(path, DATA_ROOT));
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.text();
}

async function fetchJson(path) {
  return JSON.parse(await fetchText(path));
}
