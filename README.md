# TexasSmashEm
A fun party game using the game Super Smash Brothers

Public shareable URL: https://tinyurl.com/texassmashem

## Running locally

Requires Node.js (LTS) installed.

### 1. Start the server
```
cd server
npm install
npm run dev
```
Server runs on `http://localhost:4000`.

### 2. Start the client
```
cd client
npm install
npm run dev
```
Client runs on `http://localhost:5173`.

Open the client URL in multiple browser tabs/devices to simulate multiple players. One player creates a lobby (host), shares the 5-character code, and up to 23 others join. Once everyone has joined, the host clicks "Start Tournament" to generate the single-elimination bracket, then uses the Host Admin page to report match winners and adjust chips.

## Architecture

- `server/` — Node + Express + Socket.IO. In-memory lobby store (no database). Bracket generation/advancement logic in `server/src/bracket.js`.
- `client/` — React (Vite) + react-router + socket.io-client. Pages: Home (create/join), Lobby (waiting room + live bracket), Admin (host-only: report results, adjust chips).

## Game economy

Implemented per the Texas SMASH'em Game Rules / Master Guide / Cashier Guide PDF:

- **Ante Up / Pot / Starting Chips/Boons** — host-configurable in Admin before starting (defaults: 200 chips, 2 boons, 50 ante).
- **Boons** — placed on either Upcoming Match Participant; the participant with *fewer* total boons placed on them takes a % damage handicap per the printed scale (1 boon = 10% ... 12 boons = 300%). Buy 2 boons for 10 chips. Winners get 1 boon per remaining stock, losers get 2.
- **Texas T-Pick** — each player picks a predicted Tournament Winner from Lobby → Round Actions.
- **Match Winner predictions / Cow Feed** — non-participants predict each match's winner; correct predictors are paid Cow Feed chips when the host reports the result.
- **Stock Bets / Riding Double** — eliminated players can wager on a match's exact remaining-stock outcome; a chipless eliminated player can "ride" an existing bet for half (or a third, if stacked) of the winnings.
- **Trump Card** — auto-granted to the first eliminated player; can be used any time before a match to clear an Upcoming Match Participant's boons.
- **Clean Sweep / Double-Cross / Bushwhacked / Showdown** — auto-applied to player chips when the tournament completes.
- **Divvy Up** — host-triggered at the end to distribute the remaining Pot.

### Assumptions (numbers not printed in the text rules — verify against the physical game and adjust in Admin settings if needed)

- **Stock Pool multipliers**: the doc says 6 slots each have a payout multiplier "displayed" on the physical token, but doesn't give the numbers. Defaulted to `[10, 6, 4, 3, 2, 1]` for stocks `0–5`; editable in Admin.
- **Cow Feed betSpread**: formula is `(10 × betSpread²) + 20`, but the doc doesn't define how `betSpread` derives from "the odds created by other players' predictions." Implemented as `(incorrect predictors − correct predictors)` for that match (sign doesn't matter since it's squared).
- **Bonus/penalty chip values** for Clean Sweep, Double-Cross, Bushwhacked, Showdown: the doc only says "a points-bonus/penalty" without a number. Defaulted to +50/+30/−30/+75 chips; editable in Admin.
- **Weight of Winnings / Divvy Up**: the doc references this term for the payout loop order but never gives its formula. Modeled as each player's current chip stack (min 1), looped Tournament Winner → most recent loser → ... until the Pot is exhausted.

These four are the only places where this implementation had to guess — everything else (Boon handicap scale, starting chips/boons, ante, cow feed minimum, boon awards, Trump Card timing, Stock Bet/Riding Double mechanics) is taken directly from the PDF.

## Control Dashboard (Super Admin)

A separate, lobby-independent page at `/super-admin` for operators running the event — not tied to any specific tournament. Lets you see all active lobbies across the server, force-close any of them, and restart the server process if it freezes.

### Setup

1. Set an `ADMIN_TOKEN` environment variable on the server (any secret string). The dashboard is locked out entirely if this isn't set.
2. Run the server under [pm2](https://pm2.keymetrics.io/) instead of plain `node`/`npm start`, so the Restart button has something to actually restart:
   ```
   cd server
   ADMIN_TOKEN=your-secret npm run pm2:start
   ```
   This uses `server/ecosystem.config.cjs`, which registers the process under the name `texassmashem-server` (override via `PM2_PROCESS_NAME` if you rename it).
3. Open `http://localhost:5173/super-admin`, paste the same `ADMIN_TOKEN` into the token field (stored in that browser's localStorage), and the lobby table will load and auto-refresh every 5 seconds.

### Endpoints

All require an `x-admin-token` header matching `ADMIN_TOKEN`:
- `GET /admin/lobbies` — summary of every lobby in memory (code, status, player/connected counts, pot, created time)
- `POST /admin/lobbies/:code/close` — force-closes a lobby (same effect as the host's "Close Lobby", disconnects all players in it)
- `POST /admin/restart` — calls `pm2.restart(...)` on the configured process name; returns an error if the server isn't running under pm2

If you're not running under pm2, lobby listing/closing still work fine — only the Restart button needs it.

