import { useState } from "react";

// Shown when someone lands directly on a lobby URL (e.g. by scanning the
// host's QR code) without ever having gone through the Home join form —
// they haven't had a chance to give their name yet, so we ask here.
export default function JoinLobbyModal({ code, onJoin, error }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setLocalError("");
    const res = await onJoin(name.trim());
    setBusy(false);
    if (res && !res.ok) setLocalError(res.error || "Could not join lobby");
  }

  return (
    <div className="betting-overlay">
      <div className="betting-modal">
        <div className="modal-body">
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span className="wordmark">Texas SMASH'em</span>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "var(--text-dim)", textTransform: "uppercase", marginTop: 6 }}>
              Joining Lobby {code}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <span className="field-label">Your Name</span>
              <input
                autoFocus
                placeholder="Enter your tag"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={10}
                required
              />
            </div>
            <button className="btn-gold" disabled={busy || !name.trim()} type="submit" style={{ width: "100%", marginTop: 4 }}>
              {busy ? "Joining…" : "Enter the Arena"}
            </button>
          </form>

          {(localError || error) && <p className="error" style={{ marginTop: 10 }}>{localError || error}</p>}
        </div>
      </div>
    </div>
  );
}
