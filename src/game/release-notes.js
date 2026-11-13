// What changed in each version, newest first, shown from the main menu.
// Add an entry here whenever version.js is bumped.

export const RELEASE_NOTES = [
  {
    version: "1.8",
    title: "Rations and shop ranks",
    notes: [
      "Rations: a new shop beside the recruits. Each costs 3 coin and goes on a deployed unit. Drafting new recruits brings new rations too, and you can hold a ration in reserve.",
      "Thirteen rations: Bread, Cheese, Vegetables, Wine, Spirits, Hay, Telescope, Drums and Colors for both sides; Onion and the Eagle for France; Bacon and the Claymore Sword for Britain.",
      "Wine and Onions feed a battalion's skirmishers and grenadiers. Spirits give +3/+3 for one battle. The Telescope sharpens the scout report. Drums fill the recruits with three of one unit. Colors raise the shop one rank.",
      "Shop ranks: the shop now opens up as you win, not as turns pass. France: Lancers and Cuirassiers at 2 wins, the Young Guard at 4 and the Old Guard at 6. Britain: Congreve Rockets at 2 wins and the Rifles at 4.",
      "Roll is now Draft Recruits, and it shows your shop rank.",
      "Matchmaking also matches shop ranks, so you meet armies drafted from a shop like yours.",
    ],
  },
  {
    version: "1.7",
    title: "Fair fights",
    notes: [
      "Matchmaking now pairs you with an army another player drafted on the same turn as you. If nobody has fought on your turn yet, you meet an army from the nearest earlier turn.",
      "Armies no player could have built by their turn are no longer used as opponents, such as four units on turn 1 or guns with six attack. These came from the game's oldest test data.",
      "When no army is available, the random opponent fits your turn: three recruits the shop could offer on turn 1, and five after that.",
      "Ranking up a unit by merging now plays the rank-up fanfare.",
      "Release notes: this window, opened from the main menu.",
    ],
  },
  {
    version: "1.6",
    title: "Sound the charge",
    notes: [
      "When a cavalry unit beats the enemy's front unit and grows stronger, it sounds its nation's charge call: the French or the British bugle.",
    ],
  },
  {
    version: "1.5",
    title: "Swarm Attack",
    notes: [
      "The French lancers' Lance Charge is gone. Their new ability is Swarm Attack: when the lancers reach the front, they split their health to fill every empty place behind them. Each new lancer wears a green coat and has the same attack and at least 1 health. The front lancer keeps any odd point.",
      "Squares now hold off all cavalry, lancers included: cavalry deals only 1 damage to infantry in square.",
    ],
  },
  {
    version: "1.4",
    title: "Rockets rebalanced",
    notes: [
      "Congreve rockets now split their attack: one rocket at each enemy from the front back, then round again. Six attack against five enemies deals 2, 1, 1, 1 and 1.",
      "Rockets no longer harm skirmishers, and they fire from 2nd place or further back with no range limit.",
      "Attack and health numbers sit closer together on each unit.",
    ],
  },
  {
    version: "1.3",
    title: "Hearts",
    notes: ["Health is drawn on a heart again, as in the original game."],
  },
  {
    version: "1.2",
    title: "Weapons and badges",
    notes: [
      "Every unit shows its weapon behind its attack number: musket, rifle, sabre, lance, cannonball or rocket.",
      "Line battalions show badges for the skirmisher and grenadier companies they carry. The skirmisher badge fades when the skirmishers step out in battle.",
      "Unit cards name each unit's weapon.",
      "The Congreve rocket trooper is drawn twice as large, standing beside his launcher.",
    ],
  },
  {
    version: "1.0",
    title: "Autoloo comes to the browser and Android",
    notes: [
      "The full game in the browser: recruit from the shop, roll, keep recruits in reserve, sell, and merge three of a kind to rank up. Then watch your line fight it out.",
      "Every unit and ability from the original game, plus the designed abilities for the Rifles, Rockets, Old Guard Grenadiers and Tirailleurs.",
      "Your armies go into the draft pool, and you fight armies other players drafted.",
      "Log in, sign up or reset your password from the game's own form, with the same account as the Autoloo app, or play as a guest.",
      "Music and sound from the original game, with Music and Sound switches. Victory and defeat scenes with their paintings.",
      "Unit cards show on hover, or on tap on phones and tablets.",
      "Drawn buttons for Quit, Roll, Reserve, Sell and To Battle. A held recruit is now In Reserve.",
      "The Android app, in landscape and full screen.",
    ],
  },
];
