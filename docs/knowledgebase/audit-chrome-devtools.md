# Chrome DevTools Panel Audit

**Verified**: 2026-08-14 against `src/js/devtools.js`, `src/chrome/panel.html`, and
`src/chrome/devtools.html` via the `/modern-web-guidance` skill and static reading —
this pass did **not** include a live-panel session with `browser-testing-with-devtools`
(no interactive DevTools instance was open during the audit). Re-run with that skill
attached for network-timing, console-error, and accessibility-tree coverage of the
live panel before treating this file as complete.

## Confirmed findings

### P1: Panel loads Google Fonts over the network at runtime

`panel.html` fetches Google Fonts at runtime instead of self-hosting them. This leaks a
request to Google on every panel load and breaks the panel in offline or hardened
environments — DevTools panels should work offline. Prefer self-hosting any new web
fonts rather than adding another external font fetch.

### P1: No `<body>` element (see also CSS/HTML audit)

`panel.html` and `devtools.html` have no explicit `<body>` — tracked in detail in
[CSS & HTML audit](audit-css-html.md), listed here because it's specifically a
DevTools-panel template issue: the panel only renders because `HtmlWebpackPlugin`
falls back to injecting bundles into `<head>`.

## Architecture

`devtools.js` registers the FoE Info DevTools panel via
`browser.devtools.panels.create()`. The panel exists only while DevTools is open and is
destroyed when DevTools closes — there is no background service worker, so any
install/update-only work cannot reliably live here since the panel is normally closed
when those events occur. No such work currently exists, so this is a latent
constraint rather than a live bug.

## Gaps in this pass

- No verification of console errors, network-timing behavior, or the accessibility
  tree during actual game-page network interception — this requires
  `browser-testing-with-devtools` (or the `troubleshooting` skill if the MCP session
  itself won't connect) driving a real DevTools session against
  `en0.forgeofempires.com`.
- No LCP/render-timing check for the panel — low priority for a DevTools-only panel,
  but `debug-optimize-lcp` is available if the panel ever feels slow to paint.
