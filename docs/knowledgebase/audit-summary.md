# Codebase Audit Summary

**Verified**: 2026-08-14, generated via the `/chrome-extensions` and
`/modern-web-guidance` skills plus the `css-expert`, `html-expert`,
`javascript-expert` (×2), `jquery-expert`, `nodejs-expert`, and `webpack-expert`
subagents. `websocket-expert` was skipped — the only `'websocket'` reference
(`src/js/index.js:631`) is a DevTools `_resourceType` filter check, not an actual
WebSocket implementation. The DevTools-panel audit did not include a live session (see
its gaps section) — treat that one file as the least complete of the five.

## Outcome

The extension builds, and its highest-risk paths are unescaped `innerHTML` sinks fed by
server-controlled strings, a storage helper that silently discards its own promise, and
a `webRequest` listener that has never actually modified a request since MV3 restricted
blocking mode. None of these are caught by an automated gate today — there is no lint,
type-check, or test runner, only Prettier formatting.

## Audit matrix

| Lens | Current strengths | Highest-priority gaps | Detail |
| --- | --- | --- | --- |
| Node.js & Webpack | Correct `dependencies`/`devDependencies` split; clean dev/prod entry split | No lint/type/test gate; no prod source maps | [Node.js & Webpack audit](audit-nodejs-webpack.md) |
| JavaScript | ES modules; production minification | Unescaped `innerHTML` sinks, broken storage getter, several `ReferenceError`/assignment-vs-comparison bugs | [JavaScript & jQuery audit](audit-javascript-jquery.md) |
| jQuery | No leaky `.on()`/`.off()` patterns; native `addEventListener` used throughout | `$('body').i18n()` full-document rescans on nearly every network response | [JavaScript & jQuery audit](audit-javascript-jquery.md) |
| CSS/Sass | Clear entry-point separation; Bootstrap + jQuery as the only styling/DOM stack | Undefined custom properties, invalid declarations silently dropped, ~44% dead CSS in `custom.scss` | [CSS & HTML audit](audit-css-html.md) |
| HTML | Core panel/options metadata exists | Missing `<body>` in templates; `options.html` has no heading hierarchy or i18n coverage | [CSS & HTML audit](audit-css-html.md) |
| Extension/MV3 | Valid MV3 topology, scoped `host_permissions`, restrictive CSP | `webRequest` listener is a no-op; unused `web_accessible_resources`/`externally_connectable` surface | [MV3 audit](audit-chrome-extension.md) |
| DevTools panel | Panel lifecycle correctly scoped to an open DevTools instance | Runtime Google Fonts fetch breaks offline use; audit pass itself is incomplete (no live session) | [DevTools audit](audit-chrome-devtools.md) |

## Prioritized remediation roadmap

### P0: fix silent breakage and the security-relevant sink

1. Add `return` to `fn/storage.js`'s three functions — this alone unblocks the
   `useNewDonationPanel` toggle and likely other silently-broken storage reads.
2. Replace unescaped `innerHTML` interpolation of server-controlled strings
   (player/guild names, etc.) with `textContent` or a reviewed escaping helper.
3. Replace the no-op `webRequest.onBeforeSendHeaders` listener with a
   `declarativeNetRequest` `modifyHeaders` rule, or remove it and reassess whether the
   `webRequest` permission is still needed at all.

### P1: correctness bugs and process gaps

1. Fix the `ReferenceError`s (`OtherPlayerService.js:284,286` and
   `index.js:1985-1987`) and the assignment-vs-comparison bugs
   (`StartupService.js:256,425`, `OtherPlayerService.js:619`, `index.js:492`).
2. Fix the discarded `.forEach()` return in `inactiveHTML()`
   (`GreatBuildingsService.js:839-845`) so the "INACTIVE" donor badge renders again.
3. Add null checks around the `.find(...)` results in
   `GuildBattlegroundService.js:207-253`.
4. Remove the unused `web_accessible_resources`/`externally_connectable` permission
   surface, or wire up the listener that's supposed to consume it.
5. Self-host the panel's Google Fonts so it works offline.
6. Consider adding a lint gate — every P0/P1 finding above was caught by manual
   reading, not CI.

### P2: cleanup and polish

1. Route colors in `custom.scss` through `_variables.scss`/Bootstrap tokens instead of
   more hardcoded hex values; delete (don't further comment out) the dead CSS block.
2. Add `<fieldset>`/`<legend>` grouping and a real heading hierarchy to `options.html`,
   and bring it up to the same `data-i18n` coverage as `panel.html`/`popup.html`.
3. Scope `$(selector).i18n()` calls to the just-inserted container instead of
   re-running `$('body').i18n()` on every network response.
4. Reconcile the `@wikimedia/jquery.i18n` exact-pin against the caret-range convention
   used everywhere else, and consider pinning `prettier` as a devDependency instead of
   invoking it via `npx` each time.

## Re-running this audit

Use `/audit` to regenerate this file set. It re-dispatches one subagent per lens
(`nodejs-expert`+`webpack-expert`, `javascript-expert`×2+`jquery-expert`, `css-expert`+
`html-expert`, `/chrome-extensions`, `/modern-web-guidance`+`browser-testing-with-devtools`),
each writing its own `docs/knowledgebase/audit-*.md`, then rewrites this summary from
their output.
