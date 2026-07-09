import { useState } from "react";
import ChipIcon from "./ChipIcon.jsx";

export default function BoonDrawer({ open, cost, chips, onBuy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleBuy() {
    setError("");
    setBusy(true);
    const res = await onBuy();
    setBusy(false);
    if (res && !res.ok) setError(res.error || "Purchase failed");
  }

  const canAfford = chips >= cost;

  return (
    <div
      style={{
        maxHeight: open ? 56 : 0,
        overflow: "hidden",
        transition: "max-height 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div style={{
        padding: "10px 20px 0px",
        borderTop: "1px solid var(--border)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        <button onClick={handleBuy} disabled={busy || !canAfford} className="btn-blue">
          Buy 1 Boon — {cost}
          <ChipIcon size={16} style={{ marginLeft: 2 }} />
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
