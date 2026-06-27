import { useNavigate, useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLobby } from "../lib/LobbyContext.jsx";
import { emitAck } from "../lib/socket.js";
import Bracket from "./Bracket.jsx";
import RoundActions from "./RoundActions.jsx";

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
                {p.name} {p.isHost && "(Host)"} {!p.connected && "(offline)"}
              </li>
            ))}
          </ul>
          {isHost && (
            <button onClick={handleStart} disabled={lobby.players.length < 2}>
              Start Tournament
            </button>
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
