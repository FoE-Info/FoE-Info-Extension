# Project: FoE-Info-Extension Documentation & Refactoring Architecture

## Architecture Overview

FoE-Info-Extension is a Chrome Manifest V3 browser extension designed to analyze, track, and optimize player performance in Forge of Empires (FoE). It operates via Google Chrome DevTools Network API interception (`browser.devtools.network.onRequestFinished`), capturing raw JSON game API traffic (`https://*.forgeofempires.com/game/json?h=...`) and metadata CDN payloads (`https://foe*.innogamescdn.com/start/metadata?id=...`).

### System Component Architecture

1. **Entry Point & Dispatcher (`src/js/index.js`)**: Content script entry point, initial state container, and central network event listener (`handleRequestFinished()`). Intercepts static metadata (`StaticDataService.getMetadata`) to populate city definitions before routing domain messages to service handlers.
2. **DevTools Shell (`src/js/devtools.js`, `src/js/devtools.html`)**: WebExtension DevTools panel lifecycle manager creating the "FoE-Info" inspection tab.
3. **Message Services (`src/js/msg/*`)**: 11 domain service modules parsing game API responses for specific domains (Startup, GreatBuildings, GuildBattleground, GuildExpedition, OtherPlayer, Resource, ArmyUnitManagement, Bonus, CityProduction, ClanBattle, Conversation).
4. **UI Helpers & DOM Rendering (`src/js/fn/*`)**: Utility functions generating Bootstrap DOM components, managing panel collapse states (33 flags), processing clipboard exports, and dispatching webhook POSTs (Discord/Google Sheets).
5. **Build Pipeline (`webpack-dev.config.js`, `foe-info-webstore.config.js`)**: Dual Webpack 5 bundling system compiling ES module sources into distribution bundles (`build/FoE-Info-DEV` and `build/FoE-Info_WEBSTORE`).

---

## Feature Inventory

| #   | Feature                                 | Description                                                                                                    | Milestone   | Source                |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- | --------------------- |
| 1   | System Architecture & Manifest V3 Specs | System overview, DevTools interception model, Manifest V3 permissions, Webpack pipeline                        | Milestone 1 | Survey (Explorer 1)   |
| 2   | Entry Point & Build Pipeline Specs      | `src/js/index.js` entry flow, Webpack dev vs webstore configurations, Terser minification                      | Milestone 1 | Survey (Explorer 1)   |
| 3   | Network Request Listener Mapping        | `handleRequestFinished()` regex URL matching, header masking (`onBeforeSendHeaders`), and deferred execution   | Milestone 2 | Survey (Spec Miner 2) |
| 4   | Message Route Dispatch Table            | Mapping 60+ raw Forge of Empires `requestClass` x `requestMethod` routes to message services                   | Milestone 2 | Survey (Spec Miner 2) |
| 5   | Message Services API Contracts          | Full API contracts, inputs, exported methods, and state mutations for all 11 services in `src/js/msg/`         | Milestone 2 | Survey (Spec Miner 2) |
| 6   | DOM Manipulation & UI Generation        | `src/js/fn/AddElement.js` DOM generators (`icon`, `updateIcon`, `copy`, `post`, `close`) and injection points  | Milestone 3 | Survey (Explorer 3)   |
| 7   | UI State & Collapse Handlers            | `src/js/fn/collapse.js` 33 collapse boolean flags, toggle handlers, and `fHideAllTooltips()`                   | Milestone 3 | Survey (Explorer 3)   |
| 8   | Clipboard & Data Export Utilities       | `src/js/fn/copy.js` 12 export functions (`BattlegroundCopy`, `TreasuryCopy`, etc.) and textarea copy mechanism | Milestone 3 | Survey (Explorer 3)   |
| 9   | Webhook Integration & Helper Cards      | `src/js/fn/post.js` (Discord/Google Sheets webhooks) and `src/js/fn/helper.js` (Incidents card, BG table)      | Milestone 3 | Survey (Explorer 3)   |
| 10  | Graphify Knowledge Graph Audit          | Analysis of `graphify-out/GRAPH_REPORT.md` god nodes (`handleRequestFinished()`, `index.js`) and metrics       | Milestone 4 | Survey (Explorer 3)   |
| 11  | 14 Circular Dependency Cycles Analysis  | Detailed breakdown of the 14 closed-loop triangular cycles (`fn/ -> index.js -> msg/ -> fn/`)                  | Milestone 4 | Survey (Explorer 3)   |
| 12  | Modular Decoupling Pathways             | Step-by-step refactoring plan establishing `appState.js`, `debug.js`, and `gameData.js` to break all cycles    | Milestone 4 | Survey (Explorer 3)   |
| 13  | Documentation Cross-Link Verification   | Clean compilation of markdown docs (`docs/knowledgebase/*`), verifying internal links and syntax               | Milestone 5 | Verification          |
| 14  | Webpack Build Verification              | Automated execution and verification of `npm run build` / `npm run build-foe-info`                             | Milestone 5 | Verification          |

---

## Milestones

| #   | Name                                                   | Scope                                                                                                                          | Dependencies   | Status      |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------- | ----------- |
| 1   | Architecture & Manifest V3 Overview Documentation (R1) | Update `docs/knowledgebase/architecture.md` covering system overview, entry points, Manifest V3, Webpack build configs         | none           | IN_PROGRESS |
| 2   | Service Dispatch & Network Interception Catalog (R2)   | Create `docs/knowledgebase/service-dispatch.md` covering network listeners, route mapping table, and 11 msg/ service contracts | M1             | PLANNED     |
| 3   | DOM Manipulation & UI Injection Catalog (R3)           | Create `docs/knowledgebase/ui-helpers.md` cataloging `src/js/fn/*` helpers, collapse state flags, copy/post utilities          | M1             | PLANNED     |
| 4   | Circular Dependency Analysis & Refactoring Plan (R4)   | Update `docs/knowledgebase/circular-dependencies.md` detailing Graphify audit, 14 cycles, and modular decoupling pathways      | M2, M3         | PLANNED     |
| 5   | E2E Documentation Verification & Build Validation      | Update `docs/knowledgebase/INDEX.md` and `README.md`, run markdown verification, and verify `npm run build`                    | M1, M2, M3, M4 | PLANNED     |

---

## Interface Contracts

### 1. `index.js` ↔ `src/js/msg/*`

- **`index.js` exports**: `GameVersion`, `CityEntityDefs`, `metadataLoaded`, `pendingStartupMsg`, `City`, `Galaxy`, `GBselected`, `Resources`, `MyInfo`, `BattlegroundPerformance`.
- **`msg/*` exports**: Dedicated service handlers e.g. `startupService(msg)`, `greatBuildingsService(msg)`, `guildBattlegroundService(msg)`, `otherPlayerService(msg)`, `resourceService(msg)`.

### 2. `index.js` ↔ `src/js/fn/*`

- **`index.js` exports**: State variables (`MyInfo`, `GameOrigin`, `url`, `hiddenRewards`), DOM element references (`donationDIV`, `incidents`, `alerts`), debug flag (`checkDebug()`).
- **`fn/*` functions**: DOM rendering helpers called by `index.js` or `msg/*` (`fShowIncidents()`, `fshowBattleground()`, `fCollapseIcon()`, `postToDiscord()`, `copyToClipboard()`).

### 3. `src/js/msg/*` ↔ `src/js/fn/*`

- **`msg/*` imports**: `fn/collapse.js` (collapse flags), `fn/copy.js` (copy utilities), `fn/helper.js` (rendering formatters), `fn/post.js` (webhook triggers).
- **`fn/*` imports**: `msg/GuildBattlegroundService.js` (`GBGdata`, `BattlegroundPerformance`), `msg/ResourceService.js` (`ResourceNames`).

---

## Code Layout

- **Documentation Root**: `docs/knowledgebase/`
  - `architecture.md`: System overview, Manifest V3, Webpack build pipeline, entry points.
  - `service-dispatch.md`: Network request listener mapping, 60+ API route dispatch table, 11 service contracts.
  - `ui-helpers.md`: Catalog of DOM manipulation, UI injection, collapse state management, clipboard & webhook tools.
  - `circular-dependencies.md`: Graphify audit integration, 14 circular dependency cycles, modular decoupling pathways.
  - `INDEX.md`: Knowledge Base sitemap & cross-reference index.
- **Source Files**: `src/js/`
  - `src/js/index.js`: Main content script & dispatch hub.
  - `src/js/msg/`: 11 message service modules.
  - `src/js/fn/`: Helper utility modules.
- **Build Configurations**: `webpack-dev.config.js`, `foe-info-webstore.config.js`.
