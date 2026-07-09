import { useState } from "react";
import Bracket from "../pages/Bracket.jsx";

export default function BracketPanel({ bracket, highlightPlayerId }) {
  const [open, setOpen] = useState(false);

  if (!bracket) return null;

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
          top: 0, left: 0, bottom: 0,
          width: 340,
          zIndex: 999,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          background: "var(--surface)",
          borderRight: "1px solid var(--border-gold)",
          boxShadow: open ? "8px 0 40px rgba(0,0,0,0.6)" : "none",
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
                Bracket
              </div>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--text-dim)", marginTop: 2 }}>
                TEXAS SMASH'EM · UPCOMING MATCHES
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

        {/* Scrollable bracket */}
        <div style={{ overflow: "auto", flex: 1, padding: "14px 20px" }}>
          <Bracket bracket={bracket} highlightPlayerId={highlightPlayerId} />
        </div>
      </div>

      {/* Tab trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          left: open ? 340 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1000,
          transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          padding: "10px 6px",
          borderRadius: "0 8px 8px 0",
          background: "linear-gradient(180deg,#D4A832,#9E7A1E)",
          color: "#07050F",
          boxShadow: "4px 0 18px rgba(212,168,50,0.35)",
          fontSize: "0.72rem",
          letterSpacing: "0.18em",
          fontWeight: 700,
        }}
      >
        BRACKET
      </button>
    </>
  );
}
