---
trigger: always_on
description: Mandatory modular file limits (<= 600 lines) and strict directory taxonomy in src/.
---

# Rule: Modular Architecture & File Boundaries

To maintain high maintainability, testability, and clarity, agents must write modular, single-responsibility files rather than large monolithic classes.

---

## 1. File Size & Responsibility Budgets

- **Hard File Cap**: No new or refactored module in `src/js/` may exceed **600 lines** (absolute ceiling: 800 lines for complex dispatch tables).
- **Target Size**: 100–300 lines per module.
- **Single Responsibility Principle (SRP)**: Each file must do exactly one thing (e.g. military boost tallying, goods calculation, popover event binding).
- **Orchestrator Pattern**: High-level engines (like `CityStatsCalculator`) must not contain raw parsing algorithms; they must delegate to focused sub-modules and remain $\le 80$ lines.

---

## 2. Directory Placement Invariants

As defined in the project architecture:
- `src/js/calc/`: Pure mathematical and game calculation logic ONLY. Zero DOM references (`document`, `window`, jQuery).
- `src/js/ui/`: DOM generation, card templates, popover event listeners, clipboard formatters.
- `src/js/msg/`: InnoGames JSON-RPC service handlers (`*Service.js`).
- `src/js/protocol/`: Network packet interception, message dispatching, and envelope routing.
- `src/js/state/`: In-memory state, metadata lookup stores, player preferences.
- `src/js/utils/`: General-purpose utilities (storage, copy, i18n).
- `src/js/`: Root extension entry points only (`index.js`, `devtools.js`, `options.js`, etc.).
- Legacy monoliths (`src/js/index.js`, `StartupService.js`, `GreatBuildingsService.js`, `helper.js`) remain untouched until their dedicated refactoring slices.

---

## 3. InnoGames Domain Placement Taxonomy (Where to Write What)

Never dump feature logic, RPC parsing, or calculations into generic catch-alls (`StartupService.js`, `index.js`, or `helper.js`). Use the domain placement guide below. Some target modules are proposed and do not yet exist; query the current graph before treating a name as an implemented entry point or creating a replacement.

| Game Domain / Feature | RPC Service (`src/js/msg/`) | Pure Math / Engine (`src/js/calc/`) | UI Panel (`src/js/ui/`) |
| :--- | :--- | :--- | :--- |
| **Castle System** (levels, chests, perks) | `CastleSystemService.js` | — | `renderCastlePanel.js` |
| **City Production & Harvest** | `CityProductionService.js` | `ProductionCalculator.js` | `renderProductionPanel.js` |
| **Great Buildings (Levels & Donors)** | `GreatBuildingsService.js` / `GbDonationService.js` | — | `renderGbInfoPanel.js` |
| **GB Investments & 1.9x Sniping** | `GreatBuildingsService.js` | `InvestedCalculator.js` | `renderInvestedPanel.js` |
| **Guild Battlegrounds (GBG)** | `GuildBattlegroundService.js` / `GbgSignalService.js` | — | `renderGbgPanel.js` |
| **Guild Expedition (GE 1–5)** | `GuildExpeditionService.js` | — | `expeditionTables.js` / `renderExpeditionPanel.js` |
| **Army & Rogue Management** | `ArmyUnitManagementService.js`| `UnitCalculator.js` | `renderArmyPanel.js` |
| **Historical Allies** | `AllyService.js` | — | `renderAlliesPanel.js` |
| **Inventory & Antiques Dealer** | `InventoryService.js` / `ItemExchangeService.js` | — | `renderInventoryPanel.js` |
| **Tavern & Auto-Aid** | `FriendsTavernService.js` / `AutoAidService.js` | — | `renderTavernPanel.js` |
| **Guild Treasury** | `TreasuryService.js` | — | — |
| **City Stats & Boost Totals** | `StartupService.js` (ingest only) | `CityStatsCalculator.js` | `renderCityStats.js` |
| **Blue Galaxy Charges** | `StartupService.js` (dispatch only) | `BlueGalaxyCalculator.js` | `renderGalaxyPanel.js` |
| **Cultural Outposts & Settlements** | `OutpostService.js` | — | — |

---

## 4. Debuggability & Diagnostic Invariant

Every new module, refactored slice, and extracted service must be built debuggable by design:
- **Module Logger Instantiation**: Every module performing calculations, RPC handling, state caching, or UI rendering must instantiate a scoped logger:
  ```javascript
  import { createLogger } from '../utils/logger.js';
  const logger = createLogger('ModuleName');
  ```
- **Dual-Mode Operation**:
  - **Standard Mode (Default)**: 100% silent. Zero extraneous console noise.
  - **Debug Mode (Toggled via Header Logo Icon)**: Verbose diagnostics for value computations, cache operations (reads, writes, invalidations), async fetch resolutions, UI re-renders, and potential race points.
- **Tagging**: All log statements flow through `logger.js`, producing structured `[FoE-Info:<ModuleName>]` entries in the DevTools panel console so both users and external AI assistants have immediate visibility.
