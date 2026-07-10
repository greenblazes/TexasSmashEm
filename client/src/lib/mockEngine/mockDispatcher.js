// Client-side mirror of server/src/index.js's socket handlers, for the /test
// tournament simulator. Dispatches the same event names/payloads the real client
// sends, but calls the local mockEngine functions directly instead of hitting a
// server — including the turn-timer scheduling, so countdowns really do auto-advance
// if you don't act in time, just like production.
import * as engine from "./gameEngine.js";

export function createMockDispatcher({ getLobby, onChange }) {
  const timers = new Map(); // matchId -> timeout handle

  function clearTurnTimer(matchId) {
    if (timers.has(matchId)) {
      clearTimeout(timers.get(matchId));
      timers.delete(matchId);
    }
  }

  function scheduleTurnTimer(matchId) {
    const lobby = getLobby();
    const preBet = lobby.matchPreBet?.[matchId];
    if (!preBet || preBet.phase === "complete") return;

    clearTurnTimer(matchId);
    if (preBet.deadline == null) return; // countdown disabled for this phase — wait for input only

    const delay = Math.max(0, preBet.deadline - Date.now());

    const handle = setTimeout(() => {
      timers.delete(matchId);
      const l = getLobby();
      const pb = l.matchPreBet?.[matchId];
      if (!pb) return;
      if (pb.phase === "participants") {
        engine.revealAndStartSpectators(l, matchId);
      } else if (pb.phase === "spectators") {
        engine.advanceSpectatorTurn(l, matchId);
      }
      onChange();
      scheduleTurnTimer(matchId);
    }, delay);

    timers.set(matchId, handle);
  }

  function initPreBetForReadyMatches(lobby) {
    const readyMatches = lobby.bracket?.rounds.flat().filter((m) => m.status === "ready") || [];
    for (const m of readyMatches) {
      engine.initMatchPreBet(lobby, m.id);
      scheduleTurnTimer(m.id);
    }
  }

  function dispose() {
    for (const h of timers.values()) clearTimeout(h);
    timers.clear();
  }

  function emitAck(event, payload) {
    const lobby = getLobby();
    const { playerId, matchId } = payload || {};
    let result;
    try {
      switch (event) {
        case "host:start": {
          engine.startTournament(lobby);
          initPreBetForReadyMatches(lobby);
          result = { ok: true };
          break;
        }
        case "host:reportResult": {
          clearTurnTimer(matchId);
          engine.reportMatchResult(lobby, matchId, payload.winnerId, payload.remainingStocks);
          // Pre-betting for the next match waits for an explicit "host:nextRound".
          result = { ok: true };
          break;
        }
        case "host:nextRound": {
          initPreBetForReadyMatches(lobby);
          result = { ok: true };
          break;
        }
        case "host:divvyUp": {
          const payouts = engine.divvyUp(lobby);
          result = { ok: true, payouts };
          break;
        }
        case "host:startMatch": {
          engine.startMatch(lobby, matchId);
          result = { ok: true };
          break;
        }
        case "player:setTPick": {
          engine.setTexasTPick(lobby, playerId, payload.pickPlayerId);
          result = { ok: true };
          break;
        }
        case "player:setMatchPrediction": {
          engine.setMatchPrediction(lobby, playerId, matchId, payload.predictedWinnerId);
          result = { ok: true };
          break;
        }
        case "player:buyBoons": {
          engine.buyBoons(lobby, playerId, payload.quantity ?? 1);
          result = { ok: true };
          break;
        }
        case "player:placeBoon": {
          engine.placeBoon(lobby, playerId, matchId, payload.targetParticipantId, payload.amount);
          result = { ok: true, handicap: engine.getMatchHandicap(lobby, matchId) };
          break;
        }
        case "player:placeStockBet": {
          engine.placeStockBet(lobby, playerId, matchId, payload.stocks, payload.wager);
          result = { ok: true };
          break;
        }
        case "player:rideDouble": {
          engine.rideDouble(lobby, playerId, matchId, payload.stocks);
          result = { ok: true };
          break;
        }
        case "player:playTrumpCard": {
          engine.playTrumpCard(lobby, playerId, matchId, payload.targetParticipantId);
          result = { ok: true };
          break;
        }
        case "player:submitParticipantBoons": {
          const allDone = engine.submitParticipantBoons(lobby, matchId, playerId, payload.amount);
          if (allDone) {
            clearTurnTimer(matchId);
            engine.revealAndStartSpectators(lobby, matchId);
            scheduleTurnTimer(matchId);
          }
          result = { ok: true };
          break;
        }
        case "player:spectatorDone": {
          clearTurnTimer(matchId);
          engine.spectatorDone(lobby, matchId, playerId);
          scheduleTurnTimer(matchId);
          result = { ok: true };
          break;
        }
        case "host:forceSkipTurn": {
          const { phase, allDone } = engine.forceSkipTurn(lobby, matchId);
          if (phase === "participants" && allDone) {
            clearTurnTimer(matchId);
            engine.revealAndStartSpectators(lobby, matchId);
            scheduleTurnTimer(matchId);
          } else if (phase === "spectators") {
            clearTurnTimer(matchId);
            scheduleTurnTimer(matchId);
          }
          result = { ok: true };
          break;
        }
        default:
          result = { ok: false, error: `Unhandled mock event: ${event}` };
      }
    } catch (err) {
      result = { ok: false, error: err.message };
    }
    onChange(event, result);
    return Promise.resolve(result);
  }

  return { emitAck, dispose, initPreBetForReadyMatches };
}
