// Client-side mirror of server/src/lobbyStore.js's lobby/player shape, for the
// /test tournament simulator. Builds an in-memory lobby object with no server.
import { DEFAULTS } from "./economy.js";

function id(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len).padEnd(len, "0");
}

function freshPlayerEconomy() {
  return {
    chips: 0,
    boons: 0,
    texasTPick: null,
    hasTrumpCard: false,
    matchPredictions: {},
  };
}

export function makePlayer(name, isHost) {
  return {
    id: id(10),
    name,
    isHost,
    connected: true,
    points: 0,
    eliminated: false,
    socketId: null,
    ...freshPlayerEconomy(),
  };
}

export function createMockLobby(playerNames) {
  const players = playerNames.map((name, i) => makePlayer(name, i === 0));
  return {
    code: "TEST12",
    hostPlayerId: players[0].id,
    status: "waiting", // waiting | in_progress | complete
    players,
    bracket: null,
    createdAt: Date.now(),
    settings: {
      startingChips: DEFAULTS.startingChips,
      startingBoons: DEFAULTS.startingBoons,
      anteAmount: DEFAULTS.anteAmount,
      buyBoonsCost: DEFAULTS.buyBoonsCost,
      buyBoonsAmount: DEFAULTS.buyBoonsAmount,
      cowFeedBase: DEFAULTS.cowFeedBase,
      cowFeedBonusMultiplier: DEFAULTS.cowFeedBonusMultiplier,
      turnDurationMs: DEFAULTS.turnDurationMs,
      stockPool: DEFAULTS.stockPool.map((s) => ({ ...s })),
      bonusPoints: { ...DEFAULTS.bonusPoints },
    },
    pot: 0,
    firstMatchCompleted: false,
    boonPlacements: {},
    stockBets: {},
    matchPreBet: {},
    champion: null,
  };
}
