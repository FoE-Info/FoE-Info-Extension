# DevTools Panel Audit

**Verified**: 2026-08-14 against `src/js/devtools.js`, `src/chrome/panel.html`, `src/chrome/devtools.html`, `webpack.common.js` (HtmlWebpackPlugin wiring), and `src/js/fn/collapse.js` (checked via `modern-web-guidance`'s `defer-rendering-heavy-content` guide for the content-visibility suggestion below).

**No live browser session was available for this pass** — attempting to connect via the `chrome-devtools` MCP server failed (`Could not connect to Chrome. Check if Chrome is running.`), and this repo's docs/knowledgebase doesn't cover launching a Chromium instance with the unpacked extension loaded and an authenticated `forgeofempires.com` game session, which live DevTools-panel behavior testing would require. This is a **static-only** pass. A live pass would still need to check: whether the panel actually renders correctly against real game-server payloads, whether the two external Google Fonts requests noted below actually block/delay first paint of the panel in practice, actual panel open/re-render latency under a live `handleRequestFinished()` event stream, and whether `browser.devtools.panels.create(EXT_NAME, null, 'panel.html')` (`devtools.js:17`) succeeds without warnings in a real DevTools instance.

## Confirmed findings

### P1: `panel.html` makes two external network requests on every panel open, breaking offline use and leaking to Google

`src/chrome/panel.html:8-15`:
```html
<link
  href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
  rel="stylesheet"
/>
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
/>
```
Every time a player opens the FoE Info DevTools panel, the browser fetches two stylesheets (and the font files they reference) from `fonts.googleapis.com`/`fonts.gstatic.com`. This directly contradicts `src/chrome/CLAUDE.md:14`'s stated expectation that "DevTools panels should work offline" — confirmed still true and unaddressed. Beyond breaking offline use, it sends the player's IP and User-Agent to Google on every panel open, which is a disclosure worth being explicit about in any privacy documentation given this extension already handles sensitive Discord webhook URLs.

Fix: self-host the two font families. This project already uses Webpack's `CopyPlugin` to bundle static assets verbatim (`webpack.common.js:73-87`, used for icons/i18n/polyfill files) — the same pattern extends directly to font files: download the woff2 files for the specific glyphs actually used (Material Icons Outlined + Material Symbols Outlined subset), add them via `CopyPlugin` or an asset-module `@font-face` import, and replace both `<link>` tags with a local stylesheet. No new tooling is required.

## What's solid

- `src/chrome/CLAUDE.md:13`'s claim that `panel.html` and `devtools.html` have no `<body>` element, relying on `HtmlWebpackPlugin`'s fallback of injecting bundles into `<head>`, is verified accurate: both templates end at `</head></html>` with no `<body>` tag (`panel.html:44`, `devtools.html` in full), and `webpack.common.js:48-70` confirms both are wired through `HtmlWebpackPlugin` with `filename`/`template` pointing at these exact files with no injection-mode override that would require a `<body>`.
- `devtools.js` is minimal and does one thing: `browser.devtools.panels.create(EXT_NAME, null, 'panel.html')` (`devtools.js:17`), with no dead/unreachable branches in the active code path (the two large commented-out blocks below it, lines 19-34, are inert and don't execute).
- Network interception is correctly scoped to the DevTools Protocol network API (`browser.devtools.network.onRequestFinished.addListener(handleRequestFinished)`, `src/js/index.js:623`), which is only available inside a devtools panel's extension page — not attempted from a content script or background context where it wouldn't be available.
- `panel.html`'s inline `<style>` block (lines 16-42) is small, self-contained CSS with no external `@import` — the only external-network surface in this lens is the two font `<link>` tags above.

## Worth investigating (not a confirmed bug — flagging with evidence, not fabricating a performance number)

`src/js/fn/collapse.js` (392 lines) implements an extensive collapsible-section system used throughout the panel's rendered UI (confirmed via the `clipboardText`/`collapseClipboard` pattern visible in `index.js:410-415`, and the file's own size/scope). Per `modern-web-guidance`'s `defer-rendering-heavy-content` guide, sections that are collapsed (effectively off-screen) are exactly the case `content-visibility: hidden` targets — it skips layout/paint work for hidden content while preserving render state for instant re-expansion, which is strictly better than the collapse mechanism's current approach if it's using `display: none`/height animation under the hood (verify against the CSS lens's findings in `audit-css-html.md` before deciding whether to act on this — this file doesn't re-audit `custom.scss` itself). This is a real optimization candidate worth profiling in a live session, not a confirmed regression — no live pass was available to measure actual re-render cost per the limitation noted above.
