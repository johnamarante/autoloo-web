// When an ability fires. Order here is the order abilities are listed on a card.
export const TRIGGERS = {
  shop: { label: "In shop", icon: "coin" },
  deploy: { label: "On deploy", icon: "flag" },
  firstClash: { label: "First clash", icon: "bolt" },
  battle: { label: "In battle", icon: "sabres" },
  eachCycle: { label: "Every clash", icon: "cycle" },
  front: { label: "At the front", icon: "front" },
  kill: { label: "On kill", icon: "sabre" },
  death: { label: "On death", icon: "fallen" },
};

export const TRIGGER_ORDER = Object.keys(TRIGGERS);

// Plain-language definitions shown when a player hovers or focuses a keyword.
export const KEYWORDS = {
  Skirmish: "A light company that fights in front of its battalion. It appears when the battalion reaches the front of the line.",
  Reserve: "A company held back. When the battalion is destroyed, it steps into the same place in line.",
  Scout: "Lets you see the enemy army during deployment, before you commit by ending your turn.",
  "Win Buff": "Grows stronger every time it destroys an enemy unit.",
  Momentum: "Grows stronger every time it destroys an enemy unit.",
  "Swarm Attack": "Lancers spread out to fill the gaps in their own line, trading health for numbers.",
  Rally: "Boosts other friendly cavalry when this unit is deployed.",
  Rearguard: "Comes back once, weakened, as long as a friendly unit is behind it.",
  "Bolster Morale": "Boosts friendly units when this unit is deployed.",
  "Imperial Example": "Every clash it stays in the line, your infantry get stronger.",
  Steadfast: "Every clash it stays in the line, your other infantry get tougher.",
  "Round Shot": "Long-range cannon fire at the enemy's front unit while this battery stands further back in your line.",
  Canister: "Close-range grapeshot fired when the battery itself is at the front.",
  "Rocket Barrage": "Congreve rockets strike several enemy units at once, but need distance to launch.",
  "Rifle Tactics": "Riflemen shoot from second place in line, so another unit can take the hits in front.",
  Regroup: "When this unit falls, survivors from the same nation absorb its veterans.",
  "United Netherlands": "Buy the Belgian and Dutch lines together in one turn to get the second one free.",
  Square: "When charged by cavalry, this infantry forms square: +3 attack, and it takes only 1 damage per cavalry attack. Units that only just reached the front mid-battle have no time to form one. Artillery deals double damage to a square.",
  Rank: "Merge a duplicate of this unit onto it to rank up. Each rank adds +1 attack and +1 health and can unlock companies.",
};
