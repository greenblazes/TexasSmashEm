import { buildBracket, reportResult as bracketReportResult, isTournamentComplete, getChampion } from "./bracket.js";
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

  const { startingChips, startingBoons, anteAmount } = lobby.settings;
  for (const p of lobby.players) {
    if (p.chips < anteAmount) {
      p.chips = startingChips; // grant starting stack if short
    }
    p.chips -= anteAmount;
    lobby.pot += anteAmount;
    p.boons = startingBoons;
    p.eliminated = false;
    p.hasTrumpCard = false;
    p.matchPredictions = {};
  }

  lobby.bracket = buildBracket(lobby.players.map((p) => ({ id: p.id, name: p.name })));
  lobby.status = "in_progress";
}

export function setTexasTPick(lobby, playerId, pickPlayerId) {
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
  player.matchPredictions[matchId] = predictedWinnerId;
}

export function buyBoons(lobby, playerId) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  const { buyBoonsCost, buyBoonsAmount } = lobby.settings;
  if (player.chips < buyBoonsCost) throw new Error("Not enough chips");
  player.chips -= buyBoonsCost;
  player.boons += buyBoonsAmount;
}

export function placeBoon(lobby, playerId, matchId, targetParticipantId, amount) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  const match = findMatch(lobby.bracket, matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "ready") throw new Error("Match is not open for boons");
  const participants = participantIds(match);
  if (!participants.includes(targetParticipantId)) {
    throw new Error("Boon target must be a match participant");
  }
  const qty = Number(amount);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error("Boon amount must be a positive integer");
  if (player.boons < qty) throw new Error("Not enough boons");

  player.boons -= qty;
  if (!lobby.boonPlacements[matchId]) lobby.boonPlacements[matchId] = {};
  const placements = lobby.boonPlacements[matchId];
  placements[targetParticipantId] = (placements[targetParticipantId] || 0) + qty;
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
  const slot = lobby.settings.stockPool.find((s) => s.stocks === Number(stocks));
  if (!slot) throw new Error("Invalid Stock Pool slot");
  const amount = Number(wager);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Wager must be a positive integer");
  if (player.chips < amount) throw new Error("Not enough chips");

  if (!lobby.stockBets[matchId]) lobby.stockBets[matchId] = [];
  const existing = lobby.stockBets[matchId].find((b) => b.stocks === Number(stocks));
  if (existing) throw new Error("Someone already holds that Stock Pool slot for this match");

  player.chips -= amount;
  lobby.stockBets[matchId].push({
    playerId,
    stocks: Number(stocks),
    wager: amount,
    riders: [],
  });
}

export function rideDouble(lobby, playerId, matchId, stocks) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  if (!player.eliminated) throw new Error("Only eliminated players may Ride Double");
  if (player.chips > 0) throw new Error("Riding Double requires having no chips");
  const bets = lobby.stockBets[matchId] || [];
  const bet = bets.find((b) => b.stocks === Number(stocks));
  if (!bet) throw new Error("No Stock Bet on that slot");
  if (bet.riders.length >= 1) throw new Error("That bet already has a rider stacked on it");
  bet.riders.push(playerId);
}

export function playTrumpCard(lobby, playerId, matchId, targetParticipantId) {
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");
  if (!player.hasTrumpCard) throw new Error("Player does not hold the Trump Card");
  const match = findMatch(lobby.bracket, matchId);
  if (!match) throw new Error("Match not found");
  if (!participantIds(match).includes(targetParticipantId)) {
    throw new Error("Trump Card target must be a match participant");
  }
  if (lobby.boonPlacements[matchId]) {
    delete lobby.boonPlacements[matchId][targetParticipantId];
  }
  player.hasTrumpCard = false;
}

// Host reports the match result, including the winner's remaining stocks.
// This drives Boons awarded, Cow Feed payouts, Stock Bet settlement, and Trump Card grant.
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

  // Cow Feed: pay everyone (excluding match participants) who predicted this match's winner.
  const predictors = lobby.players.filter(
    (p) => p.id !== match.playerA && p.id !== match.playerB && match.id in p.matchPredictions
  );
  const correct = predictors.filter((p) => p.matchPredictions[match.id] === winnerId);
  const incorrect = predictors.filter((p) => p.matchPredictions[match.id] !== winnerId);
  if (correct.length > 0) {
    const payout = cowFeed(correct.length, incorrect.length);
    for (const p of correct) p.chips += payout;
  }

  // Stock Bets settlement
  const bets = lobby.stockBets[matchId] || [];
  for (const bet of bets) {
    const bettor = lobby.players.find((p) => p.id === bet.playerId);
    if (bet.stocks === stocks) {
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

  if (isTournamentComplete(lobby.bracket)) {
    lobby.status = "complete";
    lobby.champion = getChampion(lobby.bracket);
    applyEndOfTournamentBonuses(lobby);
  }
}

function applyEndOfTournamentBonuses(lobby) {
  const { bonusPoints } = lobby.settings;
  const champion = lobby.champion;
  const allMatches = lobby.bracket.rounds.flat().filter((m) => m.winnerId);
  const finalMatch = lobby.bracket.rounds[lobby.bracket.rounds.length - 1][0];

  for (const player of lobby.players) {
    // Clean Sweep: correctly predicted every match they were eligible to predict.
    const eligibleMatches = allMatches.filter(
      (m) => m.playerA !== player.id && m.playerB !== player.id && m.id in player.matchPredictions
    );
    if (eligibleMatches.length > 0) {
      const allCorrect = eligibleMatches.every(
        (m) => player.matchPredictions[m.id] === m.winnerId
      );
      if (allCorrect) player.points += bonusPoints.cleanSweep;
    }

    // Double-Cross / Bushwhacked: player faced their own Texas T-Pick at some point.
    if (player.texasTPick) {
      const matchesAgainstPick = allMatches.filter(
        (m) =>
          (m.playerA === player.id && m.playerB === player.texasTPick) ||
          (m.playerB === player.id && m.playerA === player.texasTPick)
      );
      for (const m of matchesAgainstPick) {
        if (m.winnerId === player.id) {
          player.points += bonusPoints.doubleCross;
        } else {
          player.points += bonusPoints.bushwhacked;
        }
      }
    }

    // Showdown: won the final against their own Texas T-Pick.
    if (
      finalMatch?.winnerId === player.id &&
      player.texasTPick &&
      (finalMatch.playerA === player.texasTPick || finalMatch.playerB === player.texasTPick)
    ) {
      player.points += bonusPoints.showdown;
    }
  }
}

// Divvy Up: distribute the Pot in a loop ordered [Tournament Winner, most recent
// loser, next most recent loser, ...], giving each player chips equal to their
// "Weight of Winnings" (modeled here as their points score, floored at 0) per
// lap, looping until the Pot is exhausted. The doc references Weight of Winnings
// without giving its exact formula, so this is the best-effort reading — the
// host can re-run with adjusted settings if it doesn't match the physical game.
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
      return [id, Math.max(0, p?.points || 0) || 1];
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
  return Object.fromEntries(payouts);
}
