import { useState } from "react";
import Bracket from "../pages/Bracket.jsx";

export default function BracketPanel({ bracket, highlightPlayerId }) {
  const [open, setOpen] = useState(false);
  // The open panel always sits above the other (closed) one — z-index tier
  // is driven directly by this panel's own open state, not shared/global
  // state, so it can never end up stuck behind a panel that isn't showing.
  const isActive = open;

  if (!bracket) return null;

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
        className={`side-panel side-panel-left side-panel-full ${open ? "is-open" : ""} ${isActive ? "side-panel-z-active" : "side-panel-z-inactive"}`}
      >
        <div className="side-panel-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="side-panel-title">Bracket</div>
              <div className="side-panel-subtitle">TEXAS SMASH'EM · UPCOMING MATCHES</div>
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

        <div className="side-panel-body" style={{ padding: "14px 20px" }}>
          <Bracket bracket={bracket} highlightPlayerId={highlightPlayerId} />
        </div>
      </div>

      <button
        onClick={handleToggle}
        className={`side-panel-tab side-panel-tab-left side-panel-full ${open ? "is-open" : ""} ${isActive ? "side-panel-tab-z-active" : "side-panel-tab-z-inactive"}`}
      >
        BRACKET
      </button>
    </>
  );
}
