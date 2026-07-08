import { nanoid } from "nanoid";

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// players: array of { id, name }
export function buildBracket(players) {
  const size = nextPowerOfTwo(players.length);
  const byeCount = size - players.length;
  const matchCount = size / 2;
  const seeded = shuffle(players);

  // byeCount is always < matchCount, so distribute one bye per match (paired
  // with a real player) across the first byeCount matches, then pair the
  // remaining real players against each other. This avoids two byes ever
  // landing in the same match (which would create a dead, unresolvable slot).
  const slots = [];
  let nextPlayerIdx = 0;
  for (let m = 0; m < matchCount; m++) {
    slots.push(seeded[nextPlayerIdx++]);
    if (m < byeCount) {
      slots.push(null);
    } else {
      slots.push(seeded[nextPlayerIdx++]);
    }
  }

  const rounds = [];
  const roundCount = Math.log2(size);

  // Round 1 matches: both slots are already known (real player or true bye),
  // so they're immediately resolvable — expectedFeeders 0 means "decide now".
  const round1 = [];
  for (let i = 0; i < size; i += 2) {
    const a = slots[i];
    const b = slots[i + 1];
    round1.push(makeMatch(1, a, b, 0));
  }
  rounds.push(round1);

  // Empty placeholder rounds: each match here depends on exactly 2 feeder
  // matches from the previous round, and must wait for BOTH to report in
  // before deciding ready/bye — a single filled slot does NOT mean a bye,
  // it just means the other feeder match hasn't been played yet.
  for (let r = 2; r <= roundCount; r++) {
    const matchCount = size / 2 ** r;
    const round = [];
    for (let i = 0; i < matchCount; i++) {
      round.push(makeMatch(r, null, null, 2));
    }
    rounds.push(round);
  }

  const bracket = { rounds, roundCount };

  // Wire up nextMatchId links and auto-advance byes
  for (let r = 0; r < roundCount - 1; r++) {
    rounds[r].forEach((match, idx) => {
      const nextMatch = rounds[r + 1][Math.floor(idx / 2)];
      match.nextMatchId = nextMatch.id;
      match.nextMatchSlot = idx % 2 === 0 ? "a" : "b";
    });
  }

  // Auto-resolve byes (a player facing null opponent auto-wins)
  for (const match of rounds[0]) {
    resolveByeIfNeeded(bracket, match);
  }

  return bracket;
}

function makeMatch(round, playerA, playerB, expectedFeeders) {
  return {
    id: nanoid(8),
    round,
    playerA: playerA ? playerA.id : null,
    playerB: playerB ? playerB.id : null,
    playerAName: playerA ? playerA.name : null,
    playerBName: playerB ? playerB.name : null,
    winnerId: null,
    status: "pending", // pending | ready | bye | complete
    nextMatchId: null,
    nextMatchSlot: null,
    expectedFeeders,
    feedersResolved: 0,
  };
}

function findMatchById(bracket, matchId) {
  for (const round of bracket.rounds) {
    const found = round.find((m) => m.id === matchId);
    if (found) return found;
  }
  return null;
}

function resolveByeIfNeeded(bracket, match) {
  const hasA = !!match.playerA;
  const hasB = !!match.playerB;
  if (hasA && !hasB) {
    match.winnerId = match.playerA;
    match.status = "bye";
    advanceWinner(bracket, match);
  } else if (!hasA && hasB) {
    match.winnerId = match.playerB;
    match.status = "bye";
    advanceWinner(bracket, match);
  } else if (hasA && hasB) {
    match.status = "ready";
  }
}

export function advanceWinner(bracket, match) {
  if (!match.nextMatchId) return; // final
  const next = findMatchById(bracket, match.nextMatchId);
  if (!next) return;
  const winnerName =
    match.winnerId === match.playerA ? match.playerAName : match.playerBName;
  if (match.nextMatchSlot === "a") {
    next.playerA = match.winnerId;
    next.playerAName = winnerName;
  } else {
    next.playerB = match.winnerId;
    next.playerBName = winnerName;
  }
  next.feedersResolved += 1;
  if (next.feedersResolved >= next.expectedFeeders) {
    resolveByeIfNeeded(bracket, next);
  }
}

export function startMatch(bracket, matchId) {
  const match = findMatchById(bracket, matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "ready") throw new Error("Match is not in the ready state");
  match.status = "in_progress";
  return match;
}

export function reportResult(bracket, matchId, winnerId) {
  const match = findMatchById(bracket, matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "in_progress") throw new Error("Match has not been started yet");
  if (winnerId !== match.playerA && winnerId !== match.playerB) {
    throw new Error("Winner must be one of the two match participants");
  }
  match.winnerId = winnerId;
  match.status = "complete";
  advanceWinner(bracket, match);
  return match;
}

export function isTournamentComplete(bracket) {
  const finalRound = bracket.rounds[bracket.rounds.length - 1];
  return finalRound.every((m) => m.winnerId);
}

export function getChampion(bracket) {
  const finalRound = bracket.rounds[bracket.rounds.length - 1];
  const final = finalRound[0];
  if (!final || !final.winnerId) return null;
  return final.winnerId === final.playerA
    ? { id: final.playerA, name: final.playerAName }
    : { id: final.playerB, name: final.playerBName };
}
