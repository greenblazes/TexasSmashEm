import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { socket, emitAck } from "./socket.js";
import { saveSession, loadSession, clearSession } from "./session.js";

const LobbyContext = createContext(null);

export function LobbyProvider({ children }) {
  const [lobby, setLobby] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [error, setError] = useState(null);
  const [rejoinAttempted, setRejoinAttempted] = useState(false);

  useEffect(() => {
    function onState(newLobby) {
      setLobby(newLobby);
    }
    function onClosed() {
      setLobby(null);
      clearSession();
      setError("The host closed this lobby.");
    }
    socket.on("lobby:state", onState);
    socket.on("lobby:closed", onClosed);
    return () => {
      socket.off("lobby:state", onState);
      socket.off("lobby:closed", onClosed);
    };
  }, []);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      setRejoinAttempted(true);
      return;
    }
    emitAck("session:rejoin", session).then((res) => {
      if (res?.ok) {
        setPlayerId(session.playerId);
        setLobby(res.lobby);
      } else {
        clearSession();
      }
      setRejoinAttempted(true);
    });
  }, []);

  const createLobby = useCallback(async (hostName) => {
    const res = await emitAck("host:create", { hostName });
    if (res.ok) {
      saveSession(res.code, res.playerId);
      setPlayerId(res.playerId);
    }
    return res;
  }, []);

  const joinLobby = useCallback(async (code, playerName) => {
    const res = await emitAck("player:join", { code, playerName });
    if (res.ok) {
      saveSession(res.code, res.playerId);
      setPlayerId(res.playerId);
    }
    return res;
  }, []);

  const leaveSession = useCallback(() => {
    clearSession();
    setPlayerId(null);
    setLobby(null);
  }, []);

  const me = lobby?.players?.find((p) => p.id === playerId) || null;
  const isHost = !!me?.isHost;

  const value = {
    lobby,
    playerId,
    me,
    isHost,
    error,
    rejoinAttempted,
    createLobby,
    joinLobby,
    leaveSession,
    setError,
  };

  return <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>;
}

export function useLobby() {
  const ctx = useContext(LobbyContext);
  if (!ctx) throw new Error("useLobby must be used within LobbyProvider");
  return ctx;
}
