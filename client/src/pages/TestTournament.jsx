/**
 * Tournament Simulator — /test
 * Walk through a full 12-player mock tournament end-to-end using the REAL
 * production UI (RoundActions, Bracket, reward popups, header pills) driven by
 * a local mock game engine instead of a server. Use the "View as" selector to
 * see every player's perspective (participant, spectator on/off turn,
 * eliminated with/without chips), and the quick-action dock to fast-forward
 * or the real popup controls to interact exactly as a live player would.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createMockLobby } from "../lib/mockEngine/mockLobbyFactory.js";
import { createMockDispatcher } from "../lib/mockEngine/mockDispatcher.js";
import { setEmitAckOverride, clearEmitAckOverride, emitAck } from "../lib/socket.js";
import { setTexasTPick, sanitizeLobby } from "../lib/mockEngine/gameEngine.js";
import ChipIcon from "../components/ChipIcon.jsx";
import BoonIcon from "../components/BoonIcon.jsx";
import PotIcon from "../components/PotIcon.jsx";
import BoonDrawer from "../components/BoonDrawer.jsx";
import TrumpIcon from "../components/TrumpIcon.jsx";
import TrumpCardDrawer from "../components/TrumpCardDrawer.jsx";
import { RewardPopup } from "../components/RewardPopups.jsx";
import RoundActions from "./RoundActions.jsx";
import BracketPanel from "../components/BracketPanel.jsx";
import Scoreboard from "./Scoreboard.jsx";

const PLAYER_NAMES = [
  "Alice", "Bob", "Carol", "Dave", "Erin", "Frank",
  "Grace", "Heidi", "Ivan", "Judy", "Mallory", "Niaj",
];

function randomizeTPicks(lobby) {
  for (const p of lobby.players) {
    const others = lobby.players.filter((o) => o.id !== p.id);
    const pick = others[Math.floor(Math.random() * others.length)];
    setTexasTPick(lobby, p.id, pick.id);
  }
}

function buildFreshLobby() {
  const lobby = createMockLobby(PLAYER_NAMES);
  randomizeTPicks(lobby);
  return lobby;
}

function findActiveMatch(bracket) {
  if (!bracket) return null;
  return bracket.rounds.flat().find((m) => m.status === "ready" || m.status === "in_progress") || null;
}

export default function TestTournament() {
  const lobbyRef = useRef(buildFreshLobby());
  const dispatcherRef = useRef(null);
  const prevStatsRef = useRef({}); // playerId -> { chips }
  const viewAsIdRef = useRef(lobbyRef.current.hostPlayerId);

  const [, setTick] = useState(0);
  const [viewAsId, setViewAsId] = useState(lobbyRef.current.hostPlayerId);
  const [boonDrawerOpen, setBoonDrawerOpen] = useState(false);
  const [trumpDrawerOpen, setTrumpDrawerOpen] = useState(false);
  const [log, setLog] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [stocksInput, setStocksInput] = useState(2);
  const rewardIdRef = useRef(0);

  useEffect(() => { viewAsIdRef.current = viewAsId; }, [viewAsId]);

  function diffRewardsForViewedPlayer() {
    const me = lobbyRef.current.players.find((p) => p.id === viewAsIdRef.current);
    if (!me) return;
    const prev = prevStatsRef.current[me.id];
    if (prev) {
      const chipsGained = me.chips - prev.chips;
      if (chipsGained > 0) {
        setRewards((r) => [...r, { id: ++rewardIdRef.current, kind: "chips", amount: chipsGained }]);
      }
    }
    prevStatsRef.current[me.id] = { chips: me.chips };
  }

  function handleChange(event, result) {
    if (event) {
      setLog((l) => [{ id: ++rewardIdRef.current, event, ok: result?.ok, error: result?.error, ts: Date.now() }, ...l].slice(0, 14));
    }
    diffRewardsForViewedPlayer();
    setTick((t) => t + 1);
  }

  useEffect(() => {
    const dispatcher = createMockDispatcher({ getLobby: () => lobbyRef.current, onChange: handleChange });
    dispatcherRef.current = dispatcher;
    setEmitAckOverride(dispatcher.emitAck);
    // Seed the reward-diff baseline so mounting doesn't itself pop a "reward".
    for (const p of lobbyRef.current.players) prevStatsRef.current[p.id] = { chips: p.chips };
    return () => {
      dispatcher.dispose();
      clearEmitAckOverride();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetSimulation() {
    dispatcherRef.current?.dispose();
    lobbyRef.current = buildFreshLobby();
    prevStatsRef.current = {};
    for (const p of lobbyRef.current.players) prevStatsRef.current[p.id] = { chips: p.chips };
    setRewards([]);
    setLog([]);
    setViewAsId(lobbyRef.current.hostPlayerId);
    const dispatcher = createMockDispatcher({ getLobby: () => lobbyRef.current, onChange: handleChange });
    dispatcherRef.current = dispatcher;
    setEmitAckOverride(dispatcher.emitAck);
    setTick((t) => t + 1);
  }

  function rerollTPicks() {
    randomizeTPicks(lobbyRef.current);
    setTick((t) => t + 1);
  }

  // For debug tools that mutate a player directly (not through the dispatcher):
  // re-seed that player's reward-diff baseline so a later real gain doesn't produce
  // an inflated popup, then re-render.
  function resyncAndRerender(playerId) {
    const p = lobbyRef.current.players.find((pl) => pl.id === playerId);
    if (p) prevStatsRef.current[p.id] = { chips: p.chips };
    setTick((t) => t + 1);
  }

  const lobby = sanitizeLobby(lobbyRef.current);
  const me = lobby.players.find((p) => p.id === viewAsId) || lobby.players[0];
  const hostId = lobby.hostPlayerId;

  const hasTrumpCard = !!me?.hasTrumpCard;
  const trumpMatch = lobby.bracket?.rounds.flat().find((m) => m.status === "ready") || null;
  const canPlayTrump = !!(
    hasTrumpCard && trumpMatch &&
    trumpMatch.playerA !== viewAsId && trumpMatch.playerB !== viewAsId
  );

  async function handlePlayTrumpCard(targetParticipantId) {
    const res = await emitAck("player:playTrumpCard", { code: lobby.code, playerId: viewAsId, matchId: trumpMatch.id, targetParticipantId });
    if (res.ok) setTrumpDrawerOpen(false);
    return res;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {rewards.map((r, i) => (
        <RewardPopup key={r.id} reward={r} index={i} onDone={() => setRewards((rs) => rs.filter((x) => x.id !== r.id))} />
      ))}

      {lobby.bracket && <BracketPanel bracket={lobby.bracket} highlightPlayerId={viewAsId} />}

      {/* Main game view — the real app UI, driven by the mock lobby */}
      <main style={{ flex: 1, padding: "24px 28px 24px", maxWidth: 760 }}>
        <div className="page-header" style={{ margin: "-24px -28px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <span className="wordmark">Texas SMASH'em</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <span className="page-subtitle">
                Simulator · {lobby.status === "waiting" ? "Waiting" : lobby.status === "in_progress" ? "In Progress" : "Complete"}
                {" · viewing as "}<strong>{me.name}</strong>{me.id === hostId ? " (Host)" : ""}
              </span>
            </div>
            <div className="page-header-right">
              <div className="chip-pill">
                <ChipIcon size={22} className="chip-icon" />
                <span className="chip-value">{me.chips ?? 0}</span>
              </div>
              {lobby.status === "in_progress" && (
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
              {hasTrumpCard && (
                <div
                  className="chip-pill trump-pill"
                  role="button"
                  tabIndex={canPlayTrump ? 0 : -1}
                  aria-disabled={!canPlayTrump}
                  onClick={() => canPlayTrump && setTrumpDrawerOpen((o) => !o)}
                  onKeyDown={(e) => { if (canPlayTrump && (e.key === "Enter" || e.key === " ")) setTrumpDrawerOpen((o) => !o); }}
                  style={{ cursor: canPlayTrump ? "pointer" : "not-allowed", opacity: canPlayTrump ? 1 : 0.45 }}
                  title={canPlayTrump ? "Play Trump Card" : "Trump Card can't be played while a match is in progress"}
                >
                  <TrumpIcon size={22} />
                </div>
              )}
              <Link to="/">← Back to app</Link>
            </div>
          </div>
          {lobby.status === "in_progress" && (
            <BoonDrawer
              open={boonDrawerOpen}
              cost={lobby.settings.boonCost}
              chips={me.chips ?? 0}
              onBuy={() => emitAck("player:buyBoons", { code: lobby.code, playerId: viewAsId, quantity: 1 })}
            />
          )}
          {canPlayTrump && (
            <TrumpCardDrawer
              open={trumpDrawerOpen}
              match={trumpMatch}
              onPlay={handlePlayTrumpCard}
            />
          )}
        </div>

        {lobby.status === "waiting" && (
          <WaitingRoom lobby={lobby} onStart={() => emitAck("host:start", { code: lobby.code, playerId: hostId })} />
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
              <RoundActions lobby={lobby} me={me} playerId={viewAsId} />
            )}
          </div>
        )}
      </main>

      {/* Simulator control dock */}
      <aside style={{
        width: 320, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        background: "var(--surface-2)", borderLeft: "1px solid var(--border)", padding: "20px 18px",
      }}>
        <div style={{ fontFamily: "var(--font-d)", fontSize: "0.9rem", color: "var(--gold)", letterSpacing: "0.1em", marginBottom: 14 }}>
          TOURNAMENT SIMULATOR
        </div>

        <button className="btn-ghost" style={{ width: "100%", marginBottom: 16 }} onClick={resetSimulation}>
          🔄 Reset Simulation
        </button>

        <div className="field" style={{ marginBottom: 16 }}>
          <span className="field-label">View as</span>
          <select value={viewAsId} onChange={(e) => setViewAsId(e.target.value)}>
            {lobby.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.id === hostId ? " (Host)" : ""}{p.eliminated ? " · eliminated" : ""}
              </option>
            ))}
          </select>
        </div>

        {lobby.status === "waiting" && (
          <button className="btn-ghost" style={{ width: "100%", marginBottom: 16 }} onClick={rerollTPicks}>
            🔀 Re-roll T-Picks
          </button>
        )}

        <QuickActions
          lobby={lobby}
          hostId={hostId}
          stocksInput={stocksInput}
          setStocksInput={setStocksInput}
        />

        <DebugTools lobby={lobby} me={me} onChange={() => resyncAndRerender(me.id)} />

        <div style={{ marginTop: 20 }}>
          <div className="section-label">Event Log</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
            {log.length === 0 && <p style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>No events yet.</p>}
            {log.map((entry) => (
              <div key={entry.id} style={{ fontSize: "0.7rem", padding: "5px 8px", borderRadius: "var(--r)", background: entry.ok ? "var(--green-dim)" : "var(--red-dim)", color: entry.ok ? "var(--green)" : "var(--red)" }}>
                {entry.event}
                {!entry.ok && entry.error && <div style={{ color: "var(--text-mid)", marginTop: 2 }}>{entry.error}</div>}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── Waiting room (pre-tournament) ─────────────────────────────────────────────

function WaitingRoom({ lobby, onStart }) {
  return (
    <div className="card animate-up">
      <span className="section-label">Players ({lobby.players.length})</span>
      <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: 10 }}>
        Texas T-Picks are auto-assigned by the simulator (use "Re-roll T-Picks" in the dock to reshuffle).
      </p>
      <ul className="player-list">
        {lobby.players.map((p) => (
          <li key={p.id}>
            <span style={{ flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
              picked {lobby.players.find((o) => o.id === p.texasTPick)?.name}
            </span>
            {p.isHost && <span className="player-badge badge-host">Host</span>}
          </li>
        ))}
      </ul>
      <button style={{ width: "100%", marginTop: 14 }} onClick={onStart}>
        ▶ Start Tournament
      </button>
    </div>
  );
}

// ── Quick actions — context-sensitive fast-forward controls ──────────────────

function QuickActions({ lobby, hostId, stocksInput, setStocksInput }) {
  if (lobby.status !== "in_progress") return null;
  const active = findActiveMatch(lobby.bracket);
  if (!active) return <p style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>No active match right now.</p>;

  const preBet = lobby.matchPreBet?.[active.id];

  async function submitRemainingParticipants() {
    for (const pid of preBet.participants) {
      if (!(pid in preBet.sealedBoons)) {
        await emitAck("player:submitParticipantBoons", { code: lobby.code, playerId: pid, matchId: active.id, amount: 0 });
      }
    }
  }

  async function passCurrentSpectator() {
    const currentId = preBet.spectatorOrder[preBet.currentTurnIdx];
    await emitAck("player:spectatorDone", { code: lobby.code, playerId: currentId, matchId: active.id });
  }

  async function startMatch() {
    await emitAck("host:startMatch", { code: lobby.code, playerId: hostId, matchId: active.id });
  }

  async function nextRound() {
    await emitAck("host:nextRound", { code: lobby.code, playerId: hostId });
  }

  async function reportResult(winnerId) {
    await emitAck("host:reportResult", { code: lobby.code, playerId: hostId, matchId: active.id, winnerId, remainingStocks: Number(stocksInput) });
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-label">Quick Actions</div>
      <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 8 }}>
        {active.playerAName} vs {active.playerBName} — {active.status === "ready" ? (preBet?.phase || "awaiting next round") : active.status}
      </p>

      {active.status === "ready" && !preBet && (
        <button className="btn-gold" style={{ width: "100%", marginBottom: 8 }} onClick={nextRound}>
          ▶ Next Round
        </button>
      )}

      {active.status === "ready" && preBet?.phase === "participants" && (
        <button className="btn-blue" style={{ width: "100%", marginBottom: 8 }} onClick={submitRemainingParticipants}>
          ⏩ Auto-submit remaining sealed boons (0 each)
        </button>
      )}

      {active.status === "ready" && preBet?.phase === "spectators" && (
        <button className="btn-blue" style={{ width: "100%", marginBottom: 8 }} onClick={passCurrentSpectator}>
          ⏩ Pass current spectator's turn ({lobby.players.find((p) => p.id === preBet.spectatorOrder[preBet.currentTurnIdx])?.name})
        </button>
      )}

      {active.status === "ready" && preBet?.phase === "complete" && (
        <button className="btn-gold" style={{ width: "100%", marginBottom: 8 }} onClick={startMatch}>
          ▶ Start Match
        </button>
      )}

      {active.status === "in_progress" && (
        <div>
          <div className="field" style={{ marginBottom: 8 }}>
            <span className="field-label">Winner's remaining stocks</span>
            <input type="number" min={0} value={stocksInput} onChange={(e) => setStocksInput(e.target.value)} />
          </div>
          <button className="btn-gold" style={{ width: "100%", marginBottom: 6 }} onClick={() => reportResult(active.playerA)}>
            🏆 {active.playerAName} wins
          </button>
          <button className="btn-gold" style={{ width: "100%" }} onClick={() => reportResult(active.playerB)}>
            🏆 {active.playerBName} wins
          </button>
        </div>
      )}
    </div>
  );
}

// ── Debug tools — force otherwise-rare states on demand ───────────────────────

function DebugTools({ lobby, me, onChange }) {
  if (lobby.status === "waiting") return null;

  async function runDivvyUp() {
    await emitAck("host:divvyUp", { code: lobby.code, playerId: lobby.hostPlayerId });
    onChange();
  }

  function zeroChips() {
    me.chips = 0;
    onChange();
  }

  function grantTrumpCard() {
    for (const p of lobby.players) p.hasTrumpCard = p.id === me.id;
    onChange();
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div className="section-label">Debug Tools</div>
      <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 8 }}>
        Force states that are rare to reach naturally, for the currently viewed player.
      </p>
      {lobby.status === "in_progress" && (
        <>
          <button className="btn-ghost" style={{ width: "100%", marginBottom: 6 }} onClick={zeroChips}>
            💸 Zero {me.name}'s chips (test Ride Double)
          </button>
          <button className="btn-ghost" style={{ width: "100%", marginBottom: 6 }} onClick={grantTrumpCard}>
            🃏 Give {me.name} the Trump Card
          </button>
        </>
      )}
      {lobby.status === "complete" && (
        <button className="btn-ghost" style={{ width: "100%" }} onClick={runDivvyUp}>
          💰 Run Divvy Up
        </button>
      )}
    </div>
  );
}
