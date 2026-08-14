# JavaScript & jQuery Audit

**Verified**: 2026-08-14 against `src/js/**` via the `javascript-expert` (×2, split
across entry points and `msg/`) and `jquery-expert` subagents.

## Confirmed findings

### P0: `fn/storage.js` never returns its promises

`getStorage`/`setStorage`/`removeStorage` call `chrome.storage.local.*` but don't
`return` the resulting promise — every caller's `await` resolves to `undefined`
immediately. Confirmed broken caller: `GreatBuildingsService.js:58-59` — the
`useNewDonationPanel` feature toggle can never activate because the read always comes
back empty.

### P0: Unescaped server-controlled strings reach `innerHTML`

Player/guild names and other server-provided strings are interpolated unescaped into
`innerHTML` template literals in multiple render paths (`index.js:1072`,
`helper.js:741`, and others). A malicious in-game display name containing
`<script>`/`<img onerror>` executes in the panel. Use `textContent` or an escaping
helper for any field sourced from game-server responses.

### P1: `ReferenceError` on undeclared variables

`OtherPlayerService.js:284,286` — `visitStellarWarshipLevel`/`visitCosmicCatalystLevel`
are assigned but never declared, throwing in strict-mode ES modules whenever a player
has a Space Age landmark building.

`index.js:1985-1987` — `setMyGuildPermissions` writes to an undeclared
`MyGuildPermissions` (the real one lives in `helper.js`); dead/unused duplicate export
today, but throws the moment anything calls it.

### P1: Assignment-vs-comparison bugs

`StartupService.js:256,425` and `OtherPlayerService.js:619` all contain
`if ((x.name = 'clan_goods'))` — assignment, not comparison. Always truthy, and
corrupts the response object as a side effect. `index.js:492` has the same class of bug:
`darkMode == 'dark';` should be `=` (or a real comparison used somewhere), so dark-mode
state never updates when the OS theme changes.

### P1: Silent data bugs

- `OtherPlayerService.js:845` reads `Goods.sajm` instead of `Goods[age.toLowerCase()]`
  inside a per-age loop — wrong goods totals for every age but one (copy-paste bug).
- `GreatBuildingsService.js:839-845` — `return` inside `.forEach()` is discarded, so
  `inactiveHTML()` always returns `''` and the "INACTIVE" badge never renders.
- `GuildBattlegroundService.js:207-253` — `.find(...)` results used without null
  checks; throws `TypeError` if the server returns a province not seen before.
- `vars/showOptions.js:35-48` — `set()` mutates the internal `items` object but never
  updates the individual named exports, so importers see values frozen at their
  defaults forever.
- `index.js:667-744` — only the `catch` fallback of the metadata-load promise flushes
  `pendingStartupMsg`; a message queued during a normal (non-error) first load can be
  silently dropped.
- `fn/post.js:57` — `postToDiscord()` calls an undefined `getKey()` (only a
  commented-out version exists in `helper.js`). Unreachable today, will crash the
  moment it's wired up.

### P2: Anti-patterns

- Pervasive `var` instead of `let`/`const` (hundreds of occurrences); don't do a
  drive-by rewrite of unrelated existing usage, but avoid adding more.
- `$('body').i18n()` re-scans the entire document on nearly every network response
  (14+ call sites) instead of scoping to the just-injected container.
- Unguarded deep property access on live server JSON with no try/catch around
  `handleRequestFinished`; unhandled promise rejections throughout (`index.js`,
  `options.js`, `GuildBattlegroundService.js:77`).
- Large duplicated if/else chains that should be lookup tables
  (`ConversationService.js:90-146`, `GuildBattlegroundService.js:333-425`), and a
  5-way near-identical block in `showGreatBuldingDonation()`
  (`GreatBuildingsService.js:75-485`) that wants a loop.

## What's solid

- No jQuery-specific leak patterns — `.on()`/`.off()` aren't used at all; event wiring
  is native `addEventListener` on nodes that get GC'd naturally via `innerHTML`
  replacement.
- jQuery is provided globally via `webpack.ProvidePlugin`; no duplicate explicit
  imports found.
