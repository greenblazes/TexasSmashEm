import { useState } from "react";
import { emitAck } from "../lib/socket.js";
import { matchHandicap } from "../lib/economy.js";

function playerName(lobby, id) {
  return lobby.players.find((p) => p.id === id)?.name || "—";
}

export default function RoundActions({ lobby, me, playerId }) {
  const [error, setError] = useState("");

  if (!lobby.bracket || !me) return null;

  const readyMatches = lobby.bracket.rounds.flat().filter((m) => m.status === "ready");
  const isParticipant = (m) => m.playerA === playerId || m.playerB === playerId;

  async function run(event, payload) {
    setError("");
    const res = await emitAck(event, { code: lobby.code, playerId, ...payload });
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="round-actions">
      <section className="card">
        <h2>Your Stats</h2>
        <p>
          Chips: <strong>{me.chips}</strong> &nbsp; Boons: <strong>{me.boons}</strong> &nbsp;
          Points: <strong>{me.points}</strong>
          {me.hasTrumpCard && <span> &nbsp; 🃏 You hold the Trump Card</span>}
        </p>
        <button onClick={() => run("player:buyBoons", {})}>Buy 2 Boons ({lobby.settings.buyBoonsCost} chips)</button>
      </section>

      <section className="card">
        <h2>Texas T-Pick</h2>
        <p>Your pick: {me.texasTPick ? playerName(lobby, me.texasTPick) : "Not chosen yet"}</p>
        <select
          value={me.texasTPick || ""}
          onChange={(e) => run("player:setTPick", { pickPlayerId: e.target.value })}
        >
          <option value="" disabled>
            Choose Tournament Winner
          </option>
          {lobby.players
            .filter((p) => !p.eliminated)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </section>

      {readyMatches.map((match) => (
        <MatchActions
          key={match.id}
          lobby={lobby}
          match={match}
          me={me}
          playerId={playerId}
          isParticipant={isParticipant(match)}
          run={run}
        />
      ))}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

function MatchActions({ lobby, match, me, playerId, isParticipant, run }) {
  const [boonTarget, setBoonTarget] = useState(match.playerA);
  const [boonAmount, setBoonAmount] = useState(1);
  const [betStocks, setBetStocks] = useState(lobby.settings.stockPool[0]?.stocks ?? 0);
  const [betWager, setBetWager] = useState(10);

  const handicap = matchHandicap(lobby, match);
  const existingPrediction = me.matchPredictions?.[match.id];
  const stockBets = lobby.stockBets?.[match.id] || [];

  return (
    <section className="card">
      <h2>
        Match: {match.playerAName} vs {match.playerBName}
      </h2>
      <p>
        Boons placed — {match.playerAName}: {handicap.aBoons}, {match.playerBName}: {handicap.bBoons}
        {handicap.percent > 0 && (
          <> — {playerName(lobby, handicap.handicappedPlayerId)} takes +{handicap.percent}% damage</>
        )}
      </p>

      {!isParticipant && (
        <>
          <div>
            <label>Match Winner prediction: </label>
            <select
              value={existingPrediction || ""}
              onChange={(e) =>
                run("player:setMatchPrediction", { matchId: match.id, predictedWinnerId: e.target.value })
              }
            >
              <option value="" disabled>
                Pick a winner
              </option>
              <option value={match.playerA}>{match.playerAName}</option>
              <option value={match.playerB}>{match.playerBName}</option>
            </select>
          </div>

          <div>
            <label>Place Boon(s) on: </label>
            <select value={boonTarget} onChange={(e) => setBoonTarget(e.target.value)}>
              <option value={match.playerA}>{match.playerAName}</option>
              <option value={match.playerB}>{match.playerBName}</option>
            </select>
            <input
              type="number"
              min={1}
              max={me.boons}
              value={boonAmount}
              onChange={(e) => setBoonAmount(e.target.value)}
              style={{ width: 60, display: "inline-block" }}
            />
            <button
              onClick={() =>
                run("player:placeBoon", { matchId: match.id, targetParticipantId: boonTarget, amount: boonAmount })
              }
            >
              Place Boon
            </button>
          </div>
        </>
      )}

      {isParticipant && (
        <div>
          <label>Place your own Boon(s) on: </label>
          <select value={boonTarget} onChange={(e) => setBoonTarget(e.target.value)}>
            <option value={match.playerA}>{match.playerAName}</option>
            <option value={match.playerB}>{match.playerBName}</option>
          </select>
          <input
            type="number"
            min={1}
            max={me.boons}
            value={boonAmount}
            onChange={(e) => setBoonAmount(e.target.value)}
            style={{ width: 60, display: "inline-block" }}
          />
          <button
            onClick={() =>
              run("player:placeBoon", { matchId: match.id, targetParticipantId: boonTarget, amount: boonAmount })
            }
          >
            Place Boon
          </button>
        </div>
      )}

      {me.eliminated && (
        <div>
          <h3>Stock Bet</h3>
          <p>
            Open slots:{" "}
            {lobby.settings.stockPool
              .filter((s) => !stockBets.some((b) => b.stocks === s.stocks))
              .map((s) => `${s.stocks} stock(s) (x${s.multiplier})`)
              .join(", ") || "none"}
          </p>
          <select value={betStocks} onChange={(e) => setBetStocks(Number(e.target.value))}>
            {lobby.settings.stockPool.map((s) => (
              <option key={s.stocks} value={s.stocks} disabled={stockBets.some((b) => b.stocks === s.stocks)}>
                {s.stocks} stock(s) — x{s.multiplier}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={me.chips}
            value={betWager}
            onChange={(e) => setBetWager(e.target.value)}
            style={{ width: 70, display: "inline-block" }}
          />
          <button
            onClick={() => run("player:placeStockBet", { matchId: match.id, stocks: betStocks, wager: betWager })}
          >
            Place Stock Bet
          </button>

          {me.chips === 0 && stockBets.length > 0 && (
            <div>
              <p>Ride Double on:</p>
              {stockBets.map((b) => (
                <button key={b.stocks} onClick={() => run("player:rideDouble", { matchId: match.id, stocks: b.stocks })}>
                  {playerName(lobby, b.playerId)}'s bet on {b.stocks} stock(s)
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {me.hasTrumpCard && !isParticipant && (
        <div>
          <button onClick={() => run("player:playTrumpCard", { matchId: match.id, targetParticipantId: match.playerA })}>
            Play Trump Card on {match.playerAName}
          </button>
          <button onClick={() => run("player:playTrumpCard", { matchId: match.id, targetParticipantId: match.playerB })}>
            Play Trump Card on {match.playerBName}
          </button>
        </div>
      )}
    </section>
  );
}
