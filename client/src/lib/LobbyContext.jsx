import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { socket, emitAck } from "./socket.js";
import { saveSession, loadSession, clearSession } from "./session.js";

const LobbyContext = createContext(null);

let rewardIdCounter = 0;

export function LobbyProvider({ children }) {
  const [lobby, setLobby] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [error, setError] = useState(null);
  const [rejoinAttempted, setRejoinAttempted] = useState(false);
  const [rewards, setRewards] = useState([]);
  const prevStatsRef = useRef(null); // { id, chips, points }

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

  // Whenever this player's chips or points go up, queue a reward popup for the
  // gain. Diffing against the previous snapshot (rather than a server-pushed
  // "you earned X" event) means it fires for every source of chips/points —
  // Cow Feed, Stock Bets, Divvy Up, end-of-tournament bonuses — without the
  // server needing to know about the animation.
  useEffect(() => {
    if (!me) {
      prevStatsRef.current = null;
      return;
    }
    const prev = prevStatsRef.current;
    if (prev && prev.id === me.id) {
      const chipsGained = me.chips - prev.chips;
      const pointsGained = me.points - prev.points;
      if (chipsGained > 0) {
        setRewards((r) => [...r, { id: ++rewardIdCounter, kind: "chips", amount: chipsGained }]);
      }
      if (pointsGained > 0) {
        setRewards((r) => [...r, { id: ++rewardIdCounter, kind: "points", amount: pointsGained }]);
      }
    }
    prevStatsRef.current = { id: me.id, chips: me.chips, points: me.points };
  }, [me?.id, me?.chips, me?.points]);

  const dismissReward = useCallback((id) => {
    setRewards((r) => r.filter((x) => x.id !== id));
  }, []);

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
    rewards,
    dismissReward,
  };

  return <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>;
}

export function useLobby() {
  const ctx = useContext(LobbyContext);
  if (!ctx) throw new Error("useLobby must be used within LobbyProvider");
  return ctx;
}
