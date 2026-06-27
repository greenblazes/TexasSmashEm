// Chip/Boon economy per the Texas SMASH'em rules doc.
// Values not printed in the text rules (Stock Pool payout multipliers, bonus point
// magnitudes) are host-configurable defaults — see lobby.settings.

export const DEFAULTS = {
  startingChips: 200,
  startingBoons: 2,
  anteAmount: 50,
  buyBoonsCost: 10, // buys 2 boons
  buyBoonsAmount: 2,
  // 6 Stock Pool slots representing possible remaining-stock counts at match end,
  // and the multiplier printed on that slot. Exact printed values aren't in the
  // text rules, so these are reasonable defaults the host can edit in Admin.
  stockPool: [
    { stocks: 0, multiplier: 10 },
    { stocks: 1, multiplier: 6 },
    { stocks: 2, multiplier: 4 },
    { stocks: 3, multiplier: 3 },
    { stocks: 4, multiplier: 2 },
    { stocks: 5, multiplier: 1 },
  ],
  // Point bonus/penalty magnitudes — not specified numerically in the rules doc.
  bonusPoints: {
    cleanSweep: 50,
    doubleCross: 30,
    bushwhacked: -30,
    showdown: 75,
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

// Cow Feed = (10 * betSpread^2) + 20, min 20.
// betSpread modeled as the gap between players who predicted wrong vs. right
// for this match (sign doesn't matter since it's squared) — the doc says it's
// "calculated dynamically based on the odds created by other players' predictions"
// but doesn't give the exact spread formula, so this is the closest reasonable
// reading. Adjust here if the real formula differs.
export function cowFeed(correctCount, incorrectCount) {
  const spread = incorrectCount - correctCount;
  return Math.max(20, 10 * spread * spread + 20);
}
