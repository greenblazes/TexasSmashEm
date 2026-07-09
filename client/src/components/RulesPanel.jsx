import React, { useState } from "react";
import chipIcon from "../assets/icons/chip.png";
import boonIcon from "../assets/icons/boon.png";
import cowFeedIcon from "../assets/icons/cowfeed.png";
import potIcon from "../assets/icons/pot.png";
import trumpCardIcon from "../assets/icons/trumpcard.png";
import tPickIcon from "../assets/icons/tpick.png";
import matchPickIcon from "../assets/icons/match-prediction.png";
import stockBetIcon from "../assets/icons/stockbet.png";
import ridingDoubleIcon from "../assets/icons/ridingdouble.png";
import cleanSweepIcon from "../assets/icons/cleansweep.png";
import doubleCrossIcon from "../assets/icons/double-crossed.png";
import bushwhackedIcon from "../assets/icons/bushwhacked.png";
import showdownIcon from "../assets/icons/showdown.png";

const SECTIONS = [
  {
    heading: "Terms",
    rules: [
      {
        title: "Ante Up",
        icon: chipIcon,
        body: "At the start of the tournament every player pays the Ante (default 50 chips) into the pot. This is automatic when the host starts the tournament.",
      },
      {
        title: "Starting Resources",
        icon: chipIcon,
        body: "Each player begins with 200 chips and 2 Boons. You can buy 2 more Boons at any time for 10 chips.",
      },
      {
        title: "Boons & SMASH Handicap",
        icon: boonIcon,
        body: (
          <>
            <span>Place Boons on a player before their match to increase their damage taken. The net Boon advantage is converted to extra damage using the scale below. Participants can also place Boons on themselves.</span>
            <table style={{ marginTop: 10, borderCollapse: "collapse", width: "100%", fontVariantNumeric: "tabular-nums" }}>
              <tbody>
                {[[1,10],[2,20],[3,30],[4,40],[5,50],[6,60],[7,80],[8,100],[9,125],[10,150],[11,200],[12,300]].reduce((rows, [b,d], i) => {
                  if (i % 3 === 0) rows.push([]);
                  rows[rows.length - 1].push([b, d]);
                  return rows;
                }, []).map((row, ri) => (
                  <tr key={ri}>
                    {row.map(([b, d]) => (
                      <React.Fragment key={b}>
                        <td style={{ padding: "3px 6px 3px 0", color: "var(--blue-light)", fontWeight: 600 }}>{b}</td>
                        <td style={{ padding: "3px 12px 3px 0", color: "var(--text)" }}>{d}%</td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ),
      },
      {
        title: "Cow Feed",
        icon: cowFeedIcon,
        body: "After every match, every spectator (anyone not in that match) receives a flat base amount of chips. On top of that, a bonus pool is split equally among spectators who correctly predicted the winner — the fewer people who guessed right, the bigger the bonus each correct predictor earns. Both amounts are configurable by the host before the tournament starts.",
      },
      {
        title: "Divvy Up",
        icon: potIcon,
        body: "After the tournament ends and bonuses are applied, the host triggers Divvy Up. The pot is distributed to players weighted by their chip stack — champion first, then in reverse elimination order.",
      },
      {
        title: "Trump Card",
        icon: trumpCardIcon,
        body: "The loser of the first match of the tournament receives the Trump Card. Play it at any time before a round starts to remove all Boons currently placed on a player.",
      },
    ],
  },
  {
    heading: "Scoring Bonuses",
    rules: [
      {
        title: "Texas T-Pick",
        icon: tPickIcon,
        body: "Before the tournament starts, every player secretly picks who they think will win the whole tournament. Picks are locked in once play begins. If your pick wins, you earn a Cow Feed bonus.",
      },
      {
        title: "Match Winner Prediction",
        icon: matchPickIcon,
        body: "Spectators (players not in the current match) can predict who will win each match. Predictions can only be made during your own turn in the pre-match betting popup — not before spectator turns begin, and not after they end. Correct predictions earn chips via Cow Feed.",
      },
      {
        title: "Stock Bets",
        icon: stockBetIcon,
        body: "Optional, and only for eliminated players. On top of your Match Prediction, wager chips on how many stocks that predicted winner will have left when they win: 1, 2, or 3. It pays only if your Match Prediction is correct AND the winner finishes with exactly that many stocks. Win = wager × the slot's multiplier (a flawless 3-stock win pays the most). Each stock slot can be claimed by only one player per match; a wrong bet loses the wager to the pot.",
      },
      {
        title: "Riding Double",
        icon: ridingDoubleIcon,
        body: "If you're eliminated and out of chips, you can piggyback on another player's Stock Bet instead of placing your own. If that bet wins, the winnings are split: the original bettor keeps ½, you get ⅓, and the remainder is lost.",
      },
      {
        title: "Clean Sweep",
        icon: cleanSweepIcon,
        body: "Awarded at the end of the tournament to any player who correctly predicted the winner of every single match. Matches you played in yourself don't count — but every other match must have a correct prediction. Missing a prediction disqualifies you.",
      },
      {
        title: "Double-Cross",
        icon: doubleCrossIcon,
        body: "Awarded at the end of the tournament to any player who went up against their own Texas T-Pick in a match and won. Beating the person you predicted to win the whole tournament earns you bonus chips.",
      },
      {
        title: "Bushwhacked",
        icon: bushwhackedIcon,
        body: "Applied at the end of the tournament to any player who went up against their own Texas T-Pick in a match and lost. Getting eliminated by the person you picked to win the whole tournament costs you chips.",
      },
      {
        title: "Showdown",
        icon: showdownIcon,
        body: "Awarded at the end of the tournament to any player who faced their own Texas T-Pick in the final round and won. Defeating the person you predicted to win the whole tournament in the championship match earns you bonus chips.",
      },
    ],
  },
];

export default function RulesPanel() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  // The open panel always sits above the other (closed) one — z-index tier
  // is driven directly by this panel's own open state, not shared/global
  // state, so it can never end up stuck behind a panel that isn't showing.
  const isActive = open;

  function toggleRule(idx) {
    setExpanded(expanded === idx ? null : idx);
  }

  function handleToggle() {
    setOpen((o) => !o);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      {open && (
        <div
          onClick={handleClose}
          className={`side-panel-backdrop ${isActive ? "side-panel-backdrop-z-active" : "side-panel-backdrop-z-inactive"}`}
        />
      )}

      <div
        className={`side-panel side-panel-right ${open ? "is-open" : ""} ${isActive ? "side-panel-z-active" : "side-panel-z-inactive"}`}
      >
        <div className="side-panel-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="side-panel-title">Game Rules</div>
              <div className="side-panel-subtitle">TEXAS SMASH'EM · REFERENCE</div>
            </div>
            <button
              onClick={handleClose}
              className="btn-ghost"
              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="side-panel-body" style={{ padding: "6px 0" }}>
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <div style={{
                padding: "10px 20px 6px",
                fontSize: "0.6rem", letterSpacing: "0.22em", textTransform: "uppercase",
                color: "var(--gold)", fontWeight: 600,
                borderBottom: "1px solid var(--border-gold)",
                background: "rgba(212,168,50,0.05)",
              }}>
                {section.heading}
              </div>
              {section.rules.map((rule, idx) => {
                const key = section.heading + idx;
                return (
                  <div key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                    <button
                      onClick={() => toggleRule(key)}
                      style={{
                        width: "100%", background: "transparent", color: "var(--text)",
                        boxShadow: "none", padding: "11px 20px", justifyContent: "space-between",
                        borderRadius: 0, fontSize: "0.82rem", letterSpacing: "0.08em",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src={rule.icon} alt="" width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />
                        {rule.title}
                      </span>
                      <span style={{
                        color: "var(--gold)", fontSize: "0.7rem",
                        transform: expanded === key ? "rotate(90deg)" : "rotate(0)",
                        transition: "transform 0.18s ease", display: "inline-block",
                        flexShrink: 0,
                      }}>
                        ▶
                      </span>
                    </button>
                    {expanded === key && (
                      <div style={{
                        padding: "0 20px 14px",
                        fontSize: "0.82rem", color: "var(--text-mid)", lineHeight: 1.65,
                      }}>
                        {typeof rule.body === "string" ? <span>{rule.body}</span> : rule.body}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="side-panel-footer">
          {SECTIONS.reduce((n, s) => n + s.rules.length, 0)} rules · Tap any rule to expand
        </div>
      </div>

      <button
        onClick={handleToggle}
        className={`side-panel-tab side-panel-tab-right ${open ? "is-open" : ""} ${isActive ? "side-panel-tab-z-active" : "side-panel-tab-z-inactive"}`}
      >
        RULES
      </button>
    </>
  );
}
