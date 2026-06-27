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
    if (res.ok) {
      navigate(`/lobby/${res.code}`);
    } else {
      setFormError(res.error);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const res = await joinLobby(joinCode, playerName);
    setBusy(false);
    if (res.ok) {
      navigate(`/lobby/${res.code}`);
    } else {
      setFormError(res.error);
    }
  }

  return (
    <div className="page home">
      <h1>Texas SMASH'em</h1>

      <section className="card">
        <h2>Host a Tournament</h2>
        <form onSubmit={handleCreate}>
          <input
            placeholder="Your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            required
          />
          <button disabled={busy} type="submit">
            Create Lobby
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Join a Tournament</h2>
        <form onSubmit={handleJoin}>
          <input
            placeholder="Lobby code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={5}
            required
          />
          <input
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            required
          />
          <button disabled={busy} type="submit">
            Join Lobby
          </button>
        </form>
      </section>

      {formError && <p className="error">{formError}</p>}
    </div>
  );
}
