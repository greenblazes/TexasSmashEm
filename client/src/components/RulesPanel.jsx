import { useState } from "react";

const RULES = [
  {
    title: "Ante Up",
    body: "At the start of the tournament every player pays the Ante (default 50 chips) into the pot. This is automatic when the host starts the tournament.",
  },
  {
    title: "Starting Resources",
    body: "Each player begins with 200 chips and 2 Boons. You can buy 2 more Boons at any time for 10 chips.",
  },
  {
    title: "Texas T-Pick",
    body: "Before the tournament starts, every player secretly picks who they think will win the whole tournament. Picks are locked in once play begins. If your pick wins, you earn a Cow Feed bonus.",
  },
  {
    title: "Match Winner Prediction",
    body: "Spectators (players not in the current match) can predict who will win each match. Correct predictions earn points via Cow Feed.",
  },
  {
    title: "Boons & SMASH Handicap",
    body: "Place Boons on a player before their match to increase their damage taken. Boon advantage is converted to a % damage bonus using a scale of 1–12 boons → 10–300% extra damage. Participants can also place Boons on themselves.",
  },
  {
    title: "Cow Feed",
    body: "Payout for correct predictions. Formula: max(20, 10 × (wrong − right)² + 20) chips. The bigger the upset in predictions, the larger the payout.",
  },
  {
    title: "Stock Bets",
    body: "Eliminated players can bet chips on how many stocks the winner of a match will have remaining. Six multiplier slots (0–5 stocks remaining). Each slot can only be claimed once per match. Win = wager × multiplier.",
  },
  {
    title: "Riding Double",
    body: "If you have no chips left, you can piggyback on another player's Stock Bet. A correct bet splits the winnings: the original bettor keeps ½, you get ⅓, and ⅙ is lost.",
  },
  {
    title: "Trump Card",
    body: "The winner of the first match of the tournament receives the Trump Card. Play it on any player in any future match to add a massive Boon handicap on them.",
  },
  {
    title: "Clean Sweep",
    body: "If a player wins every match they play without losing a single stock, they earn +50 bonus points at the end of the tournament.",
  },
  {
    title: "Double-Cross",
    body: "If your T-Pick wins the tournament but you bet against them in at least one match prediction, you earn +30 bonus points.",
  },
  {
    title: "Bushwhacked",
    body: "If you predicted the champion correctly every match but they end up losing the tournament, you lose 30 points.",
  },
  {
    title: "Showdown",
    body: "If the two players with the most correct match predictions meet in the final, both earn +75 bonus points.",
  },
  {
    title: "Divvy Up",
    body: "After the tournament ends and bonuses are applied, the host triggers Divvy Up. The pot is distributed to players weighted by their points — champion first, then in reverse elimination order.",
  },
];

export default function RulesPanel() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  function toggleRule(idx) {
    setExpanded(expanded === idx ? null : idx);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 998,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Side panel */}
      <div
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: 340,
          zIndex: 999,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border-gold)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.6)" : "none",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Panel header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(90deg, rgba(212,168,50,0.07), transparent)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{
                fontFamily: "var(--font-d)", fontSize: "1.1rem",
                letterSpacing: "0.12em", textTransform: "uppercase",
                background: "linear-gradient(135deg,#D4A832,#F0C84A)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Game Rules
              </div>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--text-dim)", marginTop: 2 }}>
                TEXAS SMASH'EM · REFERENCE
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="btn-ghost"
              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable rule list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "10px 0" }}>
          {RULES.map((rule, idx) => (
            <div key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={() => toggleRule(idx)}
                style={{
                  width: "100%", background: "transparent", color: "var(--text)",
                  boxShadow: "none", padding: "12px 20px", justifyContent: "space-between",
                  borderRadius: 0, fontSize: "0.82rem", letterSpacing: "0.08em",
                  textAlign: "left",
                }}
              >
                <span>{rule.title}</span>
                <span style={{
                  color: "var(--gold)", fontSize: "0.7rem",
                  transform: expanded === idx ? "rotate(90deg)" : "rotate(0)",
                  transition: "transform 0.18s ease", display: "inline-block",
                }}>
                  ▶
                </span>
              </button>
              {expanded === idx && (
                <div style={{
                  padding: "0 20px 14px",
                  fontSize: "0.82rem", color: "var(--text-mid)", lineHeight: 1.65,
                }}>
                  {rule.body}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid var(--border)",
          fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em",
          flexShrink: 0,
        }}>
          {RULES.length} rules · Tap any rule to expand
        </div>
      </div>

      {/* Tab trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          right: open ? 340 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1000,
          transition: "right 0.28s cubic-bezier(0.4,0,0.2,1)",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          padding: "14px 10px",
          borderRadius: "8px 0 0 8px",
          background: "linear-gradient(180deg,#D4A832,#9E7A1E)",
          color: "#07050F",
          boxShadow: "-4px 0 18px rgba(212,168,50,0.35)",
          fontSize: "0.72rem",
          letterSpacing: "0.18em",
          fontWeight: 700,
        }}
      >
        RULES
      </button>
    </>
  );
}
