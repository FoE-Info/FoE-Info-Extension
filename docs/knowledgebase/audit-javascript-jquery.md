# JavaScript & jQuery Audit

**Verified**: 2026-08-14 against src/js/index.js, src/js/options.js, src/js/devtools.js, src/js/popup.js, src/js/vars/showOptions.js, src/js/msg/**, src/js/fn/** — three passes: entry-points lens, services/helpers lens, and jQuery-idiom lens. The jQuery-idiom pass covered the full `src/js/**` tree (all 10 `msg/*.js` files, all 8 `fn/*.js` files, and all 4 entry points) for selector/event-binding patterns, `$(selector).i18n()` call-site scoping, `.click()`/`.on()`/delegation usage, `$.each` vs native iteration, redundant `import $ from 'jquery'` on top of the global `ProvidePlugin` binding, and memory-leak-prone patterns (listeners/observers bound repeatedly across re-renders without cleanup). All three lenses are now complete.

## Confirmed findings

### P0: Saving Options silently deletes the `clipboard` setting from storage, permanently disabling the clipboard feature

`src/js/options.js` `save_options()` (lines 55-137) builds a brand-new `showOptions` object from only the checkboxes present on the options page and writes it with `browser.storage.local.set({ showOptions: {...} })`. `browser.storage.local.set()` replaces the whole `showOptions` value rather than merging it, so any key not explicitly assigned in `save_options()` is dropped from storage the first time a user clicks Save.

`src/js/vars/showOptions.js` line 33 defines `export var clipboard = true;`, and it is the *only* place the `clipboard` flag is defined as a default. `src/js/index.js` line 399 gates a real feature on it: `if (showOptions.clipboard) { ... }`. But `src/js/options.js`'s local defaults object (lines 19-52) has no `clipboard` key at all, there is no `clipboard` checkbox element referenced anywhere in `save_options()`/`fnShowOptions()`, and `restore_options()` (lines 141-200) never repopulates it either. The first time any user opens the options page and clicks Save, `showOptions.clipboard` becomes `undefined` in storage permanently (until the extension is reinstalled), silently turning off the clipboard block that `index.js:399-421` guards.

The same drop applies to `showBattlegroundChanges` (defined in `vars/showOptions.js:14` and `options.js:33`, but with no corresponding checkbox/save line in `options.js`), though that one already defaults to `false` everywhere so the practical effect is smaller.

**Fix**: add `clipboard` (and `showBattlegroundChanges` if it's meant to be user-controlled) to `options.js`'s default object, `fnShowOptions()`, and `save_options()`'s written payload — or switch `save_options()` to merge onto the existing stored `showOptions` object instead of replacing it wholesale.

### P0: Two independent default-value sources for `showOptions` disagree on 3 keys

`src/js/options.js` lines 19-52 defines a local `const showOptions = {...}` used as first-run defaults for the options page. `src/js/vars/showOptions.js` lines 1-32 defines a *second*, separate set of defaults used by `index.js`/the devtools panel before storage sync settles. They are not the same object and they disagree:

| key | `options.js` default | `vars/showOptions.js` default |
|---|---|---|
| `showGBInfo` | `true` (line 27) | `false` (line 8) |
| `showLogs` | `true` (line 46) | `false` (line 27) |
| `showContributions` | `true` (line 47) | `false` (line 28) |

Because these are two hand-maintained literals rather than one shared source, a first-time user sees different feature defaults depending on whether the panel initializes before or after the options page's first save round-trips through `browser.storage.local`. This is a straightforward drift bug (copy-pasted defaults maintained in two files), not a design choice — every other key between the two objects matches exactly.

**Fix**: have `options.js` import `{ showOptions }` from `vars/showOptions.js` as its single source of default values instead of maintaining a second literal.

### P1: `chrome.webRequest.onBeforeSendHeaders.addListener` at `index.js:613-621` is a no-op — the Origin-header strip never happens

```js
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    return {
      requestHeaders: details.requestHeaders.filter((x) => !originWithId(x)),
    };
  },
  { urls: ['https://*.innogamescdn.com/*'] },
  ['requestHeaders'],
);
```

The comment above `originWithId()` (`index.js:604`) states the intent: strip the extension's `Origin` header so requests don't visibly come from a `moz-extension://`/`chrome-extension://` origin. For a returned `{requestHeaders: ...}` value to actually take effect, the listener's `extraInfoSpec` (third argument) must include `'blocking'`, and Manifest V3 additionally requires the `webRequestBlocking` permission to be declared. Neither is true here: the extraInfoSpec array is `['requestHeaders']` only (no `'blocking'`), and `src/chrome/manifest.json:28` declares `"permissions": ["storage", "unlimitedStorage", "clipboardWrite", "webRequest"]` — no `webRequestBlocking`. The listener therefore only ever *observes* headers; the filtered `requestHeaders` return value is silently discarded by the browser, and outgoing requests to `*.innogamescdn.com` still carry the unmodified extension `Origin` header. This matches the "no-op `webRequest` listener" already flagged in `docs/knowledgebase/audit-summary.md` — confirmed still present at these exact lines with the concrete permission/extraInfoSpec root cause.

**Fix**: either drop the dead listener (it currently does nothing and can be deleted), or migrate to `chrome.declarativeNetRequest` (already the project's stated preference per `src/js/CLAUDE.md`) with a rule that removes/replaces the `Origin` header for the `innogamescdn.com` host pattern — MV3-compatible without needing blocking webRequest.

### P1: OS dark-mode change listener has a dead comparison instead of an assignment — `darkMode` state never updates

`index.js:487-496`:

```js
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ({ matches }) => {
  document.body.classList.toggle('bg-dark');
  document.body.classList.toggle('text-light');
  if (matches) {
    console.log('change to dark mode!');
    darkMode == 'dark';
  } else {
    console.log('change to light mode!');
  }
});
```

Line 492, `darkMode == 'dark';`, is a bare comparison expression evaluated and discarded — not the assignment (`darkMode = 'dark'`) the surrounding code clearly intends (mirrors the exact class of assignment-vs-comparison slip `src/js/CLAUDE.md` calls out for `msg/*Service.js`, just the inverse direction: a missing `=` rather than an accidental one). `darkMode` (exported at `index.js:206` from `browser.devtools.panels.themeName`) is never updated when the OS theme flips, so any later code that re-checks the `darkMode` variable's value (rather than the CSS classes already being toggled) will see a stale value. Low blast radius today since the only other `darkMode` reads in this file (lines 220, 240, 263, 284) run once at module load before this listener can ever fire, but it's a real, currently-inert line that should either do the assignment or be removed.

**Fix**: change line 492 to `darkMode = 'dark';` (and add a corresponding `darkMode = 'light';` in the `else` branch at line 495) if the variable's live value is meant to matter elsewhere, or delete the dead statement if it's not.

### P0 (confirmed instance of documented repo-wide gotcha): unescaped `innerHTML` interpolation of player/guild-controlled strings

`src/CLAUDE.md` and `src/js/CLAUDE.md` both flag this as a known, pre-existing, repo-wide pattern rather than something to blanket-fix here, but per the audit's explicit instruction to verify and cite concrete instances within the in-scope files, confirmed examples in `index.js`:

- `index.js:1580-1584` — guild roster row built as `friendsHTML += \`<tr><td>${entry.name}</td><td>${entry.title}</td>...\`` where `entry` comes straight from `ClanService.getOwnClanData`/`getClanData`'s `responseData.members`. Guild rank **titles** are free-text set by guild leadership in-game (not just names), making this one of the more realistic unescaped sinks in the file — a crafted guild rank title containing markup would execute in the devtools panel's DOM via `friendsDiv.innerHTML = friendsHTML + ...` (line 1587).
- `index.js:1749-1763` — treasury contribution table renders `member[1]` (a guild member's display name, sourced from the same `members` payload) directly into `treasuryHTML` via template-literal interpolation, later assigned with `treasury.innerHTML = treasuryHTML + ...` (line 1774).
- `index.js:1241-1253` — Great Building reward toast interpolates `msg.responseData.building_owner.name` (another player's name from `BlueprintService.newReward`) unescaped into `cityrewards.innerHTML`/`oldText.innerHTML`.
- `index.js:989-991` — `PlayerName` and `GBselected.name` (derived from `helper.fGBname()` off server-controlled `cityentity_id`, and `OtherPlayerService` responses) interpolated into `outputHTML`, assigned to `info.innerHTML` at line 999.

These are all pre-existing and out of scope to fix as part of this pass per project convention, but are confirmed live in the in-scope file with exact citations as requested.

### P0: `fn/storage.js`'s `getStorage()` never returns its promise — the one real caller that depends on the return value is permanently broken

```js
function getStorage(name) {
  browser.storage.local.get(name).then((result) => {
    if (browser.runtime.lastError) {
      console.log('Error retrieving index: ' + browser.runtime.lastError);
      return;
    }
    return result[name];      // returns from the .then() callback, not from getStorage()
  });
  // no `return` here — getStorage() itself always returns undefined
}
```

`src/js/fn/storage.js:34-44`. `src/js/CLAUDE.md:19` explicitly warns "callers depend on awaiting them" — this is a real, currently-live instance, not a hypothetical. `setStorage`/`removeStorage` (lines 17-32, 46-51) have the identical missing-`return` pattern, but their only callers (grepped repo-wide) all use the fire-and-forget form `storage.set(key, value)`/`storage.remove(key)` and never read a return value, so those two are latent rather than actively broken.

`getStorage` (exported as `storage.get`) has exactly one caller anywhere in the codebase — `src/js/msg/GreatBuildingsService.js:58-59`:

```js
if (storage.get('useNewDonationPanel') != null)
  useNewDonationPanel = storage.get('useNewDonationPanel');
```

Because `storage.get(...)` always evaluates to `undefined`, `undefined != null` is `false`, so this `if` body never runs — `useNewDonationPanel` (declared `false` at line 46) can never be restored from storage. The toggle is written correctly elsewhere (`clickDonation()`, `GreatBuildingsService.js:895-899`, calls `storage.set('useNewDonationPanel', useNewDonationPanel)` on shift-click and it does persist), but the read-back path is dead code — every time the panel reloads, the "new donation panel" preference silently resets to its default regardless of what the user last chose.

**Fix**: add `return` before both `browser.storage.local.get(...)` chains in `getStorage`/`setStorage`/`removeStorage`, then update `GreatBuildingsService.js:58-59` to `await`/`.then()` the now-async `storage.get(...)` call (it currently reads it synchronously, which won't work correctly once the promise is actually returned).

### P0: `fn/post.js`'s `postToDiscord()` calls an undefined `getKey()` — throws immediately, before ever sending a request

`src/js/fn/post.js:57`: `const hook = getKey(webHookUrl);`. `getKey` is not imported, not defined anywhere else in `post.js`, and the only place the name `getKey` appears in the whole `src/` tree besides this call site is a fully commented-out function at `src/js/fn/helper.js:800-805` (`// export function getKey(text){ ... }`) that is neither uncommented nor exported. Calling `postToDiscord(text)` therefore throws `ReferenceError: getKey is not defined` on the very first executable line after the `webHookUrl` guard, before the function reaches any of its actual `XMLHttpRequest` send logic. `postAlerttoDsicord()` (`post.js:291-294`) is the only caller and is completely non-functional as a result. (`logToDiscord()` at `post.js:296-318` is a separate function that does not call `getKey()` and is unaffected.)

**Fix**: either restore a real `getKey()` implementation (the commented-out stub in `helper.js` was clearly meant to derive/obfuscate the webhook key, though its `crypto.createCipher` approach is itself deprecated Node API, not a browser API — it wouldn't run in a content script as written) or drop the `getKey()` call entirely and send `webHookUrl` directly, matching how `logToDiscord()`, `postGBGtoSS()`, and `postPlayerToSS()` already send `webHookUrl` unmodified in this same file.

### P0: `msg/GuildBattlegroundService.js:115` references an undeclared `output` — `getLeaderboard()` throws every time it's called, GBG Leaderboard never renders

```js
export function getLeaderboard(msg) {
  ...
  output.innerHTML =
    `<div class="alert alert-info alert-dismissible show" role="alert">${element.close()}<strong>GBG Leaderboard:</strong>
            <p id="leaderboardText"><table>` + leaderboardHTML + `</table></p></div>`;
}
```

`output` is exported from `src/js/index.js:324` (`export var output = document.createElement('div');`), but `GuildBattlegroundService.js`'s import block (lines 14-34) only pulls in `BuildingDefs, donationDIV, EpocTime, GameOrigin, targets, targetText, url, VolcanoProvinceDefs, WaterfallProvinceDefs` from `../index.js` — `output` is never imported. Because ES modules have their own scope, the bare `output` reference is an undeclared identifier: `getLeaderboard()` throws `ReferenceError: output is not defined` on every invocation. It's called from `index.js:1427` (`if (showOptions.showLeaderboard) getLeaderboard(msg);`), inside the same try/catch that wraps the whole dispatch loop, so the exception is swallowed and logged rather than crashing the extension — but the practical effect is that the "GBG Leaderboard" feature has never rendered anything for any user who has it enabled. (Checked: this is an isolated instance — `output.` also appears in `StartupService.js:914,1065` and `OtherPlayerService.js:182`, but all three of those are commented-out lines, not live code.)

**Fix**: add `output` to `GuildBattlegroundService.js`'s existing `import { ... } from '../index.js'` block.

### P1: Assignment-instead-of-comparison bug live in three `msg/*.js` clan-goods branches (confirms `src/js/CLAUDE.md:23`)

`StartupService.js:256`, `StartupService.js:425`, and `OtherPlayerService.js:619` all contain the identical pattern:

```js
if ((mapID.state.current_product.goods.name = 'clan_goods')) {   // StartupService.js:256, OtherPlayerService.js:619
if ((mapID.state.productionOption.goods.name = 'clan_goods')) {  // StartupService.js:425
```

Each `if` condition is an **assignment**, not a comparison: it unconditionally sets `.goods.name` to the string `'clan_goods'` (mutating the parsed payload in place) and then evaluates the assigned string itself, which is always truthy, so the guarded block always executes — regardless of whether the production entry's goods actually are guild/clan goods. In all three call sites this branch sums `mapID.state.current_product.goods[good].value` (or `.productionOption.goods[...]`) into `clanGoods`/`clanGoodsBuildings`/`clanGoodsHTML`, which are the guild-contribution totals shown to the user and to guild leadership. Since the condition can never be false, **any** production-goods array on a scanned building — not just genuine clan/guild goods — gets folded into the clan-goods tally, inflating those numbers with the player's regular (non-guild) goods production whenever this code path runs.

**Fix**: change all three to `===` (`if (mapID.state.current_product.goods.name === 'clan_goods')` etc.) and drop the now-unnecessary extra parens.

### P1: `getSafe()`/`getPlaceValues()` in `GreatBuildingsService.js` mix plain-JS-number arithmetic into a BigNumber-based calculation

`src/js/msg/GreatBuildingsService.js:919-939`:

```js
function getSafe(place) {
  ...
  var rem = remaining;                                  // remaining is a plain JS number (see below)
  for (var i = index; i < 5; i++) {
    donateSuggest[i] = new BigNumber(GBrewards[i]).times(currentPercent).div(100).dp(0);
    rem -= donateSuggest[i];                             // plain number -= BigNumber instance
    safe[i] = rem <= donateSuggest[i] - Top[place] ? true : false;   // BigNumber - plain number
  }
}

function getPlaceValues(place) {
  var index = place - 1;
  Donation = new BigNumber(GBselected.total - GBselected.current + Top[index]).div(2).dp(0, 2);
  // ^ raw JS subtraction/addition happens first; BigNumber only wraps the already-computed result
  ...
  remaining = GBselected.total - GBselected.current;     // stored as a plain JS number, not BigNumber
}
```

The rest of this same file uses `BigNumber` consistently for donation math (`getFriendlyDonation`, `fPercentBanded`, the donor-ranking totals at lines 110-125, `fDonationSuggest` at line 597), matching `src/js/CLAUDE.md`'s "always use `BigNumber` for resource/point/donor calculation math" convention. But `getPlaceValues()` computes `GBselected.total - GBselected.current + Top[index]` and `GBselected.total - GBselected.current` with native `-`/`+` before ever constructing a `BigNumber`, and `getSafe()` then subtracts `BigNumber` instances from/into that plain `remaining` number using native `-`/`-=`, which silently coerces the `BigNumber` operands back to primitives via `valueOf()`/`toString()` for the arithmetic. The net effect is that `remaining`/`rem`/the `safe[i]` comparison all run on native IEEE-754 numbers despite `BigNumber` objects passing through the expressions — the precision guarantee `BigNumber` exists for in this file is not actually in effect for these two functions. Not observably wrong at today's Forge Points value ranges (well under `Number.MAX_SAFE_INTEGER`), but it's a real inconsistency with the file's own established pattern and a latent bug if GB total-cost/current values grow.

**Fix**: wrap `GBselected.total`, `GBselected.current`, and `Top[index]`/`Top[place]` in `BigNumber(...)` before the arithmetic in `getPlaceValues()`, store `remaining` as a `BigNumber`, and use `.minus()`/`.isLessThanOrEqualTo()` instead of `-`/`-=`/`<=` in `getSafe()`.

### P1: Unguarded `.find()` result in `fshowBattleground()` — throws if a battleground participant isn't in `GuildMembers`

`src/js/fn/helper.js:733-737`:

```js
var player = GuildMembers.find((id) => id.name == entry.name);
battleDiff = wonBattles - player.wonBattles;
negotiationsDiff = wonNegotiations - player.wonNegotiations;
attritionDiff = attrition - player.attrition;
```

`.find()` returns `undefined` when no `GuildMembers` entry matches `entry.name`, and the three lines immediately following dereference `player.wonBattles`/`.wonNegotiations`/`.attrition` with no null check. `GuildMembers` is populated from `browser.storage.local` in `GuildBattlegroundService.js:77-94` (with new members added lazily only for names already present in the current `BattlegroundPerformance` snapshot at the time storage was last written) — so any guild-roster change between two GBG-tracked runs (a member leaves, or storage was cleared/never-before-seeded for that member) can produce an `entry.name` with no matching `GuildMembers` record, throwing `TypeError: Cannot read properties of undefined (reading 'wonBattles')` inside `fshowBattleground()`. Caught by index.js's outer try/catch like the other findings above, but it aborts rendering the entire Battlegrounds panel for that response, not just the one row.

**Fix**: guard with `if (!player) player = { wonBattles: 0, wonNegotiations: 0, attrition: 0 };` (mirroring the fallback pattern already used for `GuildMembers.push(...)` at `GuildBattlegroundService.js:88-93`) before computing the three diffs.

### P2: Guard-clause coverage is inconsistent across `msg/*.js` — several files dereference `msg.responseData.*` with no top-level check

`src/js/CLAUDE.md` states network payload extraction should be "wrapped in guard clauses ... so a malformed/unexpected payload shape doesn't throw uncaught." `StartupService.js` (31 `checkDebug()` guards, 1 `try/catch`) and `OtherPlayerService.js` (12 `checkDebug()` guards, 1 `try/catch`) follow this closely. Several other service files have zero internal guard clauses or `try/catch` and access nested `msg.responseData` properties directly on the first line of the function body:

- `CityProductionService.js:20` `msg.responseData.militaryProducts.length` and `:33` `msg.responseData.updatedEntities.length` — no check that `msg.responseData` itself exists first.
- `ArmyUnitManagementService.js:29` `msg.responseData.counts.length` — same pattern.
- `GuildExpeditionService.js:33` `msg.responseData.forEach((entry) => {...})` — no check `msg.responseData` is an array before iterating.
- `ResourceService.js:40-41` `Resources = msg.responseData.resources; availableFP = Resources.strategy_points;` inside `getPlayerResources()` — the outer `if (msg.responseData && ResourceDefs)` at line 39 checks `responseData` exists but not `.resources`, so a `responseData` without a `resources` key throws on `Resources.strategy_points`.
- `ConversationService.js:30-31` `conversationService()` reads `msg.responseData.category.teasers` / `msg.responseData.teasers` with no guard at all.
- `BonusService.js:55` `getLimitedBonuses()`'s `msg.responseData.length` check in the `if` condition itself throws if `responseData` is `undefined`, since the property access happens before the truthiness check can short-circuit anything.

Every one of these call sites is reached from inside `handleRequestFinished()`'s single outer `try { ... } catch (err) { console.error(...) }` (confirmed by pass 1, `index.js:671-1914`), so none of these can crash the extension outright — but each one fails silently: the one malformed message is dropped, its panel doesn't update, and the only trace is a `console.error` in the DevTools console. This is a real inconsistency between service files rather than a uniform gap.

**Fix** (low priority, cleanup-tier): add a `if (!msg.responseData) return;`-style guard at the top of the affected exported functions, matching the pattern `StartupService.js`/`OtherPlayerService.js` already use.

### P1: `ResizeObserver` instances are created and `.observe()`d on nearly every network-response render, and `.disconnect()` is never called anywhere in the codebase

Nine call sites construct a fresh `new ResizeObserver(...)` and immediately `.observe()` a panel element, all inside functions reached from `handleRequestFinished()`'s per-message dispatch:

- `index.js:2475` inside `rewardObserve()` — called from `showReward()` (`index.js:2369`) and `showRewards()` (`index.js:2467`), which are themselves invoked at `index.js:804,826,1196,1210,1419` and `msg/CityProductionService.js:84` — i.e. on essentially every collected-building/quest/auto-aid reward, one of the highest-frequency events in a play session.
- `index.js:1871` inside `handleRequestFinished()` itself.
- `fn/helper.js:777` inside `fshowBattleground()` (the same function flagged above for the unguarded `.find()`), reached on every GBG-tracked response.
- `msg/ArmyUnitManagementService.js:94` inside `armyUnitManagementService()`.
- `msg/ResourceService.js:63` inside `getPlayerResources()`.
- `msg/ClanBattleService.js:345` inside `getProvinceDetailed()`.
- `msg/GuildExpeditionService.js:50` inside `guildExpeditionService()`.
- `msg/OtherPlayerService.js:1069` inside `otherPlayerServiceUpdateActions()`.
- `msg/GuildBattlegroundService.js:654` inside `showBuildingCost()`.

A repo-wide grep for `.disconnect()` across `src/js/**` returns zero matches — none of these nine observers is ever torn down. Contrast this with the adjacent `addEventListener('click', ...)` calls at the same call sites (e.g. `index.js:2370`, `fn/helper.js:772`, `msg/ArmyUnitManagementService.js:92`): those are safe from accumulation because they're attached to a DOM node freshly created by the *same* function's preceding `container.innerHTML = ...` reassignment, so the browser destroys the previous node (and its listener) each time the container is re-rendered. `ResizeObserver` doesn't get that same free cleanup — per spec, an observer keeps a live reference to whatever element it was told to watch, independent of that element still being attached to the document, so each of the ~9 call sites permanently pins one more detached DOM node + its resize-callback closure per invocation. Over a long-lived DevTools panel session (this panel is not meant to be closed/reopened between game actions) this accumulates without bound: `rewardObserve()` alone can fire many times per minute during active building collection.

**Fix**: store each `resizeObserver` on a variable that survives across calls (e.g. a module-level `let` per panel section) and call `.disconnect()` on the previous instance immediately before creating a new one, or call `resizeObserver.disconnect()` inside the click handler that collapses/hides that panel section — mirroring the explicit `removeEventListener` cleanup the same file already does correctly for `#logo`/`toggleDebug` at `index.js:2607-2609` (`removeDebug()`).

### P1 (confirms `src/js/CLAUDE.md:15`): `$('body').i18n()` re-scans the entire panel DOM on nearly every dispatched network message instead of scoping to just-inserted content

`src/js/CLAUDE.md:15` states the existing code "re-scans the whole document on almost every network response" via `$('body').i18n()` rather than scoping to just-inserted content. Confirmed accurate by exact citation — the whole-document form appears at 18 separate call sites, each inside a function invoked from `handleRequestFinished()`'s dispatch (directly or via a `msg/*Service.js` handler it calls):

`index.js:571`, `index.js:1003`, `index.js:1564`, `index.js:1597`, `index.js:1783`, `index.js:1878`, `fn/helper.js:787` (`fshowBattleground()`), `msg/ResourceService.js:69`, `msg/ClanBattleService.js:155`, `msg/ClanBattleService.js:354`, `msg/GuildExpeditionService.js:57`, `msg/GreatBuildingsService.js:482`, `msg/GreatBuildingsService.js:567`, `msg/ArmyUnitManagementService.js:100`, `msg/GuildBattlegroundService.js:100`, `msg/GuildBattlegroundService.js:662`, `msg/OtherPlayerService.js:889`, `msg/StartupService.js:842`.

Against that, only two call sites already scope the rescan to the container that was just updated: `index.js:1363` (`$('#investedDiv').i18n()`) and `index.js:2472` (`$('#rewards').i18n()`, inside `rewardObserve()`). The 18:2 ratio means nearly every message-handler function that touches i18n-tagged markup chooses the expensive whole-`<body>` form even though each one already knows (and has just written to) the specific container it rendered into — `outputHTML`/`*HTML` is always assigned to a single named element (`info.innerHTML`, `donationDIV.innerHTML`, `armyDIV.innerHTML`, etc.) immediately before the `$('body').i18n()` call. Because these handler functions fire on ordinary, frequent gameplay actions (collecting a building, opening a Great Building, viewing another player, a GBG action, a guild-expedition tick, a mail/conversation load), `$('body').i18n()`'s full-document `data-i18n` attribute scan runs dozens of times over a normal play session, each time re-walking the entire DevTools panel DOM instead of the handful of elements that actually changed.

**Fix**: replace each `$('body').i18n()` with a selector scoped to the container the surrounding code just wrote to (e.g. `$('#armyDIV').i18n()` at `msg/ArmyUnitManagementService.js:100`, `$('#donationDIV').i18n()`/equivalent at the `GuildBattlegroundService.js`/`GreatBuildingsService.js` sites), following the pattern already correctly used at `index.js:1363` and `index.js:2472`.

### P2: `fn/copy.js:14`'s `import $ from 'jquery'` is dead code — `$` is never referenced anywhere in the file

`src/js/CLAUDE.md:22` explicitly warns against adding `import $ from 'jquery'` on top of the global `webpack.ProvidePlugin` binding (`webpack.common.js:43-46`, which provides `$`/`jQuery` globally to every entry already). `fn/copy.js:14` does exactly that — and unlike a merely-redundant-but-used import, grepping the full 224-line file for `$(` or bare `$` finds no usage at all: every DOM operation in `copy.js` (`fClipboardCopy`, `DonorCopy`, `DonationCopy`, `fCityStatsCopy`, `fFriendsCopy`, `fGuildCopy`, `fHoodCopy`, `BattlegroundCopy`, `ExpeditionCopy`, `TreasuryCopy`, and the internal `copyToClipboard()`/`fallbackCopy()`/`addToClipboard()`/`copyNode()` helpers) uses `document.querySelector`/`document.getElementById`/`window.getSelection`/`navigator.clipboard` — plain DOM APIs only. The import has no effect beyond pulling `jquery` into this module's dependency graph for nothing.

**Fix**: delete `import $ from 'jquery';` at `fn/copy.js:14`.

## What's solid

- `handleRequestFinished()` (`index.js:627-1916`) wraps the entire per-message dispatch loop in a single `try { ... } catch (err) { console.error(...) }` (lines 671-1914) plus a `.catch()` on `request.getContent()` itself (lines 1912-1914) — a malformed/unexpected payload shape from any single `msg` will not throw uncaught inside the main traffic-interception loop; it's swallowed and logged, and the loop continues to the next message.
- `vars/showOptions.js`'s `set()` (lines 35-48) mutates the exported `items` object's properties in place (`items[key] = value`) rather than reassigning `items` to a new object, so the live ES-module binding exported as `showOptions` (line 86) correctly reflects updates for every importer — this is the specific failure mode `src/js/CLAUDE.md` warns about, and it is *not* present here.
- No `var`-in-new-code, no assignment-vs-comparison (`if (x = y)`) conditionals, and no un-`return`ed promise-returning helpers were found within `index.js`, `options.js`, `devtools.js`, `popup.js`, or `vars/showOptions.js` themselves (grepped explicitly for the `if (x = y)` pattern across all five files — no matches).
- `devtools.js` and `popup.js` are both minimal, single-purpose files with no correctness issues found.
- `fn/collapse.js`'s default-exported `set(key, value)` (lines 65-174) mutates the same module-level `let`-equivalent bindings it manages via a plain `switch` statement, the same live-binding-correct pattern already confirmed for `vars/showOptions.js` in pass 1 — no export/import identity drift found here either.
- `msg/GreatBuildingsService.js` uses `BigNumber` consistently for the donation math that's actually displayed and compared against thresholds — `getFriendlyDonation()`, `fPercentBanded()`, `fDonationSuggest()` (line 597), and the donor-ranking totals (lines 110-125) all stay in `BigNumber` end-to-end. The plain-number mixing flagged above is localized to `getSafe()`/`getPlaceValues()`'s `remaining`/`rem` values, not a file-wide gap.
- `msg/ConversationService.js`'s `getPercent()` (lines 90-146) wraps its entire donation-percent-parsing logic in `try { ... } catch (error) { console.log(error); }`, so a malformed or unexpected GBG-target message title can't throw uncaught even before it would reach `index.js`'s outer catch.
- Checked all ten `msg/*.js` files' imports against every identifier they reference from `../index.js`: the undeclared-`output` bug is isolated to `GuildBattlegroundService.js:115` — the same `output.innerHTML` pattern appears in `StartupService.js:914,1065` and `OtherPlayerService.js:182`, but in both of those files it's commented-out code, not live.
- `fn/storage.js`'s `setStorage`/`removeStorage` share `getStorage`'s missing-`return` pattern, but grepping every caller repo-wide confirms none of them read a return value from `storage.set(...)`/`storage.remove(...)` — those two are latent (would break a future caller that tried to `await` them) rather than actively broken today, unlike `getStorage`.
- No jQuery-specific event-binding idioms (`.on()`, `.click()`, delegated `.on(selector, event, handler)`) are used anywhere in `src/js/**` — a repo-wide grep for these patterns returns zero matches. All event binding, in every entry point and every `msg/*.js`/`fn/*.js` file, uses native `addEventListener`/`removeEventListener`, so there's no jQuery delegated-event anti-pattern to flag.
- The DOM-replacement-then-`addEventListener()` pattern used at 18+ sites across `index.js` and `msg/*.js` (e.g. `index.js:999-1002`, `:1356-1362`, `fn/helper.js:770-772`) is *not* a listener-accumulation leak, despite running on every relevant network response: in each case the container's preceding `.innerHTML =` reassignment destroys the previous element (and any listener bound to it) before the new listener is attached to the freshly created node. `index.js:2593-2608`'s `toggleDebug()`/`removeDebug()` pair shows this is a deliberate, understood pattern in this codebase — `removeDebug()` explicitly `removeEventListener`s `#logo`'s click handler, and `toggleDebug()` re-attaches it fresh each time the logo element is rebuilt via `outerHTML =`. The `ResizeObserver` finding above is a real gap precisely because it *doesn't* get this same implicit cleanup.
- jQuery is used correctly and narrowly outside of `.i18n()`/`.height()`: `msg/GuildBattlegroundService.js:319-331`'s local `copyToClipboard()` helper appends a temporary jQuery-wrapped `<textarea>` to `body` and reliably `.remove()`s it in the same synchronous call (line 330) before returning — no orphaned DOM nodes left behind, and it correctly coexists with the unrelated vanilla-JS `copyToClipboard()` of the same name in `fn/copy.js` since both are module-scoped, non-exported functions with no naming collision at the ES-module level.
- No `$.each()` usage anywhere in `src/js/**` — every iteration in the codebase uses native `.forEach()`/`for`/`.map()`, so there's no `$.each`-vs-native inconsistency to flag.
- Confirmed `webpack.ProvidePlugin` (`webpack.common.js:43-46`) is the sole source of the global `$`/`jQuery` bindings, and only one file (`fn/copy.js:14`, flagged above) adds a redundant explicit `import $ from 'jquery'` on top of it — every other file that uses `$` relies on the global correctly, per `src/js/CLAUDE.md:22`.

## Running priority total (all 3 passes — final)

P0: 5 (unchanged from passes 1-2, per that pass's own counted total: silently-dropped `clipboard`/`showBattlegroundChanges` settings on Save, two disagreeing `showOptions` default sources, broken `getStorage()` return breaking `useNewDonationPanel` restore, undefined `getKey()` breaking `postToDiscord()`, undeclared `output` breaking the GBG Leaderboard — the confirmed `innerHTML`-interpolation instances are also P0-severity but were explicitly excluded from pass 1-2's counted total as a documented pre-existing repo-wide gotcha rather than a newly-surfaced defect; see that finding's own text) · P1: 7 (5 from passes 1-2: no-op `webRequest` listener, dead `darkMode` comparison, three-site assignment-vs-comparison clan-goods bug, BigNumber/plain-number mixing in GB donation math, unguarded `.find()` in `fshowBattleground()`; + 2 new from pass 3: accumulating `ResizeObserver` leak across 9 call sites with zero `.disconnect()` calls repo-wide, and the 18:2 unscoped-vs-scoped `$('body').i18n()` full-document rescan confirming `src/js/CLAUDE.md:15`) · P2: 2 (1 from passes 1-2: inconsistent `msg/*.js` guard-clause coverage; + 1 new from pass 3: dead `import $ from 'jquery'` in `fn/copy.js:14`).

**Total across all three passes: 14 confirmed findings — 5 P0, 7 P1, 2 P2.**
