import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  createLobby,
  getLobby,
  addPlayer,
  removeLobby,
  listLobbies,
} from "./lobbyStore.js";
import {
  startTournament,
  startMatch,
  initMatchPreBet,
  submitParticipantBoons,
  revealAndStartSpectators,
  advanceSpectatorTurn,
  spectatorDone,
  setTexasTPick,
  setMatchPrediction,
  buyBoons,
  placeBoon,
  getMatchHandicap,
  placeStockBet,
  rideDouble,
  playTrumpCard,
  reportMatchResult,
  divvyUp,
} from "./gameEngine.js";

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

function roomName(code) {
  return `lobby:${code}`;
}

// Hide sealed boon amounts during participant phase — clients only see submitted/not-submitted.
function sanitizeLobby(lobby) {
  if (!lobby.matchPreBet || Object.keys(lobby.matchPreBet).length === 0) return lobby;
  const sanitizedPreBet = {};
  for (const [matchId, preBet] of Object.entries(lobby.matchPreBet)) {
    if (preBet.phase === "participants") {
      sanitizedPreBet[matchId] = {
        ...preBet,
        sealedBoons: Object.fromEntries(preBet.participants.map((id) => [id, id in preBet.sealedBoons])),
      };
    } else {
      sanitizedPreBet[matchId] = preBet;
    }
  }
  return { ...lobby, matchPreBet: sanitizedPreBet };
}

function broadcastLobby(code) {
  const lobby = getLobby(code);
  if (!lobby) return;
  io.to(roomName(code)).emit("lobby:state", sanitizeLobby(lobby));
}

// ── Pre-bet turn timer management ─────────────────────────────────────────────
const turnTimers = new Map(); // matchId -> timeoutHandle

function clearTurnTimer(matchId) {
  if (turnTimers.has(matchId)) {
    clearTimeout(turnTimers.get(matchId));
    turnTimers.delete(matchId);
  }
}

function scheduleTurnTimer(code, matchId) {
  const lobby = getLobby(code);
  if (!lobby) return;
  const preBet = lobby.matchPreBet?.[matchId];
  if (!preBet || preBet.phase === "complete") return;

  clearTurnTimer(matchId);
  if (preBet.deadline == null) return; // countdown disabled for this phase — wait for input only

  const delay = Math.max(0, preBet.deadline - Date.now());

  const handle = setTimeout(() => {
    turnTimers.delete(matchId);
    const l = getLobby(code);
    if (!l) return;
    const pb = l.matchPreBet?.[matchId];
    if (!pb) return;
    if (pb.phase === "participants") {
      revealAndStartSpectators(l, matchId);
    } else if (pb.phase === "spectators") {
      advanceSpectatorTurn(l, matchId);
    }
    broadcastLobby(code);
    scheduleTurnTimer(code, matchId);
  }, delay);

  turnTimers.set(matchId, handle);
}

function initPreBetForReadyMatches(lobby) {
  const readyMatches = lobby.bracket?.rounds.flat().filter((m) => m.status === "ready") || [];
  for (const m of readyMatches) {
    initMatchPreBet(lobby, m.id);
    scheduleTurnTimer(lobby.code, m.id);
  }
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PM2_PROCESS_NAME = process.env.PM2_PROCESS_NAME || "texassmashem-server";

function requireAdminToken(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: "ADMIN_TOKEN is not configured on the server" });
  }
  const provided = req.get("x-admin-token");
  if (provided !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Invalid or missing admin token" });
  }
  next();
}

app.get("/admin/lobbies", requireAdminToken, (req, res) => {
  const summaries = listLobbies().map((lobby) => ({
    code: lobby.code,
    status: lobby.status,
    playerCount: lobby.players.length,
    connectedCount: lobby.players.filter((p) => p.connected).length,
    pot: lobby.pot,
    createdAt: lobby.createdAt,
  }));
  res.json({ lobbies: summaries });
});

app.post("/admin/lobbies/:code/close", requireAdminToken, (req, res) => {
  const lobby = getLobby(req.params.code);
  if (!lobby) return res.status(404).json({ error: "Lobby not found" });
  io.to(roomName(lobby.code)).emit("lobby:closed");
  removeLobby(lobby.code);
  res.json({ ok: true });
});

app.post("/admin/restart", requireAdminToken, async (req, res) => {
  try {
    const pm2 = await import("pm2");
    pm2.default.connect((connectErr) => {
      if (connectErr) {
        res.status(500).json({ error: `Could not connect to pm2: ${connectErr.message}` });
        return;
      }
      pm2.default.restart(PM2_PROCESS_NAME, (restartErr) => {
        pm2.default.disconnect();
        if (restartErr) {
          res.status(500).json({ error: `pm2 restart failed: ${restartErr.message}` });
          return;
        }
        res.json({ ok: true });
      });
    });
  } catch (err) {
    res.status(500).json({
      error: `Restart unavailable — this process must be running under pm2 (see PM2_PROCESS_NAME). ${err.message}`,
    });
  }
});

function requireHost(lobby, playerId) {
  if (!lobby) throw new Error("Lobby not found");
  if (lobby.hostPlayerId !== playerId) throw new Error("Only the host can do this");
}

io.on("connection", (socket) => {
  socket.on("host:create", ({ hostName }, ack) => {
    try {
      if (!hostName || !hostName.trim()) throw new Error("Host name required");
      const lobby = createLobby(hostName.trim());
      const player = lobby.players[0];
      player.socketId = socket.id;
      socket.join(roomName(lobby.code));
      ack?.({ ok: true, code: lobby.code, playerId: player.id });
      broadcastLobby(lobby.code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:join", ({ code, playerName }, ack) => {
    try {
      if (!playerName || !playerName.trim()) throw new Error("Name required");
      const { lobby, player } = addPlayer(code, playerName.trim());
      player.socketId = socket.id;
      socket.join(roomName(lobby.code));
      ack?.({ ok: true, code: lobby.code, playerId: player.id });
      broadcastLobby(lobby.code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("session:rejoin", ({ code, playerId }, ack) => {
    try {
      const lobby = getLobby(code);
      if (!lobby) throw new Error("Lobby not found");
      const player = lobby.players.find((p) => p.id === playerId);
      if (!player) throw new Error("Player not found in lobby");
      player.socketId = socket.id;
      player.connected = true;
      socket.join(roomName(lobby.code));
      ack?.({ ok: true, lobby });
      broadcastLobby(lobby.code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:start", ({ code, playerId }, ack) => {
    try {
      const lobby = getLobby(code);
      requireHost(lobby, playerId);
      startTournament(lobby);
      initPreBetForReadyMatches(lobby);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:updateSettings", ({ code, playerId, settings }, ack) => {
    try {
      const lobby = getLobby(code);
      requireHost(lobby, playerId);
      if (lobby.status !== "waiting") throw new Error("Cannot change settings after start");
      Object.assign(lobby.settings, settings);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:reportResult", ({ code, playerId, matchId, winnerId, remainingStocks }, ack) => {
    try {
      const lobby = getLobby(code);
      requireHost(lobby, playerId);
      if (!lobby.bracket) throw new Error("Tournament not started");
      clearTurnTimer(matchId);
      reportMatchResult(lobby, matchId, winnerId, remainingStocks);
      // Pre-betting for the next match does NOT start automatically here — the host
      // clicks "Next Round" (below) once the next two participants are ready.
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:nextRound", ({ code, playerId }, ack) => {
    try {
      const lobby = getLobby(code);
      requireHost(lobby, playerId);
      if (!lobby.bracket) throw new Error("Tournament not started");
      initPreBetForReadyMatches(lobby);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:divvyUp", ({ code, playerId }, ack) => {
    try {
      const lobby = getLobby(code);
      requireHost(lobby, playerId);
      const payouts = divvyUp(lobby);
      ack?.({ ok: true, payouts });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:setTPick", ({ code, playerId, pickPlayerId }, ack) => {
    try {
      const lobby = getLobby(code);
      setTexasTPick(lobby, playerId, pickPlayerId);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:setMatchPrediction", ({ code, playerId, matchId, predictedWinnerId }, ack) => {
    try {
      const lobby = getLobby(code);
      setMatchPrediction(lobby, playerId, matchId, predictedWinnerId);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:buyBoons", ({ code, playerId }, ack) => {
    try {
      const lobby = getLobby(code);
      buyBoons(lobby, playerId);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:placeBoon", ({ code, playerId, matchId, targetParticipantId, amount }, ack) => {
    try {
      const lobby = getLobby(code);
      placeBoon(lobby, playerId, matchId, targetParticipantId, amount);
      ack?.({ ok: true, handicap: getMatchHandicap(lobby, matchId) });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:placeStockBet", ({ code, playerId, matchId, stocks, wager }, ack) => {
    try {
      const lobby = getLobby(code);
      placeStockBet(lobby, playerId, matchId, stocks, wager);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:rideDouble", ({ code, playerId, matchId, stocks }, ack) => {
    try {
      const lobby = getLobby(code);
      rideDouble(lobby, playerId, matchId, stocks);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:playTrumpCard", ({ code, playerId, matchId, targetParticipantId }, ack) => {
    try {
      const lobby = getLobby(code);
      playTrumpCard(lobby, playerId, matchId, targetParticipantId);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:submitParticipantBoons", ({ code, playerId, matchId, amount }, ack) => {
    try {
      const lobby = getLobby(code);
      const allDone = submitParticipantBoons(lobby, matchId, playerId, amount);
      if (allDone) {
        clearTurnTimer(matchId);
        revealAndStartSpectators(lobby, matchId);
        scheduleTurnTimer(code, matchId);
      }
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("player:spectatorDone", ({ code, playerId, matchId }, ack) => {
    try {
      const lobby = getLobby(code);
      clearTurnTimer(matchId);
      spectatorDone(lobby, matchId, playerId);
      scheduleTurnTimer(code, matchId);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:startMatch", ({ code, playerId, matchId }, ack) => {
    try {
      const lobby = getLobby(code);
      requireHost(lobby, playerId);
      startMatch(lobby, matchId);
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:adjustChips", ({ code, playerId, targetPlayerId, delta }, ack) => {
    try {
      const lobby = getLobby(code);
      requireHost(lobby, playerId);
      const target = lobby.players.find((p) => p.id === targetPlayerId);
      if (!target) throw new Error("Player not found");
      target.chips += Number(delta) || 0;
      ack?.({ ok: true });
      broadcastLobby(code);
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("host:closeLobby", ({ code, playerId }, ack) => {
    try {
      const lobby = getLobby(code);
      requireHost(lobby, playerId);
      io.to(roomName(code)).emit("lobby:closed");
      removeLobby(code);
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("disconnect", () => {
    for (const code of socket.rooms) {
      if (!code.startsWith("lobby:")) continue;
      const lobbyCode = code.replace("lobby:", "");
      const lobby = getLobby(lobbyCode);
      if (!lobby) continue;
      const player = lobby.players.find((p) => p.socketId === socket.id);
      if (player) {
        player.connected = false;
        broadcastLobby(lobbyCode);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`TexasSmashEm server listening on port ${PORT}`);
});
