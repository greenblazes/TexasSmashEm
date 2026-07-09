/**
 * UI TestBed — /test
 * Every game state and design component rendered with mock data.
 * No server connection required.
 */
import React, { useState, useEffect } from "react";
import ChipIcon from "../components/ChipIcon.jsx";
import TrumpIcon from "../components/TrumpIcon.jsx";
import { Link } from "react-router-dom";
import RoundActions from "./RoundActions.jsx";
import Bracket from "./Bracket.jsx";

// ── Mock data ─────────────────────────────────────────────────────────────────

const PLAYERS = {
  p1: { id: "p1", name: "Alice",   chips: 180, boons: 3, eliminated: false, texasTPick: "p3", hasTrumpCard: false, matchPredictions: {}, connected: true, isHost: true },
  p2: { id: "p2", name: "Bob",     chips: 120, boons: 1, eliminated: false, texasTPick: "p1", hasTrumpCard: true,  matchPredictions: { m1: "p1" }, connected: true },
  p3: { id: "p3", name: "Charlie", chips: 50,  boons: 0, eliminated: true,  texasTPick: "p2", hasTrumpCard: false, matchPredictions: {}, connected: true },
  p4: { id: "p4", name: "Diana",   chips: 0,   boons: 2, eliminated: true,  texasTPick: "p1", hasTrumpCard: false, matchPredictions: { m1: "p2" }, connected: true },
};

const BASE_MATCH = {
  id: "m1", round: 1,
  playerA: "p1", playerAName: "Alice",
  playerB: "p2", playerBName: "Bob",
  winnerId: null,
};

const SETTINGS = {
  buyBoonsCost: 10, buyBoonsAmount: 2,
  turnDurationMs: 30000,
  stockPool: [
    { stocks: 1, multiplier: 2 },
    { stocks: 2, multiplier: 3 },
    { stocks: 3, multiplier: 5 },
  ],
};

function makeLobby(matchStatus, preBet = null, extra = {}) {
  return {
    code: "DEMO1",
    status: "in_progress",
    pot: 150,
    players: Object.values(PLAYERS),
    settings: SETTINGS,
    bracket: { rounds: [[{ ...BASE_MATCH, status: matchStatus }]] },
    boonPlacements: { m1: { p1: 2, p2: 1 } },
    stockBets: { m1: [{ playerId: "p3", stocks: 2, wager: 30, predictedWinnerId: "p1", riders: [] }] },
    matchPreBet: preBet ? { m1: preBet } : {},
    ...extra,
  };
}

const MOCK_BRACKET = {
  rounds: [
    [
      { id: "m1", round: 1, playerA: "p1", playerAName: "Alice",   playerB: "p2", playerBName: "Bob",     status: "complete", winnerId: "p1" },
      { id: "m2", round: 1, playerA: "p3", playerAName: "Charlie", playerB: "p4", playerBName: "Diana",   status: "in_progress", winnerId: null },
    ],
    [
      { id: "m3", round: 2, playerA: "p1", playerAName: "Alice",   playerB: null,  playerBName: null,     status: "pending",  winnerId: null },
    ],
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const noop = () => {};
const fakeRun = (event, payload) => { console.log("[test]", event, payload); };

function Section({ id, label, children }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <div style={{
        fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase",
        color: "var(--gold)", fontWeight: 700, marginBottom: 16,
        paddingBottom: 8, borderBottom: "1px solid var(--border-gold)",
      }}>
        {label}
      </div>
      {children}
    </section>
  );
}

function Row({ children, gap = 12 }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap, marginBottom: 12 }}>{children}</div>;
}

// ── TestBed page ──────────────────────────────────────────────────────────────

const NAV = [
  ["#tokens",          "Design Tokens"],
  ["#cards",           "Cards"],
  ["#buttons",         "Buttons"],
  ["#pills",           "Pills & Badges"],
  ["#reward-popup",    "Reward Popup"],
  ["#stats",           "Stat Tiles"],
  ["#vs-banner",       "VS Banner"],
  ["#lobby-code",      "Lobby Code"],
  ["#progress",        "Progress & Countdown"],
  ["#bracket-view",    "Bracket"],
  ["#phase-participant","Pre-Bet: Participant"],
  ["#phase-spectator", "Pre-Bet: Spectator"],
  ["#phase-complete",  "Pre-Bet: Complete"],
  ["#match-locked",    "Match In Progress"],
  ["#notifs",          "Notifications"],
];

export default function TestBed() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar nav */}
      <nav style={{
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        width: 200, flexShrink: 0,
        background: "var(--surface-2)", borderRight: "1px solid var(--border)",
        padding: "20px 0",
      }}>
        <div style={{ padding: "0 16px 16px", fontFamily: "var(--font-d)", fontSize: "0.85rem", color: "var(--gold)", letterSpacing: "0.1em" }}>
          UI TESTBED
        </div>
        <Link to="/" style={{ display: "block", padding: "6px 16px", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          ← Back to app
        </Link>
        <div style={{ marginTop: 12 }}>
          {NAV.map(([href, label]) => (
            <a key={href} href={href} style={{
              display: "block", padding: "6px 16px",
              fontSize: "0.78rem", color: "var(--text-mid)",
              textDecoration: "none", borderLeft: "2px solid transparent",
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--gold)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-mid)"}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: "40px 48px", maxWidth: 900 }}>
        <h1 style={{ fontFamily: "var(--font-d)", fontSize: "1.6rem", color: "var(--gold)", marginBottom: 8, letterSpacing: "0.1em" }}>
          TEXAS SMASH'EM — UI TESTBED
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginBottom: 48 }}>
          All game states and components rendered with mock data. No server required.
        </p>

        <TokensSection />
        <CardsSection />
        <ButtonsSection />
        <PillsSection />
        <RewardPopupSection />
        <StatsSection />
        <VSBannerSection />
        <LobbyCodeSection />
        <ProgressSection />
        <BracketSection />
        <ParticipantPhaseSection />
        <SpectatorPhaseSection />
        <PreBetCompleteSection />
        <MatchLockedSection />
        <NotifsSection />
      </main>
    </div>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

function TokensSection() {
  const colors = [
    ["--red", "Red"],
    ["--gold", "Gold"],
    ["--gold-light", "Gold Light"],
    ["--blue", "Blue"],
    ["--blue-light", "Blue Light"],
    ["--green", "Green"],
    ["--text", "Text"],
    ["--text-mid", "Text Mid"],
    ["--text-dim", "Text Dim"],
  ];
  return (
    <Section id="tokens" label="Design Tokens — Colors">
      <Row gap={8}>
        {colors.map(([v, label]) => (
          <div key={v} style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--r)", background: `var(${v})`, border: "1px solid var(--border)", marginBottom: 6 }} />
            <div style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>{label}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--text-dim)", opacity: 0.6 }}>{v}</div>
          </div>
        ))}
      </Row>
      <Row gap={16}>
        {["var(--font-d)", "var(--font-b)"].map((f) => (
          <div key={f} style={{ fontFamily: f, fontSize: "1.2rem", color: "var(--text)" }}>
            {f === "var(--font-d)" ? "IMPACT DISPLAY FONT" : "Body / System Font"}
          </div>
        ))}
      </Row>
    </Section>
  );
}

function CardsSection() {
  return (
    <Section id="cards" label="Cards">
      <Row gap={16}>
        {[
          ["card", "Default card"],
          ["card card-gold", "Gold card"],
          ["card card-red", "Red card"],
          ["card card-blue", "Blue card"],
        ].map(([cls, label]) => (
          <div key={cls} className={cls} style={{ flex: "1 1 180px", minHeight: 80 }}>
            <span className="section-label">{label}</span>
            <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", marginTop: 6 }}>Card body content goes here.</p>
          </div>
        ))}
      </Row>
    </Section>
  );
}

function ButtonsSection() {
  return (
    <Section id="buttons" label="Buttons">
      <Row>
        <button className="btn-gold">btn-gold</button>
        <button className="btn-blue">btn-blue</button>
        <button className="btn-ghost">btn-ghost</button>
        <button className="btn-gold" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>Disabled</button>
      </Row>
    </Section>
  );
}

function PillsSection() {
  return (
    <Section id="pills" label="Pills & Badges">
      <Row gap={10}>
        <span className="chip-pill">
          <ChipIcon size={22} className="chip-icon" />
          <span className="chip-value">850</span>
        </span>
        <span className="trump-pill"><TrumpIcon size={18} /> Trump Card</span>
        <span className="notif">ℹ Info notification</span>
        <span className="notif notif-warn">⚠ Warning notification</span>
      </Row>
      <Row gap={6}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>Boon pips:</span>
        {Array.from({ length: 6 }).map((_, i) => <span key={i} className="boon-pip" />)}
      </Row>
      <Row gap={8}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-mid)" }}>
          <span className="live-dot" /> Live indicator
        </span>
      </Row>
    </Section>
  );
}

function DemoRewardPopup({ reward, index, onDone }) {
  const [vars, setVars] = useState(null);

  useEffect(() => {
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight / 2 + index * 74;
    const target = document.querySelector(".chip-pill");
    let dx = 0, dy = -window.innerHeight * 0.35;
    if (target) {
      const r = target.getBoundingClientRect();
      dx = r.left + r.width / 2 - originX;
      dy = r.top + r.height / 2 - originY;
    }
    setVars({ top: originY, left: originX, "--dx": `${dx}px`, "--dy": `${dy}px` });
  }, [reward.kind, index]);

  if (!vars) return null;

  return (
    <div className={`reward-popup reward-popup-${reward.kind}`} style={vars} onAnimationEnd={onDone}>
      <span className="reward-popup-amount">+{reward.amount}</span>
      <span className="reward-popup-label">Chips</span>
    </div>
  );
}

function RewardPopupSection() {
  const [demoRewards, setDemoRewards] = useState([]);

  function fire() {
    setDemoRewards((r) => [...r, { id: Date.now() + Math.random(), kind: "chips", amount: 75 }]);
  }

  return (
    <Section id="reward-popup" label="Reward Popup (chips gained)">
      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: 16 }}>
        Fires automatically in production whenever a player's chips increase — Cow Feed,
        Stock Bet payouts, Divvy Up, or the end-of-tournament bonuses. Pops up center-screen, holds,
        then flies into the chip pill above (scroll up to watch it land).
      </p>
      <Row gap={10}>
        <button className="btn-gold" onClick={fire}>Simulate +75 Chips</button>
      </Row>
      {demoRewards.map((r, i) => (
        <DemoRewardPopup
          key={r.id}
          reward={r}
          index={i}
          onDone={() => setDemoRewards((rs) => rs.filter((x) => x.id !== r.id))}
        />
      ))}
    </Section>
  );
}

function StatsSection() {
  return (
    <Section id="stats" label="Stat Tiles">
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-value" style={{ background: "linear-gradient(135deg,#D4A832,#F0C84A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>850</div>
          <div className="stat-label">Chips</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: "var(--blue-light)" }}>4</div>
          <div className="stat-label">Boons</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value" style={{ color: "var(--red)" }}>3</div>
          <div className="stat-label">Stocks Left</div>
        </div>
      </div>
    </Section>
  );
}

function VSBannerSection() {
  return (
    <Section id="vs-banner" label="VS Banner">
      <div className="vs-banner">
        <span className="vs-name" style={{ color: "var(--blue-light)" }}>Alice</span>
        <span className="vs-sep">VS</span>
        <span className="vs-name" style={{ color: "var(--green)" }}>Bob</span>
      </div>
    </Section>
  );
}

function LobbyCodeSection() {
  return (
    <Section id="lobby-code" label="Lobby Code Display (glow-pulse animation)">
      <div className="lobby-code-display">XKQR7</div>
    </Section>
  );
}

function CountdownDemo() {
  const [deadline, setDeadline] = useState(() => Date.now() + 30000);
  const [ms, setMs] = React.useState(30000);
  React.useEffect(() => {
    const iv = setInterval(() => setMs(Math.max(0, deadline - Date.now())), 250);
    return () => clearInterval(iv);
  }, [deadline]);
  const pct = (ms / 30000) * 100;
  const secs = Math.ceil(ms / 1000);
  const color = pct > 50 ? "var(--green)" : pct > 25 ? "var(--gold)" : "var(--red)";
  return (
    <div style={{ maxWidth: 400 }}>
      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 4 }}>{secs}s remaining</div>
      <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.25s linear, background 0.5s" }} />
      </div>
      <button className="btn-ghost" onClick={() => setDeadline(Date.now() + 30000)}>Reset timer</button>
    </div>
  );
}

function ProgressSection() {
  return (
    <Section id="progress" label="Progress Bar & Countdown Timer">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 4 }}>Progress bar (3 of 6 players ready)</div>
        <div className="progress-bar" style={{ maxWidth: 400 }}>
          <div className="progress-fill" style={{ width: "50%" }} />
        </div>
      </div>
      <CountdownDemo />
    </Section>
  );
}

function BracketSection() {
  return (
    <Section id="bracket-view" label="Bracket">
      <div className="card">
        <Bracket bracket={MOCK_BRACKET} />
      </div>
    </Section>
  );
}

function ParticipantPhaseSection() {
  const preBet = {
    phase: "participants",
    turnDurationMs: 30000,
    deadline: Date.now() + 22000,
    participants: ["p1", "p2"],
    sealedBoons: {}, // neither participant has submitted yet
    spectatorOrder: ["p3", "p4"],
    currentTurnIdx: 0,
    turnActions: {},
  };

  return (
    <Section id="phase-participant" label="Pre-Bet Phase — Participant Sealed Boons">
      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: 16 }}>
        Showing as <strong style={{ color: "var(--text)" }}>Alice (participant, not yet submitted)</strong>.
      </p>
      <RoundActions
        lobby={makeLobby("ready", preBet)}
        me={{ ...PLAYERS.p1, boons: 3 }}
        playerId="p1"
        autoOpenModal={false}
      />

      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", margin: "24px 0 16px" }}>
        Showing as <strong style={{ color: "var(--text)" }}>Charlie (spectator view during participant phase)</strong>.
      </p>
      <RoundActions
        lobby={makeLobby("ready", preBet)}
        me={{ ...PLAYERS.p3 }}
        playerId="p3"
        autoOpenModal={false}
      />
    </Section>
  );
}

function SpectatorPhaseSection() {
  const preBet = {
    phase: "spectators",
    turnDurationMs: 30000,
    deadline: Date.now() + 18000,
    participants: ["p1", "p2"],
    sealedBoons: { p1: 2, p2: 0 },
    spectatorOrder: ["p3", "p4"],
    currentTurnIdx: 0, // Charlie's turn
    turnActions: {},
  };
  const preBetP4Turn = {
    ...preBet,
    currentTurnIdx: 1, // Diana's turn
    turnActions: {
      p3: { boons: { p1: 1 }, bet: { stocks: 2, wager: 30 }, rideDouble: null },
    },
  };

  return (
    <Section id="phase-spectator" label="Pre-Bet Phase — Spectator Turn Order">
      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: 16 }}>
        Showing as <strong style={{ color: "var(--text)" }}>Charlie (eliminated, has chips)</strong>.
        No prediction is selected by default — the Stock Bet section stays hidden until Charlie picks a match winner.
      </p>
      <RoundActions
        lobby={makeLobby("ready", preBet, { stockBets: { m1: [] } })}
        me={{ ...PLAYERS.p3 }}
        playerId="p3"
        autoOpenModal={false}
      />

      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", margin: "24px 0 16px" }}>
        Showing as <strong style={{ color: "var(--text)" }}>Diana (eliminated, 0 chips — can only Ride Double)</strong> on
        Charlie's existing bet.
      </p>
      <RoundActions
        lobby={makeLobby("ready", preBetP4Turn)}
        me={{ ...PLAYERS.p4 }}
        playerId="p4"
        autoOpenModal={false}
      />
    </Section>
  );
}

function PreBetCompleteSection() {
  const preBet = {
    phase: "complete",
    turnDurationMs: 30000,
    deadline: Date.now() - 5000,
    participants: ["p1", "p2"],
    sealedBoons: { p1: 2, p2: 0 },
    spectatorOrder: ["p3", "p4"],
    currentTurnIdx: 2,
    turnActions: {
      p3: { boons: { p1: 1 }, bet: { stocks: 2, wager: 30 }, rideDouble: null },
      p4: { boons: {}, bet: null, rideDouble: null },
    },
  };

  return (
    <Section id="phase-complete" label="Pre-Bet Phase — Complete (waiting for host)">
      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: 16 }}>
        Showing as <strong style={{ color: "var(--text)" }}>Charlie (spectator)</strong>.
      </p>
      <RoundActions
        lobby={makeLobby("ready", preBet)}
        me={{ ...PLAYERS.p3 }}
        playerId="p3"
      />
    </Section>
  );
}

function MatchLockedSection() {
  return (
    <Section id="match-locked" label="Match In Progress (locked)">
      <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: 16 }}>
        Showing as <strong style={{ color: "var(--text)" }}>Charlie (spectator)</strong>.
      </p>
      <RoundActions
        lobby={makeLobby("in_progress")}
        me={{ ...PLAYERS.p3 }}
        playerId="p3"
      />
    </Section>
  );
}

function NotifsSection() {
  return (
    <Section id="notifs" label="Notifications">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 500 }}>
        <div className="notif">ℹ Your turn is coming up — get ready to place your bets.</div>
        <div className="notif notif-warn">⚠ You don't have enough chips to place that bet.</div>
        <div className="card card-gold" style={{ padding: "14px 18px" }}>
          <span className="section-label">🏆 Tournament Complete</span>
          <p style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-mid)" }}>Alice wins the pot. Clean Sweep bonus awarded.</p>
        </div>
      </div>
    </Section>
  );
}
