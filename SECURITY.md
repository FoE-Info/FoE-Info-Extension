# Security Policy

## Supported Versions

Only the latest released version of the FoE-Info extension receives security
updates.

## Reporting a Vulnerability

Please report security issues **privately**. Do not open a public issue for a
suspected vulnerability.

Use the **Security** tab of this repository and choose **Report a vulnerability**
to open a private advisory visible only to the maintainers. Alternatively, email
**foegameinfo@gmail.com**.

Include as much of the following as possible:

- A description of the issue and its impact.
- Steps to reproduce, or a minimal proof-of-concept.
- Affected version(s) and browser.
- Any suggested fix or mitigation.

Reports are acknowledged as soon as possible and handled confidentially. Valid
reports are credited unless you prefer to remain anonymous.

## Data Intake Paths

FoE-Info reads game traffic through two separate intake paths. Both are
read-only observation channels; neither writes to the game.

### 1. DevTools network listener

`devtools.html` / `devtools.js` create the FoE-Info panel inside the browser's
DevTools dock. `src/js/protocol/networkListener.js` subscribes to DevTools
network events for the inspected tab and consumes the game's own JSON-RPC
request/response traffic. This is the primary, documented path and the one the
product is designed around.

### 2. MAIN-world content-script bridge

In every build target (development, beta, production), the manifest
(`src/chrome/manifest.json:12-24`) and `webpack.common.js:11-12` inject two
content scripts into `https://*.forgeofempires.com/game/*` pages:

- `xhrInterceptor.js` runs in the **MAIN** world at `document_start` and wraps
  the page's `XMLHttpRequest`/`fetch`/`WebSocket` interfaces to observe traffic
  the DevTools listener may miss.
- `contentBridge.js` runs in the **ISOLATED** world at `document_start` and
  forwards the intercepted envelopes to the extension.

This means the extension's data capture is **not** limited to DevTools-driven
sessions. Any loaded game tab with the extension enabled feeds both channels.
README and ARCHITECTURE currently describe the product as DevTools-only with
"no injection"; that wording is inconsistent with the shipped build, which
loads a MAIN-world interceptor. No extension-generated gameplay actions were
found in reviewed paths — observation hooks alone are not botting — but the
transport boundary is wider than the docs claim, and this document is the
authoritative description.

## Page-Spoofable Messages

`src/js/protocol/contentBridge.js:45-54` validates that `postMessage` events
arrive from the **same window** and the **exact same origin**
(`event.source !== window || event.origin !== window.location.origin` →
reject). The `FOE_INFO_XHR` channel is therefore not reachable from other
frames, other tabs, or cross-origin pages.

However, same-window/exact-origin is **not** an authenticated channel: any
content script running in the game page — browser extensions the user has
installed, page-injected code, or the game's own scripts — can synthesize a
`FOE_INFO_XHR` envelope (`{ type, url, body, ... }`) and it will be accepted
and forwarded into FoE-Info's pipeline. There is no signature and no nonce.
Treat all payloads arriving over this channel as **untrusted page-controlled
input**, exactly like network-derived data. Fields sourced from either intake
path (player names, guild names, message text) must be escaped or assigned via
`textContent` before being placed into panel markup; see `docs/TODO.md` §2.1
for the current known escaping gaps.

This spoofing surface is inherent to the MAIN-world design, not authenticated
game-server provenance.

## External Publication & Enrichment

The extension can post data **out of the browser** to user-configured
destinations:

- Discord posting from guild-battleground/conversation contexts
  (`src/js/ui/gbgPanel.js`, `src/js/msg/ConversationService.js`).
- Google Sheets posting, conditionally enabled by the `sheetGuildURL` setting
  (`fn/post.js` and migrated legacy settings).
- Legacy dormant helpers exist in `src/js/fn/post.js` (`postPlayerToSS`,
  `postData`, `logToDiscord`, `postAlerttoDsicord`); several have no
  production callers but remain exported in the bundle.

All external posting requires explicit user configuration and, where
applicable, a user click. Destinations are user-controlled; the extension does
not publish game data anywhere the user has not configured. Reviewers and
security analysts should treat these endpoints as credentials-scoped outbound
channels (see §0 of `docs/TODO.md`) and validate them at intake before any
hardening work.

FoE-Info performs **no telemetry** of its own: it has no analytics, no crash
reporting, and no update pings beyond normal extension update mechanics.

## Data Retention

- **In-memory session state**: fully ephemeral, discarded when the panel or
  game tab closes.
- **Settings** (world selection, donation defaults, webhook/Sheets URLs,
  metric toggles): persisted in `chrome.storage.local`, scoped per game world.
- **Game-derived caches**: player-name caches, Great Building registry
  entries, ScoreDB lookup results, and metadata responses are persisted in
  `chrome.storage.local` to survive restarts. Some of these caches are
  currently unbounded or weakly bounded — see `docs/TODO.md` §4 for the
  bounded-retention items.
- The extension does not sync data to any server run by the project. The only
  outbound writes are the user-configured external destinations above.

Clearing the extension's storage (`chrome://extensions` → FoE-Info →
Remove, or clearing site/extension data) removes all persisted state.

## Permissions & CSP Rationale

- **Host permissions / content-script matches**: limited to
  `https://*.forgeofempires.com/game/*` — the minimum needed to observe game
  traffic on real game pages. There is **no `<all_urls>` grant**. Some CDN
  metadata endpoints are loaded by the panel via network fetch rather than
  host permissions.
- **DevTools permission**: creates the FoE-Info panel page inside DevTools.
- **Content scripts**: the two scripts described above (MAIN-world
  interceptor + ISOLATED-world bridge). Their presence is the implementation
  of traffic observation, not a game-write capability.
- **Content Security Policy**: `script-src 'self'; object-src 'none';
base-uri 'none'`. No `unsafe-inline`, no `unsafe-eval`, no remote code
  loading. This materially constrains the impact of any markup-spoofing
  finding: injected HTML can distort the panel UI, but script execution inside
  the extension context is blocked by CSP.
- The extension stores OAuth-free plain settings only. `chrome.storage` is
  scoped to the extension; no cookies, no browsing history access.

## Product Boundary

- FoE-Info **reads** the game's own traffic; it does not modify game requests,
  submit actions, click, or automate gameplay in reviewed paths.
- It **does** inject a MAIN-world interceptor into game pages in current
  builds; documentation elsewhere that says "no injection" is being corrected
  (see `docs/TODO.md` §0 and §2.4). The accurate statement is: _no
  extension-generated game actions_, with passive observation hooks on game
  pages.
- External publication is opt-in per the External Publication section.
