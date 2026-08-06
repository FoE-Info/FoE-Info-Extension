# Chrome Extension Architecture & MV3 Guidelines

This repository implements a Chrome Browser Extension for Forge of Empires based on Manifest V3 specifications.

## Core Extension Rules & Invariants

- **Manifest Specification**: [`src/chrome/manifest.json`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/chrome/manifest.json) is the single source of truth for extension permissions, web accessible resources, background scripts, options UI, and popup entry points.
- **Chrome APIs & Polyfill**: Use `webextension-polyfill` (`browser.*` namespace) for cross-browser promise-based extension APIs.
- **Content Scripts & Page Injection**:
  - `src/js/index.js` runs in the web page content script context.
  - Page DOM manipulation is performed via jQuery (`$`) and Bootstrap 5 overlays.
- **Network Request Interception**:
  - Forge of Empires network responses are intercepted and processed in `handleRequestFinished()` in [`src/js/index.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/index.js).
  - Packet data is dispatched to specialized message handlers located in [`src/js/msg/`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/).
- **Extension Storage**: Use `chrome.storage.local` / `browser.storage.local` via [`src/js/fn/storage.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/storage.js) for persistent state. Never rely on in-memory globals across content script reloads.
- **Host Permissions & Security**: Keep host permissions strictly scoped in `manifest.json`. Never add wildcards (`*://*/*`) beyond required Innogames CDN and game domain origins (`https://*.forgeofempires.com/game/*`).
