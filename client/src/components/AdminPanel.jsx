import { useState } from "react";
import AdminTools from "./AdminTools.jsx";

export default function AdminPanel({ lobby, playerId }) {
  const [open, setOpen] = useState(false);
  // The open panel always sits above the other (closed) one — z-index tier
  // is driven directly by this panel's own open state, not shared/global
  // state, so it can never end up stuck behind a panel that isn't showing.
  const isActive = open;

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
        className={`side-panel side-panel-right side-panel-blue ${open ? "is-open" : ""} ${isActive ? "side-panel-z-active" : "side-panel-z-inactive"}`}
      >
        <div className="side-panel-header side-panel-header-blue">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="side-panel-title side-panel-title-blue">Host Admin</div>
              <div className="side-panel-subtitle">LOBBY {lobby.code} · {lobby.status.toUpperCase()} · POT {lobby.pot}</div>
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
          <AdminTools lobby={lobby} playerId={playerId} />
        </div>
      </div>

      <button
        onClick={handleToggle}
        className={`side-panel-tab side-panel-tab-right side-panel-tab-admin ${open ? "is-open" : ""} ${isActive ? "side-panel-tab-z-active" : "side-panel-tab-z-inactive"}`}
      >
        ADMIN
      </button>
    </>
  );
}
