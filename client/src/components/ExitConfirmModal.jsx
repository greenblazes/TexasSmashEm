// Confirms before a player leaves an active lobby/tournament — leaving drops
// their session, so a stray click on the (now icon-only) exit button
// shouldn't silently boot them.
export default function ExitConfirmModal({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="betting-overlay" onClick={onCancel}>
      <div className="betting-modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: "center" }}>
          <span className="wordmark" style={{ display: "block", marginBottom: 8 }}>Leave Tournament?</span>
          <p style={{ marginBottom: 20 }}>
            You'll be removed from this session. You can rejoin with the lobby code if the tournament is still going.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
              Cancel
            </button>
            <button className="btn-gold" style={{ flex: 1 }} onClick={onConfirm}>
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
