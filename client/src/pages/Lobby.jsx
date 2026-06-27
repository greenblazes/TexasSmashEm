import { useNavigate, useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLobby } from "../lib/LobbyContext.jsx";
import { emitAck } from "../lib/socket.js";
import Bracket from "./Bracket.jsx";
import RoundActions from "./RoundActions.jsx";

function TexasTPickSelector({ lobby, me, playerId }) {
  if (!me) return null;

  async function pick(pickPlayerId) {
    const res = await emitAck("player:setTPick", { code: lobby.code, playerId, pickPlayerId });
    if (!res.ok) alert(res.error);
  }

  return (
    <div className="card">
      <h3>Your Texas T-Pick (who will win the whole tournament?)</h3>
      <p>This locks in once the tournament starts.</p>
      <select value={me.texasTPick || ""} onChange={(e) => pick(e.target.value)}>
        <option value="" disabled>
          Choose your pick
        </option>
        {lobby.players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Lobby() {
  const { code } = useParams();
  const { lobby, me, playerId, isHost, leaveSession, rejoinAttempted, error } = useLobby();
  const navigate = useNavigate();

  useEffect(() => {
    if (rejoinAttempted && !lobby) {
      navigate("/", { replace: true });
    }
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

  return (
    <div className="page lobby">
      <header className="lobby-header">
        <div>
          <h1>Lobby {lobby.code}</h1>
          <p>Status: {lobby.status}</p>
        </div>
        <div className="lobby-actions">
          {isHost && <Link to={`/lobby/${lobby.code}/admin`}>Host Admin</Link>}
          <button onClick={handleLeave}>Leave</button>
        </div>
      </header>

      {lobby.status === "waiting" && (
        <section>
          <h2>Players ({lobby.players.length}/24)</h2>
          <ul className="player-list">
            {lobby.players.map((p) => (
              <li key={p.id} className={p.id === playerId ? "me" : ""}>
                <input type="checkbox" checked={!!p.texasTPick} readOnly title="Texas T-Pick selected" />
                {" "}
                {p.name} {p.isHost && "(Host)"} {!p.connected && "(offline)"}
              </li>
            ))}
          </ul>

          <TexasTPickSelector lobby={lobby} me={me} playerId={playerId} />

          {isHost && (
            <button
              onClick={handleStart}
              disabled={lobby.players.length < 2 || lobby.players.some((p) => !p.texasTPick)}
            >
              Start Tournament
            </button>
          )}
          {isHost && lobby.players.some((p) => !p.texasTPick) && (
            <p>Waiting for everyone to select their Texas T-Pick before you can start.</p>
          )}
          {!isHost && <p>Waiting for the host to start the tournament…</p>}
        </section>
      )}

      {lobby.status !== "waiting" && (
        <section>
          {lobby.status === "complete" && lobby.champion && (
            <h2>🏆 Champion: {lobby.champion.name}</h2>
          )}
          <p>Pot: {lobby.pot} chips</p>
          <Bracket bracket={lobby.bracket} highlightPlayerId={playerId} />
          {lobby.status === "in_progress" && (
            <RoundActions lobby={lobby} me={me} playerId={playerId} />
          )}
        </section>
      )}
    </div>
  );
}
