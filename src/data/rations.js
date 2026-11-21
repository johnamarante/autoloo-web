// Which rations (from data/supplies/rations.csv) pay off especially well on a
// given unit. Rations that help every unit equally (Bread, Cheese, Colors...)
// are left out so the card only calls out real synergies.
const RULES = {
  Hay: (u) => u.type === "cavalry",
  Onion: (u) => u.nation === "france" && hasKind(u, "grenadier"),
  Bacon: (u) => u.nation === "britain" && u.type === "infantry",
  Wine: (u) => hasKind(u, "skirmisher"),
  Telescope: (u) => hasKeyword(u, "Scout") || u.type === "artillery",
  // On the Scots it is +3/+3 and +1/+1 to the rest of the army; elsewhere only +1/+1.
  "Claymore Sword": (u) => u.contingent === "Scots",
  Eagle: (u) => u.nation === "france" && (u.tier >= 3 || u.attack + u.health >= 10),
};

const NATION_ONLY = { Onion: "france", Bacon: "britain", "Claymore Sword": "britain", Eagle: "france" };

export function rationSynergies(unit, rations) {
  return rations
    .filter((r) => RULES[r.Name] && (!NATION_ONLY[r.Name] || NATION_ONLY[r.Name] === unit.nation))
    .filter((r) => RULES[r.Name](unit))
    .map((r) => ({ name: r.Name, effect: r.Effect.replace(/^"+|"+$/g, "").trim() }));
}

function hasKind(unit, kind) {
  return (unit.attachments || []).some((a) => a.kind === kind);
}

function hasKeyword(unit, keyword) {
  return (unit.abilities || []).some((a) => a.keyword === keyword);
}
