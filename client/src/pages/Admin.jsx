import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useLobby } from "../lib/LobbyContext.jsx";
import { emitAck } from "../lib/socket.js";
import Bracket from "./Bracket.jsx";

export default function Admin() {
  const { code } = useParams();
  const { lobby, playerId, isHost, rejoinAttempted } = useLobby();
  const navigate = useNavigate();

  useEffect(() => {
    if (rejoinAttempted && !lobby) {
      navigate("/", { replace: true });
    } else if (lobby && !isHost) {
      navigate(`/lobby/${code}`, { replace: true });
    }
  }, [rejoinAttempted, lobby, isHost, code, navigate]);

  if (!lobby || !isHost) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  }

  async function reportResult(matchId, winnerId, remainingStocks) {
    const res = await emitAck("host:reportResult", {
      code: lobby.code,
      playerId,
      matchId,
      winnerId,
      remainingStocks: Number(remainingStocks) || 0,
    });
    if (!res.ok) alert(res.error);
  }

  async function adjustPoints(targetPlayerId, delta) {
    const res = await emitAck("host:adjustPoints", {
      code: lobby.code,
      playerId,
      targetPlayerId,
      delta,
    });
    if (!res.ok) alert(res.error);
  }

  async function handleDivvyUp() {
    const res = await emitAck("host:divvyUp", { code: lobby.code, playerId });
    if (!res.ok) alert(res.error);
    else alert("Pot divvied up — chip totals updated below.");
  }

  const readyMatches =
    lobby.bracket?.rounds.flat().filter((m) => m.status === "ready") || [];

  return (
    <div className="page admin">
      <header className="lobby-header">
        <div>
          <h1>Host Admin — {lobby.code}</h1>
          <p>
            Status: {lobby.status} &nbsp; Pot: {lobby.pot} chips
          </p>
        </div>
        <Link to={`/lobby/${lobby.code}`}>Back to Lobby View</Link>
      </header>

      {lobby.status === "waiting" && <SettingsEditor lobby={lobby} playerId={playerId} />}

      <section>
        <h2>Players</h2>
        <table className="points-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Points</th>
              <th>Chips</th>
              <th>Boons</th>
              <th>T-Pick</th>
              <th>Trump</th>
              <th>Eliminated</th>
              <th>Adjust Points</th>
            </tr>
          </thead>
          <tbody>
            {lobby.players.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.points}</td>
                <td>{p.chips}</td>
                <td>{p.boons}</td>
                <td>{lobby.players.find((x) => x.id === p.texasTPick)?.name || "—"}</td>
                <td>{p.hasTrumpCard ? "🃏" : ""}</td>
                <td>{p.eliminated ? "Yes" : "No"}</td>
                <td>
                  <button onClick={() => adjustPoints(p.id, 1)}>+1</button>
                  <button onClick={() => adjustPoints(p.id, -1)}>-1</button>
                  <button onClick={() => adjustPoints(p.id, 10)}>+10</button>
                  <button onClick={() => adjustPoints(p.id, -10)}>-10</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {lobby.bracket && (
        <section>
          <h2>Matches Awaiting Result</h2>
          {readyMatches.length === 0 && <p>No matches currently ready.</p>}
          {readyMatches.map((m) => (
            <MatchResultControl key={m.id} match={m} onReport={reportResult} />
          ))}

          <h2>Full Bracket</h2>
          <Bracket bracket={lobby.bracket} />
        </section>
      )}

      {lobby.status === "complete" && (
        <section>
          <h2>Post-Game</h2>
          <p>End-of-tournament bonuses (Clean Sweep, Double-Cross, Bushwhacked, Showdown) have already been applied to points above.</p>
          <button onClick={handleDivvyUp}>Divvy Up the Pot</button>
        </section>
      )}
    </div>
  );
}

function MatchResultControl({ match, onReport }) {
  const [stocks, setStocks] = useState(1);

  return (
    <div className="card match-control">
      <p>Round {match.round}</p>
      <label>Winner's remaining stocks: </label>
      <input
        type="number"
        min={0}
        value={stocks}
        onChange={(e) => setStocks(e.target.value)}
        style={{ width: 60, display: "inline-block" }}
      />
      <button onClick={() => onReport(match.id, match.playerA, stocks)}>
        {match.playerAName} wins
      </button>
      <button onClick={() => onReport(match.id, match.playerB, stocks)}>
        {match.playerBName} wins
      </button>
    </div>
  );
}

function SettingsEditor({ lobby, playerId }) {
  const [settings, setSettings] = useState(lobby.settings);

  async function save() {
    const res = await emitAck("host:updateSettings", { code: lobby.code, playerId, settings });
    if (!res.ok) alert(res.error);
  }

  function updateStockSlot(idx, field, value) {
    const stockPool = settings.stockPool.map((s, i) =>
      i === idx ? { ...s, [field]: Number(value) } : s
    );
    setSettings({ ...settings, stockPool });
  }

  function updateBonus(field, value) {
    setSettings({ ...settings, bonusPoints: { ...settings.bonusPoints, [field]: Number(value) } });
  }

  return (
    <section className="card">
      <h2>Tournament Settings (edit before starting)</h2>
      <div>
        <label>Ante Up amount: </label>
        <input
          type="number"
          value={settings.anteAmount}
          onChange={(e) => setSettings({ ...settings, anteAmount: Number(e.target.value) })}
          style={{ width: 80, display: "inline-block" }}
        />
      </div>
      <div>
        <label>Starting Chips: </label>
        <input
          type="number"
          value={settings.startingChips}
          onChange={(e) => setSettings({ ...settings, startingChips: Number(e.target.value) })}
          style={{ width: 80, display: "inline-block" }}
        />
      </div>
      <div>
        <label>Starting Boons: </label>
        <input
          type="number"
          value={settings.startingBoons}
          onChange={(e) => setSettings({ ...settings, startingBoons: Number(e.target.value) })}
          style={{ width: 80, display: "inline-block" }}
        />
      </div>

      <h3>Stock Pool (payout multipliers per remaining-stock slot)</h3>
      {settings.stockPool.map((s, idx) => (
        <div key={idx}>
          <label>Stocks: </label>
          <input
            type="number"
            value={s.stocks}
            onChange={(e) => updateStockSlot(idx, "stocks", e.target.value)}
            style={{ width: 60, display: "inline-block" }}
          />
          <label> Multiplier: </label>
          <input
            type="number"
            value={s.multiplier}
            onChange={(e) => updateStockSlot(idx, "multiplier", e.target.value)}
            style={{ width: 60, display: "inline-block" }}
          />
        </div>
      ))}

      <h3>Bonus/Penalty Points</h3>
      <div>
        <label>Clean Sweep: </label>
        <input
          type="number"
          value={settings.bonusPoints.cleanSweep}
          onChange={(e) => updateBonus("cleanSweep", e.target.value)}
          style={{ width: 70, display: "inline-block" }}
        />
        <label> Double-Cross: </label>
        <input
          type="number"
          value={settings.bonusPoints.doubleCross}
          onChange={(e) => updateBonus("doubleCross", e.target.value)}
          style={{ width: 70, display: "inline-block" }}
        />
        <label> Bushwhacked: </label>
        <input
          type="number"
          value={settings.bonusPoints.bushwhacked}
          onChange={(e) => updateBonus("bushwhacked", e.target.value)}
          style={{ width: 70, display: "inline-block" }}
        />
        <label> Showdown: </label>
        <input
          type="number"
          value={settings.bonusPoints.showdown}
          onChange={(e) => updateBonus("showdown", e.target.value)}
          style={{ width: 70, display: "inline-block" }}
        />
      </div>

      <button onClick={save}>Save Settings</button>
    </section>
  );
}
