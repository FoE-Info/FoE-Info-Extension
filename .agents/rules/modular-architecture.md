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

- `src/js/calc/`: Pure mathematical and game calculation logic ONLY. Zero DOM references (`document`, `window`, jQuery).
- `src/js/ui/`: DOM generation, card templates, popover event listeners, clipboard formatters.
- `src/js/msg/`: InnoGames JSON-RPC service handlers (`*Service.js`).
- `src/js/protocol/`: Network packet interception, message dispatching, and envelope routing.
- `src/js/state/`: In-memory state, metadata lookup stores, player preferences.
- `src/js/utils/`: General-purpose utilities (storage, copy, i18n, logger).
- `src/js/`: Root extension entry points only (`index.js`, `devtools.js`, `options.js`, etc.).
- Legacy monoliths (`src/js/index.js`, `StartupService.js`, `GreatBuildingsService.js`, `helper.js`) remain untouched until their dedicated refactoring slices.

---

## 3. InnoGames Domain Taxonomy Summary

Never dump feature logic, RPC parsing, or calculations into generic catch-alls (`StartupService.js`, `index.js`, or `helper.js`).
- **City Production & Harvest** $\to$ `CityProductionService.js` / `ProductionCalculator.js` / `renderProductionPanel.js`
- **Great Buildings & Investments** $\to$ `GreatBuildingsService.js` / `InvestedCalculator.js` / `renderInvestedPanel.js`
- **Guild Battlegrounds (GBG)** $\to$ `GuildBattlegroundService.js` / `GbgSignalService.js` / `renderGbgPanel.js`
- **Guild Expedition (GE 1–5)** $\to$ `GuildExpeditionService.js` / `renderExpeditionPanel.js`
- **Army & Combat Boosts** $\to$ `ArmyUnitManagementService.js` / `UnitCalculator.js` / `renderArmyPanel.js`
- **Inventory & Historical Allies** $\to$ `InventoryService.js` / `AllyService.js` / `renderAlliesPanel.js`
- **City Boosts & Blue Galaxy** $\to$ `CityStatsCalculator.js` / `BlueGalaxyCalculator.js` / `renderGalaxyPanel.js`

---

## 4. Debuggability

Every module performing calculations, RPC handling, state caching, or UI rendering must instantiate a scoped logger (`createLogger('ModuleName')`) and follow [Debuggability by Design](debuggability-by-design.md).
