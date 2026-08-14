# Extension / MV3 Audit

**Verified**: 2026-08-14 against `src/chrome/manifest.json`, `src/chrome/manifest_release.json`, `webpack.common.js` (CopyPlugin icon mapping), and extension-API call sites across `src/js/**` (`index.js`, `devtools.js`, `popup.js`, `options.js`, `fn/copy.js`, `fn/post.js`).

## Confirmed findings

### P1: `webRequest.onBeforeSendHeaders` listener is a silent no-op

`src/js/index.js:613-621` registers:

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

The `extraInfoSpec` array (third argument) is `['requestHeaders']` — it does **not** include `'blocking'`. Without `'blocking'`, Chrome ignores the callback's return value entirely; the listener only observes, it cannot modify outgoing headers. The comment directly above it (`/* don't send the origin, so that they don't see the request coming from Chrome extension */`, line 604) states the intent — stripping the extension's `Origin` header before it reaches `innogamescdn.com` — but that stripping never happens. The `Origin: chrome-extension://...` header still goes out on every matching request.

This is also unfixable in place: per `src/chrome/CLAUDE.md:8`, blocking `webRequest` has been restricted to force-installed/enterprise installs since Chrome 121, so adding `'blocking'` back wouldn't work for a Web Store distribution anyway. The fix is to replace this listener with a `declarativeNetRequest` `modifyHeaders` rule (remove-header action on the `Origin` request header for `*.innogamescdn.com` requests), and drop the now-unused `webRequest` permission from both manifests once migrated.

### P1: `google.com`/`googleusercontent.com` host_permissions have zero active call sites

`src/chrome/manifest.json:31-32` (and identically in `manifest_release.json`) grant:
```json
"https://*.google.com/*",
"https://*.googleusercontent.com/",
```
The only reference to a Google host anywhere in `src/js/**` is a single commented-out line, `src/js/fn/post.js:15`:
```js
// https://script.google.com/macros/s/AKfycbw6QTefSBnuMF40Q8MpLcmCV8aB9dPNJnJzyjFBiZvBJaIlcE24JLkj/exec
```
No live `fetch`/`XMLHttpRequest` call targets either host. These are broad host_permissions (all of Google, all of Google's user-content CDN) held for a feature that was never implemented or was removed, with no code path exercising them. Beyond being unnecessary attack surface, Chrome Web Store review specifically flags host_permissions without a corresponding justified use — this pair will need a real justification or removal at publish time. Recommend removing both from `permissions`/`host_permissions` in both manifest files unless the Google Apps Script integration is still planned, in which case the commented code should be finished or the intent documented.

### P2: `externally_connectable` and `web_accessible_resources` expose surface nothing consumes

`src/chrome/manifest.json:12-14` declares `externally_connectable` for `https://*.forgeofempires.com/game/*`, but there is no `chrome.runtime.onMessageExternal` (or `onConnectExternal`) listener anywhere in `src/js/**` (verified via full-tree search — zero matches). Any page matching that pattern can currently call `chrome.runtime.sendMessage(extensionId, ...)` and reach the extension's message-routing surface for no functional benefit — it's inert but unnecessary.

Similarly, `web_accessible_resources` (`manifest.json:37-42`) exposes `browser-polyfill.js` to `https://*.forgeofempires.com/*`. There is no `content_scripts` entry in either manifest and no `chrome.scripting.executeScript` call anywhere in the codebase (verified via full-tree search) — nothing injects a content script into the game page that would need to fetch this bundled file from page context. The resource is reachable by any script on that origin for no reason the codebase currently uses.

Both are low-severity (no secrets exposed, `browser-polyfill.js` is a public library file), but both widen the reviewable/attestable permission surface for zero functional payoff. Recommend removing `externally_connectable` and the `web_accessible_resources` entry unless there's a near-term plan to add the consuming code, in which case note that intent in `src/chrome/CLAUDE.md` (which already flags this exact gap in prose but the surface hasn't been trimmed).

### P2: `CLAUDE.md`'s "content-script traffic controller" description doesn't match how `index.js` actually runs

Root `CLAUDE.md` and `src/js/CLAUDE.md` both describe `src/js/index.js` as a "content-script traffic controller." It is not a content script: there is no `content_scripts` entry in either manifest, and `index.js` is loaded by `panel.html`, which is registered as a DevTools panel via `chrome.devtools.panels.create(EXT_NAME, null, 'panel.html')` in `src/js/devtools.js:17`. Network interception happens through `browser.devtools.network.onRequestFinished.addListener(handleRequestFinished)` (`index.js:623`), the DevTools Protocol network API available only inside a devtools panel's extension page — not through a content script's isolated-world DOM access.

This distinction matters beyond wording: a devtools panel page runs as a full extension page (same privilege level as `popup.html`/`options.html`, full `chrome.*` API access, no isolated-world/page-CSP boundary), not under a content script's restricted execution model. Someone reading "content-script" and reasoning about security boundaries (e.g. "this can't touch `chrome.webRequest`, content scripts don't get that") would reach the wrong conclusion — which is presumably how the non-blocking `webRequest` listener above went unnoticed. Recommend correcting both CLAUDE.md descriptions to "DevTools panel script" or similar.

## What's solid

- `manifest_version: 3` throughout, no MV2 API usage found (`chrome.action` not `browserAction`, no `background.scripts`).
- All six declared icon sizes (`16/24/32/48/64/128`) exist as real files under `src/icons/foe-info/` and are correctly copied to `icons/` in the build output by `webpack.common.js`'s `CopyPlugin` (`src/icons/common` + `src/icons/foe-info` → `icons`), matching the manifest's `"icons/IconNN.png"` paths exactly — verified against `build/FoE-Info-DEV/icons/`.
- `content_security_policy.extension_pages` is `script-src 'self'; object-src 'self'` with no `unsafe-eval`/`unsafe-inline` — no inline `<script>` or `eval()`/`new Function()` usage found in `src/js/**`.
- `"action": { "default_popup": "popup.html" }` is present, consistent with `popup.js`'s use of `chrome.action`-adjacent behavior (opening the options page).
- `clipboardWrite` usage in `src/js/fn/copy.js` goes through `navigator.clipboard.writeText()` (standard Web Clipboard API) with a `document.execCommand('copy')`-style fallback (`fallbackCopy`), consistent with normal MV3 extension-page clipboard access.
- `manifest.json` and `manifest_release.json` are byte-identical (verified via `diff`) — not itself a bug, but worth knowing there is currently no dev/release manifest divergence (e.g. no separate `key` field for a stable dev extension ID); flagged for awareness, not filed as a finding since nothing in the repo indicates one was ever intended.
- Discord webhook host_permissions (`discordapp.com`, `discord.com`) and `innogamescdn.com` are both actively exercised by real code (`src/js/fn/post.js` webhook posting; `index.js` metadata-URL matching and header interception) — legitimately justified permissions, not surface to trim.
