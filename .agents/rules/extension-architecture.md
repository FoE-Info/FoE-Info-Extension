# Chrome Extension Architecture & MV3 Guidelines

This repository implements a Chrome Browser Extension for Forge of Empires based on Manifest V3 specifications.

## Core Extension Rules & Invariants

- **Manifest Specification**: [`src/chrome/manifest.json`](../../src/chrome/manifest.json) is the single source of truth for extension permissions, web accessible resources, background scripts, options UI, and popup entry points.
- **Entry Points & Configuration Scripts**:
  - [`src/js/index.js`](../../src/js/index.js): Main Content Script & Traffic Controller.
    - **Packet Capture**: Intercepts AJAX/WebSocket game responses via `handleRequestFinished()` (God Node).
    - **State Observers**: Manages logged-in player identity (`setMyInfo()`), player name (`setPlayerName()`), and storage sync (`receiveStorage()`, `storageChange()`).
    - **Debug & UI Handlers**: Toggles verbose console logging (`checkDebug()`, `removeDebug()`) and observes reward popups (`rewardObserve()`, `showReward()`).
  - [`src/js/devtools.js`](../../src/js/devtools.js): Registers the extension DevTools panel (`browser.devtools.panels.create()`) for monitoring network traffic.
  - [`src/js/options.js`](../../src/js/options.js): Controller for `options.html`. Reads/saves user settings (`restore_options()`, `save_options()`) to `chrome.storage.local`.
  - [`src/js/popup.js`](../../src/js/popup.js): Action popup script providing quick navigation (`browser.runtime.openOptionsPage()`).
  - [`src/js/vars/showOptions.js`](../../src/js/vars/showOptions.js): Feature flag default booleans (`showFriends`, `showGBInfo`, `showBattleground`, etc.) and mutation export (`showOptions`).
- **Chrome APIs & Polyfill**: Use `webextension-polyfill` (`browser.*` namespace) for cross-browser promise-based extension APIs.
- **Content Scripts & Page Injection**:
  - `src/js/index.js` runs in the web page content script context.
  - Page DOM manipulation is performed via jQuery (`$`) and Bootstrap 5 overlays.
- **Network Request Interception**:
  - Forge of Empires network responses are intercepted and processed in `handleRequestFinished()` in [`src/js/index.js`](../../src/js/index.js).
  - Packet data is parsed in `handleRequestFinished()` (`src/js/index.js`) and dispatched to domain services in [`src/js/msg/`](../../src/js/msg/):
    - `StartupService.js`: Login, player identity (`setMyInfo()`), friends list.
    - `GreatBuildingsService.js`: GB calculations, FP donation safety margins (`showGreatBuldingDonation()`).
    - `GuildBattlegroundService.js`: GBG sectors, log history, attrition calculation (`setBattlegroundSize()`).
    - `OtherPlayerService.js`: External player profiles, activity tracking (`checkInactive()`).
    - `ArmyUnitManagementService.js`: Army unit tracking, troop composition, and defense units.
    - `BonusService.js`: City boost bonuses and attack/defense multipliers.
    - `CityProductionService.js`: Building collection timers and storage tracking.
    - `ClanBattleService.js`: Guild vs Guild (GvG) map sectors and battle logs.
    - `ConversationService.js`: In-game mail, messaging threads, and player communication.
    - `GuildExpeditionService.js`: Guild Expedition encounters, maps, and progress.
    - `ResourceService.js`: Goods, supplies, FP balances, and special tavern/event resources.
- **Extension Storage**: Use `chrome.storage.local` / `browser.storage.local` via [`src/js/fn/storage.js`](../../src/js/fn/storage.js) for persistent state. Never rely on in-memory globals across content script reloads.
- **Host Permissions & Security**: Keep host permissions strictly scoped in `manifest.json`. Never add wildcards (`*://*/*`) beyond required Innogames CDN and game domain origins (`https://*.forgeofempires.com/game/*`).
