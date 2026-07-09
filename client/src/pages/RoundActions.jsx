import React, { useState, useEffect, useCallback } from "react";
import { emitAck } from "../lib/socket.js";
import { matchHandicap } from "../lib/economy.js";
import TrumpIcon from "../components/TrumpIcon.jsx";
import stockBetImg from "../assets/icons/stockbet.png";

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

// ── Prominent countdown shown at top of modal ────────────────────────────────

function ModalTimer({ deadline, totalMs }) {
  const msLeft = useCountdown(deadline);
  const pct = totalMs > 0 ? (msLeft / totalMs) * 100 : 0;
  const secs = Math.ceil(msLeft / 1000);
  const color = pct > 50 ? "var(--green)" : pct > 25 ? "var(--gold)" : "var(--red)";
  return (
    <div className="modal-timer">
      <div className="modal-timer-digits" style={{ color }}>{secs}</div>
      <div className="modal-timer-label">seconds remaining</div>
      <div className="modal-timer-bar">
        <div className="modal-timer-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Boon +/− stepper row ─────────────────────────────────────────────────────

function BoonStepper({ label, value, onDec, onInc, canDec, canInc }) {
  return (
    <div className="boon-stepper-row">
      <span className="boon-stepper-label">{label}</span>
      <div className="boon-stepper-controls">
        <button className="boon-stepper-btn" onClick={onDec} disabled={!canDec}>−</button>
        <span className="boon-stepper-value">{value}</span>
        <button className="boon-stepper-btn" onClick={onInc} disabled={!canInc}>+</button>
      </div>
    </div>
  );
}

// ── VS header with live boon counts ─────────────────────────────────────────

function ModalVsRow({ match, lobby, pendingA = 0, pendingB = 0 }) {
  const handicap = matchHandicap(lobby, match);
  const totalA = handicap.aBoons + pendingA;
  const totalB = handicap.bBoons + pendingB;

  return (
    <>
      <div className="modal-vs-row">
        <div className="modal-player-card side-a">
          <div className="modal-player-name" style={{ color: "var(--blue-light)" }}>
            {match.playerAName}
          </div>
          <div className="modal-player-boons">
            {totalA > 0
              ? Array.from({ length: Math.min(totalA, 12) }).map((_, i) => (
                  <span
                    key={i}
                    className={`boon-pip${i >= handicap.aBoons ? " pending" : ""}`}
                  />
                ))
              : <span className="boon-count">none</span>}
          </div>
          {pendingA > 0 && (
            <div style={{ fontSize: "0.68rem", color: "var(--gold)", marginTop: 4 }}>+{pendingA} pending</div>
          )}
        </div>

        <span className="vs-sep" style={{ fontSize: "0.9rem" }}>VS</span>

        <div className="modal-player-card side-b">
          <div className="modal-player-name" style={{ color: "var(--green)" }}>
            {match.playerBName}
          </div>
          <div className="modal-player-boons">
            {totalB > 0
              ? Array.from({ length: Math.min(totalB, 12) }).map((_, i) => (
                  <span
                    key={i}
                    className={`boon-pip${i >= handicap.bBoons ? " pending" : ""}`}
                  />
                ))
              : <span className="boon-count">none</span>}
          </div>
          {pendingB > 0 && (
            <div style={{ fontSize: "0.68rem", color: "var(--gold)", marginTop: 4 }}>+{pendingB} pending</div>
          )}
        </div>
      </div>

      {handicap.percent > 0 && (
        <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--red)", marginBottom: 14 }}>
          ⚠ {lobby.players.find((p) => p.id === handicap.handicappedPlayerId)?.name} +{handicap.percent}% damage handicap
        </div>
      )}
    </>
  );
}

// ── Betting modal shell ──────────────────────────────────────────────────────

function BettingModal({ open, deadline, totalMs, children }) {
  if (!open) return null;
  return (
    <div className="betting-overlay">
      <div className="betting-modal">
        <ModalTimer deadline={deadline} totalMs={totalMs} />
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Section divider label ────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <div className="modal-section-label">{children}</div>;
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function RoundActions({ lobby, me, playerId }) {
  const [error, setError] = useState("");

  if (!lobby.bracket || !me) return null;

  const allActiveMatches = lobby.bracket.rounds
    .flat()
    .filter((m) => m.status === "ready" || m.status === "in_progress");

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

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
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
          Handicap:{" "}
          <span style={{ color: "var(--red)" }}>
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

// ── Pre-bet phase router ──────────────────────────────────────────────────────

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
  const [pendingSelf, setPendingSelf] = useState(0);
  const mySubmitted = preBet.sealedBoons[playerId] === true;
  const isMyTurn = isParticipant && !mySubmitted;
  const otherParticipantId = preBet.participants.find((id) => id !== playerId);
  const otherSubmitted = preBet.sealedBoons[otherParticipantId] === true;

  useEffect(() => {
    if (isMyTurn) { playBeep(); vibrate(); }
  }, [isMyTurn]);

  const boonsAvailable = me.boons - pendingSelf;

  function handleSubmit() {
    run("player:submitParticipantBoons", { matchId: match.id, amount: pendingSelf });
  }

  return (
    <>
      {/* Ambient card (always visible) */}
      <div className="card card-red" style={{ borderColor: isMyTurn ? "var(--border-gold)" : undefined }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <span className="section-label" style={{ marginBottom: 0 }}>Sealed Boon Placement</span>
        </div>

        <div className="vs-banner" style={{ marginBottom: 14 }}>
          <span className="vs-name" style={{ color: "var(--blue-light)" }}>{match.playerAName}</span>
          <span className="vs-sep">VS</span>
          <span className="vs-name" style={{ color: "var(--green)" }}>{match.playerBName}</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {preBet.participants.map((id) => {
            const submitted = preBet.sealedBoons[id] === true;
            return (
              <div key={id} style={{
                flex: 1, padding: "8px 12px", borderRadius: "var(--r)",
                border: `1px solid ${submitted ? "var(--green)" : "var(--border)"}`,
                background: submitted ? "var(--green-dim)" : "transparent",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "0.72rem", color: submitted ? "var(--green)" : "var(--text-dim)" }}>
                  {submitted ? "✓ Sealed" : "Waiting…"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 500, marginTop: 2 }}>
                  {playerName(lobby, id)}
                </div>
              </div>
            );
          })}
        </div>

        {isParticipant && mySubmitted && (
          <p style={{ fontSize: "0.82rem", color: "var(--green)" }}>
            ✓ Your boons are sealed. Waiting for {otherSubmitted ? "phase to complete…" : `${playerName(lobby, otherParticipantId)} to submit…`}
          </p>
        )}
        {!isParticipant && (
          <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
            Participants are placing boons on themselves in secret. Your turn starts once both submit.
          </p>
        )}

        <TrumpCardButton match={match} me={me} playerId={playerId} run={run} />
      </div>

      {/* Modal — only when it's this participant's turn */}
      <BettingModal open={isMyTurn} deadline={preBet.deadline} totalMs={preBet.turnDurationMs}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ textAlign: "center", fontSize: "0.72rem", letterSpacing: "0.14em", color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", marginBottom: 14 }}>
            Seal Your Boons
          </div>

          <ModalVsRow match={match} lobby={lobby}
            pendingA={match.playerA === playerId ? pendingSelf : 0}
            pendingB={match.playerB === playerId ? pendingSelf : 0}
          />
        </div>

        <div className="modal-section">
          <SectionLabel>Boons to place on yourself</SectionLabel>
          <BoonStepper
            label={`${me.name ?? "You"} (you)`}
            value={pendingSelf}
            onDec={() => setPendingSelf((v) => Math.max(0, v - 1))}
            onInc={() => setPendingSelf((v) => Math.min(me.boons, v + 1))}
            canDec={pendingSelf > 0}
            canInc={pendingSelf < me.boons}
          />
          <div className="modal-remaining">
            {me.boons} boon{me.boons !== 1 ? "s" : ""} available · {boonsAvailable} remaining after placement
          </div>
        </div>

        <div className="modal-section" style={{ marginBottom: 0 }}>
          <button
            className="btn-gold"
            style={{ width: "100%", padding: "14px", fontSize: "0.95rem", letterSpacing: "0.08em" }}
            onClick={handleSubmit}
          >
            🔒 Seal &amp; Submit
          </button>
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 10, marginBottom: 0 }}>
            Your choice is hidden from your opponent until both submit.
          </p>
        </div>
      </BettingModal>
    </>
  );
}

// ── Spectator turn phase ──────────────────────────────────────────────────────

function SpectatorPhase({ lobby, match, preBet, me, playerId, isParticipant, run }) {
  const [boonsA, setBoonsA] = useState(0);
  const [boonsB, setBoonsB] = useState(0);
  const [prediction, setPrediction] = useState(me.matchPredictions?.[match.id] || "");
  const [selectedStock, setSelectedStock] = useState(null); // 1/2/3, or null = no bet
  const [betWager, setBetWager] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const currentId = preBet.spectatorOrder[preBet.currentTurnIdx];
  const isMyTurn = playerId === currentId;
  const totalPending = boonsA + boonsB;
  const boonsRemaining = me.boons - totalPending;
  const stockBets = lobby.stockBets?.[match.id] || [];
  const alreadyBet = stockBets.some((b) => b.playerId === playerId);
  const canBetStocks = me.eliminated && me.chips > 0 && !alreadyBet;
  const canRideDouble = me.eliminated && me.chips === 0;

  useEffect(() => {
    if (isMyTurn) { playBeep(); vibrate(); }
  }, [isMyTurn]);

  async function handleDone() {
    if (submitting) return;
    setSubmitting(true);
    setModalError("");
    // Commit everything in order, then pass the turn. Prediction must land before the
    // Stock Bet, since a bet is only valid once a match winner has been predicted.
    try {
      if (boonsA > 0) {
        const r = await emitAck("player:placeBoon", { code: lobby.code, playerId, matchId: match.id, targetParticipantId: match.playerA, amount: boonsA });
        if (!r.ok) throw new Error(r.error);
      }
      if (boonsB > 0) {
        const r = await emitAck("player:placeBoon", { code: lobby.code, playerId, matchId: match.id, targetParticipantId: match.playerB, amount: boonsB });
        if (!r.ok) throw new Error(r.error);
      }
      if (prediction) {
        const r = await emitAck("player:setMatchPrediction", { code: lobby.code, playerId, matchId: match.id, predictedWinnerId: prediction });
        if (!r.ok) throw new Error(r.error);
      }
      if (canBetStocks && prediction && selectedStock != null) {
        const r = await emitAck("player:placeStockBet", { code: lobby.code, playerId, matchId: match.id, stocks: selectedStock, wager: Number(betWager) });
        if (!r.ok) throw new Error(r.error);
      }
    } catch (e) {
      setModalError(e.message);
      setSubmitting(false);
      return; // leave the modal open so they can fix it before their turn ends
    }
    await emitAck("player:spectatorDone", { code: lobby.code, playerId, matchId: match.id });
    setSubmitting(false);
  }

  return (
    <>
      {/* Ambient turn-queue card */}
      <div className="card card-red">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <span className="section-label" style={{ marginBottom: 0 }}>
            Spectator Betting — Turn {preBet.currentTurnIdx + 1} of {preBet.spectatorOrder.length}
          </span>
        </div>

        <div className="vs-banner" style={{ marginBottom: 12 }}>
          <span className="vs-name" style={{ color: "var(--blue-light)" }}>{match.playerAName}</span>
          <span className="vs-sep">VS</span>
          <span className="vs-name" style={{ color: "var(--green)" }}>{match.playerBName}</span>
        </div>

        {/* Turn queue */}
        <div style={{ marginBottom: 12 }}>
          {preBet.spectatorOrder.map((id, idx) => {
            const done = idx < preBet.currentTurnIdx;
            const active = idx === preBet.currentTurnIdx;
            const actions = preBet.turnActions?.[id];
            return (
              <div key={id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4,
                borderRadius: "var(--r)",
                background: active ? "rgba(212,168,50,0.08)" : "transparent",
                border: `1px solid ${active ? "var(--border-gold)" : "var(--border)"}`,
                opacity: done ? 0.6 : 1,
              }}>
                <span style={{ fontSize: "0.72rem", color: active ? "var(--gold)" : done ? "var(--green)" : "var(--text-dim)", width: 18, textAlign: "center", flexShrink: 0 }}>
                  {done ? "✓" : active ? "▶" : idx + 1}
                </span>
                <span style={{ flex: 1, fontSize: "0.85rem", color: active ? "var(--text)" : "var(--text-mid)", fontWeight: active ? 600 : 400 }}>
                  {playerName(lobby, id)}{id === playerId ? " (you)" : ""}
                </span>
                {active && (
                  <span style={{ fontSize: "0.72rem", color: "var(--gold)" }}>
                    {isMyTurn ? "Your turn" : "Active"}
                  </span>
                )}
                {done && actions && (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    {[
                      ...Object.entries(actions.boons || {}).map(([tid, n]) => `${n}b → ${playerName(lobby, tid)}`),
                      actions.bet ? `bet ${actions.bet.wager}` : null,
                      actions.rideDouble ? `rode double` : null,
                    ].filter(Boolean).join(" · ") || "passed"}
                  </span>
                )}
                {done && !actions && <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>passed</span>}
              </div>
            );
          })}
        </div>

        {!isMyTurn && !isParticipant && (
          <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: 12, marginBottom: 0 }}>
            {preBet.spectatorOrder.indexOf(playerId) > preBet.currentTurnIdx
              ? "Your turn is coming up — get ready!"
              : "Your turn has passed."}
          </p>
        )}
        {isParticipant && (
          <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: 12, marginBottom: 0 }}>
            Spectators are placing boons and bets. Get ready to play!
          </p>
        )}

        <TrumpCardButton match={match} me={me} playerId={playerId} run={(e, p) => emitAck(e, { code: lobby.code, playerId, ...p })} />
      </div>

      {/* Betting modal — only when it's this spectator's turn */}
      <BettingModal open={isMyTurn && !isParticipant} deadline={preBet.deadline} totalMs={preBet.turnDurationMs}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ textAlign: "center", fontSize: "0.72rem", letterSpacing: "0.14em", color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", marginBottom: 14 }}>
            Your Turn to Bet
          </div>
          <ModalVsRow match={match} lobby={lobby} pendingA={boonsA} pendingB={boonsB} />
        </div>

        {/* Boon placement */}
        <div className="modal-section">
          <SectionLabel>Place Boons</SectionLabel>
          <BoonStepper
            label={match.playerAName}
            value={boonsA}
            onDec={() => setBoonsA((v) => Math.max(0, v - 1))}
            onInc={() => setBoonsA((v) => v + 1)}
            canDec={boonsA > 0}
            canInc={boonsRemaining > 0}
          />
          <BoonStepper
            label={match.playerBName}
            value={boonsB}
            onDec={() => setBoonsB((v) => Math.max(0, v - 1))}
            onInc={() => setBoonsB((v) => v + 1)}
            canDec={boonsB > 0}
            canInc={boonsRemaining > 0}
          />
          <div className="modal-remaining">
            {me.boons} boon{me.boons !== 1 ? "s" : ""} available · {boonsRemaining} remaining
          </div>
        </div>

        {/* Match prediction */}
        <div className="modal-section">
          <SectionLabel>Match Prediction</SectionLabel>
          <div className="prediction-toggle">
            <button
              className={`prediction-btn${prediction === match.playerA ? " selected-a" : ""}`}
              onClick={() => setPrediction(prediction === match.playerA ? "" : match.playerA)}
            >
              {match.playerAName}
            </button>
            <button
              className={`prediction-btn${prediction === match.playerB ? " selected-b" : ""}`}
              onClick={() => setPrediction(prediction === match.playerB ? "" : match.playerB)}
            >
              {match.playerBName}
            </button>
          </div>
        </div>

        {/* Stock bet — eliminated players with chips, shown once they've picked a winner */}
        {canBetStocks && prediction && (
          <div className="modal-section">
            <SectionLabel>Stock Bet</SectionLabel>
            <img
              src={stockBetImg}
              alt="Stock Bet"
              style={{ display: "block", width: "60%", maxWidth: 220, height: "auto", margin: "0 auto 10px", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
              draggable={false}
            />
            <div className="stock-bet-toggle">
              {lobby.settings.stockPool.map((s) => {
                const taken = stockBets.some((b) => b.stocks === s.stocks);
                const selected = selectedStock === s.stocks;
                return (
                  <button
                    key={s.stocks}
                    className={`stock-bet-btn${selected ? " selected" : ""}`}
                    disabled={taken && !selected}
                    onClick={() => setSelectedStock(selected ? null : s.stocks)}
                  >
                    <span className="stock-bet-num">{s.stocks}</span>
                    <span className="stock-bet-mult">×{s.multiplier}</span>
                    {taken && <span className="stock-bet-taken">taken</span>}
                  </button>
                );
              })}
            </div>
            {selectedStock != null && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-mid)" }}>Wager</span>
                <input
                  type="number" min={1} max={me.chips} value={betWager}
                  onChange={(e) => setBetWager(e.target.value)}
                  style={{ width: 80, display: "inline-block" }}
                />
                <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                  of {me.chips} chips → win {Number(betWager) * (lobby.settings.stockPool.find((s) => s.stocks === selectedStock)?.multiplier ?? 1)}
                </span>
              </div>
            )}
            <div className="modal-remaining" style={{ marginTop: 8 }}>
              Pays only if {playerName(lobby, prediction)} wins with exactly that many stocks.
            </div>
          </div>
        )}

        {/* Ride Double — only when the eliminated player has no chips left */}
        {canRideDouble && stockBets.length > 0 && (
          <div className="modal-section">
            <SectionLabel>Ride Double</SectionLabel>
            <p style={{ fontSize: "0.76rem", color: "var(--text-mid)", margin: "0 0 8px" }}>
              You're out of chips — piggyback on another player's Stock Bet to split the winnings.
            </p>
            {stockBets.map((b) => (
              <button
                key={b.stocks}
                className="btn-ghost"
                style={{ width: "100%", marginBottom: 6 }}
                disabled={b.riders?.length >= 1 || b.playerId === playerId}
                onClick={() => emitAck("player:rideDouble", { code: lobby.code, playerId, matchId: match.id, stocks: b.stocks })}
              >
                Ride {playerName(lobby, b.playerId)}'s bet · {playerName(lobby, b.predictedWinnerId)} with {b.stocks} stock{b.stocks !== 1 ? "s" : ""}
                {b.riders?.length >= 1 ? " (full)" : ""}
              </button>
            ))}
          </div>
        )}

        {canRideDouble && stockBets.length === 0 && (
          <div className="modal-section">
            <SectionLabel>Ride Double</SectionLabel>
            <p style={{ fontSize: "0.76rem", color: "var(--text-dim)", margin: 0 }}>
              No Stock Bets to ride yet. If someone bets later this round, you can hop on.
            </p>
          </div>
        )}

        {modalError && (
          <p className="error" style={{ marginTop: 4 }}>{modalError}</p>
        )}

        {/* Done button */}
        <div className="modal-section" style={{ marginBottom: 0 }}>
          <button
            className="btn-gold"
            style={{ width: "100%", padding: "14px", fontSize: "0.95rem", letterSpacing: "0.08em" }}
            onClick={handleDone}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "✓ Done — Pass Turn"}
          </button>
        </div>
      </BettingModal>
    </>
  );
}

// ── Pre-bet complete view ─────────────────────────────────────────────────────

function PreBetComplete({ lobby, match, preBet, me, playerId, isParticipant, run }) {
  const handicap = matchHandicap(lobby, match);

  return (
    <div className="card card-red">
      <span className="section-label">Ready to Start</span>

      <div className="vs-banner" style={{ marginBottom: 14 }}>
        <span className="vs-name" style={{ color: "var(--blue-light)" }}>{match.playerAName}</span>
        <span className="vs-sep">VS</span>
        <span className="vs-name" style={{ color: "var(--green)" }}>{match.playerBName}</span>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {[
          { name: match.playerAName, count: handicap.aBoons, color: "var(--blue-light)" },
          { name: match.playerBName, count: handicap.bBoons, color: "var(--green)" },
        ].map(({ name, count, color }) => (
          <div key={name} style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: "0.72rem", color, fontWeight: 700, marginBottom: 5 }}>{name}</div>
            <div className="modal-player-boons">
              {count > 0
                ? Array.from({ length: count }).map((_, i) => <span key={i} className="boon-pip" />)
                : <span className="boon-count" style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>no boons</span>}
            </div>
          </div>
        ))}
      </div>

      {handicap.percent > 0 && (
        <p style={{ fontSize: "0.82rem", color: "var(--red)", marginBottom: 10 }}>
          ⚠ {lobby.players.find((p) => p.id === handicap.handicappedPlayerId)?.name} +{handicap.percent}% damage handicap
        </p>
      )}

      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginTop: 10 }}>
        Betting is closed. Waiting for the host to start the match.
      </p>

      <TrumpCardButton match={match} me={me} playerId={playerId} run={run} />
    </div>
  );
}

// ── Trump Card ────────────────────────────────────────────────────────────────

function TrumpCardButton({ match, me, playerId, run }) {
  if (!me.hasTrumpCard) return null;
  const isParticipant = match.playerA === playerId || match.playerB === playerId;
  if (isParticipant) return null;
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-gold)" }}>
      <span className="field-label" style={{ display: "block", marginBottom: 8 }}><TrumpIcon size={16} style={{ marginRight: 6 }} />Play Trump Card — clear all boons on:</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-gold" onClick={() => run("player:playTrumpCard", { matchId: match.id, targetParticipantId: match.playerA })}>{match.playerAName}</button>
        <button className="btn-gold" onClick={() => run("player:playTrumpCard", { matchId: match.id, targetParticipantId: match.playerB })}>{match.playerBName}</button>
      </div>
    </div>
  );
}
