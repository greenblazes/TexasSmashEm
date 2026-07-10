import { useState } from "react";

// Drawer under the header — mirrors BoonDrawer's slide-down pattern. Lets a
// spectator holding the Trump Card play it against either participant of the
// current pre-match match, clearing all Boons placed on them.
export default function TrumpCardDrawer({ open, match, onPlay }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handlePlay(targetParticipantId) {
    setError("");
    setBusy(true);
    const res = await onPlay(targetParticipantId);
    setBusy(false);
    if (res && !res.ok) setError(res.error || "Could not play Trump Card");
  }

  if (!match) return null;

  return (
    <div
      style={{
        maxHeight: open ? 110 : 0,
        overflow: "hidden",
        transition: "max-height 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div style={{
        padding: "12px 20px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Play Trump Card — clear all boons on:
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-gold" disabled={busy} onClick={() => handlePlay(match.playerA)}>
            {match.playerAName}
          </button>
          <button className="btn-gold" disabled={busy} onClick={() => handlePlay(match.playerB)}>
            {match.playerBName}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
