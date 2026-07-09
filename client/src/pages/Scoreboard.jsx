import { useState } from "react";
import { buildScoreboard } from "../lib/scoreboard.js";
import ChipIcon from "../components/ChipIcon.jsx";
import BonusIcon from "../components/BonusIcon.jsx";

// Shown to every player once the host has run Divvy Up. Lists players ranked by
// final chip count, with the bonuses each earned along the way; each row expands
// to reveal extra tournament stats for that player.
export default function Scoreboard({ lobby }) {
  const [expandedId, setExpandedId] = useState(null);
  const rows = buildScoreboard(lobby);

  return (
    <div className="card card-gold">
      <span className="section-label">Final Scoreboard</span>
      <div className="scoreboard-list">
        {rows.map(({ player, roundsPlayed, boonsReceived, boonsOnOpponents, predictionsCorrect }, idx) => {
          const expanded = expandedId === player.id;
          return (
            <div key={player.id} className={`scoreboard-row${expanded ? " expanded" : ""}`}>
              <button
                className="scoreboard-row-header"
                onClick={() => setExpandedId(expanded ? null : player.id)}
              >
                <span className="scoreboard-rank">#{idx + 1}</span>
                <span className="scoreboard-name">
                  {player.name}{player.isHost ? " (Host)" : ""}
                </span>
                <span className="scoreboard-bonuses">
                  {(player.bonusHistory || []).map((type, i) => (
                    <BonusIcon key={i} type={type} size={24} />
                  ))}
                </span>
                <span className="scoreboard-chips">
                  <ChipIcon size={18} />
                  {player.chips}
                </span>
                <span className="scoreboard-caret">{expanded ? "▲" : "▼"}</span>
              </button>

              {expanded && (
                <div className="scoreboard-details">
                  <div className="stat-grid">
                    <div className="stat-tile">
                      <div className="stat-value" style={{ color: "var(--blue-light)" }}>{player.boonsPlaced ?? 0}</div>
                      <div className="stat-label">Boons Played</div>
                    </div>
                    <div className="stat-tile">
                      <div className="stat-value" style={{ color: "var(--blue-light)" }}>{boonsReceived}</div>
                      <div className="stat-label">Boons Received</div>
                    </div>
                    <div className="stat-tile">
                      <div className="stat-value" style={{ color: "var(--red)" }}>{boonsOnOpponents}</div>
                      <div className="stat-label">Boons on Opponents</div>
                    </div>
                    <div className="stat-tile">
                      <div className="stat-value" style={{ color: "var(--text)" }}>{roundsPlayed}</div>
                      <div className="stat-label">Rounds Played</div>
                    </div>
                    <div className="stat-tile">
                      <div className="stat-value" style={{ color: "var(--green)" }}>{predictionsCorrect}</div>
                      <div className="stat-label">Predictions Correct</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
