// Which file plays for what, as the Unity build wires them (see the
// AudioClip fields on GameManager, Deployment, CombatEffect, ConfettiBurst,
// Artillery and Unit). Several files means one is picked at random.
// Rifles and rockets have no sound in Unity; they borrow the unused
// sharpshooter recording and the cannon shots.

const cannonFire = [2, 3, 4, 6, 7, 9, 10].map((n) => `cannon-fire-${n}.mp3`);

export const SOUNDS = {
  coin: { files: ["coin.mp3"] }, // Deployment.Roll, paying for a re-roll
  bugle: { files: ["bugle.mp3"], volume: 0.7 }, // a new shop is drawn
  cannonFire: { files: cannonFire }, // GameManager.PlayCannonballFire
  cannonHit: { files: ["cannon-hit-1.mp3", "cannon-hit-2.mp3"] }, // Cannonball impact
  grapeshot: { files: ["grapeshot.mp3"] }, // canister from the front
  loadGrape_france: { files: ["load-grape-france.mp3"] }, // Artillery.PrepareToShootGrape
  loadGrape_britain: { files: ["load-grape-britain.mp3"] },
  musket: { files: ["musket-volley.mp3"] }, // CombatEffect gunfire, infantry at the front
  sabre: { files: ["cavalry-attack.mp3"] }, // CombatEffect, cavalry at the front
  rifle: { files: ["rifle.mp3"] },
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
