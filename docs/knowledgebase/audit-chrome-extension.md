# Chrome Extension MV3 Audit

**Verified**: 2026-08-08 against all three manifests, generated production assets,
and Chrome-extension API call sites.

## Architecture

The extension uses a valid DevTools-only MV3 topology with no service worker:

```text
action popup ───────────────► popup.html / popup.js
devtools_page ─► devtools.js ─► panel.html / app.js
options_ui ─────────────────► options.html / options.js
```

`devtools.js` correctly creates `panel.html` using a path relative to the extension
root. The panel exists only while DevTools is open and is destroyed when DevTools
closes. A service worker is unnecessary for the current network-inspection feature,
but installation/update-only work cannot reliably live in a panel that is normally
closed when those events occur.

All manifest icon references exist and match their declared pixel dimensions. The
production build populates the blank source `name`, `short_name`, and `version` fields.

## Confirmed findings

### P0: the `webRequest` listener is observational, not modifying

`index.js` registers `onBeforeSendHeaders` with only `requestHeaders` and returns a
modified header array. Without the blocking mode, Chrome ignores that return value, so
the intended removal of the extension `Origin` header does not occur.

Do not fix this by merely adding `blocking`: in MV3, `webRequestBlocking` is generally
reserved for policy-installed extensions. First confirm whether stripping `Origin` is
actually required. If it is, implement and test a narrowly scoped
`declarativeNetRequest` `modifyHeaders` rule; otherwise remove the ineffective listener
and reassess whether the `webRequest` permission is needed at all. See Chrome's
[webRequest](https://developer.chrome.com/docs/extensions/reference/api/webRequest)
and
[declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
documentation.

### P0: required permissions are requested again at runtime

`storage` and `clipboardWrite` are declared in `permissions`, not
`optional_permissions`, yet the panel/options code calls `browser.permissions.request`
for them. Required permissions are granted at install time; runtime requests are for
optional permissions and should be initiated by a user gesture.

Remove these request flows and use the APIs directly with normal error handling. If a
permission becomes optional, move it to `optional_permissions` and keep the request
inside a clear user action. See Chrome's
[Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions).

### P0: externally sourced text reaches privileged extension HTML

Game payloads and a Google endpoint response are interpolated into `innerHTML`; the
fallback at `fn/post.js:348` assigns the raw response. HTTPS and CSP do not make remote
text safe HTML. Render untrusted values with `textContent` or a reviewed sanitizer and
keep extension-page DOM construction explicit.

### P1: host access is broader or malformed

| Pattern                                 | Finding                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `https://*.forgeofempires.com/game/*`   | Core interception scope; verify every observed endpoint stays under `/game/` |
| `https://*.google.com/*`                | Far broader than user-configured Apps Script posting requires                |
| `https://*.googleusercontent.com/`      | Missing the required `/*` path form for a match pattern                      |
| `https://discordapp.com/api/webhooks/*` | Legacy duplicate; verify and remove if `discord.com` covers supported URLs   |
| `https://discord.com/api/webhooks/*`    | Correctly scoped to webhook paths                                            |
| `https://*.innogamescdn.com/*`          | Used for metadata requests; retain only if current traffic verifies it       |

Replace the broad Google pattern with the exact tested Apps Script/content hosts.
Host permissions should match validated URL parsing in `post.js`; a manifest allowlist
is not a substitute for runtime validation.

### P1: `externally_connectable` has no consumer

The manifests allow Forge of Empires pages to connect externally, but there is no
`runtime.onMessageExternal` or `runtime.onConnectExternal` listener. Remove the field
unless external messaging is intentionally added with sender/origin validation.

### P1: clipboard permission remains in active use

The source has 13 active `document.execCommand('copy')` calls plus two Clipboard API
paths that fall back to `execCommand`. Keep `clipboardWrite` until all copy flows are
migrated and tested in the DevTools panel. Then verify focused extension-page behavior
before removing the permission.

### P1: install/update listeners live in the panel entry

`index.js` registers `runtime.onInstalled`, `runtime.onUpdateAvailable`, and immediately
calls `runtime.requestUpdateCheck()`. The panel is not normally open at installation,
and forcing update checks every time a panel starts is noisy and can be throttled. Move
true lifecycle work to a service worker if it is required; otherwise remove these
listeners/checks and rely on Chrome's update lifecycle.

### P2: permission necessity needs measurement

Chrome storage local has a 10 MB limit in current Chrome versions unless
`unlimitedStorage` applies. The extension stores large metadata objects, but the docs
do not record measured peak usage. Capture `storage.local.getBytesInUse(null)` under a
representative account before declaring `unlimitedStorage` permanently necessary.

## CSP and remote resources

The extension-page CSP retains the MV3 minimum `script-src 'self'; object-src 'self'`
and no inline scripts or event-handler attributes were found. Inline CSS and two
remote Google Fonts stylesheets remain; they are not remote executable JavaScript, but
they create privacy, offline, and rendering dependencies. Bundle icons locally and
move inline styles into compiled Sass.

`browser-polyfill.js` is exposed as a web-accessible resource to Forge of Empires pages,
but no page injection/reference was found in the audited source. Remove that exposure
if runtime testing confirms it is unused.

## Security and data handling

- User-configured Discord webhook URLs contain credentials and are stored in
  `storage.local`; do not log or export them.
- `storage.set` currently logs every stored key/value through `console.log`.
- Posting code does not consistently validate destination hosts, HTTP status, network
  errors, or timeouts.
- The manifest declares no analytics and no hardcoded live credentials were found.
- `npm audit --audit-level=high` reported zero known package vulnerabilities on the
  verification date; this does not cover application logic.

## Prioritized remediation

| Priority | Action                                                                          |
| -------- | ------------------------------------------------------------------------------- |
| P0       | Remove or replace the ineffective webRequest header mutation with tested DNR    |
| P0       | Remove runtime requests for already-required permissions                        |
| P0       | Stop rendering remote/game values as unsanitized extension HTML                 |
| P1       | Narrow/fix host patterns and validate posting destinations                      |
| P1       | Remove unused `externally_connectable` and web-accessible resource declarations |
| P1       | Move or remove lifecycle/update logic currently registered in the panel         |
| P1       | Complete Clipboard API migration before revisiting `clipboardWrite`             |
| P2       | Measure storage use before keeping `unlimitedStorage`                           |
| P2       | Raise/document the browser support floor and test Chrome plus Firefox manifests |

## Verification record

```text
Manifest V3                         PASS
Production manifest generation     PASS
Referenced icon existence/sizing   PASS
Production build                   PASS with performance warnings
npm dependency audit               PASS: 0 known vulnerabilities
Live browser permission/CSP tests  NOT RUN
```

This is a static/build audit. Reload behavior, DevTools network interception,
declarative header modification, clipboard permissions, and store-review behavior
must be verified in Chrome before closing those findings.
