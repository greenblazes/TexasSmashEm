// Client-side mirror of server/src/economy.js for the /test tournament simulator.
// Kept byte-identical in behavior to the server copy.

export const DEFAULTS = {
  startingChips: 200,
  startingBoons: 2,
  anteAmount: 50,
  boonCost: 10, // chips per boon purchased
  cowFeedBase: 10,         // chips given to every spectator after each match
  cowFeedBonusMultiplier: 20, // bonus pool = this × number of spectators, split among correct predictors
  turnDurationMs: 30000,   // ms each player has to place boons/bets before their turn auto-advances
  disableParticipantCountdown: true,
  disableSpectatorCountdown: true,
  stockPool: [
    { stocks: 1, multiplier: 2 },
    { stocks: 2, multiplier: 3 },
    { stocks: 3, multiplier: 5 },
  ],
  bonusChips: {
    cleanSweep: 50,
    doubleCross: 30,
    bushwhacked: -30,
    showdown: 75,
    tPickCorrect: 40,
  },
};

const BOON_DAMAGE_SCALE = {
  1: 10,
  2: 20,
  3: 30,
  4: 40,
  5: 50,
  6: 60,
  7: 80,
  8: 100,
  9: 125,
  10: 150,
  11: 200,
  12: 300,
};

export function boonHandicapPercent(diff) {
  if (diff <= 0) return 0;
  if (diff >= 12) return BOON_DAMAGE_SCALE[12];
  return BOON_DAMAGE_SCALE[diff] ?? 0;
}

export function cowFeed(spectatorCount, correctCount, base, bonusMultiplier) {
  if (spectatorCount === 0) return { base: 0, bonus: 0 };
  const pool = bonusMultiplier * spectatorCount;
  const bonus = correctCount > 0 ? Math.floor(pool / correctCount) : 0;
  return { base, bonus };
}
