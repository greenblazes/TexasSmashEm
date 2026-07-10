import { useNavigate } from "react-router-dom";

// Shown when someone lands on a lobby URL (e.g. by scanning the host's QR
// code) but the tournament can't be joined — already started, full, or the
// code doesn't exist. No point asking for their name first.
export default function LobbyNotJoinable({ reason }) {
  const navigate = useNavigate();

  return (
    <div className="betting-overlay">
      <div className="betting-modal">
        <div className="modal-body" style={{ textAlign: "center" }}>
          <span className="wordmark" style={{ display: "block", marginBottom: 8 }}>Texas SMASH'em</span>
          <p style={{ marginBottom: 20 }}>{reason}</p>
          <button className="btn-gold" style={{ width: "100%" }} onClick={() => navigate("/")}>
            Return to App
          </button>
        </div>
      </div>
    </div>
  );
}
