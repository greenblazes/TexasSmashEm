export default function Bracket({ bracket, highlightPlayerId }) {
  if (!bracket) return null;

  return (
    <div className="bracket">
      {bracket.rounds.map((round, idx) => (
        <div className="bracket-round" key={idx}>
          <h3>{roundLabel(idx, bracket.rounds.length)}</h3>
          {round.map((match) => (
            <div
              className={`match match-${match.status}`}
              key={match.id}
            >
              <div
                className={matchSlotClass(match, "a", highlightPlayerId)}
              >
                {match.playerAName || (match.status === "pending" ? "TBD" : "—")}
                {match.winnerId === match.playerA && match.playerA && (
                  <span className="crown">★</span>
                )}
              </div>
              <div
                className={matchSlotClass(match, "b", highlightPlayerId)}
              >
                {match.playerBName || (match.status === "pending" ? "TBD" : "—")}
                {match.winnerId === match.playerB && match.playerB && (
                  <span className="crown">★</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function matchSlotClass(match, slot, highlightPlayerId) {
  const playerId = slot === "a" ? match.playerA : match.playerB;
  const classes = ["slot"];
  if (playerId && playerId === highlightPlayerId) classes.push("me");
  if (match.winnerId && playerId === match.winnerId) classes.push("winner");
  if (match.winnerId && playerId && playerId !== match.winnerId) classes.push("loser");
  return classes.join(" ");
}

function roundLabel(idx, total) {
  const remaining = total - idx;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Semifinals";
  if (remaining === 3) return "Quarterfinals";
  return `Round ${idx + 1}`;
}
