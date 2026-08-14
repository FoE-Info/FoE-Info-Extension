# src/js — Application Code

## Layout

- `index.js`, `options.js`, `popup.js`, `devtools.js` are the four Webpack entry points (one per surface).
  - `index.js` is the main content-script traffic controller: `handleRequestFinished()` intercepts AJAX/WebSocket game responses and dispatches parsed payloads to `msg/*Service.js`; it also owns logged-in player identity (`setMyInfo()`, `setPlayerName()`) and storage sync (`receiveStorage()`, `storageChange()`).
- `msg/*Service.js` — one file per game-server response type: `StartupService` (login/identity/friends), `GreatBuildingsService` (GB calc, FP donation safety margins), `GuildBattlegroundService` (GBG sectors, attrition), `OtherPlayerService` (external profiles, activity tracking), `ArmyUnitManagementService` (troop composition), `BonusService` (city boosts), `CityProductionService` (collection timers, storage), `ClanBattleService` (GvG map/battle logs), `ConversationService` (in-game mail), `GuildExpeditionService`, `ResourceService` (goods/supplies/FP). New response handling belongs in a new or existing `*Service.js`, not inline in `index.js`.
- `fn/` — shared helpers: `storage.js` (chrome.storage wrapper), `post.js` (Discord webhook posting), `AddElement.js`, `collapse.js`, `constants.js`, `copy.js`, `globals.js`, `helper.js`.
- `vars/` — shared mutable state (currently just `showOptions.js`).

## Precision & formatting conventions

- Always use `bignumber.js` (`BigNumber`) for resource/point/donor calculation math — plain JS numbers lose precision (IEEE 754) on large Forge of Empires values.
- Use `dayjs` for timestamp parsing and date formatting, not raw `Date` math.
- Wrap network payload extraction in guard clauses (`checkDebug()` in `index.js`) so a malformed/unexpected payload shape doesn't throw uncaught inside the main game loop.

## Known-shape gotchas (check before assuming these work)

- `fn/storage.js`'s `getStorage`/`setStorage`/`removeStorage` must `return` the underlying promise — callers depend on awaiting them. If you touch this file, verify the `return` is actually there.
- `vars/showOptions.js`'s `set()` must update the same object identity that's exported/imported elsewhere, not just an internal copy — named exports captured at import time won't see later mutations of a re-assigned internal object.
- `postToDiscord()` in `fn/post.js` depends on a `getKey()` helper — confirm it's actually defined (not just referenced) before assuming this path works.
- jQuery is provided globally via `webpack.ProvidePlugin` (`$`/`jQuery`) — don't add an explicit `import $ from 'jquery'` on top of that, it's already global in every entry.
- Assignment-vs-comparison bugs (`if ((x.name = 'foo'))`) have crept into a few `msg/*Service.js` conditionals — when editing conditionals in this codebase, double check `===` was intended.
- Prefer `chrome.declarativeNetRequest` for any new request/header manipulation — see `src/chrome/CLAUDE.md` for why `webRequest` blocking doesn't work here.
