import { nanoid } from "nanoid";
import { DEFAULTS } from "./economy.js";

const MAX_PLAYERS = 24;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const lobbies = new Map(); // code -> lobby

function freshPlayerEconomy() {
  return {
    chips: 0, // assigned at tournament start
    boons: 0,
    boonsPlaced: 0, // cumulative count of boons this player has placed (on self or others)
    texasTPick: null,
    hasTrumpCard: false,
    matchPredictions: {}, // matchId -> predicted winnerId
    bonusHistory: [], // list of bonus types applied at tournament end, e.g. ["doubleCross", "showdown"]
  };
}

function generateCode() {
  let code;
  do {
    code = "";
    for (let i = 0; i < 5; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
  } while (lobbies.has(code));
  return code;
}

export function createLobby(hostName) {
  const code = generateCode();
  const hostPlayerId = nanoid(10);
  const lobby = {
    code,
    hostPlayerId,
    status: "waiting", // waiting | in_progress | complete
    players: [
      {
        id: hostPlayerId,
        name: hostName,
        isHost: true,
        connected: true,
        eliminated: false,
        socketId: null,
        ...freshPlayerEconomy(),
      },
    ],
    bracket: null,
    createdAt: Date.now(),
    settings: {
      startingChips: DEFAULTS.startingChips,
      startingBoons: DEFAULTS.startingBoons,
      anteAmount: DEFAULTS.anteAmount,
      boonCost: DEFAULTS.boonCost,
      cowFeedBase: DEFAULTS.cowFeedBase,
      cowFeedBonusMultiplier: DEFAULTS.cowFeedBonusMultiplier,
      turnDurationMs: DEFAULTS.turnDurationMs,
      disableParticipantCountdown: DEFAULTS.disableParticipantCountdown,
      disableSpectatorCountdown: DEFAULTS.disableSpectatorCountdown,
      stockPool: DEFAULTS.stockPool.map((s) => ({ ...s })),
      bonusChips: { ...DEFAULTS.bonusChips },
    },
    pot: 0,
    firstMatchCompleted: false,
    boonPlacements: {}, // matchId -> { participantId: totalBoonsPlaced }
    stockBets: {}, // matchId -> [{ playerId, stocks, wager, predictedWinnerId, riders: [] }]
    matchPreBet: {}, // matchId -> pre-bet phase state
    champion: null,
    divvied: false, // true once the host has run Divvy Up — client shows the Scoreboard
  };
  lobbies.set(code, lobby);
  return lobby;
}

export function getLobby(code) {
  return lobbies.get(code?.toUpperCase());
}

export function addPlayer(code, playerName) {
  const lobby = getLobby(code);
  if (!lobby) throw new Error("Lobby not found");
  if (lobby.status !== "waiting") throw new Error("Tournament already started");
  if (lobby.players.length >= MAX_PLAYERS) throw new Error("Lobby is full");
  const nameTaken = lobby.players.some(
    (p) => p.name.toLowerCase() === playerName.toLowerCase()
  );
  if (nameTaken) throw new Error("Name already taken in this lobby");

  const player = {
    id: nanoid(10),
    name: playerName,
    isHost: false,
    connected: true,
    eliminated: false,
    socketId: null,
    ...freshPlayerEconomy(),
  };
  lobby.players.push(player);
  return { lobby, player };
}

export function listLobbies() {
  return Array.from(lobbies.values());
}

export function removeLobby(code) {
  lobbies.delete(code?.toUpperCase());
}

export function findLobbyByPlayerId(playerId) {
  for (const lobby of lobbies.values()) {
    if (lobby.players.some((p) => p.id === playerId)) return lobby;
  }
  return null;
}

export const MAX_PLAYERS_ALLOWED = MAX_PLAYERS;
