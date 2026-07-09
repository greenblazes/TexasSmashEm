// Client-side mirror of server/src/gameEngine.js for the /test tournament simulator.
// Kept behaviorally identical to the server copy so the simulator's rules, math, and
// state machine exactly match production. Only the import paths differ (point at the
// local bracket.js/economy.js copies instead of the server ones).

import { buildBracket, startMatch as bracketStartMatch, reportResult as bracketReportResult, isTournamentComplete, getChampion } from "./bracket.js";
import { boonHandicapPercent, cowFeed } from "./economy.js";

function findMatch(bracket, matchId) {
  for (const round of bracket.rounds) {
    const m = round.find((mm) => mm.id === matchId);
    if (m) return m;
  }
  return null;
}

function participantIds(match) {
  return [match.playerA, match.playerB].filter(Boolean);
}

export function startTournament(lobby) {
  if (lobby.status !== "waiting") throw new Error("Tournament already started");
  if (lobby.players.length < 2) throw new Error("Need at least 2 players");
  if (lobby.players.some((p) => !p.texasTPick)) {
    throw new Error("Every player must select a Texas T-Pick before the tournament can start");
  }

  const { startingChips, startingBoons, anteAmount } = lobby.settings;
  for (const p of lobby.players) {
    if (p.chips < anteAmount) {
      p.chips = startingChips; // grant starting stack if short
    }
    p.chips -= anteAmount;
    lobby.pot += anteAmount;
    p.boons = startingBoons;
    p.boonsPlaced = 0;
    p.eliminated = false;
    p.hasTrumpCard = false;
    p.matchPredictions = {};
    p.bonusHistory = [];
  }

  lobby.bracket = buildBracket(lobby.players.map((p) => ({ id: p.id, name: p.name })));
  lobby.status = "in_progress";
}

export function setTexasTPick(lobby, playerId, pickPlayerId) {
  if (lobby.status !== "waiting") {
    throw new Error("Texas T-Pick can only be set before the tournament starts");
  }
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  if (!lobby.players.some((p) => p.id === pickPlayerId)) {
    throw new Error("Texas T-Pick must be a player in the lobby");
  }
  player.texasTPick = pickPlayerId;
}

export function setMatchPrediction(lobby, playerId, matchId, predictedWinnerId) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  const match = findMatch(lobby.bracket, matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "ready") throw new Error("Match is not open for predictions");
  const participants = participantIds(match);
  if (participants.includes(playerId)) {
    throw new Error("Match participants cannot predict their own match");
  }
  if (!participants.includes(predictedWinnerId)) {
    throw new Error("Prediction must be one of the two match participants");
  }

  const preBet = lobby.matchPreBet[matchId];
  if (preBet) {
    if (preBet.phase !== "spectators") throw new Error(
      preBet.phase === "participants"
        ? "Predictions open once spectator turns begin"
        : "Pre-match betting is closed"
    );
    if (preBet.spectatorOrder[preBet.currentTurnIdx] !== playerId) throw new Error("It is not your turn");
  }

  player.matchPredictions[matchId] = predictedWinnerId;

  const existingBet = (lobby.stockBets[matchId] || []).find((b) => b.playerId === playerId);
  if (existingBet) existingBet.predictedWinnerId = predictedWinnerId;
}

export function buyBoons(lobby, playerId, quantity = 1) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  const totalCost = lobby.settings.boonCost * quantity;
  if (player.chips < totalCost) throw new Error("Not enough chips");
  player.chips -= totalCost;
  player.boons += quantity;
  lobby.pot += totalCost;
}

// ── Pre-bet phase helpers ─────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initMatchPreBet(lobby, matchId) {
  const match = findMatch(lobby.bracket, matchId);
  if (!match || match.status !== "ready") return;
  if (lobby.matchPreBet[matchId]) return; // already initialised

  const participants = participantIds(match);
  const spectatorOrder = shuffle(
    lobby.players.filter((p) => !participants.includes(p.id)).map((p) => p.id)
  );

  lobby.matchPreBet[matchId] = {
    phase: "participants", // participants | spectators | complete
    turnDurationMs: lobby.settings.turnDurationMs,
    deadline: lobby.settings.disableParticipantCountdown ? null : Date.now() + lobby.settings.turnDurationMs,
    participants,
    sealedBoons: {},
    spectatorOrder,
    currentTurnIdx: 0,
    turnActions: {},
  };
}

export function submitParticipantBoons(lobby, matchId, playerId, amount) {
  const preBet = lobby.matchPreBet[matchId];
  if (!preBet || preBet.phase !== "participants") throw new Error("Not in participant boon phase");
  if (!preBet.participants.includes(playerId)) throw new Error("Only match participants can submit in this phase");
  if (playerId in preBet.sealedBoons) throw new Error("Already submitted");

  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  const qty = Number(amount);
  if (!Number.isInteger(qty) || qty < 0) throw new Error("Amount must be a non-negative integer");
  if (qty > 0 && player.boons < qty) throw new Error("Not enough boons");
  if (qty > 0) {
    player.boons -= qty;
    player.boonsPlaced += qty;
  }

  preBet.sealedBoons[playerId] = qty;
  return preBet.participants.every((id) => id in preBet.sealedBoons);
}

// Client-side mirror of server/src/index.js's sanitizeLobby — hides sealed boon
// amounts during the participant phase so the UI only sees submitted/not-submitted,
// matching what a real server broadcast would deliver. Non-mutating: the raw amounts
// stay on the source lobby object for revealAndStartSpectators to consume later.
export function sanitizeLobby(lobby) {
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

export function revealAndStartSpectators(lobby, matchId) {
  const preBet = lobby.matchPreBet[matchId];
  if (!preBet || preBet.phase !== "participants") return;

  for (const [participantId, qty] of Object.entries(preBet.sealedBoons)) {
    if (qty > 0) {
      if (!lobby.boonPlacements[matchId]) lobby.boonPlacements[matchId] = {};
      lobby.boonPlacements[matchId][participantId] = (lobby.boonPlacements[matchId][participantId] || 0) + qty;
    }
  }

  if (preBet.spectatorOrder.length === 0) {
    preBet.phase = "complete";
    return;
  }

  preBet.phase = "spectators";
  preBet.currentTurnIdx = 0;
  preBet.deadline = lobby.settings.disableSpectatorCountdown ? null : Date.now() + preBet.turnDurationMs;
}

export function advanceSpectatorTurn(lobby, matchId) {
  const preBet = lobby.matchPreBet[matchId];
  if (!preBet || preBet.phase !== "spectators") return true;

  preBet.currentTurnIdx += 1;
  if (preBet.currentTurnIdx >= preBet.spectatorOrder.length) {
    preBet.phase = "complete";
    return true;
  }

  preBet.deadline = lobby.settings.disableSpectatorCountdown ? null : Date.now() + preBet.turnDurationMs;
  return false;
}

export function spectatorDone(lobby, matchId, playerId) {
  const preBet = lobby.matchPreBet[matchId];
  if (!preBet || preBet.phase !== "spectators") throw new Error("Not in spectator turn phase");
  const current = preBet.spectatorOrder[preBet.currentTurnIdx];
  if (playerId !== current) throw new Error("It is not your turn");
  return advanceSpectatorTurn(lobby, matchId);
}

// ── Match start ───────────────────────────────────────────────────────────────

export function startMatch(lobby, matchId) {
  const preBet = lobby.matchPreBet[matchId];
  if (preBet && preBet.phase !== "complete") throw new Error("Pre-match betting has not concluded yet");
  const match = findMatch(lobby.bracket, matchId);
  if (!match) throw new Error("Match not found");
  bracketStartMatch(lobby.bracket, matchId);
}

export function placeBoon(lobby, playerId, matchId, targetParticipantId, amount) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  const match = findMatch(lobby.bracket, matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "ready") throw new Error("Match is not open for boons");

  const preBet = lobby.matchPreBet[matchId];
  if (preBet) {
    if (preBet.phase !== "spectators") throw new Error(
      preBet.phase === "participants"
        ? "Participants are placing boons — spectator turns haven't started yet"
        : "Pre-match betting is closed"
    );
    if (preBet.spectatorOrder[preBet.currentTurnIdx] !== playerId) throw new Error("It is not your turn");
  }

  const participants = participantIds(match);
  if (!participants.includes(targetParticipantId)) throw new Error("Boon target must be a match participant");
  const qty = Number(amount);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error("Boon amount must be a positive integer");
  if (player.boons < qty) throw new Error("Not enough boons");

  player.boons -= qty;
  player.boonsPlaced += qty;
  if (!lobby.boonPlacements[matchId]) lobby.boonPlacements[matchId] = {};
  lobby.boonPlacements[matchId][targetParticipantId] = (lobby.boonPlacements[matchId][targetParticipantId] || 0) + qty;

  if (preBet) {
    if (!preBet.turnActions[playerId]) preBet.turnActions[playerId] = { boons: {}, bet: null, rideDouble: null };
    preBet.turnActions[playerId].boons[targetParticipantId] = (preBet.turnActions[playerId].boons[targetParticipantId] || 0) + qty;
  }
}

export function getMatchHandicap(lobby, matchId) {
  const match = findMatch(lobby.bracket, matchId);
  if (!match) return null;
  const placements = lobby.boonPlacements[matchId] || {};
  const aBoons = placements[match.playerA] || 0;
  const bBoons = placements[match.playerB] || 0;
  const diff = Math.abs(aBoons - bBoons);
  const percent = boonHandicapPercent(diff);
  const handicappedPlayerId = aBoons === bBoons ? null : aBoons < bBoons ? match.playerA : match.playerB;
  return { aBoons, bBoons, diff, percent, handicappedPlayerId };
}

export function placeStockBet(lobby, playerId, matchId, stocks, wager) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  if (!player.eliminated) throw new Error("Only eliminated players may place Stock Bets");
  const match = findMatch(lobby.bracket, matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "ready") throw new Error("Match is not open for Stock Bets");

  const preBet = lobby.matchPreBet[matchId];
  if (preBet) {
    if (preBet.phase !== "spectators") throw new Error(
      preBet.phase === "participants" ? "Spectator turns haven't started yet" : "Pre-match betting is closed"
    );
    if (preBet.spectatorOrder[preBet.currentTurnIdx] !== playerId) throw new Error("It is not your turn");
  }

  const predictedWinnerId = player.matchPredictions[matchId] ?? null;

  const slot = lobby.settings.stockPool.find((s) => s.stocks === Number(stocks));
  if (!slot) throw new Error("Invalid Stock Pool slot");
  const amount = Number(wager);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Wager must be a positive integer");
  if (player.chips < amount) throw new Error("Not enough chips");
  if (!lobby.stockBets[matchId]) lobby.stockBets[matchId] = [];
  if (lobby.stockBets[matchId].find((b) => b.playerId === playerId)) throw new Error("You already placed a Stock Bet on this match");
  if (lobby.stockBets[matchId].find((b) => b.stocks === Number(stocks))) throw new Error("Someone already holds that slot");

  player.chips -= amount;
  lobby.stockBets[matchId].push({ playerId, stocks: Number(stocks), wager: amount, predictedWinnerId, riders: [] });

  if (preBet) {
    if (!preBet.turnActions[playerId]) preBet.turnActions[playerId] = { boons: {}, bet: null, rideDouble: null };
    preBet.turnActions[playerId].bet = { stocks: Number(stocks), wager: amount };
  }
}

export function rideDouble(lobby, playerId, matchId, stocks) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  if (!player.eliminated) throw new Error("Only eliminated players may Ride Double");
  if (player.chips > 0) throw new Error("Riding Double requires having no chips");
  const rideMatch = findMatch(lobby.bracket, matchId);
  if (!rideMatch || rideMatch.status !== "ready") throw new Error("Match has already started — bets are locked");

  const preBet = lobby.matchPreBet[matchId];
  if (preBet) {
    if (preBet.phase !== "spectators") throw new Error(
      preBet.phase === "participants" ? "Spectator turns haven't started yet" : "Pre-match betting is closed"
    );
    if (preBet.spectatorOrder[preBet.currentTurnIdx] !== playerId) throw new Error("It is not your turn");
  }

  const bets = lobby.stockBets[matchId] || [];
  const bet = bets.find((b) => b.stocks === Number(stocks));
  if (!bet) throw new Error("No Stock Bet on that slot");
  if (bet.riders.length >= 1) throw new Error("That bet already has a rider stacked on it");
  bet.riders.push(playerId);

  if (preBet) {
    if (!preBet.turnActions[playerId]) preBet.turnActions[playerId] = { boons: {}, bet: null, rideDouble: null };
    preBet.turnActions[playerId].rideDouble = { stocks: Number(stocks) };
  }
}

export function playTrumpCard(lobby, playerId, matchId, targetParticipantId) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  if (!player.hasTrumpCard) throw new Error("Player does not hold the Trump Card");
  const match = findMatch(lobby.bracket, matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "ready") throw new Error("Match has already started — Trump Card must be played before the match begins");
  if (!participantIds(match).includes(targetParticipantId)) {
    throw new Error("Trump Card target must be a match participant");
  }
  if (lobby.boonPlacements[matchId]) {
    delete lobby.boonPlacements[matchId][targetParticipantId];
  }
  player.hasTrumpCard = false;
}

export function reportMatchResult(lobby, matchId, winnerId, remainingStocks) {
  const match = findMatch(lobby.bracket, matchId);
  if (!match) throw new Error("Match not found");
  const wasFirstMatch = !lobby.firstMatchCompleted;

  bracketReportResult(lobby.bracket, matchId, winnerId);

  const loserId = winnerId === match.playerA ? match.playerB : match.playerA;
  const winner = lobby.players.find((p) => p.id === winnerId);
  const loser = lobby.players.find((p) => p.id === loserId);

  const stocks = Math.max(0, Number(remainingStocks) || 0);

  if (winner) winner.boons += stocks;
  if (loser) {
    loser.boons += 2;
    loser.eliminated = true;
  }

  if (wasFirstMatch && loser) {
    loser.hasTrumpCard = true;
  }
  lobby.firstMatchCompleted = true;

  const spectators = lobby.players.filter(
    (p) => p.id !== match.playerA && p.id !== match.playerB
  );
  const correct = spectators.filter(
    (p) => match.id in p.matchPredictions && p.matchPredictions[match.id] === winnerId
  );
  const { base, bonus } = cowFeed(
    spectators.length,
    correct.length,
    lobby.settings.cowFeedBase,
    lobby.settings.cowFeedBonusMultiplier
  );
  for (const p of spectators) p.chips += base;
  for (const p of correct) p.chips += bonus;

  const bets = lobby.stockBets[matchId] || [];
  for (const bet of bets) {
    const bettor = lobby.players.find((p) => p.id === bet.playerId);
    const predictionCorrect = bet.predictedWinnerId === winnerId;
    if (predictionCorrect && bet.stocks === stocks) {
      const slot = lobby.settings.stockPool.find((s) => s.stocks === bet.stocks);
      const totalWinnings = bet.wager * (slot?.multiplier ?? 1);
      const riderCount = bet.riders.length;
      if (riderCount === 0) {
        if (bettor) bettor.chips += totalWinnings;
      } else if (riderCount === 1) {
        const half = Math.floor(totalWinnings / 2);
        if (bettor) bettor.chips += half;
        const rider = lobby.players.find((p) => p.id === bet.riders[0]);
        if (rider) rider.chips += half;
      } else {
        const third = Math.floor(totalWinnings / 3);
        if (bettor) bettor.chips += third;
        for (const riderId of bet.riders) {
          const rider = lobby.players.find((p) => p.id === riderId);
          if (rider) rider.chips += third;
        }
      }
    } else {
      lobby.pot += bet.wager;
    }
  }
  delete lobby.stockBets[matchId];
  delete lobby.matchPreBet[matchId];

  if (isTournamentComplete(lobby.bracket)) {
    lobby.status = "complete";
    lobby.champion = getChampion(lobby.bracket);
    applyEndOfTournamentBonuses(lobby);
  }
}

function applyEndOfTournamentBonuses(lobby) {
  const { bonusChips } = lobby.settings;
  const champion = lobby.champion;
  const allMatches = lobby.bracket.rounds.flat().filter((m) => m.winnerId);
  const finalMatch = lobby.bracket.rounds[lobby.bracket.rounds.length - 1][0];

  for (const player of lobby.players) {
    player.bonusHistory = [];

    const eligibleMatches = allMatches.filter(
      (m) => m.playerA !== player.id && m.playerB !== player.id
    );
    if (eligibleMatches.length > 0) {
      const allCorrect = eligibleMatches.every(
        (m) => player.matchPredictions[m.id] === m.winnerId
      );
      if (allCorrect) {
        player.chips += bonusChips.cleanSweep;
        player.bonusHistory.push("cleanSweep");
      }
    }

    if (player.texasTPick) {
      const matchesAgainstPick = allMatches.filter(
        (m) =>
          (m.playerA === player.id && m.playerB === player.texasTPick) ||
          (m.playerB === player.id && m.playerA === player.texasTPick)
      );
      for (const m of matchesAgainstPick) {
        if (m.winnerId === player.id) {
          player.chips += bonusChips.doubleCross;
          player.bonusHistory.push("doubleCross");
        } else {
          player.chips += bonusChips.bushwhacked;
          player.bonusHistory.push("bushwhacked");
        }
      }
    }

    if (champion && player.texasTPick === champion.id) {
      player.chips += bonusChips.tPickCorrect;
      player.bonusHistory.push("tPickCorrect");
    }

    if (
      finalMatch?.winnerId === player.id &&
      player.texasTPick &&
      (finalMatch.playerA === player.texasTPick || finalMatch.playerB === player.texasTPick)
    ) {
      player.chips += bonusChips.showdown;
      player.bonusHistory.push("showdown");
    }
  }
}

export function divvyUp(lobby) {
  if (lobby.status !== "complete") throw new Error("Tournament is not complete");

  const eliminationOrder = lobby.bracket.rounds
    .flat()
    .filter((m) => m.winnerId)
    .map((m) => ({ loserId: m.winnerId === m.playerA ? m.playerB : m.playerA, round: m.round }))
    .filter((x) => x.loserId)
    .sort((a, b) => b.round - a.round)
    .map((x) => x.loserId);

  const order = [lobby.champion?.id, ...eliminationOrder].filter(Boolean);
  const uniqueOrder = [...new Set(order)];

  const weights = new Map(
    uniqueOrder.map((id) => {
      const p = lobby.players.find((pl) => pl.id === id);
      return [id, Math.max(0, p?.chips || 0) || 1];
    })
  );

  let pot = lobby.pot;
  const payouts = new Map(uniqueOrder.map((id) => [id, 0]));
  let guard = 0;
  while (pot > 0 && guard < 10000) {
    for (const id of uniqueOrder) {
      if (pot <= 0) break;
      const give = Math.min(weights.get(id), pot);
      payouts.set(id, payouts.get(id) + give);
      pot -= give;
    }
    guard++;
  }

  for (const [id, amount] of payouts) {
    const p = lobby.players.find((pl) => pl.id === id);
    if (p) p.chips += amount;
  }
  lobby.pot = 0;
  lobby.divvied = true;
  return Object.fromEntries(payouts);
}
