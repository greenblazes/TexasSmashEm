// Derives extended per-player tournament stats for the post-Divvy-Up Scoreboard.
// `bonusHistory` and `boonsPlaced` come straight from the server (or the mock engine);
// everything else here is computed from data already present in `lobby` — the bracket
// (which retains every match, including boonPlacements, even after it's complete) and
// each player's matchPredictions.

export function getPlayerRoundsPlayed(lobby, playerId) {
  return lobby.bracket.rounds
    .flat()
    .filter((m) => m.winnerId && m.status !== "bye" && (m.playerA === playerId || m.playerB === playerId))
    .length;
}

export function getPlayerBoonsReceived(lobby, playerId) {
  let total = 0;
  for (const round of lobby.bracket.rounds) {
    for (const m of round) {
      if (m.playerA === playerId || m.playerB === playerId) {
        total += lobby.boonPlacements?.[m.id]?.[playerId] || 0;
      }
    }
  }
  return total;
}

export function getPlayerBoonsOnOpponents(lobby, playerId) {
  let total = 0;
  for (const round of lobby.bracket.rounds) {
    for (const m of round) {
      const opponentId = m.playerA === playerId ? m.playerB : m.playerB === playerId ? m.playerA : null;
      if (opponentId) {
        total += lobby.boonPlacements?.[m.id]?.[opponentId] || 0;
      }
    }
  }
  return total;
}

export function getPlayerPredictionsCorrect(lobby, playerId) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) return 0;
  let count = 0;
  for (const round of lobby.bracket.rounds) {
    for (const m of round) {
      if (m.winnerId && player.matchPredictions?.[m.id] === m.winnerId) count++;
    }
  }
  return count;
}

// Returns players sorted descending by final chip count, each paired with their
// derived stats for the Scoreboard.
export function buildScoreboard(lobby) {
  return [...lobby.players]
    .sort((a, b) => b.chips - a.chips)
    .map((player) => ({
      player,
      roundsPlayed: getPlayerRoundsPlayed(lobby, player.id),
      boonsReceived: getPlayerBoonsReceived(lobby, player.id),
      boonsOnOpponents: getPlayerBoonsOnOpponents(lobby, player.id),
      predictionsCorrect: getPlayerPredictionsCorrect(lobby, player.id),
    }));
}
