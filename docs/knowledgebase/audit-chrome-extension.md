# Chrome Extension MV3 Audit

**Verified**: 2026-08-14 against `src/chrome/manifest*.json` and Chrome-extension API
call sites in `src/js/**`, via the `/chrome-extensions` skill.

## Confirmed findings

### P0: `webRequest.onBeforeSendHeaders` is a silent no-op

`index.js:613-621` registers the listener with `extraInfoSpec: ['requestHeaders']` —
missing `'blocking'` — so Chrome ignores the returned `{requestHeaders: ...}`. The
code's whole purpose (stripping the `Origin: chrome-extension://...` header before it
reaches innogamescdn.com) never happens.

Do not fix this by simply adding `'blocking'`: MV3 restricts blocking `webRequest` to
force-installed/enterprise installs since Chrome 121 — a Web Store extension cannot use
it at all. Replace with a narrowly scoped `declarativeNetRequest` `modifyHeaders` rule
instead, or remove the listener if the header strip turns out not to be load-bearing.

### P1: Unused permission surface

`web_accessible_resources` and `externally_connectable` currently expose surface
(`browser-polyfill.js`, game-page messaging) with no corresponding content script or
`onMessageExternal`/`onConnectExternal` listener consuming it. This looks like leftover
surface from an earlier content-script architecture — as-is it's dead but still widens
the attack surface unnecessarily. Don't widen further "for later"; only add scope when
something in `src/` actually calls it.

### P2: `minimum_chrome_version` inconsistency

`minimum_chrome_version: "88.0"` is inconsistent with the MV3 `webRequest`-blocking
restriction above (effectively requires acknowledging Chrome 121+ behavior). Worth
revisiting once the P0 finding is fixed.

## What's solid

- Manifest is correctly MV3, `action: {}` is present, CSP is properly restrictive
  (`script-src 'self'`, no inline scripts/handlers anywhere).
- All icon files exist at the correct declared pixel dimensions.
- `host_permissions` are scoped, not `<all_urls>`.
- `manifest.json`'s empty `name`/`version` fields are intentional —
  `WebpackExtensionManifestPlugin` fills them from `package.json` at build time, not a
  bug.
