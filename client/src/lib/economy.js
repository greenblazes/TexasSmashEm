const BOON_DAMAGE_SCALE = {
  1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60,
  7: 80, 8: 100, 9: 125, 10: 150, 11: 200, 12: 300,
};

export function boonHandicapPercent(diff) {
  if (diff <= 0) return 0;
  if (diff >= 12) return BOON_DAMAGE_SCALE[12];
  return BOON_DAMAGE_SCALE[diff] ?? 0;
}

export function matchHandicap(lobby, match) {
  const placements = lobby.boonPlacements?.[match.id] || {};
  const aBoons = placements[match.playerA] || 0;
  const bBoons = placements[match.playerB] || 0;
  const diff = Math.abs(aBoons - bBoons);
  const percent = boonHandicapPercent(diff);
  const handicappedPlayerId =
    aBoons === bBoons ? null : aBoons < bBoons ? match.playerA : match.playerB;
  return { aBoons, bBoons, diff, percent, handicappedPlayerId };
}
