# FoE-Info-Extension Codebase Architecture & Technical Manual

This manual provides a detailed technical overview of the `FoE-Info-Extension` Chrome extension, its network interception pipeline, service routing, UI injection, and build tooling.

---

## 1. System Overview & Entry Points

`FoE-Info-Extension` is a Chrome Manifest V3 extension engineered to enhance the Forge of Empires web game experience. It intercepts live game traffic, tracks player stats, donor data, expedition progress, guild battleground status, and renders real-time overlay dashboards directly over the game canvas.

### Major Component Map

```mermaid
flowchart TD
    Manifest["src/chrome/manifest.json<br/>(Manifest V3 Configuration)"]
    Webpack["Webpack 5 Bundler<br/>(webpack-dev / foe-info-webstore)"]
    ContentScript["src/js/index.js<br/>(Content Script & Network Dispatcher)"]
    Services["src/js/msg/*Service.js<br/>(Startup, GB, Battleground, Clan, etc.)"]
    UI["src/js/fn/AddElement.js & jQuery<br/>(Bootstrap 5 Overlays & Tooltips)"]
    Storage["src/js/fn/storage.js<br/>(chrome.storage.local API)"]

    Manifest --> Webpack
    Webpack --> ContentScript
    ContentScript -->|handleRequestFinished()| Services
    Services --> UI
    Services --> Storage
```

### Primary Entry Points

- [`src/chrome/manifest.json`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/chrome/manifest.json): Extension configuration defining permissions (`storage`, `unlimitedStorage`, `clipboardWrite`), host permissions (`https://*.forgeofempires.com/game/*`), background service worker, popup UI, and content script injection.
- [`src/js/index.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/index.js): Content script entry point loaded on Forge of Empires pages. Houses global debug toggles, network packet listeners, state initialization, and service dispatching.
- [`src/js/devtools.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/devtools.js): DevTools panel script monitoring game network traffic via Chrome DevTools Network API.
- [`src/js/options.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/options.js): Extension options page controller for user preferences and webhook configurations.

---

## 2. Network Interception & Service Dispatching

The core engine of the extension centers around `handleRequestFinished()` in [`src/js/index.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/index.js), identified as the top **God Node** (47 connecting edges) by Graphify AST analysis.

### Request Processing Flow

1. **Packet Capture**: Game AJAX/WebSocket response payloads are intercepted.
2. **Payload Parsing**: JSON payloads are decoded and checked for target service classes.
3. **Service Dispatch**:
   - `StartupService`: Process initial player login, city state, friends list, and player metadata (`setMyInfo()`, `setPlayerName()`).
   - `GreatBuildingsService`: Process Great Building level data, donation investments, forge point calculations, and copy strings (`contributeForgePoints()`, `fDonationSuggest()`).
   - `OtherPlayerService`: Handle neighbor/guild member interactions, inactive player detection, and stats (`checkInactive()`, `otherPlayerService()`).
   - `GuildBattlegroundService`: Monitor sector control, attrition rates, and guild battleground maps (`setBattlegroundSize()`, `fshowBattleground()`).
   - `ClanBattleService` / `GuildExpeditionService`: Parse GvG / Expedition progress and treasury contributions.

---

## 3. Modular Service Breakdown (`src/js/msg/`)

| Service File                                                                                                                      | Responsibilities                                                  | Key Functions                                                       |
| :-------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- | :------------------------------------------------------------------ |
| [`StartupService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/StartupService.js)                     | Initial login packet parsing, player identity, friends list setup | `startupService()`, `setMyInfo()`, `setFriendsSize()`               |
| [`GreatBuildingsService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/GreatBuildingsService.js)       | GB calculations, FP donation safety margins, copy formatting      | `showGreatBuldingDonation()`, `fPercentBanded()`, `clickDonation()` |
| [`OtherPlayerService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/OtherPlayerService.js)             | External player profiles, activity tracking, army units           | `otherPlayerService()`, `checkInactive()`                           |
| [`GuildBattlegroundService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/GuildBattlegroundService.js) | GBG map sectors, log history, attrition calculation               | `setBattlegroundSize()`, `BattlegroundCopy()`                       |
| [`BonusService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/BonusService.js)                         | City boost bonuses, attack/defense multiplier tracking            | `getBonuses()`                                                      |
| [`CityProductionService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/CityProductionService.js)       | Building production cycles, collection timers                     | `receiveStorage()`, `setBuildingCostSize()`                         |

---

## 4. UI Rendering & DOM Injection (`src/js/fn/`)

UI elements are injected directly into the active browser page DOM using jQuery 3.7 and Bootstrap 5:

- [`AddElement.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/AddElement.js): Dynamically constructs overlay containers, action buttons (`fAddCollapseIcon()`, `fCollapseIcon()`), and sidebars.
- [`collapse.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/collapse.js): Handles modal collapsibility, panel toggles (`fCollapseIncidents()`, `fCollapseStats()`), and tooltip visibility.
- [`copy.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/copy.js): Formats structured FP investment and GBG status tables into clipboard text strings (`BattlegroundCopy()`, `DonorCopy()`, `addToClipboard()`).
- [`helper.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/helper.js): Math formatting, age name translations (`numAges`), and incident detection.

---

## 5. Webpack Bundling & Release Pipeline

The build architecture utilizes Webpack 5:

- **`webpack-dev.config.js`**: Development build configured with source maps and `--watch` mode.
- **`foe-info-webstore.config.js`**: Production pipeline compiling assets into `build/` and creating zip archives for Webstore submission.
- **Dependencies**: `jquery`, `@popperjs/core`, `bootstrap`, `bignumber.js`, `dayjs`, `webextension-polyfill`, `webhook-discord`.
