// Chip/Boon economy per the Texas SMASH'em rules doc.
// Values not printed in the text rules (Stock Pool payout multipliers, bonus chip
// magnitudes) are host-configurable defaults — see lobby.settings.

export const DEFAULTS = {
  startingChips: 200,
  startingBoons: 2,
  anteAmount: 50,
  buyBoonsCost: 10, // buys 2 boons
  buyBoonsAmount: 2,
  cowFeedBase: 10,         // chips given to every spectator after each match
  cowFeedBonusMultiplier: 20, // bonus pool = this × number of spectators, split among correct predictors
  turnDurationMs: 30000,   // ms each player has to place boons/bets before their turn auto-advances
  disableParticipantCountdown: false, // if true, sealed-boon phase never auto-advances — waits for both participants
  disableSpectatorCountdown: false,   // if true, spectator turns never auto-advance — waits for each player's input
  // Stock Bets: an eliminated player wagers chips that the match victor (the player
  // they picked in their Match Prediction) will finish with exactly N stocks remaining.
  // A 3-stock match means the winner ends with 1, 2, or 3 stocks — so there are three
  // slots. A 3-stock (flawless) win is rarest, so it pays the most. Multipliers are
  // host-editable defaults. Win = wager × multiplier, and ONLY if the bettor's Match
  // Prediction was also correct.
  stockPool: [
    { stocks: 1, multiplier: 2 },
    { stocks: 2, multiplier: 3 },
    { stocks: 3, multiplier: 5 },
  ],
  // Bonus/penalty chip magnitudes — not specified numerically in the rules doc.
  bonusChips: {
    cleanSweep: 50,
    doubleCross: 30,
    bushwhacked: -30,
    showdown: 75,
    tPickCorrect: 40, // your Texas T-Pick won the whole tournament
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

// Cow Feed payouts after a match:
//   base    — flat chips awarded to every spectator (non-participant)
//   bonus   — pool of (bonusMultiplier × spectatorCount) split evenly among correct predictors
// Returns { base, bonus } chip amounts. bonus is 0 if no one predicted correctly.
export function cowFeed(spectatorCount, correctCount, base, bonusMultiplier) {
  if (spectatorCount === 0) return { base: 0, bonus: 0 };
  const pool = bonusMultiplier * spectatorCount;
  const bonus = correctCount > 0 ? Math.floor(pool / correctCount) : 0;
  return { base, bonus };
}
