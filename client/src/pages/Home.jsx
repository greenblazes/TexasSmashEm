import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLobby } from "../lib/LobbyContext.jsx";

export default function Home() {
  const { createLobby, joinLobby, lobby, rejoinAttempted } = useLobby();
  const navigate = useNavigate();
  const [hostName, setHostName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  if (rejoinAttempted && lobby) {
    navigate(`/lobby/${lobby.code}`, { replace: true });
    return null;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const res = await createLobby(hostName);
    setBusy(false);
    if (res.ok) navigate(`/lobby/${res.code}`);
    else setFormError(res.error);
  }

  async function handleJoin(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const res = await joinLobby(joinCode, playerName);
    setBusy(false);
    if (res.ok) navigate(`/lobby/${res.code}`);
    else setFormError(res.error);
  }

  return (
    <div className="page">
      <div className="home-hero animate-up">
        <h1>Texas SMASH'em</h1>
        <span className="tagline">All In. Every Stock.</span>
      </div>

      <div className="cols-2">
        <div className="card card-gold animate-up-2">
          <span className="section-label">▶ Join a Tournament</span>
          <form onSubmit={handleJoin}>
            <div className="field">
              <span className="field-label">Lobby Code</span>
              <input
                placeholder="e.g. XKQR7"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={5}
                required
              />
            </div>
            <div className="field">
              <span className="field-label">Your Name</span>
              <input
                placeholder="Enter your tag"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required
              />
            </div>
            <button className="btn-gold" disabled={busy} type="submit" style={{ width: "100%", marginTop: 4 }}>
              Enter the Arena
            </button>
          </form>
        </div>

        <details className="card animate-up-3">
          <summary>Host a Tournament</summary>
          <form onSubmit={handleCreate}>
            <div className="field">
              <span className="field-label">Your Name</span>
              <input
                placeholder="Enter your tag"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                required
              />
            </div>
            <button disabled={busy} type="submit" style={{ width: "100%" }}>
              Create Lobby
            </button>
          </form>
        </details>
      </div>

      {formError && <p className="error">{formError}</p>}
    </div>
  );
}
