import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useLobby } from "../lib/LobbyContext.jsx";
import { emitAck } from "../lib/socket.js";
import Bracket from "./Bracket.jsx";
import TrumpIcon from "../components/TrumpIcon.jsx";

export default function Admin() {
  const { code } = useParams();
  const { lobby, playerId, isHost, rejoinAttempted } = useLobby();
  const navigate = useNavigate();

  useEffect(() => {
    if (rejoinAttempted && !lobby) navigate("/", { replace: true });
    else if (lobby && !isHost) navigate(`/lobby/${code}`, { replace: true });
  }, [rejoinAttempted, lobby, isHost, code, navigate]);

  if (!lobby || !isHost) return <div className="page"><p>Loading…</p></div>;

  async function startMatch(matchId) {
    const res = await emitAck("host:startMatch", { code: lobby.code, playerId, matchId });
    if (!res.ok) alert(res.error);
  }

  async function nextRound() {
    const res = await emitAck("host:nextRound", { code: lobby.code, playerId });
    if (!res.ok) alert(res.error);
  }

  async function reportResult(matchId, winnerId, remainingStocks) {
    const res = await emitAck("host:reportResult", {
      code: lobby.code, playerId, matchId, winnerId,
      remainingStocks: Number(remainingStocks) || 0,
    });
    if (!res.ok) alert(res.error);
  }

  async function adjustChips(targetPlayerId, delta) {
    const res = await emitAck("host:adjustChips", { code: lobby.code, playerId, targetPlayerId, delta });
    if (!res.ok) alert(res.error);
  }

  async function handleDivvyUp() {
    const res = await emitAck("host:divvyUp", { code: lobby.code, playerId });
    if (!res.ok) alert(res.error);
    else alert("Pot divvied up — chip totals updated.");
  }

  const allMatches = lobby.bracket?.rounds.flat() || [];
  const readyMatches = allMatches.filter((m) => m.status === "ready");
  const inProgressMatches = allMatches.filter((m) => m.status === "in_progress");

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="wordmark">Host Admin</span>
          <span className="page-subtitle">
            Lobby {lobby.code} · {lobby.status} · Pot: {lobby.pot} chips
          </span>
        </div>
        <div className="page-header-right">
          <Link to={`/lobby/${lobby.code}`}>← Lobby View</Link>
        </div>
      </div>

      {lobby.status === "waiting" && <SettingsEditor lobby={lobby} playerId={playerId} />}

      {lobby.bracket && (
        <>
          {readyMatches.length > 0 && (
            <div className="card card-blue">
              <span className="section-label">Matches Ready to Start</span>
              {readyMatches.map((m) => {
                const preBet = lobby.matchPreBet?.[m.id];
                const needsNextRound = !preBet;
                const phase = preBet?.phase;
                const canStart = phase === "complete";
                const phaseLabel = needsNextRound
                  ? "Waiting to begin"
                  : phase === "participants" ? "Sealed boon phase"
                  : phase === "spectators" ? `Spectator turn ${(preBet.currentTurnIdx ?? 0) + 1} of ${preBet.spectatorOrder.length}`
                  : "Betting closed";
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ color: "var(--text)", fontWeight: 500 }}>
                        {m.playerAName} <span style={{ color: "var(--text-dim)" }}>vs</span> {m.playerBName}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: canStart ? "var(--green)" : "var(--gold)", marginTop: 2 }}>
                        {phaseLabel}
                      </div>
                    </div>
                    {needsNextRound ? (
                      <button className="btn-gold" onClick={nextRound}>
                        Next Round
                      </button>
                    ) : (
                      <button className="btn-gold" onClick={() => startMatch(m.id)} disabled={!canStart} style={{ opacity: canStart ? 1 : 0.4, cursor: canStart ? "pointer" : "not-allowed" }}>
                        Start Match
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {inProgressMatches.length > 0 && (
            <div className="card card-red">
              <span className="section-label">
                <span className="live-dot" />
                Match In Progress — Report Result
              </span>
              {inProgressMatches.map((m) => (
                <MatchResultControl key={m.id} match={m} onReport={reportResult} />
              ))}
            </div>
          )}

          <div className="card">
            <span className="section-label">Full Bracket</span>
            <Bracket bracket={lobby.bracket} />
          </div>
        </>
      )}

      <div className="card">
        <span className="section-label">Players</span>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Chips</th>
                <th>Boons</th>
                <th>T-Pick</th>
                <th>Trump</th>
                <th>Out</th>
                <th>Adjust Chips</th>
              </tr>
            </thead>
            <tbody>
              {lobby.players.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: "var(--text)", fontWeight: 500 }}>{p.name}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{p.chips}</td>
                  <td style={{ color: "var(--blue-light)" }}>{p.boons}</td>
                  <td>{lobby.players.find((x) => x.id === p.texasTPick)?.name || "—"}</td>
                  <td>{p.hasTrumpCard ? <TrumpIcon size={22} /> : ""}</td>
                  <td>{p.eliminated ? "Yes" : "No"}</td>
                  <td>
                    <button onClick={() => adjustChips(p.id, 1)}>+1</button>
                    <button onClick={() => adjustChips(p.id, -1)}>-1</button>
                    <button onClick={() => adjustChips(p.id, 10)}>+10</button>
                    <button onClick={() => adjustChips(p.id, -10)}>-10</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lobby.status === "complete" && (
        <div className="card card-gold" style={{ textAlign: "center" }}>
          <span className="section-label">Post-Game</span>
          <p style={{ marginBottom: 14 }}>
            End-of-tournament bonuses (Clean Sweep, Double-Cross, Bushwhacked, Showdown) have been applied.
          </p>
          <button className="btn-gold" onClick={handleDivvyUp}>Divvy Up the Pot</button>
        </div>
      )}
    </div>
  );
}

function MatchResultControl({ match, onReport }) {
  const [stocks, setStocks] = useState(1);

  return (
    <div className="match-control" style={{ marginBottom: 14, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontFamily: "var(--font-d)", fontSize: "0.85rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text)" }}>
        R{match.round}: {match.playerAName} vs {match.playerBName}
      </span>
      <label style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Stocks left:</label>
      <input
        type="number" min={0} value={stocks}
        onChange={(e) => setStocks(e.target.value)}
        style={{ width: 60, display: "inline-block" }}
      />
      <button onClick={() => onReport(match.id, match.playerA, stocks)} style={{ marginRight: 6 }}>
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
    setSettings({ ...settings, bonusChips: { ...settings.bonusChips, [field]: Number(value) } });
  }

  return (
    <div className="card">
      <span className="section-label">Tournament Settings</span>

      <h3>Economy</h3>
      <div className="settings-row">
        <label>Ante Up amount</label>
        <input type="number" value={settings.anteAmount} onChange={(e) => setSettings({ ...settings, anteAmount: Number(e.target.value) })} style={{ width: 80, display: "inline-block" }} />
      </div>
      <div className="settings-row">
        <label>Starting Chips</label>
        <input type="number" value={settings.startingChips} onChange={(e) => setSettings({ ...settings, startingChips: Number(e.target.value) })} style={{ width: 80, display: "inline-block" }} />
      </div>
      <div className="settings-row">
        <label>Starting Boons</label>
        <input type="number" value={settings.startingBoons} onChange={(e) => setSettings({ ...settings, startingBoons: Number(e.target.value) })} style={{ width: 80, display: "inline-block" }} />
      </div>

      <h3>Pre-Match Betting</h3>
      <div className="settings-row">
        <label>Turn duration (seconds)</label>
        <input type="number" value={settings.turnDurationMs / 1000} onChange={(e) => setSettings({ ...settings, turnDurationMs: Number(e.target.value) * 1000 })} style={{ width: 80, display: "inline-block" }} />
      </div>
      <div className="settings-row">
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!settings.disableParticipantCountdown}
            onChange={(e) => setSettings({ ...settings, disableParticipantCountdown: e.target.checked })}
          />
          Disable participant countdown (wait for both to submit, no timeout)
        </label>
      </div>
      <div className="settings-row">
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!settings.disableSpectatorCountdown}
            onChange={(e) => setSettings({ ...settings, disableSpectatorCountdown: e.target.checked })}
          />
          Disable spectator countdown (wait for each turn's input, no timeout)
        </label>
      </div>

      <h3>Cow Feed</h3>
      <div className="settings-row">
        <label>Base chips (all spectators)</label>
        <input type="number" value={settings.cowFeedBase} onChange={(e) => setSettings({ ...settings, cowFeedBase: Number(e.target.value) })} style={{ width: 80, display: "inline-block" }} />
      </div>
      <div className="settings-row">
        <label>Bonus multiplier (× spectator count)</label>
        <input type="number" value={settings.cowFeedBonusMultiplier} onChange={(e) => setSettings({ ...settings, cowFeedBonusMultiplier: Number(e.target.value) })} style={{ width: 80, display: "inline-block" }} />
      </div>

      <h3>Stock Bets — Payout Multipliers</h3>
      <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: -4, marginBottom: 10 }}>
        Eliminated players wager chips that the winner they predicted finishes with exactly this many stocks. Win = wager × multiplier.
      </p>
      {settings.stockPool.map((s, idx) => (
        <div className="settings-row" key={idx}>
          <label style={{ minWidth: 80 }}>{s.stocks} stock{s.stocks !== 1 ? "s" : ""} left</label>
          <label style={{ minWidth: 80 }}>Multiplier ×</label>
          <input type="number" min={1} value={s.multiplier} onChange={(e) => updateStockSlot(idx, "multiplier", e.target.value)} style={{ width: 60, display: "inline-block" }} />
        </div>
      ))}

      <h3>Bonus / Penalty Chips</h3>
      <div className="settings-row">
        <label>Clean Sweep</label>
        <input type="number" value={settings.bonusChips.cleanSweep} onChange={(e) => updateBonus("cleanSweep", e.target.value)} style={{ width: 70, display: "inline-block" }} />
        <label style={{ minWidth: 100 }}>Double-Cross</label>
        <input type="number" value={settings.bonusChips.doubleCross} onChange={(e) => updateBonus("doubleCross", e.target.value)} style={{ width: 70, display: "inline-block" }} />
      </div>
      <div className="settings-row">
        <label>Bushwhacked</label>
        <input type="number" value={settings.bonusChips.bushwhacked} onChange={(e) => updateBonus("bushwhacked", e.target.value)} style={{ width: 70, display: "inline-block" }} />
        <label style={{ minWidth: 100 }}>Showdown</label>
        <input type="number" value={settings.bonusChips.showdown} onChange={(e) => updateBonus("showdown", e.target.value)} style={{ width: 70, display: "inline-block" }} />
      </div>

      <button className="btn-gold" onClick={save} style={{ marginTop: 8 }}>Save Settings</button>
    </div>
  );
}
