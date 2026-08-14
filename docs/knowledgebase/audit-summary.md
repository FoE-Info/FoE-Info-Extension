# Audit Summary

**Run**: 2026-08-14, five domain lenses (Node.js/Webpack, JavaScript/jQuery, CSS/HTML, Extension/MV3, DevTools panel), each verified against actual source lines — no lens reports a finding it didn't confirm by reading the cited file. Raw totals across all five lens files: **7 P0, 20 P1, 13 P2** (40 confirmed findings). One finding — the unescaped-`innerHTML` gotcha — was already known and documented before this run (see prior "known risk areas" note); everything else is newly surfaced by this pass.

## Outcome

The most urgent thing this audit found is that **four independent, real user-facing features are currently silently broken**, with no test suite to have caught any of them: saving the options page wipes the `clipboard` preference from storage on every click (`audit-javascript-jquery.md`); the GBG Leaderboard panel throws on every single invocation and has therefore never rendered for anyone who enabled it (`audit-javascript-jquery.md`); `postToDiscord()` throws immediately on an undefined `getKey()` reference, so that webhook path has never worked (`audit-javascript-jquery.md`); and the "new donation panel" preference can never be restored from storage because `getStorage()` doesn't return its promise (`audit-javascript-jquery.md`). None of these crash the extension — they're all swallowed by `index.js`'s outer `try/catch` — which is exactly why they've stayed invisible.

Second, and specific to what this extension is *for*: a copy-paste assignment-vs-comparison bug (`= ` instead of `===`) in three `msg/*.js` clan-goods branches means the guild-contribution totals this tool calculates and displays to guild leadership are currently inflated with every player's regular, non-guild goods production (`audit-javascript-jquery.md`). For a tool whose core value proposition is accurate game-data calculation, a silent accuracy bug in guild-contribution math is a trust issue, not just a code-quality one.

Third, the project's only automated gate is currently broken in this exact working tree: `npm run check` (and the documented `/build-verify` command that calls it) fails because `.prettierignore` doesn't exclude `.claude/` — a false-positive failure any future contributor will hit immediately, unrelated to their own change (`audit-nodejs-webpack.md`).

Fourth, a small cluster of permission-hygiene issues would draw attention at Chrome Web Store review: broad `google.com`/`googleusercontent.com` host_permissions with zero active call sites, an `externally_connectable` + `web_accessible_resources` surface nothing in the codebase consumes, and — confirmed **independently by two separate lenses** (Extension/MV3 and JavaScript/jQuery, reading the same lines from different angles) — a `chrome.webRequest.onBeforeSendHeaders` listener that has never actually stripped the extension's identifying header from outgoing requests, because it was never registered as blocking (`audit-chrome-extension.md`, `audit-javascript-jquery.md`).

## Audit matrix

| Lens | Current strengths | Highest-priority gaps | File |
|---|---|---|---|
| Node.js & Webpack | 0 vulnerabilities (`npm audit`), all dependencies at latest, both real builds (`npm run build`/`build:dev`) succeed end-to-end with correct asset output | `npm run check`/`/build-verify` currently fails on `.claude/` files (P1); `devtools.html`/`popup.html` ship 220 KiB of unused vendor JS every load (P1); `postcss-loader` runs with zero config (P1) | [audit-nodejs-webpack.md](audit-nodejs-webpack.md) |
| JavaScript & jQuery | Outer `try/catch` prevents any malformed payload from crashing the panel; no jQuery delegated-event anti-patterns anywhere; live-binding export pattern correctly used in `vars/showOptions.js`/`collapse.js` | 4 silently-broken features (clipboard setting, GBG Leaderboard, Discord webhook, donation-panel restore) + 2 conflicting option-default sources — all P0; guild-contribution math accuracy bug (P1); accumulating `ResizeObserver` leak, 9 sites, never disconnected (P1) | [audit-javascript-jquery.md](audit-javascript-jquery.md) |
| CSS & HTML | Sass compiles cleanly with modern `@use` syntax; no inline scripts/handlers anywhere (CSP-clean); `options.html` form labeling is fully correct | Popup's options icon renders visibly mis-colored (P0) **and** is keyboard-unreachable with no accessible name (P1) — same element, two lenses, two compounding bugs; `_variables.scss` (the entire Bootstrap theme override) is never imported and has zero effect (P1) | [audit-css-html.md](audit-css-html.md) |
| Extension / MV3 | All 6 icon sizes present and correctly built; CSP is `script-src 'self'` with no violations found; Discord/`innogamescdn.com` host_permissions are genuinely used | `webRequest` header-strip listener is a confirmed no-op (P1, cross-confirmed by the JS lens independently); unused `google.com`/`googleusercontent.com` host_permissions (P1) | [audit-chrome-extension.md](audit-chrome-extension.md) |
| DevTools panel | Panel-creation code is minimal with no dead active paths; network interception correctly scoped to the DevTools Protocol API, not attempted from an unavailable context | Panel loads two external Google Fonts stylesheets on every open, breaking offline use and leaking IP/UA to Google (P1); **no live browser session was available for this pass** — static analysis only | [audit-chrome-devtools.md](audit-chrome-devtools.md) |

## Prioritized remediation roadmap

### P0 — breaks something now

1. **`options.js` `save_options()` wipes `showOptions.clipboard` (and `showBattlegroundChanges`) from storage on every Save**, permanently disabling the clipboard feature gated at `index.js:399`. Fix: merge onto existing stored `showOptions` instead of replacing it wholesale, or add the missing keys to the write payload. — `audit-javascript-jquery.md`
2. **Two disagreeing `showOptions` default-value sources** (`options.js` vs `vars/showOptions.js`) diverge on `showGBInfo`/`showLogs`/`showContributions`, so first-run defaults depend on init timing. Fix: have `options.js` import defaults from `vars/showOptions.js` instead of maintaining a second literal. — `audit-javascript-jquery.md`
3. **`fn/storage.js`'s `getStorage()`/`setStorage()`/`removeStorage()` don't `return` their promise**; the one live caller (`GreatBuildingsService.js:58-59`, restoring `useNewDonationPanel`) is permanently dead code. Fix: add `return` to all three, then update the caller to `await`/`.then()` the now-real promise. — `audit-javascript-jquery.md`
4. **`fn/post.js`'s `postToDiscord()` calls an undefined `getKey()`**, throwing before ever sending a request; `postAlerttoDsicord()` is completely non-functional. Fix: remove the `getKey()` call (send `webHookUrl` directly, matching `logToDiscord()`/`postGBGtoSS()`) or restore a real implementation. — `audit-javascript-jquery.md`
5. **`msg/GuildBattlegroundService.js:115` references an undeclared `output`** (never imported from `index.js`), so `getLeaderboard()` throws on every call and the GBG Leaderboard has never rendered. Fix: add `output` to the file's existing import block. — `audit-javascript-jquery.md`
6. **`custom.scss:57-66`'s `.bi-tools` debug colors (red/green/blue) override the popup's live "go to options" icon** (`popup.html:32-44`), which currently renders mis-colored for every user. Fix: replace with one intentional color or delete the rule. — `audit-css-html.md`
7. **Unescaped `innerHTML` interpolation of player/guild-controlled strings** — confirmed live at `index.js:1580, 1749, 1241, 989` (guild rank titles, member names, GB donor/owner names). This is the one item in this list that was already known before this run (flagged in prior audit notes as a repo-wide gotcha, not something to blanket-fix in one pass) — this run adds exact, currently-live citations rather than discovering it fresh. Fix per-site: switch to `textContent` or an escaping helper for the specific interpolated fields. — `audit-javascript-jquery.md`

### P1 — real correctness or process gap

8. **`npm run check`/`/build-verify` fails on `.claude/` files** — add `.claude` to `.prettierignore`. — `audit-nodejs-webpack.md`
9. **`chrome.webRequest.onBeforeSendHeaders` listener is a no-op** (missing `'blocking'` + `webRequestBlocking` permission) — the extension's `Origin` header still reaches `innogamescdn.com` unmodified. Confirmed independently by two lenses. Fix: migrate to `declarativeNetRequest` `modifyHeaders`, or delete the dead listener. — `audit-chrome-extension.md`, `audit-javascript-jquery.md`
10. **Three-site assignment-vs-comparison bug inflates guild-contribution totals** (`StartupService.js:256,425`, `OtherPlayerService.js:619`) — change `=` to `===` at all three sites. — `audit-javascript-jquery.md`
11. **`ResizeObserver` accumulation leak, 9 call sites, zero `.disconnect()` calls repo-wide** — worst offender `rewardObserve()`, fires on nearly every collected-building/quest reward in a long-lived panel session. Fix: track and disconnect the previous observer before creating a new one at each site. — `audit-javascript-jquery.md`
12. **`$('body').i18n()` full-document rescan at 18 sites** (only 2 sites correctly scope to the just-updated container) — fires on ordinary, frequent gameplay actions. Fix: scope each call to the specific container just rendered. — `audit-javascript-jquery.md`
13. **`google.com`/`googleusercontent.com` host_permissions have zero active call sites** (only a commented-out reference in `fn/post.js:15`) — remove both unless the Google Apps Script integration is still planned. — `audit-chrome-extension.md`
14. **`_variables.scss` (191 lines of Bootstrap theme overrides) is never imported** — the build compiles stock Bootstrap defaults instead of the intended theme. Fix: `@use` it in `main.scss`/`options.scss`, or confirm it's retired and delete it. — `audit-css-html.md`
15. **Hardcoded colors bypass design tokens** throughout `custom.scss` — route new colors through Bootstrap/`_variables.scss` once the import above is fixed. — `audit-css-html.md`
16. **Invalid CSS silently dropped** — `fw: bold;` (not a real property) at `custom.scss:136,142` **and independently** at `panel.html:28`; `float: center;` (invalid keyword) at `custom.scss:286`. Three separate typos, none causing a build error. — `audit-css-html.md`
17. **Popup's options icon has no accessible name and isn't keyboard-operable** (`popup.html:32-49`) — same element as finding #6 above. Fix: wrap in a real `<button aria-label="Options">` or add `role="button" tabindex="0"` + keydown handling. — `audit-css-html.md`
18. **Static HTML templates have zero `data-i18n` coverage**, including `popup.html`'s hardcoded instructional text — corrects `src/CLAUDE.md:16`'s guidance, which points at files with nothing to match. — `audit-css-html.md`
19. **Panel loads two external Google Fonts stylesheets on every open** — breaks offline use, leaks IP/UA to Google. Fix: self-host via the same `CopyPlugin` pattern already used for icons/i18n/polyfill files. — `audit-chrome-devtools.md`
20. **`GBselected`/`getSafe()`/`getPlaceValues()` mix plain-JS-number arithmetic into BigNumber-based donation math** — not observably wrong at today's value ranges, but defeats the file's own precision convention. — `audit-javascript-jquery.md`
21. **Unguarded `.find()` result in `fshowBattleground()`** throws if a battleground participant isn't in `GuildMembers`, aborting the whole Battlegrounds panel render for that response. — `audit-javascript-jquery.md`
22. **`devtools.html`/`webpack.dev.js`'s dead-weight configs**: the single `vendors` cache group forces 220 KiB of unused jQuery/Bootstrap/i18n JS onto `devtools.html` and `popup.html` (neither imports any of it); `postcss-loader` runs in both pipelines with no config present, doing nothing while implying autoprefixing is happening. — `audit-nodejs-webpack.md`

### P2 — cleanup / polish

23. `externally_connectable` + `web_accessible_resources` expose surface nothing in the codebase consumes — remove or document intent. — `audit-chrome-extension.md`
24. `CLAUDE.md`'s "content-script traffic controller" description doesn't match how `index.js` actually runs (it's a DevTools panel script, not a content script) — correct the docs; the distinction affects reasoning about security boundaries. — `audit-chrome-extension.md`
25. `custom.scss:397-681` — large (~42% of the file) commented-out dead-style block; delete rather than continuing to comment out more. — `audit-css-html.md`
26. `.dark-mode` class is unreachable (its only toggle call site is itself commented out). — `audit-css-html.md`
27. `devtools.html` missing `lang` attribute (inconsistent with the other three templates). — `audit-css-html.md`
28. Heading levels skip straight to `<h6>`/`<h2>` with no `<h1>` on `options.html`/`popup.html` — not urgent, fix if either page is reworked. — `audit-css-html.md`
29. Dead `import $ from 'jquery'` in `fn/copy.js:14` — `$` is never referenced in the file. — `audit-javascript-jquery.md`
30. Inconsistent guard-clause coverage across several `msg/*.js` files (`CityProductionService.js`, `ArmyUnitManagementService.js`, `GuildExpeditionService.js`, `ResourceService.js`, `ConversationService.js`, `BonusService.js`) — low priority since the outer `try/catch` already contains the blast radius. — `audit-javascript-jquery.md`
31. `allowScripts` field in `package.json` has no effect (no tool reads this convention) — add the tool or remove the field. — `audit-nodejs-webpack.md`
32. `npm run setup` hard-fails on missing `uv`/`uvx` after `npm install` already succeeded, reading as a broken install rather than "optional tooling missing." — `audit-nodejs-webpack.md`
33. No `.nvmrc`/`.npmrc` enforcing the `engines.node` pin — currently documentation-only. — `audit-nodejs-webpack.md`
34. Two dead/no-op Webpack module rules (`webpack.common.js:15-18, 19-25`) and an unreachable `devServer` config (`webpack.dev.js:35-41`) that would mislead a contributor into expecting live-reload. — `audit-nodejs-webpack.md`

## Re-running this audit

Run `/audit` again after addressing findings above to get a fresh, evidence-verified pass — each lens re-reads its scoped files from scratch rather than trusting this summary, so fixed findings will simply stop appearing rather than needing to be manually cleared.
