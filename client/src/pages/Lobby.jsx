import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLobby } from "../lib/LobbyContext.jsx";
import { emitAck } from "../lib/socket.js";
import BracketPanel from "../components/BracketPanel.jsx";
import AdminPanel from "../components/AdminPanel.jsx";
import ChipIcon from "../components/ChipIcon.jsx";
import BoonIcon from "../components/BoonIcon.jsx";
import PotIcon from "../components/PotIcon.jsx";
import BoonDrawer from "../components/BoonDrawer.jsx";
import TrumpIcon from "../components/TrumpIcon.jsx";
import TrumpCardDrawer from "../components/TrumpCardDrawer.jsx";
import TPickIcon from "../components/TPickIcon.jsx";
import QRCode from "../components/QRCode.jsx";
import JoinLobbyModal from "../components/JoinLobbyModal.jsx";
import LobbyNotJoinable from "../components/LobbyNotJoinable.jsx";
import ExitIcon from "../components/ExitIcon.jsx";
import ExitConfirmModal from "../components/ExitConfirmModal.jsx";
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
    <div className={`card card-blue ${me.texasTPick ? "" : "card-blink"}`} style={{ marginTop: 14, textAlign: "center" }}>
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
  const { lobby, me, playerId, isHost, leaveSession, joinLobby, rejoinAttempted, error } = useLobby();
  const navigate = useNavigate();
  const [boonDrawerOpen, setBoonDrawerOpen] = useState(false);
  const [trumpDrawerOpen, setTrumpDrawerOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [joinability, setJoinability] = useState(null); // null = checking, else { joinable, reason }

  async function handleJoinAsNewPlayer(name) {
    return joinLobby(code, name);
  }

  useEffect(() => {
    if (lobby || !rejoinAttempted) return;
    let cancelled = false;
    emitAck("lobby:checkJoinable", { code }).then((res) => {
      if (!cancelled) setJoinability(res);
    });
    return () => { cancelled = true; };
  }, [lobby, rejoinAttempted, code]);

  if (!rejoinAttempted || (!lobby && !joinability)) {
    return (
      <div className="page">
        <p>Loading lobby…</p>
      </div>
    );
  }

  if (!lobby) {
    if (!joinability.joinable) {
      return <LobbyNotJoinable reason={joinability.reason} />;
    }
    // Lobby is joinable but this browser has no active session for it —
    // most likely someone scanned the host's QR code or opened a shared
    // link directly, so they haven't had a chance to give their name yet.
    return <JoinLobbyModal code={code} onJoin={handleJoinAsNewPlayer} error={error} />;
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

  async function handlePlayTrumpCard(targetParticipantId) {
    const res = await emitAck("player:playTrumpCard", { code: lobby.code, playerId, matchId: trumpMatch.id, targetParticipantId });
    if (res.ok) setTrumpDrawerOpen(false);
    return res;
  }

  const totalPlayers = lobby.players.length;
  const picksDone = lobby.players.filter(p => p.texasTPick).length;

  // Trump Card can only be played before the current match starts, and only
  // by someone who isn't one of its two participants. Once a match is
  // in_progress there's no "ready" match yet, so trumpMatch is null and the
  // pill goes into its disabled state rather than disappearing.
  const hasTrumpCard = !!me?.hasTrumpCard;
  const trumpMatch = lobby.bracket?.rounds.flat().find((m) => m.status === "ready") || null;
  const canPlayTrump = !!(
    hasTrumpCard && trumpMatch &&
    trumpMatch.playerA !== playerId && trumpMatch.playerB !== playerId
  );

  return (
    <div className="page">
      <RewardPopups />
      {lobby.bracket && <BracketPanel bracket={lobby.bracket} highlightPlayerId={playerId} />}
      {isHost && <AdminPanel lobby={lobby} playerId={playerId} />}
      <div className="page-header">
        <div style={{ textAlign: "center" }}>
          <span className="wordmark game-title"><ChipIcon size={12} /> Texas SMASH'em <ChipIcon size={12} /></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="page-subtitle-row">
              <span className="page-subtitle">Lobby</span>
              <span className="page-subtitle-code">{lobby.code}</span>
            </div>

          </div>
          <div className="page-header-right">
            {me && (
              <div className="chip-pill">
                <ChipIcon size={22} className="chip-icon" />
                <span className="chip-value">{me.chips ?? 0}</span>
              </div>
            )}
            {me && lobby.status === "in_progress" && (
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
            <button
              className="btn-ghost"
              onClick={() => setExitConfirmOpen(true)}
              aria-label="Exit tournament"
              title="Exit tournament"
              style={{ padding: 8, borderRadius: "50%", width: 34, height: 34 }}
            >
              <ExitIcon size={16} />
            </button>
          </div>
        </div>
        {me && lobby.status === "in_progress" && (
          <BoonDrawer
            open={boonDrawerOpen}
            cost={lobby.settings.boonCost}
            chips={me.chips ?? 0}
            onBuy={handleBuyBoon}
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
      
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span className={`lobby-status lobby-status-${lobby.status}`}>
          {lobby.status === "waiting" ? "Waiting" : lobby.status === "in_progress" ? "In Progress" : "Complete"}
        </span>
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
              <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                <div style={{
                  padding: 12, background: "var(--surface-2)", borderRadius: 12,
                  border: "1px solid var(--border-gold)",
                  boxShadow: "0 0 24px rgba(212,168,50,0.15), inset 0 1px 0 rgba(212,168,50,0.1)",
                  lineHeight: 0,
                }}>
                  <QRCode value={`${window.location.origin}/lobby/${lobby.code}`} size={140} />
                </div>
              </div>
              <p style={{ textAlign: "center", marginTop: 10, fontSize: "0.72rem" }}>
                Or scan to jump straight in
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

      {(lobby.status === "in_progress" || lobby.status === "complete") && (
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

      <ExitConfirmModal
        open={exitConfirmOpen}
        onCancel={() => setExitConfirmOpen(false)}
        onConfirm={handleLeave}
      />
    </div>
  );
}
