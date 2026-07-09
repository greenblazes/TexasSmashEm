import { useNavigate, useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLobby } from "../lib/LobbyContext.jsx";
import { emitAck } from "../lib/socket.js";
import Bracket from "./Bracket.jsx";
import ChipIcon from "../components/ChipIcon.jsx";
import RoundActions from "./RoundActions.jsx";
import RewardPopups from "../components/RewardPopups.jsx";

function TexasTPickSelector({ lobby, me, playerId }) {
  if (!me) return null;

  async function pick(pickPlayerId) {
    const res = await emitAck("player:setTPick", { code: lobby.code, playerId, pickPlayerId });
    if (!res.ok) alert(res.error);
  }

  return (
    <div className="card card-blue" style={{ marginTop: 14 }}>
      <span className="section-label">Texas T-Pick</span>
      <p style={{ marginBottom: 10 }}>Who will win the whole tournament? Locks in when play begins.</p>
      <select value={me.texasTPick || ""} onChange={(e) => pick(e.target.value)}>
        <option value="" disabled>Choose your pick</option>
        {lobby.players.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {me.texasTPick && (
        <p style={{ marginTop: 8, color: "var(--green)", fontSize: "0.8rem" }}>
          ✓ Pick saved — {lobby.players.find(p => p.id === me.texasTPick)?.name}
        </p>
      )}
    </div>
  );
}

export default function Lobby() {
  const { code } = useParams();
  const { lobby, me, playerId, isHost, leaveSession, rejoinAttempted, error } = useLobby();
  const navigate = useNavigate();

  useEffect(() => {
    if (rejoinAttempted && !lobby) navigate("/", { replace: true });
  }, [rejoinAttempted, lobby, navigate]);

  if (!lobby) {
    return (
      <div className="page">
        {error ? <p className="error">{error}</p> : <p>Loading lobby…</p>}
      </div>
    );
  }

  async function handleStart() {
    const res = await emitAck("host:start", { code: lobby.code, playerId });
    if (!res.ok) alert(res.error);
  }

  function handleLeave() {
    leaveSession();
    navigate("/");
  }

  const totalPlayers = lobby.players.length;
  const picksDone = lobby.players.filter(p => p.texasTPick).length;

  return (
    <div className="page">
      <RewardPopups />
      <div className="page-header">
        <div>
          <span className="wordmark">Texas SMASH'em</span>
          <span className="page-subtitle">
            Lobby {lobby.code} · {lobby.status === "waiting" ? "Waiting" : lobby.status === "in_progress" ? "In Progress" : "Complete"}
          </span>
        </div>
        <div className="page-header-right">
          {me && (
            <div className="chip-pill">
              <ChipIcon size={22} className="chip-icon" />
              <span className="chip-value">{me.chips ?? 0}</span>
            </div>
          )}
          {isHost && <Link to={`/lobby/${lobby.code}/admin`}>Host Admin</Link>}
          <button className="btn-ghost" onClick={handleLeave}>Leave</button>
        </div>
      </div>

      {lobby.status === "waiting" && (
        <div className="cols-2">
          <div>
            <div className="card card-gold animate-up">
              <span className="section-label">Lobby Code</span>
              <div className="lobby-code-display">{lobby.code}</div>
              <p style={{ textAlign: "center", marginTop: 10, fontSize: "0.72rem" }}>
                Share this code with players
              </p>
            </div>
            <TexasTPickSelector lobby={lobby} me={me} playerId={playerId} />
          </div>

          <div className="card animate-up-2">
            <span className="section-label">Players ({totalPlayers} / 24)</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(totalPlayers / 24) * 100}%` }} />
            </div>
            <ul className="player-list">
              {lobby.players.map((p) => (
                <li key={p.id} className={p.id === playerId ? "me" : ""}>
                  <input
                    type="checkbox"
                    checked={!!p.texasTPick}
                    readOnly
                    title={p.texasTPick ? "T-Pick selected" : "No T-Pick yet"}
                  />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  {p.isHost && <span className="player-badge badge-host">Host</span>}
                  {!p.connected && <span className="player-badge badge-offline">Offline</span>}
                </li>
              ))}
            </ul>

            {isHost && (
              <div style={{ marginTop: 14 }}>
                {picksDone < totalPlayers && (
                  <div className="notif notif-warn">
                    ⏳ Waiting for {totalPlayers - picksDone} player{totalPlayers - picksDone !== 1 ? "s" : ""} to select their T-Pick.
                  </div>
                )}
                <button
                  onClick={handleStart}
                  disabled={totalPlayers < 2 || picksDone < totalPlayers}
                  style={{ width: "100%" }}
                >
                  Start Tournament
                </button>
              </div>
            )}
            {!isHost && <p style={{ marginTop: 10 }}>Waiting for the host to start…</p>}
          </div>
        </div>
      )}

      {lobby.status !== "waiting" && (
        <div>
          {lobby.status === "complete" && lobby.champion && (
            <div className="card card-gold" style={{ textAlign: "center", padding: "24px 22px" }}>
              <span className="section-label">Champion</span>
              <div style={{ fontFamily: "var(--font-d)", fontSize: "2rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                🏆 {lobby.champion.name}
              </div>
            </div>
          )}

          <div className="card card-gold">
            <div className="pot-display">
              <span className="pot-label">Tournament Pot</span>
              <div className="pot-amount">{lobby.pot.toLocaleString()}</div>
            </div>
          </div>

          <div className="card">
            <span className="section-label">Bracket</span>
            <Bracket bracket={lobby.bracket} highlightPlayerId={playerId} />
          </div>

          {lobby.status === "in_progress" && (
            <RoundActions lobby={lobby} me={me} playerId={playerId} />
          )}
        </div>
      )}
    </div>
  );
}
