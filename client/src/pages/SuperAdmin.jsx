import { useEffect, useState, useCallback } from "react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const TOKEN_KEY = "texassmashem:adminToken";

export default function SuperAdmin() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [lobbies, setLobbies] = useState([]);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${SERVER_URL}/admin/lobbies`, {
        headers: { "x-admin-token": token },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load lobbies");
        return;
      }
      setLobbies(data.lobbies);
      setLastUpdated(new Date());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  function saveToken(value) {
    setToken(value);
    localStorage.setItem(TOKEN_KEY, value);
  }

  async function closeLobby(code) {
    if (!window.confirm(`Close lobby ${code}? All players will be disconnected.`)) return;
    const res = await fetch(`${SERVER_URL}/admin/lobbies/${code}/close`, {
      method: "POST",
      headers: { "x-admin-token": token },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    refresh();
  }

  async function restartServer() {
    if (!window.confirm("Restart the server process via pm2? Active connections will drop briefly.")) return;
    const res = await fetch(`${SERVER_URL}/admin/restart`, {
      method: "POST",
      headers: { "x-admin-token": token },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    alert("Restart triggered.");
  }

  return (
    <div className="page">
      <h1>Control Dashboard</h1>

      <section className="card">
        <label>Admin token: </label>
        <input
          type="password"
          value={token}
          onChange={(e) => saveToken(e.target.value)}
          placeholder="Paste ADMIN_TOKEN"
          style={{ display: "inline-block", width: 280 }}
        />
        <button onClick={refresh}>Refresh</button>
        <button onClick={restartServer}>Restart Server</button>
        {lastUpdated && <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section>
        <h2>Active Lobbies ({lobbies.length})</h2>
        <table className="points-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Status</th>
              <th>Players</th>
              <th>Connected</th>
              <th>Pot</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lobbies.map((l) => (
              <tr key={l.code}>
                <td>{l.code}</td>
                <td>{l.status}</td>
                <td>{l.playerCount}</td>
                <td>{l.connectedCount}</td>
                <td>{l.pot}</td>
                <td>{new Date(l.createdAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => closeLobby(l.code)}>Close</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
