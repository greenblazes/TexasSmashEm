import { useNavigate, useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLobby } from "../lib/LobbyContext.jsx";
import { emitAck } from "../lib/socket.js";
import BracketPanel from "../components/BracketPanel.jsx";
import ChipIcon from "../components/ChipIcon.jsx";
import BoonIcon from "../components/BoonIcon.jsx";
import PotIcon from "../components/PotIcon.jsx";
import BoonDrawer from "../components/BoonDrawer.jsx";
import TPickIcon from "../components/TPickIcon.jsx";
import RoundActions from "./RoundActions.jsx";
import RewardPopups from "../components/RewardPopups.jsx";
import Scoreboard from "./Scoreboard.jsx";

function TexasTPickSelector({ lobby, me, playerId }) {
  if (!me) return null;

  async function pick(pickPlayerId) {
    const res = await emitAck("player:setTPick", { code: lobby.code, playerId, pickPlayerId });
    if (!res.ok) alert(res.error);
  }

  return (
    <div className="card card-blue" style={{ marginTop: 14, textAlign: "center" }}>
      <span className="section-label">Texas T-Pick</span>
      <TPickIcon size={56} style={{ marginBottom: 10 }} />
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
  const [boonDrawerOpen, setBoonDrawerOpen] = useState(false);

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

  async function handleBuyBoon() {
    const res = await emitAck("player:buyBoons", { code: lobby.code, playerId, quantity: 1 });
    return res;
  }

  const totalPlayers = lobby.players.length;
  const picksDone = lobby.players.filter(p => p.texasTPick).length;

  return (
    <div className="page">
      <RewardPopups />
      {lobby.bracket && <BracketPanel bracket={lobby.bracket} highlightPlayerId={playerId} />}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
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
            {me && lobby.status !== "waiting" && (
              <div
                className="chip-pill boon-pill"
                role="button"
                tabIndex={0}
                onClick={() => setBoonDrawerOpen((o) => !o)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setBoonDrawerOpen((o) => !o); }}
                style={{ cursor: "pointer" }}
              >
                <BoonIcon size={22} className="chip-icon" />
                <span className="chip-value">{me.boons ?? 0}</span>
              </div>
            )}
            {isHost && <Link to={`/lobby/${lobby.code}/admin`}>Host Admin</Link>}
            <button className="btn-ghost" onClick={handleLeave}>Exit</button>
          </div>
        </div>
        {me && lobby.status !== "waiting" && (
          <BoonDrawer
            open={boonDrawerOpen}
            cost={Math.round(lobby.settings.buyBoonsCost / lobby.settings.buyBoonsAmount)}
            chips={me.chips ?? 0}
            onBuy={handleBuyBoon}
          />
        )}
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

          {lobby.status === "complete" && lobby.divvied ? (
            <Scoreboard lobby={lobby} />
          ) : (
            <div className="card card-gold">
              <div className="pot-display">
                <span className="pot-label">Tournament Pot</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 12 }}>
                  <PotIcon size={72} />
                  <div className="pot-amount">{lobby.pot.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {lobby.status === "in_progress" && (
            <RoundActions lobby={lobby} me={me} playerId={playerId} />
          )}
        </div>
      )}
    </div>
  );
}
