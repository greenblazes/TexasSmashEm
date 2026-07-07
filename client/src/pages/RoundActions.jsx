import { useState } from "react";
import { emitAck } from "../lib/socket.js";
import { matchHandicap } from "../lib/economy.js";

function playerName(lobby, id) {
  return lobby.players.find((p) => p.id === id)?.name || "—";
}

export default function RoundActions({ lobby, me, playerId }) {
  const [error, setError] = useState("");

  if (!lobby.bracket || !me) return null;

  const readyMatches = lobby.bracket.rounds.flat().filter((m) => m.status === "ready");
  const isParticipant = (m) => m.playerA === playerId || m.playerB === playerId;

  async function run(event, payload) {
    setError("");
    const res = await emitAck(event, { code: lobby.code, playerId, ...payload });
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="round-actions">
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-value" style={{ background: "linear-gradient(135deg,#D4A832,#F0C84A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {me.chips}
          </div>
          <div className="stat-label">Chips</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: "var(--blue-light)" }}>{me.boons}</div>
          <div className="stat-label">Boons</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: "var(--green)" }}>{me.points}</div>
          <div className="stat-label">Points</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => run("player:buyBoons", {})} className="btn-ghost">
          Buy 2 Boons — {lobby.settings.buyBoonsCost} chips
        </button>
        {me.hasTrumpCard && <span className="trump-pill">🃏 Trump Card</span>}
      </div>

      {me.texasTPick && (
        <div className="card card-blue">
          <span className="section-label">Texas T-Pick · Locked</span>
          <p>Your predicted champion: <strong style={{ color: "var(--text)" }}>{playerName(lobby, me.texasTPick)}</strong></p>
        </div>
      )}

      {readyMatches.map((match) => (
        <MatchActions
          key={match.id}
          lobby={lobby}
          match={match}
          me={me}
          playerId={playerId}
          isParticipant={isParticipant(match)}
          run={run}
        />
      ))}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

function MatchActions({ lobby, match, me, playerId, isParticipant, run }) {
  const [boonTarget, setBoonTarget] = useState(match.playerA);
  const [boonAmount, setBoonAmount] = useState(1);
  const [betStocks, setBetStocks] = useState(lobby.settings.stockPool[0]?.stocks ?? 0);
  const [betWager, setBetWager] = useState(10);

  const handicap = matchHandicap(lobby, match);
  const existingPrediction = me.matchPredictions?.[match.id];
  const stockBets = lobby.stockBets?.[match.id] || [];

  return (
    <div className="card card-red">
      <div className="vs-banner">
        <span className="vs-name" style={{ color: "var(--blue-light)" }}>{match.playerAName}</span>
        <span className="vs-sep">VS</span>
        <span className="vs-name" style={{ color: "var(--green)" }}>{match.playerBName}</span>
      </div>

      <p style={{ marginBottom: 12 }}>
        Boons — {match.playerAName}:{" "}
        {Array.from({ length: handicap.aBoons }).map((_, i) => <span key={i} className="boon-pip" />)}
        {handicap.aBoons === 0 && "none"}
        {"  ·  "}
        {match.playerBName}:{" "}
        {Array.from({ length: handicap.bBoons }).map((_, i) => <span key={i} className="boon-pip" />)}
        {handicap.bBoons === 0 && "none"}
        {handicap.percent > 0 && (
          <span style={{ color: "var(--red)", marginLeft: 8 }}>
            {playerName(lobby, handicap.handicappedPlayerId)} +{handicap.percent}% dmg
          </span>
        )}
      </p>

      {!isParticipant && (
        <div className="field">
          <span className="field-label">Match Winner Prediction</span>
          <select
            value={existingPrediction || ""}
            onChange={(e) => run("player:setMatchPrediction", { matchId: match.id, predictedWinnerId: e.target.value })}
          >
            <option value="" disabled>Pick a winner</option>
            <option value={match.playerA}>{match.playerAName}</option>
            <option value={match.playerB}>{match.playerBName}</option>
          </select>
        </div>
      )}

      <div className="field">
        <span className="field-label">{isParticipant ? "Place your own Boon(s) on" : "Place Boon(s) on"}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={boonTarget} onChange={(e) => setBoonTarget(e.target.value)} style={{ flex: 1 }}>
            <option value={match.playerA}>{match.playerAName}</option>
            <option value={match.playerB}>{match.playerBName}</option>
          </select>
          <input
            type="number" min={1} max={me.boons} value={boonAmount}
            onChange={(e) => setBoonAmount(e.target.value)}
            style={{ width: 64, display: "inline-block" }}
          />
          <button
            className="btn-blue"
            onClick={() => run("player:placeBoon", { matchId: match.id, targetParticipantId: boonTarget, amount: boonAmount })}
          >
            Place
          </button>
        </div>
      </div>

      {me.eliminated && (
        <div>
          <span className="field-label" style={{ display: "block", marginBottom: 8 }}>Stock Bet</span>
          <p style={{ marginBottom: 8 }}>
            Open slots:{" "}
            {lobby.settings.stockPool
              .filter((s) => !stockBets.some((b) => b.stocks === s.stocks))
              .map((s) => `${s.stocks} stock(s) ×${s.multiplier}`)
              .join(", ") || "none"}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={betStocks} onChange={(e) => setBetStocks(Number(e.target.value))} style={{ flex: 1 }}>
              {lobby.settings.stockPool.map((s) => (
                <option key={s.stocks} value={s.stocks} disabled={stockBets.some((b) => b.stocks === s.stocks)}>
                  {s.stocks} stock(s) — ×{s.multiplier}
                </option>
              ))}
            </select>
            <input
              type="number" min={1} max={me.chips} value={betWager}
              onChange={(e) => setBetWager(e.target.value)}
              style={{ width: 70, display: "inline-block" }}
            />
            <button
              className="btn-blue"
              onClick={() => run("player:placeStockBet", { matchId: match.id, stocks: betStocks, wager: betWager })}
            >
              Bet
            </button>
          </div>

          {me.chips === 0 && stockBets.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="field-label" style={{ display: "block", marginBottom: 8 }}>Ride Double on</span>
              {stockBets.map((b) => (
                <button
                  key={b.stocks}
                  className="btn-ghost"
                  style={{ marginRight: 8, marginBottom: 6 }}
                  onClick={() => run("player:rideDouble", { matchId: match.id, stocks: b.stocks })}
                >
                  {playerName(lobby, b.playerId)}'s bet · {b.stocks} stock(s)
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {me.hasTrumpCard && !isParticipant && (
        <div style={{ marginTop: 12 }}>
          <span className="field-label" style={{ display: "block", marginBottom: 8 }}>Play Trump Card on</span>
          <button
            className="btn-gold"
            style={{ marginRight: 8 }}
            onClick={() => run("player:playTrumpCard", { matchId: match.id, targetParticipantId: match.playerA })}
          >
            {match.playerAName}
          </button>
          <button
            className="btn-gold"
            onClick={() => run("player:playTrumpCard", { matchId: match.id, targetParticipantId: match.playerB })}
          >
            {match.playerBName}
          </button>
        </div>
      )}
    </div>
  );
}
