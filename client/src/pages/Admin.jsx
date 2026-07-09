import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useLobby } from "../lib/LobbyContext.jsx";
import AdminTools from "../components/AdminTools.jsx";

export default function Admin() {
  const { code } = useParams();
  const { lobby, playerId, isHost, rejoinAttempted } = useLobby();
  const navigate = useNavigate();

  useEffect(() => {
    if (rejoinAttempted && !lobby) navigate("/", { replace: true });
    else if (lobby && !isHost) navigate(`/lobby/${code}`, { replace: true });
  }, [rejoinAttempted, lobby, isHost, code, navigate]);

  if (!lobby || !isHost) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="wordmark">Host Admin</span>
          <span className="page-subtitle">
            Lobby {lobby.code} · {lobby.status} · Pot: {lobby.pot} chips
          </span>
        </div>
        <div className="page-header-right">
          <Link to={`/lobby/${lobby.code}`}>← Lobby View</Link>
        </div>
      </div>

      <AdminTools lobby={lobby} playerId={playerId} />
    </div>
  );
}
