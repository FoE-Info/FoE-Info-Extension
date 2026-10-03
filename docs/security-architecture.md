# FoE-Info Security Architecture

## Data Intake Paths

FoE-Info reads game traffic through two separate intake paths. Both are
read-only observation channels; neither writes to the game.

### 1. DevTools network listener

`devtools.html` / `devtools.js` create the FoE-Info panel inside the browser's
DevTools dock. `src/js/protocol/networkListener.js` subscribes to DevTools
network events for the inspected tab and consumes the game's own JSON-RPC
request/response traffic. This is the primary, documented path and the one the
product is designed around.

The DevTools listener and MAIN-world XHR bridge also observe the URL of the trusted InnoGames CDN
`shop_inventory` UI atlas as a first-opening hint for Goods Inventory. They
forward no atlas body or headers. Cached window reopens and closes may produce
no network signal; this hint does not establish the current window's visibility.

### 2. MAIN-world content-script bridge

In every build target (development, beta, production), the manifest
(`src/chrome/manifest.json:12-24`) and `webpack.common.js:11-12` inject two
content scripts into `https://*.forgeofempires.com/game/*` pages:

- `xhrInterceptor.js` runs in the **MAIN** world at `document_start` and wraps
  the page's `XMLHttpRequest`/`fetch`/`WebSocket` interfaces to observe traffic
  the DevTools listener may miss.
- `contentBridge.js` runs in the **ISOLATED** world at `document_start` and
  forwards the intercepted envelopes to the extension.

Both channels feed the same dispatcher, so a loaded game tab with the
extension enabled updates state whether or not DevTools is open. `README.md`
and `docs/architecture.md` describe the same two read-only paths; this document is
the authoritative description of what each path observes and authenticates,
and of the privilege scope below.

## Page-Spoofable Messages

`src/js/protocol/contentBridge.mjs:45-54` validates that `postMessage` events
arrive from the **same window** and the **exact same origin**
(`event.source !== window || event.origin !== window.location.origin` →
reject). The `FOE_INFO_XHR` channel is therefore not reachable from other
frames, other tabs, or cross-origin pages.

Same-window/exact-origin checks do not authenticate the sender. Browser
extensions the user has installed, page-injected code, or the game's own scripts
running in the game page can synthesize a
`FOE_INFO_XHR` envelope (`{ type, url, body, ... }`) and it will be accepted
and forwarded into FoE-Info's pipeline. There is no signature and no nonce.
Treat all payloads arriving over this channel as **untrusted page-controlled
input**, exactly like network-derived data. Fields sourced from either intake
path (player names, guild names, message text) must be escaped or assigned via
`textContent` before being placed into panel markup.

GBG target notifications escape conversation message text and sender names with
the shared `escapeHTML` helper before inserting the renderer template.

Rich popover content, GBG target messages, QI cards, Blue Galaxy and collection
panels pass through `sanitizeHTML` in `src/js/utils/html.mjs` before HTML
insertion. Its `xss` allowlist preserves panel controls and formatting, filters
CSS and link schemes, and excludes active elements and event attributes. Escape
plain data before composing templates; sanitization does not make arbitrary
markup suitable as a player name or numeric field. Tooltip attributes use
`escapeHTMLAttribute`, including the plain-text title.

Clipboard and Discord conversion use parsed tag callbacks rather than regular
expressions that strip tags. Common template entities and numeric references are
decoded once; unknown named entities stay literal. The result is plain text,
never safe HTML, and must be escaped before HTML reuse. i18n tests separately use
an HTML parser to inspect visible text and headings.

The MAIN-world design allows this spoofing; accepted messages do not prove
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
channels, and validate them at intake before any hardening work.

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
  currently unbounded or weakly bounded and carry no retention policy.
- The extension does not sync data to any server run by the project. The only
  outbound writes are the user-configured external destinations above.

Clearing the extension's storage (`chrome://extensions` → FoE-Info →
Remove, or clearing site/extension data) removes all persisted state.

## Permissions & CSP Rationale

- **Host permissions / content-script matches**: the content-script matches are
  limited to `https://*.forgeofempires.com/game/*`, the minimum needed to
  observe game traffic on real game pages, and the only page the MAIN-world
  observer is injected into. The extension also requests read access to the
  surfaces it actually calls: `https://*.innogamescdn.com/*` (entity and asset
  metadata), `https://*.scoredb.io/*` (optional ranking lookups),
  `https://discord.com/api/webhooks/*` and `https://discordapp.com/api/webhooks/*`
  (player-configured guild export), and `https://script.google.com/macros/s/*`
  (player-configured Sheets export). There is **no `<all_urls>` grant** and no
  write permission for any game endpoint.
- **Content Security Policy** (`extension_pages` in the manifest):
  `script-src 'self'; object-src 'none'; base-uri 'none'`, plus a `connect-src`
  limited to the same origins listed above and `img-src 'self'
https://*.innogamescdn.com data:`. No `unsafe-inline`, no `unsafe-eval`, no
  remote code loading. This materially constrains the impact of any
  markup-spoofing finding by blocking inline scripts and event handlers.
  CSP does not replace input validation, escaping or rich-markup sanitization.
- **Permissions**: `storage`, `unlimitedStorage`, and `clipboardWrite` only.
  Settings are OAuth-free plain values in `chrome.storage`; no cookies, no
  browsing history access, and no `webRequest` or `debugger` grant.
- **DevTools panel**: enabled by the manifest's `devtools_page` declaration,
  which is a page declaration rather than a permission. It is what creates the
  FoE-Info panel inside DevTools.

## Product Boundary

- FoE-Info **reads** the game's own traffic; it does not modify game requests,
  submit actions, click, or automate gameplay in reviewed paths.
- It **does** inject a MAIN-world interceptor into game pages in current
  builds. The accurate statement is: _no extension-generated game actions_,
  with passive observation hooks on game pages.
- External publication is opt-in per the External Publication section.
