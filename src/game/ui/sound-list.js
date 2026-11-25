// Which file plays for what, as the Unity build wires them (see the
// AudioClip fields on GameManager, Deployment, CombatEffect, ConfettiBurst,
// Artillery and Unit). Several files means one is picked at random.
// Rifles and rockets have no sound in Unity; they borrow the unused
// sharpshooter recording and the cannon shots.

const cannonFire = [2, 3, 4, 6, 7, 9, 10].map((n) => `cannon-fire-${n}.mp3`);

/** The language each unit answers in; any unit not listed speaks its nation's. */
const VOICE_BY_NATION = { france: "french", britain: "english", prussia: "german" };
const VOICE_BY_UNIT = {
  british_nassaurfusilier: "german",
  british_brunswickline: "german",
  british_dutchline: "german", // Dutch "Ja!" is the same word
  british_belgianline: "german", // no French from the Allied side: it is too confusing
  british_highlander: "scottish",
  british_socttsgreysdragoons: "scottish",
};

/** The sounds a unit makes when placed in the line, in order: its voice, then horses for cavalry. */
export function deploySounds(unit, nation) {
  const voice = `voice_${VOICE_BY_UNIT[unit.id] ?? VOICE_BY_NATION[nation] ?? "english"}`;
  return unit.type === "cavalry" ? [voice, "deploy_cavalry"] : [voice];
}

export const SOUNDS = {
  coin: { files: ["coin.mp3"] }, // Deployment.Roll, paying for a re-roll
  rankUp: { files: ["rank-up.mp3"] }, // a unit ranks up by merging (rank_up_or_ration_consumed.mp3)
  bugle: { files: ["bugle.mp3"], volume: 0.7 }, // a new shop is drawn
  deploy_cavalry: { files: ["deploy-cavalry.mp3"] }, // a cavalry unit is placed in the line (deployed_cavalry.mp3)
  // Every unit answers the player when placed in the line; cavalry then whinny.
  voice_french: { files: ["voice-oui.mp3", "voice-oui-monsieur.mp3", "voice-oui-general.mp3"] }, // french_oui, _oui_monsieur, _oui_general
  voice_english: { files: ["voice-yes-commander.mp3"] }, // british_yes_commander
  voice_scottish: { files: ["voice-scottish-yes-sir.mp3"] }, // british_scottish_yes_sir
  voice_german: { files: ["voice-ja.mp3"] }, // german_ja
  cannonFire: { files: cannonFire }, // GameManager.PlayCannonballFire
  cannonHit: { files: ["cannon-hit-1.mp3", "cannon-hit-2.mp3"] }, // Cannonball impact
  grapeshot: { files: ["grapeshot.mp3"] }, // canister from the front
  loadGrape_france: { files: ["load-grape-france.mp3"] }, // Artillery.PrepareToShootGrape
  loadGrape_britain: { files: ["load-grape-britain.mp3"] },
  musket: { files: ["musket-volley.mp3"] }, // CombatEffect gunfire, infantry at the front
  sabre: { files: ["cavalry-attack.mp3"] }, // CombatEffect, cavalry at the front
  rifle: { files: ["rifle.mp3"] },
  charge_france: { files: ["charge-france.mp3"] }, // cavalry grows after winning at the front (Chargef.wav)
  charge_britain: { files: ["charge-britain.mp3"] }, // (Chargeb.wav)
  rockets: { files: cannonFire, volume: 0.7 },
  square_france: { files: ["square-france.mp3"] }, // Unit forming square
  square_britain: { files: ["square-britain.mp3"] },
  shatter: { files: ["break-1.mp3", "break-2.mp3", "break-3.mp3"] }, // ConfettiBurst on a fallen unit
  cymbal: { files: ["cymbal.mp3"] }, // the battle is decided
  win_france: { files: ["win-fight-france.mp3"] }, // ShowResultPopup: a win
  win_britain: { files: ["win-fight-britain.mp3"] },
  lose_france: { files: ["lose-round-france.mp3"] }, // a loss or a draw
  lose_britain: { files: ["lose-round-britain.mp3"] },
};

// An intro plays once, then the cycle repeats (BattleMusicController plays
// intro, then mid, mid, outro; Britain has no outro, so mid repeats).
export const TRACKS = {
  menu: { cycle: ["music/autoloo-title-login-main.mp3"], volume: 0.8 },
  march_france: {
    intro: "music/french-battle-march-intro.mp3",
    cycle: ["music/french-battle-march-mid.mp3", "music/french-battle-march-mid.mp3", "music/french-battle-march-outro.mp3"],
    volume: 0.25,
  },
  march_britain: { intro: "music/britain-battle-march-intro.mp3", cycle: ["music/britain-battle-march-mid.mp3"], volume: 0.25 },
  victory_france: { cycle: ["music/french-victory.mp3"], once: true, volume: 1 },
  defeat_france: { cycle: ["music/french-defeat.mp3"], once: true, volume: 0.5 },
  victory_britain: { cycle: ["music/british-victory.mp3"], once: true, volume: 0.5 },
  defeat_britain: { cycle: ["music/british-defeat.mp3"], once: true, volume: 0.5 },
};

// The distant battle under deployment (all four in turn, quietly) and under the fight.
export const AMBIENCE = {
  deployment: { cycle: [1, 2, 3, 4].map((n) => `distant-battle-${n}.mp3`), volume: 0.5 },
  battle: { cycle: ["distant-battle-1.mp3"], volume: 0.95 },
};
