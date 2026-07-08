import React, { useState, useEffect } from "react";
import { emitAck } from "../lib/socket.js";
import { matchHandicap } from "../lib/economy.js";

function playerName(lobby, id) {
  return lobby.players.find((p) => p.id === id)?.name || "—";
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function vibrate() {
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}

function useCountdown(deadline) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, deadline - Date.now()));
  useEffect(() => {
    setMsLeft(Math.max(0, deadline - Date.now()));
    const iv = setInterval(() => setMsLeft(Math.max(0, deadline - Date.now())), 250);
    return () => clearInterval(iv);
  }, [deadline]);
  return msLeft;
}

function CountdownBar({ deadline, totalMs }) {
  const msLeft = useCountdown(deadline);
  const pct = totalMs > 0 ? (msLeft / totalMs) * 100 : 0;
  const secs = Math.ceil(msLeft / 1000);
  const color = pct > 50 ? "var(--green)" : pct > 25 ? "var(--gold)" : "var(--red)";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 4 }}>{secs}s remaining</div>
      <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.25s linear, background 0.5s" }} />
      </div>
    </div>
  );
}

export default function RoundActions({ lobby, me, playerId }) {
  const [error, setError] = useState("");

  if (!lobby.bracket || !me) return null;

  const allActiveMatches = lobby.bracket.rounds.flat().filter((m) => m.status === "ready" || m.status === "in_progress");

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
      </div>

      {me.texasTPick && (
        <div className="card card-blue">
          <span className="section-label">Texas T-Pick · Locked</span>
          <p>Your predicted champion: <strong style={{ color: "var(--text)" }}>{playerName(lobby, me.texasTPick)}</strong></p>
        </div>
      )}

      {allActiveMatches.map((match) => {
        const preBet = lobby.matchPreBet?.[match.id];
        const isParticipant = match.playerA === playerId || match.playerB === playerId;

        if (match.status === "in_progress") {
          return <MatchLocked key={match.id} match={match} lobby={lobby} isParticipant={isParticipant} />;
        }

        return (
          <MatchPreBet
            key={match.id}
            lobby={lobby}
            match={match}
            preBet={preBet}
            me={me}
            playerId={playerId}
            isParticipant={isParticipant}
            run={run}
          />
        );
      })}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

// ── Locked (in-progress) view ─────────────────────────────────────────────────

function MatchLocked({ match, lobby, isParticipant }) {
  const handicap = matchHandicap(lobby, match);
  return (
    <div className="card card-red">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span className="live-dot" />
        <span style={{ fontSize: "0.7rem", letterSpacing: "0.14em", color: "var(--red)", fontWeight: 600, textTransform: "uppercase" }}>Match In Progress</span>
      </div>
      <div className="vs-banner">
        <span className="vs-name" style={{ color: "var(--blue-light)" }}>{match.playerAName}</span>
        <span className="vs-sep">VS</span>
        <span className="vs-name" style={{ color: "var(--green)" }}>{match.playerBName}</span>
      </div>
      {handicap.percent > 0 && (
        <p style={{ marginTop: 10, color: "var(--text-mid)", fontSize: "0.85rem" }}>
          Handicap: <span style={{ color: "var(--red)" }}>
            {lobby.players.find((p) => p.id === handicap.handicappedPlayerId)?.name} +{handicap.percent}% dmg
          </span>
        </p>
      )}
      <p style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--text-dim)" }}>
        Boons, bets, and Trump Card are locked.
      </p>
    </div>
  );
}

// ── Pre-bet phase container ───────────────────────────────────────────────────

function MatchPreBet({ lobby, match, preBet, me, playerId, isParticipant, run }) {
  const phase = preBet?.phase ?? "complete";

  if (phase === "participants") {
    return <ParticipantPhase lobby={lobby} match={match} preBet={preBet} me={me} playerId={playerId} isParticipant={isParticipant} run={run} />;
  }
  if (phase === "spectators") {
    return <SpectatorPhase lobby={lobby} match={match} preBet={preBet} me={me} playerId={playerId} isParticipant={isParticipant} run={run} />;
  }
  return <PreBetComplete lobby={lobby} match={match} preBet={preBet} me={me} playerId={playerId} isParticipant={isParticipant} run={run} />;
}

// ── Participant sealed boon phase ─────────────────────────────────────────────

function ParticipantPhase({ lobby, match, preBet, me, playerId, isParticipant, run }) {
  const [boonAmt, setBoonAmt] = useState(0);
  const mySubmitted = preBet.sealedBoons[playerId] === true;
  const isMyTurn = isParticipant && !mySubmitted;

  useEffect(() => {
    if (isMyTurn) { playBeep(); vibrate(); }
  }, [isMyTurn]);

  const otherParticipantId = preBet.participants.find((id) => id !== playerId);
  const otherName = playerName(lobby, otherParticipantId);
  const otherSubmitted = preBet.sealedBoons[otherParticipantId] === true;

  return (
    <div className="card card-red" style={{ borderColor: isMyTurn ? "var(--gold)" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span className="section-label" style={{ marginBottom: 0 }}>Sealed Boon Placement</span>
        <CountdownBar deadline={preBet.deadline} totalMs={preBet.turnDurationMs} />
      </div>

      <div className="vs-banner" style={{ marginBottom: 14 }}>
        <span className="vs-name" style={{ color: "var(--blue-light)" }}>{match.playerAName}</span>
        <span className="vs-sep">VS</span>
        <span className="vs-name" style={{ color: "var(--green)" }}>{match.playerBName}</span>
      </div>

      {/* Participant status indicators */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {preBet.participants.map((id) => {
          const submitted = preBet.sealedBoons[id] === true;
          const name = playerName(lobby, id);
          return (
            <div key={id} style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--r)", border: `1px solid ${submitted ? "var(--green)" : "var(--border)"}`, background: submitted ? "var(--green-dim)" : "transparent", textAlign: "center" }}>
              <div style={{ fontSize: "0.72rem", color: submitted ? "var(--green)" : "var(--text-dim)" }}>{submitted ? "✓ Sealed" : "Waiting…"}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 500, marginTop: 2 }}>{name}</div>
            </div>
          );
        })}
      </div>

      {isParticipant && !mySubmitted && (
        <div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", marginBottom: 10 }}>
            Place boons on yourself (sealed — your opponent won't see until both submit).
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number" min={0} max={me.boons} value={boonAmt}
              onChange={(e) => setBoonAmt(Number(e.target.value))}
              style={{ width: 70, display: "inline-block" }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>of {me.boons} boons</span>
            <button
              className="btn-gold"
              onClick={() => run("player:submitParticipantBoons", { matchId: match.id, amount: boonAmt })}
            >
              Seal & Submit
            </button>
          </div>
        </div>
      )}

      {isParticipant && mySubmitted && (
        <p style={{ fontSize: "0.82rem", color: "var(--green)" }}>
          ✓ Your boons are sealed. Waiting for {otherSubmitted ? "phase to complete…" : `${otherName} to submit…`}
        </p>
      )}

      {!isParticipant && (
        <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
          Both participants are placing boons on themselves in secret. Spectator turns start once both submit.
        </p>
      )}

      <TrumpCardButton match={match} me={me} playerId={playerId} run={run} />
    </div>
  );
}

// ── Spectator turn phase ──────────────────────────────────────────────────────

function SpectatorPhase({ lobby, match, preBet, me, playerId, isParticipant, run }) {
  const [boonTarget, setBoonTarget] = useState(match.playerA);
  const [boonAmount, setBoonAmount] = useState(1);
  const [betStocks, setBetStocks] = useState(lobby.settings.stockPool[0]?.stocks ?? 0);
  const [betWager, setBetWager] = useState(10);

  const currentId = preBet.spectatorOrder[preBet.currentTurnIdx];
  const isMyTurn = playerId === currentId;

  useEffect(() => {
    if (isMyTurn) { playBeep(); vibrate(); }
  }, [isMyTurn]);

  const handicap = matchHandicap(lobby, match);
  const stockBets = lobby.stockBets?.[match.id] || [];
  const existingPrediction = me.matchPredictions?.[match.id];

  return (
    <div className="card card-red">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="section-label" style={{ marginBottom: 0 }}>Spectator Betting — Turn {preBet.currentTurnIdx + 1} of {preBet.spectatorOrder.length}</span>
      </div>

      <div className="vs-banner" style={{ marginBottom: 12 }}>
        <span className="vs-name" style={{ color: "var(--blue-light)" }}>{match.playerAName}</span>
        <span className="vs-sep">VS</span>
        <span className="vs-name" style={{ color: "var(--green)" }}>{match.playerBName}</span>
      </div>

      {handicap.percent > 0 && (
        <p style={{ marginBottom: 10, fontSize: "0.82rem" }}>
          Boon handicap: <span style={{ color: "var(--red)" }}>
            {lobby.players.find((p) => p.id === handicap.handicappedPlayerId)?.name} +{handicap.percent}% dmg
          </span>
        </p>
      )}

      {/* Turn queue */}
      <div style={{ marginBottom: 14 }}>
        {preBet.spectatorOrder.map((id, idx) => {
          const done = idx < preBet.currentTurnIdx;
          const active = idx === preBet.currentTurnIdx;
          const name = playerName(lobby, id);
          const actions = preBet.turnActions?.[id];
          return (
            <div key={id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4,
              borderRadius: "var(--r)",
              background: active ? "rgba(212,168,50,0.08)" : "transparent",
              border: `1px solid ${active ? "var(--border-gold)" : done ? "var(--border)" : "var(--border)"}`,
              opacity: done ? 0.6 : 1,
            }}>
              <span style={{ fontSize: "0.72rem", color: active ? "var(--gold)" : done ? "var(--green)" : "var(--text-dim)", width: 18, textAlign: "center", flexShrink: 0 }}>
                {done ? "✓" : active ? "▶" : idx + 1}
              </span>
              <span style={{ flex: 1, fontSize: "0.85rem", color: active ? "var(--text)" : "var(--text-mid)", fontWeight: active ? 600 : 400 }}>
                {name} {id === playerId ? "(you)" : ""}
              </span>
              {active && <CountdownBar deadline={preBet.deadline} totalMs={preBet.turnDurationMs} />}
              {done && actions && (
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {Object.entries(actions.boons || {}).map(([tid, n]) => `${n} boon${n > 1 ? "s" : ""} on ${playerName(lobby, tid)}`).join(", ")}
                  {actions.bet ? ` · bet ${actions.bet.wager} on ${actions.bet.stocks} stock(s)` : ""}
                  {actions.rideDouble ? ` · rode double on ${actions.rideDouble.stocks} stock(s)` : ""}
                  {!Object.keys(actions.boons || {}).length && !actions.bet && !actions.rideDouble ? "passed" : ""}
                </span>
              )}
              {done && !actions && <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>passed</span>}
            </div>
          );
        })}
      </div>

      {/* Active spectator's action form */}
      {isMyTurn && !isParticipant && (
        <div style={{ borderTop: "1px solid var(--border-gold)", paddingTop: 14 }}>
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
            <span className="field-label">Place Boon(s) on</span>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={boonTarget} onChange={(e) => setBoonTarget(e.target.value)} style={{ flex: 1 }}>
                <option value={match.playerA}>{match.playerAName}</option>
                <option value={match.playerB}>{match.playerBName}</option>
              </select>
              <input type="number" min={1} max={me.boons} value={boonAmount} onChange={(e) => setBoonAmount(e.target.value)} style={{ width: 64, display: "inline-block" }} />
              <button className="btn-blue" onClick={() => run("player:placeBoon", { matchId: match.id, targetParticipantId: boonTarget, amount: boonAmount })}>Place</button>
            </div>
          </div>

          {me.eliminated && (
            <div className="field">
              <span className="field-label">Stock Bet</span>
              <p style={{ marginBottom: 8, fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Open: {lobby.settings.stockPool.filter((s) => !stockBets.some((b) => b.stocks === s.stocks)).map((s) => `${s.stocks} stock(s) ×${s.multiplier}`).join(", ") || "none"}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={betStocks} onChange={(e) => setBetStocks(Number(e.target.value))} style={{ flex: 1 }}>
                  {lobby.settings.stockPool.map((s) => (
                    <option key={s.stocks} value={s.stocks} disabled={stockBets.some((b) => b.stocks === s.stocks)}>
                      {s.stocks} stock(s) — ×{s.multiplier}
                    </option>
                  ))}
                </select>
                <input type="number" min={1} max={me.chips} value={betWager} onChange={(e) => setBetWager(e.target.value)} style={{ width: 70, display: "inline-block" }} />
                <button className="btn-blue" onClick={() => run("player:placeStockBet", { matchId: match.id, stocks: betStocks, wager: betWager })}>Bet</button>
              </div>

              {me.chips === 0 && stockBets.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span className="field-label" style={{ display: "block", marginBottom: 6 }}>Ride Double</span>
                  {stockBets.map((b) => (
                    <button key={b.stocks} className="btn-ghost" style={{ marginRight: 8, marginBottom: 6 }}
                      onClick={() => run("player:rideDouble", { matchId: match.id, stocks: b.stocks })}>
                      {playerName(lobby, b.playerId)}'s bet · {b.stocks} stock(s)
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button className="btn-gold" style={{ marginTop: 8 }} onClick={() => run("player:spectatorDone", { matchId: match.id })}>
            Done — Pass Turn
          </button>
        </div>
      )}

      {!isMyTurn && !isParticipant && (
        <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          {preBet.currentTurnIdx < preBet.spectatorOrder.indexOf(playerId)
            ? "Your turn is coming up."
            : preBet.spectatorOrder.indexOf(playerId) === -1
            ? "You are a participant — watching spectator turns."
            : "Your turn has passed."}
        </p>
      )}

      {isParticipant && (
        <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          Spectators are placing boons and bets. Get ready to play!
        </p>
      )}

      <TrumpCardButton match={match} me={me} playerId={playerId} run={run} />
    </div>
  );
}

// ── Pre-bet complete view ─────────────────────────────────────────────────────

function PreBetComplete({ lobby, match, preBet, me, playerId, isParticipant, run }) {
  const handicap = matchHandicap(lobby, match);
  const existingPrediction = me.matchPredictions?.[match.id];

  return (
    <div className="card card-red">
      <span className="section-label">Ready to Start</span>

      <div className="vs-banner" style={{ marginBottom: 12 }}>
        <span className="vs-name" style={{ color: "var(--blue-light)" }}>{match.playerAName}</span>
        <span className="vs-sep">VS</span>
        <span className="vs-name" style={{ color: "var(--green)" }}>{match.playerBName}</span>
      </div>

      <p style={{ marginBottom: 8 }}>
        Boons — {match.playerAName}:{" "}
        {Array.from({ length: handicap.aBoons }).map((_, i) => <span key={i} className="boon-pip" />)}
        {handicap.aBoons === 0 && "none"}
        {"  ·  "}
        {match.playerBName}:{" "}
        {Array.from({ length: handicap.bBoons }).map((_, i) => <span key={i} className="boon-pip" />)}
        {handicap.bBoons === 0 && "none"}
        {handicap.percent > 0 && (
          <span style={{ color: "var(--red)", marginLeft: 8 }}>
            {lobby.players.find((p) => p.id === handicap.handicappedPlayerId)?.name} +{handicap.percent}% dmg
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

      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginTop: 10 }}>
        Betting is closed. Waiting for the host to start the match.
      </p>

      <TrumpCardButton match={match} me={me} playerId={playerId} run={run} />
    </div>
  );
}

// ── Trump Card (always available during ready phase) ─────────────────────────

function TrumpCardButton({ match, me, playerId, run }) {
  if (!me.hasTrumpCard) return null;
  const isParticipant = match.playerA === playerId || match.playerB === playerId;
  if (isParticipant) return null;
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-gold)" }}>
      <span className="field-label" style={{ display: "block", marginBottom: 8 }}>🃏 Play Trump Card — clear all boons on:</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-gold" onClick={() => run("player:playTrumpCard", { matchId: match.id, targetParticipantId: match.playerA })}>{match.playerAName}</button>
        <button className="btn-gold" onClick={() => run("player:playTrumpCard", { matchId: match.id, targetParticipantId: match.playerB })}>{match.playerBName}</button>
      </div>
    </div>
  );
}
