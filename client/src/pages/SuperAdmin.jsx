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
      if (!res.ok) { setError(data.error || "Failed to load lobbies"); return; }
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
      method: "POST", headers: { "x-admin-token": token },
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    refresh();
  }

  async function restartServer() {
    if (!window.confirm("Restart the server via pm2? Active connections will drop briefly.")) return;
    const res = await fetch(`${SERVER_URL}/admin/restart`, {
      method: "POST", headers: { "x-admin-token": token },
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    alert("Restart triggered.");
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="wordmark">Control Dashboard</span>
          <span className="page-subtitle">Super Admin · Auto-refreshes every 5s</span>
        </div>
        <div className="page-header-right">
          {lastUpdated && (
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={refresh} className="btn-ghost">Refresh</button>
          <button onClick={restartServer}>Restart Server</button>
        </div>
      </div>

      <div className="card card-gold animate-up">
        <span className="section-label">Admin Token</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="password"
            value={token}
            onChange={(e) => saveToken(e.target.value)}
            placeholder="Paste ADMIN_TOKEN"
            style={{ flex: 1 }}
          />
        </div>
        {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
      </div>

      <div className="card animate-up-2">
        <span className="section-label">Active Lobbies ({lobbies.length})</span>
        {lobbies.length === 0 ? (
          <p>No active lobbies.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
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
                    <td style={{ color: "var(--gold)", fontFamily: "var(--font-d)", letterSpacing: "0.1em" }}>{l.code}</td>
                    <td>
                      <span style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: "0.65rem",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        background: l.status === "in_progress" ? "rgba(61,186,110,0.12)" : "rgba(122,118,144,0.1)",
                        color: l.status === "in_progress" ? "var(--green)" : "var(--text-dim)",
                        border: `1px solid ${l.status === "in_progress" ? "rgba(61,186,110,0.3)" : "var(--border)"}`,
                      }}>
                        {l.status}
                      </span>
                    </td>
                    <td>{l.playerCount}</td>
                    <td>{l.connectedCount}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{l.pot}</td>
                    <td style={{ fontSize: "0.78rem" }}>{new Date(l.createdAt).toLocaleString()}</td>
                    <td>
                      <button onClick={() => closeLobby(l.code)} style={{ padding: "4px 10px", fontSize: "0.65rem" }}>
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
