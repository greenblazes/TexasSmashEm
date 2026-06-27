import { nanoid } from "nanoid";
import { DEFAULTS } from "./economy.js";

const MAX_PLAYERS = 24;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const lobbies = new Map(); // code -> lobby

function freshPlayerEconomy() {
  return {
    chips: 0, // assigned at tournament start
    boons: 0,
    texasTPick: null,
    hasTrumpCard: false,
    matchPredictions: {}, // matchId -> predicted winnerId
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
        points: 0,
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
      buyBoonsCost: DEFAULTS.buyBoonsCost,
      buyBoonsAmount: DEFAULTS.buyBoonsAmount,
      stockPool: DEFAULTS.stockPool.map((s) => ({ ...s })),
      bonusPoints: { ...DEFAULTS.bonusPoints },
    },
    pot: 0,
    firstMatchCompleted: false,
    boonPlacements: {}, // matchId -> { participantId: totalBoonsPlaced }
    stockBets: {}, // matchId -> [{ playerId, stocks, wager, riders: [] }]
    champion: null,
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
    points: 0,
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
