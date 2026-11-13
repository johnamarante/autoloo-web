// Loads everything the game screens need: the engine catalog plus the card
// data (names, sprites, ability text) for each unit.
import { loadRosters } from "../../data/roster.js";
import { createCatalog } from "../engine/units.js";

export async function loadGameData() {
  const [{ rosters, rations, game }, endings, shopRations] = await Promise.all([
    loadRosters(),
    fetch(new URL("../../../data/endings.json", import.meta.url)).then((r) => r.json()),
    fetch(new URL("../../../data/rations.json", import.meta.url)).then((r) => r.json()),
  ]);
  const catalog = createCatalog({ ...game, rations: shopRations.rations });
  const cards = new Map();
  for (const roster of Object.values(rosters)) {
    for (const card of roster.units) if (card.unitId) cards.set(card.unitId, { card, roster });
  }
  // Companies borrow their picture and name from the battalion card that lists them.
  const companies = new Map();
  for (const [id, def] of Object.entries(catalog.units)) {
    const card = cards.get(id)?.card;
    if (!card) continue;
    for (const [rule, kind] of [["skirmish", "skirmisher"], ["grenadiers", "grenadier"]]) {
      const att = def[rule] && card.attachments.find((a) => a.kind === kind);
      if (att) companies.set(def[rule].company, { name: att.displayName, artLayers: att.artLayers });
    }
  }
  return { catalog, cards, companies, rosters, rations, endings };
}

/** Display name and sprite layers for any unit, company or battalion. */
export function unitLook(data, unit) {
  const entry = data.cards.get(unit.id);
  if (entry) {
    const artLayers = unit.swarmCopy && entry.card.swarmArtLayers ? entry.card.swarmArtLayers : entry.card.artLayers;
    return { name: entry.card.displayName, artLayers, card: entry.card, roster: entry.roster };
  }
  const company = data.companies.get(unit.id);
  return { name: company?.name ?? unit.kind, artLayers: company?.artLayers ?? [], card: null, roster: null };
}
