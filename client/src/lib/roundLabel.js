// Shared round-name logic for bracket displays (Bracket.jsx, RoundActions.jsx).
// idx = 0-based round index (match.round - 1), total = bracket.rounds.length (roundCount).
export function roundLabel(idx, total) {
  const remaining = total - idx;
  if (remaining === 1) return "Grand Final";
  if (remaining === 2) return "Semifinal";
  if (remaining === 3) return "Quarterfinal";
  return `Round ${idx + 1}`;
}
